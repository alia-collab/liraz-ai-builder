import prisma from "@/lib/db";
import { planFromPrompt } from "@/lib/ai/pipeline/planner";
import { refineDesignWithClaude } from "@/lib/ai/pipeline/claude-design";
import {
  AICreditsExhaustedError,
  AI_CREDITS_EXHAUSTED_MESSAGE,
  runClaudeWithCredits,
} from "@/lib/ai-credits";
import { runBuilderBuild, runBuilderEdit } from "@/lib/builder/orchestrator";
import { createProjectVersion } from "@/lib/projects";
import { incrementUsage } from "@/lib/quotas";
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import { addChatMessage, setTaskStatus, updateJob, PLAN_TASKS, BUILD_TASKS, EDIT_TASKS } from "./tasks";
import { currentSnapshotFromProject } from "./persist";
import { emitWorkspace } from "./events";

async function cancelled(jobId: string) {
  const job = await prisma.buildJob.findUnique({ where: { id: jobId }, select: { cancelRequested: true } });
  return Boolean(job?.cancelRequested);
}

async function failJob(jobId: string, projectId: string, message: string) {
  await updateJob(jobId, { status: "FAILED", errorMessage: message, completedAt: new Date() });
  await addChatMessage({
    projectId,
    jobId,
    role: "assistant",
    kind: "ERROR",
    content: message,
    payload: { retry: true },
  });
}

export async function hasActiveJob(projectId: string) {
  const existing = await prisma.buildJob.findFirst({
    where: { projectId, status: { in: ["PENDING", "PLANNING", "RUNNING"] } },
    select: { id: true },
  });
  return existing;
}

export async function startPlanJob(input: {
  projectId: string;
  userId: string;
  prompt: string;
  projectType?: string;
  locale: "HE" | "EN";
}) {
  const busy = await hasActiveJob(input.projectId);
  if (busy) {
    throw new Error("JOB_IN_PROGRESS");
  }

  const he = input.locale === "HE";
  const job = await prisma.buildJob.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      kind: "PLAN",
      status: "PLANNING",
      prompt: input.prompt,
    },
  });

  await prisma.buildTask.createMany({
    data: PLAN_TASKS.map((t, i) => ({
      jobId: job.id,
      projectId: input.projectId,
      key: t.key,
      title: he ? t.titleHe : t.titleEn,
      description: he ? t.descriptionHe : t.descriptionEn,
      sortOrder: i,
      status: i === 0 ? "COMPLETED" : "PENDING",
      startedAt: i === 0 ? new Date() : undefined,
      completedAt: i === 0 ? new Date() : undefined,
    })),
  });

  await addChatMessage({
    projectId: input.projectId,
    jobId: job.id,
    role: "user",
    kind: "USER",
    content: input.prompt,
  });
  await addChatMessage({
    projectId: input.projectId,
    jobId: job.id,
    role: "assistant",
    kind: "ASSISTANT",
    content: he
      ? "הבנתי. אני מנתח את הדרישה המלאה ומכין תוכנית מימוש מפורטת."
      : "Got it. I am analyzing the full requirement and preparing a detailed implementation plan.",
  });
  await addChatMessage({
    projectId: input.projectId,
    jobId: job.id,
    role: "assistant",
    kind: "ACTIVITY",
    content: he ? "מזהה עמודים, משתמשים, מודלים וזרימות." : "Identifying pages, users, data models, and workflows.",
    payload: { key: "analyzing", status: "RUNNING" },
  });

  const analyzing = await prisma.buildTask.findFirst({ where: { jobId: job.id, key: "analyzing" } });
  if (analyzing) await setTaskStatus(analyzing.id, "RUNNING");

  try {
    if (await cancelled(job.id)) {
      await updateJob(job.id, { status: "CANCELLED", completedAt: new Date() });
      return job.id;
    }

    let spec = planFromPrompt(input.prompt, input.projectType);
    const { result: design } = await runClaudeWithCredits({
      userId: input.userId,
      projectId: input.projectId,
      prompt: input.prompt,
      run: async () => {
        const d = await refineDesignWithClaude(spec);
        spec = d.spec;
        return {
          tokensUsed: d.tokensUsed,
          costUsd: d.costUsd,
          model: d.model,
          explanation: `Plan design: ${spec.typeLabel}`,
        };
      },
    });
    void design;

    if (analyzing) {
      await setTaskStatus(
        analyzing.id,
        "COMPLETED",
        spec.typeLabel,
        JSON.parse(
          JSON.stringify({
            pages: spec.pages.map((p) => p.slug),
            roles: spec.userRoles,
            forms: spec.forms,
            dataModel: spec.dataModel,
            successCriteria: spec.successCriteria,
          })
        )
      );
    }
    const planning = await prisma.buildTask.findFirst({ where: { jobId: job.id, key: "planning" } });
    if (planning) await setTaskStatus(planning.id, "RUNNING");

    await prisma.buildJob.update({
      where: { id: job.id },
      data: { spec: spec as object, status: "AWAITING_APPROVAL" },
    });

    if (planning) {
      await setTaskStatus(
        planning.id,
        "NEEDS_APPROVAL",
        he ? "ממתין לאישור התוכנית" : "Waiting for plan approval",
        JSON.parse(JSON.stringify({ criteria: spec.successCriteria }))
      );
    }

    await addChatMessage({
      projectId: input.projectId,
      jobId: job.id,
      role: "assistant",
      kind: "PLAN",
      content: he ? "תוכנית בנייה מוכנה לאישור." : "Build plan ready for approval.",
      payload: JSON.parse(JSON.stringify(spec)),
    });

    emitWorkspace(input.projectId, "job", { id: job.id, status: "AWAITING_APPROVAL" });
    return job.id;
  } catch (err) {
    if (analyzing) await setTaskStatus(analyzing.id, "FAILED", err instanceof Error ? err.message : "plan failed");
    const msg =
      err instanceof AICreditsExhaustedError
        ? AI_CREDITS_EXHAUSTED_MESSAGE
        : he
          ? "הניתוח נכשל. אפשר לנסות לתקן."
          : "Analysis failed. You can try to fix it.";
    await failJob(job.id, input.projectId, msg);
    throw err;
  }
}

export async function startBuildFromPlan(input: {
  projectId: string;
  userId: string;
  jobId: string;
  locale: "HE" | "EN";
}) {
  const planJob = await prisma.buildJob.findFirst({
    where: { id: input.jobId, projectId: input.projectId },
  });
  if (!planJob?.spec) throw new Error("PLAN_NOT_FOUND");
  if (planJob.status !== "AWAITING_APPROVAL") throw new Error("PLAN_NOT_READY");

  const busy = await prisma.buildJob.findFirst({
    where: { projectId: input.projectId, status: "RUNNING" },
  });
  if (busy) throw new Error("JOB_IN_PROGRESS");

  const spec = planJob.spec as unknown as BuildSpec;
  const he = input.locale === "HE";

  const job = await prisma.buildJob.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      kind: "BUILD",
      status: "RUNNING",
      prompt: planJob.prompt,
      spec: spec as object,
    },
  });

  await updateJob(planJob.id, { status: "COMPLETED", completedAt: new Date() });

  await prisma.buildTask.createMany({
    data: BUILD_TASKS.map((t, i) => ({
      jobId: job.id,
      projectId: input.projectId,
      key: t.key,
      title: he ? t.titleHe : t.titleEn,
      description: he ? t.descriptionHe : t.descriptionEn,
      sortOrder: i,
      status: "PENDING",
    })),
  });

  await addChatMessage({
    projectId: input.projectId,
    jobId: job.id,
    role: "assistant",
    kind: "ACTIVITY",
    content: he
      ? "סוכן הבנייה האוטונומי מתחיל: ניתוח → מימוש → בדיקות → תיקון."
      : "Autonomous build agent starting: analyze → implement → test → repair.",
    payload: { key: "analyze", status: "RUNNING" },
  });

  runBuildJob({ ...input, jobId: job.id, spec }).catch((err) => {
    console.error("build job failed", err);
  });

  return job.id;
}

async function runBuildJob(input: {
  projectId: string;
  userId: string;
  jobId: string;
  locale: "HE" | "EN";
  spec: BuildSpec;
}) {
  const previous = await currentSnapshotFromProject(input.projectId);
  if (previous && previous.pages.length > 0) {
    await createProjectVersion(input.projectId, previous, input.userId, "checkpoint before autonomous build");
  }

  if (await cancelled(input.jobId)) {
    await updateJob(input.jobId, { status: "CANCELLED", completedAt: new Date() });
    return;
  }

  const tasks = await prisma.buildTask.findMany({ where: { jobId: input.jobId }, orderBy: { sortOrder: "asc" } });
  const byKey = Object.fromEntries(tasks.map((t) => [t.key, t]));

  await runBuilderBuild({
    projectId: input.projectId,
    userId: input.userId,
    jobId: input.jobId,
    locale: input.locale,
    spec: input.spec,
    byKey,
  });

  const job = await prisma.buildJob.findUnique({ where: { id: input.jobId } });
  if (job?.status === "COMPLETED") {
    await incrementUsage(input.userId, "aiRequests");
  }
}

export async function startEditJob(input: {
  projectId: string;
  userId: string;
  prompt: string;
  componentId?: string;
  pageSlug?: string;
  locale: "HE" | "EN";
}) {
  const busy = await hasActiveJob(input.projectId);
  if (busy) throw new Error("JOB_IN_PROGRESS");

  const he = input.locale === "HE";
  const job = await prisma.buildJob.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      kind: "EDIT",
      status: "RUNNING",
      prompt: input.prompt,
    },
  });

  await prisma.buildTask.createMany({
    data: EDIT_TASKS.map((t, i) => ({
      jobId: job.id,
      projectId: input.projectId,
      key: t.key,
      title: he ? t.titleHe : t.titleEn,
      description: he ? t.descriptionHe : t.descriptionEn,
      sortOrder: i,
      status: "PENDING",
    })),
  });

  await addChatMessage({
    projectId: input.projectId,
    jobId: job.id,
    role: "user",
    kind: "USER",
    content: input.componentId
      ? `[${input.pageSlug ?? "page"} / ${input.componentId}] ${input.prompt}`
      : input.prompt,
    payload: { componentId: input.componentId, pageSlug: input.pageSlug },
  });
  await addChatMessage({
    projectId: input.projectId,
    jobId: job.id,
    role: "assistant",
    kind: "ASSISTANT",
    content: he
      ? "הבנתי. אני בודק את המבנה הקיים ומתכנן שינוי ממוקד."
      : "Got it. I am inspecting the current project and planning a targeted change.",
  });

  runEditJob(input, job.id).catch((err) => console.error("edit job failed", err));
  return job.id;
}

async function runEditJob(
  input: {
    projectId: string;
    userId: string;
    prompt: string;
    componentId?: string;
    pageSlug?: string;
    locale: "HE" | "EN";
  },
  jobId: string
) {
  if (await cancelled(jobId)) {
    await updateJob(jobId, { status: "CANCELLED", completedAt: new Date() });
    return;
  }

  const tasks = await prisma.buildTask.findMany({ where: { jobId }, orderBy: { sortOrder: "asc" } });
  const byKey = Object.fromEntries(tasks.map((t) => [t.key, t]));

  await runBuilderEdit({
    projectId: input.projectId,
    userId: input.userId,
    jobId,
    locale: input.locale,
    prompt: input.prompt,
    componentId: input.componentId,
    pageSlug: input.pageSlug,
    byKey,
  });

  const job = await prisma.buildJob.findUnique({ where: { id: jobId } });
  if (job?.status === "COMPLETED") {
    await incrementUsage(input.userId, "aiRequests");
  }
}

export async function requestStop(projectId: string, userId: string) {
  void userId;
  const job = await prisma.buildJob.findFirst({
    where: { projectId, status: { in: ["PLANNING", "RUNNING"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!job) return null;
  await prisma.buildJob.update({
    where: { id: job.id },
    data: { cancelRequested: true },
  });
  emitWorkspace(projectId, "job", { id: job.id, cancelRequested: true });
  await addChatMessage({
    projectId,
    jobId: job.id,
    role: "system",
    kind: "SYSTEM",
    content: "Stop requested — finishing the current safe step.",
  });
  return job.id;
}

export async function applyStyle(projectId: string, userId: string, themeId: string, locale: "HE" | "EN") {
  void userId;
  const job = await prisma.buildJob.findFirst({
    where: { projectId, kind: "PLAN", status: "AWAITING_APPROVAL" },
    orderBy: { createdAt: "desc" },
  });
  if (!job?.spec) throw new Error("PLAN_NOT_FOUND");
  const spec = job.spec as unknown as BuildSpec;
  const option = spec.visual.designOptions.find((d) => d.id === themeId);
  if (!option) throw new Error("STYLE_NOT_FOUND");
  spec.visual.primaryColor = option.primaryColor;
  spec.visual.style = option.style;
  await prisma.buildJob.update({ where: { id: job.id }, data: { spec: spec as object } });
  await addChatMessage({
    projectId,
    jobId: job.id,
    role: "assistant",
    kind: "PLAN",
    content: locale === "HE" ? `עודכן סגנון: ${option.name}` : `Style updated: ${option.name}`,
    payload: JSON.parse(JSON.stringify(spec)),
  });
  return spec;
}
