import prisma from "@/lib/db";
import { planFromPrompt } from "@/lib/ai/pipeline/planner";
import { refineDesignWithClaude } from "@/lib/ai/pipeline/claude-design";
import { buildSnapshotFromSpec } from "@/lib/ai/pipeline/blueprint";
import { qaSnapshot, applySurgicalEdit } from "@/lib/ai/pipeline/qa";
import { emptyMemory } from "@/lib/ai/pipeline/memory";
import { getAIProvider } from "@/lib/ai";
import { createProjectVersion } from "@/lib/projects";
import { incrementUsage } from "@/lib/quotas";
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import { addChatMessage, setTaskStatus, updateJob, PLAN_TASKS, BUILD_TASKS, EDIT_TASKS } from "./tasks";
import { writeSnapshotToProject, currentSnapshotFromProject } from "./persist";
import { emitWorkspace } from "./events";
import { seedAppData } from "@/lib/runtime/seed";

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
    content: he ? "הבנתי. אני מנתח את הבקשה ומכין תוכנית בנייה." : "Got it. I am analyzing the request and preparing a build plan.",
  });
  await addChatMessage({
    projectId: input.projectId,
    jobId: job.id,
    role: "assistant",
    kind: "ACTIVITY",
    content: he ? "אני מזהה את העמודים, המשתמשים והפעולות הנדרשות." : "I am identifying the pages, users, and required actions.",
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
    spec = await refineDesignWithClaude(spec);

    if (analyzing) await setTaskStatus(analyzing.id, "COMPLETED", spec.typeLabel);
    const planning = await prisma.buildTask.findFirst({ where: { jobId: job.id, key: "planning" } });
    if (planning) await setTaskStatus(planning.id, "RUNNING");

    await prisma.buildJob.update({
      where: { id: job.id },
      data: { spec: spec as object, status: "AWAITING_APPROVAL" },
    });

    if (planning) await setTaskStatus(planning.id, "NEEDS_APPROVAL", he ? "ממתין לאישור התוכנית" : "Waiting for plan approval");

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
    await failJob(job.id, input.projectId, he ? "הניתוח נכשל. אפשר לנסות לתקן." : "Analysis failed. You can try to fix it.");
    throw err;
  }
}

export async function startBuildFromPlan(input: { projectId: string; userId: string; jobId: string; locale: "HE" | "EN" }) {
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
      status: i === 0 ? "COMPLETED" : "PENDING",
      startedAt: i === 0 ? new Date() : undefined,
      completedAt: i === 0 ? new Date() : undefined,
    })),
  });

  await addChatMessage({
    projectId: input.projectId,
    jobId: job.id,
    role: "assistant",
    kind: "ACTIVITY",
    content: he ? "יוצר את הניווט, העמודים והרכיבים הראשיים." : "Creating navigation, pages, and main components.",
    payload: { key: "structure", status: "RUNNING" },
  });

  runBuildJob({ ...input, jobId: job.id, spec }).catch((err) => {
    console.error("build job failed", err);
  });

  return job.id;
}

async function runBuildJob(input: { projectId: string; userId: string; jobId: string; locale: "HE" | "EN"; spec: BuildSpec }) {
  const he = input.locale === "HE";
  const tasks = await prisma.buildTask.findMany({ where: { jobId: input.jobId }, orderBy: { sortOrder: "asc" } });
  const byKey = Object.fromEntries(tasks.map((t) => [t.key, t]));

  const mark = async (key: string, status: "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED", detail?: string) => {
    const t = byKey[key];
    if (t) await setTaskStatus(t.id, status, detail);
  };

  try {
    const previous = await currentSnapshotFromProject(input.projectId);
    if (previous && previous.pages.length > 0) {
      await createProjectVersion(input.projectId, previous, input.userId, "checkpoint before build");
    }

    if (await cancelled(input.jobId)) {
      for (const t of tasks) if (t.status === "PENDING" || t.status === "RUNNING") await setTaskStatus(t.id, "CANCELLED");
      await updateJob(input.jobId, { status: "CANCELLED", completedAt: new Date() });
      return;
    }

    await mark("structure", "RUNNING");
    const snapshot = buildSnapshotFromSpec(input.spec, input.projectId);
    const memory = emptyMemory(input.spec);
    await writeSnapshotToProject(input.projectId, snapshot, input.spec, memory);
    await mark("structure", "COMPLETED", `${snapshot.pages.length} pages`);
    await addChatMessage({
      projectId: input.projectId,
      jobId: input.jobId,
      role: "assistant",
      kind: "FILES",
      content: he ? `${snapshot.pages.length} קבצים עודכנו` : `${snapshot.pages.length} files updated`,
      payload: {
        files: snapshot.pages.map((p) => ({ name: `pages/${p.slug}`, action: "created", page: p.title, summary: p.seo?.description ?? p.title })),
      },
    });
    emitWorkspace(input.projectId, "preview", { path: `/preview/${input.projectId}/home` });

    if (await cancelled(input.jobId)) {
      await updateJob(input.jobId, { status: "CANCELLED", completedAt: new Date() });
      return;
    }

    await mark("design", "RUNNING");
    await addChatMessage({
      projectId: input.projectId,
      jobId: input.jobId,
      role: "assistant",
      kind: "ACTIVITY",
      content: he ? "מגדיר צבעים, גופנים, כפתורים ומרווחים אחידים." : "Setting colors, fonts, buttons, and spacing.",
      payload: { key: "design", status: "RUNNING" },
    });
    await mark("design", "COMPLETED", input.spec.visual.style);

    await mark("database", "RUNNING");
    await addChatMessage({
      projectId: input.projectId,
      jobId: input.jobId,
      role: "assistant",
      kind: "ACTIVITY",
      content: he ? "יוצר טבלאות, קשרים והרשאות גישה." : "Creating tables, relations, and access rules.",
      payload: { key: "database", status: "RUNNING" },
    });
    await seedAppData(input.projectId, input.spec);
    await mark("database", "COMPLETED", input.spec.dataModel.map((t) => t.name).join(", "));

    await mark("auth", "RUNNING");
    await mark("auth", "COMPLETED", input.spec.integrations.auth ? (he ? "עמודי התחברות נוצרו" : "Auth pages created") : (he ? "לא נדרש בתוכנית" : "Not in this plan"));

    await mark("forms", "RUNNING");
    await mark("forms", "COMPLETED", he ? "טפסי פנייה שומרים למסד" : "Lead forms persist");

    await mark("mobile", "RUNNING");
    await mark("mobile", "COMPLETED", he ? "פריסה רספונסיבית" : "Responsive layout");

    await mark("testing", "RUNNING");
    await addChatMessage({
      projectId: input.projectId,
      jobId: input.jobId,
      role: "assistant",
      kind: "ACTIVITY",
      content: he ? "בודק טפסים, קישורים, התחברות והתאמה למובייל." : "Checking forms, links, auth, and mobile.",
      payload: { key: "testing", status: "RUNNING" },
    });
    const qa = qaSnapshot(snapshot, input.projectId, input.spec);
    memory.qa = qa;
    memory.buildLog = BUILD_TASKS.map((s) => ({
      stage: s.key,
      status: s.key === "testing" && !qa.passed ? "failed" : "done",
      detail: s.key === "testing" ? (qa.passed ? "QA passed" : qa.errors.join("; ")) : "ok",
    }));
    await writeSnapshotToProject(input.projectId, snapshot, input.spec, memory);
    await createProjectVersion(input.projectId, snapshot, input.userId, "Build");

    if (!qa.passed) {
      await mark("testing", "FAILED", qa.errors.join("; "));
      await failJob(input.jobId, input.projectId, he ? `בדיקות קריטיות נכשלו: ${qa.errors.join("; ")}` : `Critical checks failed: ${qa.errors.join("; ")}`);
      return;
    }
    await mark("testing", "COMPLETED", he ? `${qa.errors.length} שגיאות, ${qa.warnings.length} אזהרות` : `${qa.errors.length} errors, ${qa.warnings.length} warnings`);

    await mark("preview", "RUNNING");
    await mark("preview", "COMPLETED");
    emitWorkspace(input.projectId, "preview", { path: `/preview/${input.projectId}/home` });

    const setupNeeded = input.spec.needsSetup.filter((s) => s.status === "needed");
    await addChatMessage({
      projectId: input.projectId,
      jobId: input.jobId,
      role: "assistant",
      kind: "READY",
      content: he ? "הפרויקט מוכן" : "The project is ready",
        payload: JSON.parse(JSON.stringify({
          pages: snapshot.pages.length,
          functions: input.spec.actions,
          testsPassed: qa.passed,
          testsWarnings: qa.warnings.length,
          issuesFixed: 0,
          needsSetup: setupNeeded,
          qa,
        })),
    });

    await updateJob(input.jobId, {
      status: "COMPLETED",
      completedAt: new Date(),
      result: { qa, pages: snapshot.pages.length } as object,
    });
    await incrementUsage(input.userId, "aiRequests");
  } catch (err) {
    await failJob(input.jobId, input.projectId, err instanceof Error ? err.message : "Build failed");
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
    content: input.componentId ? `[${input.pageSlug ?? "page"} / ${input.componentId}] ${input.prompt}` : input.prompt,
    payload: { componentId: input.componentId, pageSlug: input.pageSlug },
  });
  await addChatMessage({
    projectId: input.projectId,
    jobId: job.id,
    role: "assistant",
    kind: "ASSISTANT",
    content: he ? "הבנתי. אני מנתח את הבקשה ומכין תוכנית בנייה." : "Got it. I am analyzing the request and preparing a build plan.",
  });

  runEditJob(input, job.id).catch((err) => console.error("edit job failed", err));
  return job.id;
}

async function runEditJob(
  input: { projectId: string; userId: string; prompt: string; componentId?: string; pageSlug?: string; locale: "HE" | "EN" },
  jobId: string
) {
  const he = input.locale === "HE";
  const tasks = await prisma.buildTask.findMany({ where: { jobId }, orderBy: { sortOrder: "asc" } });
  const byKey = Object.fromEntries(tasks.map((t) => [t.key, t]));
  const mark = async (key: string, status: "RUNNING" | "COMPLETED" | "FAILED", detail?: string) => {
    const t = byKey[key];
    if (t) await setTaskStatus(t.id, status, detail);
  };

  try {
    await mark("analyzing", "RUNNING");
    const current = await currentSnapshotFromProject(input.projectId);
    if (!current) throw new Error("No snapshot");
    await createProjectVersion(input.projectId, current, input.userId, `checkpoint before: ${input.prompt.slice(0, 40)}`);
    await mark("analyzing", "COMPLETED");

    if (await cancelled(jobId)) {
      await updateJob(jobId, { status: "CANCELLED", completedAt: new Date() });
      return;
    }

    await mark("structure", "RUNNING");
    const instruction = input.componentId ? `[component ${input.componentId}] ${input.prompt}` : input.prompt;
    const surgical = applySurgicalEdit(current, instruction, input.componentId);
    let next = surgical.snapshot;

    const provider = await getAIProvider();
    if (!input.componentId && !/צבע|color|כחול|ירוק|אדום|וואטסאפ|whatsapp/.test(input.prompt.toLowerCase())) {
      try {
        const ai = await provider.editProject(current, instruction, {
          userId: input.userId,
          projectId: input.projectId,
          locale: current.locale,
          currentSnapshot: current,
        });
        next = ai.snapshot;
      } catch {
        next = surgical.snapshot;
      }
    }

    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    const spec = ((project?.settings as { spec?: BuildSpec } | null)?.spec) ?? undefined;
    const qa = qaSnapshot(next, input.projectId, spec);
    if (!qa.passed) {
      await mark("testing", "FAILED", qa.errors.join("; "));
      await failJob(jobId, input.projectId, he ? `השינוי נחסם בבדיקה: ${qa.errors.join("; ")}` : `Change blocked: ${qa.errors.join("; ")}`);
      return;
    }

    const memory = emptyMemory(spec ?? planFromPrompt(input.prompt));
    memory.qa = qa;
    memory.changelog.push({
      at: new Date().toISOString(),
      summary: surgical.summary,
      files: surgical.files,
      by: input.userId,
    });
    await writeSnapshotToProject(input.projectId, next, spec ?? planFromPrompt(input.prompt), memory);
    await mark("structure", "COMPLETED", surgical.summary);
    await mark("testing", "RUNNING");
    await mark("testing", "COMPLETED");
    await mark("preview", "COMPLETED");

    await addChatMessage({
      projectId: input.projectId,
      jobId,
      role: "assistant",
      kind: "FILES",
      content: he ? `${surgical.files.length} קבצים עודכנו` : `${surgical.files.length} files updated`,
      payload: {
        files: surgical.files.map((name) => ({
          name,
          action: "updated",
          page: input.pageSlug ?? null,
          summary: surgical.summary,
        })),
        technical: surgical.summary,
      },
    });
    emitWorkspace(input.projectId, "preview", { path: `/preview/${input.projectId}/${input.pageSlug ?? "home"}` });
    await updateJob(jobId, { status: "COMPLETED", completedAt: new Date(), result: { qa } as object });
    await incrementUsage(input.userId, "aiRequests");
  } catch (err) {
    await failJob(jobId, input.projectId, err instanceof Error ? err.message : "Edit failed");
  }
}

export async function requestStop(projectId: string, userId: string) {
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
