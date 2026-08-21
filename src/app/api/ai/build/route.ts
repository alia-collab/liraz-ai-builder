import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import { checkQuota, incrementUsage } from "@/lib/quotas";
import { getUserOrganization } from "@/lib/deploy";
import { createAuditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { getAIProvider } from "@/lib/ai";
import { createAnthropicAIRequest } from "@/lib/ai/log-request";
import {
  AICreditsExhaustedError,
  AI_CREDITS_EXHAUSTED_CODE,
  AI_CREDITS_EXHAUSTED_MESSAGE,
  costUsdToCredits,
  finalizeAICredits,
  releaseReservation,
  reserveCredits,
} from "@/lib/ai-credits";
import { planFromPrompt } from "@/lib/ai/pipeline/planner";
import { refineDesignWithClaude } from "@/lib/ai/pipeline/claude-design";
import { buildSnapshotFromSpec } from "@/lib/ai/pipeline/blueprint";
import { qaSnapshot } from "@/lib/ai/pipeline/qa";
import { emptyMemory, mergeSettings } from "@/lib/ai/pipeline/memory";
import { BUILD_STAGES } from "@/lib/ai/pipeline/types";
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import type { ProjectType } from "@prisma/client";
import type { ProjectSnapshot } from "@/lib/ai/types";
import { isClaudeConfigured } from "@/lib/ai/anthropic-provider";
import { seedAppData } from "@/lib/runtime/seed";

export async function POST(request: NextRequest) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;

  if (!isClaudeConfigured()) {
    return jsonError("ANTHROPIC_API_KEY is required for AI builds", 503);
  }

  const aiQuota = await checkQuota(session.user.id, "aiRequests");
  if (!aiQuota.allowed) return jsonError("AI usage limit reached", 429);
  const projectQuota = await checkQuota(session.user.id, "projects");
  if (!projectQuota.allowed) return jsonError("Project limit reached", 429);

  const org = await getUserOrganization(session.user.id);
  if (!org) return jsonError("Organization not found", 404);

  const body = (await request.json().catch(() => ({}))) as {
    spec?: BuildSpec;
    prompt?: string;
    projectType?: string;
    primaryColor?: string;
  };

  let spec: BuildSpec = body.spec ?? planFromPrompt(String(body.prompt ?? ""), body.projectType);
  const promptForClaude =
    String(body.prompt ?? "").trim() ||
    spec.inferredFrom ||
    `${spec.name}: ${spec.purpose}`;

  let reservationId: string | undefined;
  let tokensUsed = 0;
  let costUsd = 0;
  let model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  let aiSnapshot: ProjectSnapshot | null = null;

  try {
    const reserved = await reserveCredits(session.user.id);
    reservationId = reserved.reservationId;

    const design = await refineDesignWithClaude(spec);
    spec = design.spec;
    if (body.primaryColor) spec.visual.primaryColor = body.primaryColor;
    tokensUsed += design.tokensUsed;
    costUsd += design.costUsd;
    model = design.model;

    const provider = await getAIProvider();
    const ai = await provider.generateProject(promptForClaude, {
      userId: session.user.id,
      locale: spec.locale,
    });
    tokensUsed += ai.tokensUsed;
    costUsd += ai.costUsd;
    model = ai.model || model;
    if (ai.snapshot?.pages?.length) {
      aiSnapshot = ai.snapshot;
    }
  } catch (err) {
    if (reservationId) {
      await releaseReservation(reservationId, err instanceof Error ? err.message : "AI failed");
    }
    if (err instanceof AICreditsExhaustedError) {
      return jsonError(AI_CREDITS_EXHAUSTED_MESSAGE, 402, AI_CREDITS_EXHAUSTED_CODE);
    }
    await createAnthropicAIRequest({
      userId: session.user.id,
      prompt: promptForClaude,
      status: "FAILED",
      errorMessage: err instanceof Error ? err.message : "Anthropic generation failed",
      model,
      tokensUsed,
      costUsd,
    });
    return jsonError(err instanceof Error ? err.message : "AI generation failed", 502);
  }

  const orgSlug = slugify(spec.name) + "-" + Date.now().toString(36).slice(-4);

  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: (aiSnapshot?.name || spec.name).trim() || spec.name,
      slug: orgSlug,
      description: spec.purpose,
      type: (aiSnapshot?.type || spec.productType) as ProjectType,
      locale: aiSnapshot?.locale || spec.locale,
      direction: aiSnapshot?.direction || spec.direction,
      status: "DRAFT",
      settings: {},
    },
  });

  const snapshot: ProjectSnapshot = aiSnapshot
    ? {
        ...aiSnapshot,
        theme: {
          ...aiSnapshot.theme,
          primaryColor: spec.visual.primaryColor || aiSnapshot.theme.primaryColor,
        },
      }
    : buildSnapshotFromSpec(spec, project.id);
  if (!aiSnapshot) {
    snapshot.theme.primaryColor = spec.visual.primaryColor;
  }

  const qa = qaSnapshot(snapshot, project.id, spec);
  const memory = emptyMemory(spec);
  memory.buildLog = BUILD_STAGES.map((stage) => ({
    stage,
    status: qa.passed || stage !== "testing" ? "done" : "failed",
    detail: stage === "testing" ? (qa.passed ? "QA passed" : qa.errors.join("; ")) : "ok",
  }));
  memory.qa = qa;
  memory.openTasks = qa.passed ? [] : qa.errors;
  memory.changelog.push({
    at: new Date().toISOString(),
    summary: "Initial staged build from Claude + approved spec",
    files: snapshot.pages.map((p) => `pages/${p.slug}`),
    by: session.user.id,
  });

  for (const [index, page] of snapshot.pages.entries()) {
    await prisma.page.create({
      data: {
        projectId: project.id,
        slug: page.slug,
        title: page.title,
        locale: page.locale,
        direction: page.direction,
        components: page.components as object[],
        seo: page.seo as object,
        sortOrder: index,
        isHomePage: Boolean(page.slug === "home"),
      },
    });
  }

  await prisma.projectVersion.create({
    data: {
      projectId: project.id,
      version: 1,
      label: "Build v1",
      description: spec.purpose,
      snapshot: snapshot as object,
      createdBy: session.user.id,
      isPublished: false,
    },
  });

  await prisma.project.update({
    where: { id: project.id },
    data: {
      settings: mergeSettings({}, memory, snapshot.theme) as object,
    },
  });

  await seedAppData(project.id, spec);

  const creditsUsed = costUsdToCredits(costUsd);
  const aiRequest = await createAnthropicAIRequest({
    userId: session.user.id,
    projectId: project.id,
    prompt: promptForClaude,
    status: qa.passed ? "COMPLETED" : "FAILED",
    response: qa.passed ? "Build complete" : qa.errors.join("; "),
    model,
    tokensUsed,
    costUsd,
    creditsUsed,
  });

  if (reservationId) {
    await finalizeAICredits({
      reservationId,
      costUsd,
      aiRequestId: aiRequest.id,
    });
  }

  await incrementUsage(session.user.id, "aiRequests");
  await incrementUsage(session.user.id, "projects");
  await createAuditLog({
    userId: session.user.id,
    action: "PROJECT_CREATED",
    targetType: "Project",
    targetId: project.id,
  });

  if (!qa.passed) {
    return jsonSuccess({
      complete: false,
      project: { id: project.id, name: project.name },
      qa,
      memory,
      previewPath: `/preview/${project.id}/home`,
    }, 201);
  }

  return jsonSuccess({
    complete: true,
    project: { id: project.id, name: project.name },
    qa,
    stages: memory.buildLog,
    previewPath: `/preview/${project.id}/home`,
    editorPath: `/editor/${project.id}`,
  }, 201);
}
