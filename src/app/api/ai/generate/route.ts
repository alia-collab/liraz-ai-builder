import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { checkQuota, incrementUsage } from "@/lib/quotas";
import { getUserOrganization } from "@/lib/deploy";
import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import { createAuditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { getAIProvider } from "@/lib/ai";
import { createAnthropicAIRequest } from "@/lib/ai/log-request";
import { planFromPrompt } from "@/lib/ai/pipeline/planner";
import { refineDesignWithClaude } from "@/lib/ai/pipeline/claude-design";
import { buildSnapshotFromSpec } from "@/lib/ai/pipeline/blueprint";
import { qaSnapshot } from "@/lib/ai/pipeline/qa";
import { emptyMemory } from "@/lib/ai/pipeline/memory";
import { writeSnapshotToProject } from "@/lib/workspace/persist";
import { seedAppData } from "@/lib/runtime/seed";
import { createProjectVersion } from "@/lib/projects";
import { isClaudeConfigured } from "@/lib/ai/anthropic-provider";
import type { ProjectType } from "@prisma/client";
import type { ProjectSnapshot } from "@/lib/ai/types";

export async function POST(request: NextRequest) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;

  if (!isClaudeConfigured()) {
    return jsonError("ANTHROPIC_API_KEY is required for AI generation", 503);
  }

  const body = (await request.json().catch(() => ({}))) as {
    prompt?: unknown;
    locale?: unknown;
    projectType?: unknown;
  };

  const prompt = String(body.prompt ?? "").trim();
  const projectType = String(body.projectType ?? "").trim();
  if (prompt.length < 2) {
    return jsonError("כתבי מה תרצו לבנות, ואז לחצו על יצירה.", 400);
  }

  const quota = await checkQuota(session.user.id, "aiRequests");
  if (!quota.allowed) return jsonError("AI usage limit reached. Upgrade your plan.", 429);
  const projectQuota = await checkQuota(session.user.id, "projects");
  if (!projectQuota.allowed) return jsonError("Project limit reached.", 429);

  const org = await getUserOrganization(session.user.id);
  if (!org) return jsonError("Organization not found", 404);

  let spec = planFromPrompt(prompt, projectType || undefined);
  let tokensUsed = 0;
  let costUsd = 0;
  let model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  let aiSnapshot: ProjectSnapshot | null = null;

  try {
    const design = await refineDesignWithClaude(spec);
    spec = design.spec;
    tokensUsed += design.tokensUsed;
    costUsd += design.costUsd;
    model = design.model;

    const provider = await getAIProvider();
    const ai = await provider.generateProject(prompt, {
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
    await createAnthropicAIRequest({
      userId: session.user.id,
      prompt,
      status: "FAILED",
      errorMessage: err instanceof Error ? err.message : "Anthropic generation failed",
      model,
      tokensUsed,
      costUsd,
    });
    return jsonError(err instanceof Error ? err.message : "AI generation failed", 502);
  }

  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: (aiSnapshot?.name || spec.name).trim() || spec.name,
      slug: slugify(spec.name) + "-" + Date.now().toString(36).slice(-4),
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

  const qa = qaSnapshot(snapshot, project.id, spec);
  const memory = emptyMemory(spec);
  memory.qa = qa;
  await writeSnapshotToProject(project.id, snapshot, spec, memory);
  await seedAppData(project.id, spec);
  await createProjectVersion(project.id, snapshot, session.user.id, "Generate");

  await createAnthropicAIRequest({
    userId: session.user.id,
    projectId: project.id,
    prompt,
    status: qa.passed ? "COMPLETED" : "FAILED",
    response: qa.passed ? spec.typeLabel : qa.errors.join("; "),
    model,
    tokensUsed,
    costUsd,
  });

  await incrementUsage(session.user.id, "aiRequests");
  await incrementUsage(session.user.id, "projects");
  await createAuditLog({
    userId: session.user.id,
    action: "PROJECT_CREATED",
    targetType: "Project",
    targetId: project.id,
  });

  return jsonSuccess({
    complete: qa.passed,
    project: { id: project.id, name: project.name, slug: project.slug },
    explanation: spec.typeLabel,
    qa,
    editorPath: `/editor/${project.id}`,
    previewPath: `/preview/${project.id}/home`,
  }, 201);
}
