import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import { checkQuota, incrementUsage } from "@/lib/quotas";
import { getUserOrganization } from "@/lib/deploy";
import { createAuditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { planFromPrompt } from "@/lib/ai/pipeline/planner";
import { refineDesignWithClaude } from "@/lib/ai/pipeline/claude-design";
import { buildSnapshotFromSpec } from "@/lib/ai/pipeline/blueprint";
import { qaSnapshot } from "@/lib/ai/pipeline/qa";
import { emptyMemory, mergeSettings } from "@/lib/ai/pipeline/memory";
import { BUILD_STAGES } from "@/lib/ai/pipeline/types";
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import type { ProjectType } from "@prisma/client";
import { isClaudeConfigured } from "@/lib/ai/anthropic-provider";
import { seedAppData } from "@/lib/runtime/seed";

export async function POST(request: NextRequest) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;

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
  spec = await refineDesignWithClaude(spec);
  if (body.primaryColor) spec.visual.primaryColor = body.primaryColor;

  const orgSlug = slugify(spec.name) + "-" + Date.now().toString(36).slice(-4);

  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: spec.name,
      slug: orgSlug,
      description: spec.purpose,
      type: spec.productType as ProjectType,
      locale: spec.locale,
      direction: spec.direction,
      status: "DRAFT",
      settings: {},
    },
  });

  const snapshot = buildSnapshotFromSpec(spec, project.id);
  snapshot.theme.primaryColor = spec.visual.primaryColor;

  const qa = qaSnapshot(snapshot, project.id, spec);
  const memory = emptyMemory(spec);
  memory.buildLog = BUILD_STAGES.map((stage) => ({
    stage,
    status: qa.passed || stage !== "testing" ? "done" : "failed",
    detail: stage === "testing" ? (qa.passed ? "QA passed" : qa.errors.join("; ")) : "ok",
  }));
  memory.qa = qa;
  if (!qa.passed) {
    memory.openTasks = qa.errors;
  } else {
    memory.openTasks = [];
  }
  memory.changelog.push({
    at: new Date().toISOString(),
    summary: "Initial staged build from approved spec",
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

  await prisma.aIRequest.create({
    data: {
      userId: session.user.id,
      projectId: project.id,
      prompt: spec.inferredFrom,
      status: qa.passed ? "COMPLETED" : "FAILED",
      response: qa.passed ? "Build complete" : qa.errors.join("; "),
      completedAt: new Date(),
      provider: isClaudeConfigured() ? "ANTHROPIC" : "MOCK",
    },
  });

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
