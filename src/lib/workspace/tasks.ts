import type { ChatMessageKind, BuildTaskStatus, Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { emitWorkspace } from "./events";
import { AGENT_BUILD_STAGES, AGENT_EDIT_STAGES, stagesToBuildTasks } from "@/lib/agent/stages";

export async function addChatMessage(input: {
  projectId: string;
  jobId?: string | null;
  role: string;
  kind: ChatMessageKind;
  content: string;
  payload?: Prisma.InputJsonValue;
}) {
  const message = await prisma.projectChatMessage.create({
    data: {
      projectId: input.projectId,
      jobId: input.jobId ?? undefined,
      role: input.role,
      kind: input.kind,
      content: input.content,
      payload: input.payload ?? {},
    },
  });
  emitWorkspace(input.projectId, "message", message);
  return message;
}

export async function setTaskStatus(
  taskId: string,
  status: BuildTaskStatus,
  detail?: string,
  extra?: Prisma.InputJsonValue
) {
  const now = new Date();
  const existing = await prisma.buildTask.findUnique({ where: { id: taskId } });
  const task = await prisma.buildTask.update({
    where: { id: taskId },
    data: {
      status,
      detail,
      metadata: extra ?? undefined,
      startedAt: status === "RUNNING" ? now : existing?.startedAt ?? undefined,
      completedAt: ["COMPLETED", "FAILED", "FIXED", "CANCELLED"].includes(status) ? now : undefined,
    },
  });
  emitWorkspace(task.projectId, "task", task);
  return task;
}

export async function updateJob(
  jobId: string,
  data: Prisma.BuildJobUpdateInput
) {
  const job = await prisma.buildJob.update({ where: { id: jobId }, data });
  emitWorkspace(job.projectId, "job", job);
  return job;
}

export const PLAN_TASKS = [
  { key: "received", titleHe: "הבקשה התקבלה", titleEn: "Request received", descriptionHe: "ההודעה נשמרה.", descriptionEn: "The message was saved." },
  { key: "analyzing", titleHe: "ניתוח דרישות", titleEn: "ANALYZE", descriptionHe: "מזהה עמודים, משתמשים ופעולות.", descriptionEn: "Detecting pages, users, and actions." },
  { key: "planning", titleHe: "יצירת תוכנית", titleEn: "PLAN", descriptionHe: "מכין כרטיס תוכנית לאישור.", descriptionEn: "Preparing a plan card for approval." },
] as const;

/** Full autonomous build stages — streamed via BuildTask. */
export const BUILD_TASKS = stagesToBuildTasks(AGENT_BUILD_STAGES);

/** Autonomous edit stages with project-aware repair. */
export const EDIT_TASKS = stagesToBuildTasks(AGENT_EDIT_STAGES);
