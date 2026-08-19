import type { ChatMessageKind, BuildTaskStatus, Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { emitWorkspace } from "./events";

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
  const task = await prisma.buildTask.update({
    where: { id: taskId },
    data: {
      status,
      detail,
      metadata: extra ?? undefined,
      startedAt: status === "RUNNING" ? now : undefined,
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
  { key: "analyzing", titleHe: "ניתוח דרישות", titleEn: "Analyzing requirements", descriptionHe: "מזהה עמודים, משתמשים ופעולות.", descriptionEn: "Detecting pages, users, and actions." },
  { key: "planning", titleHe: "יצירת תוכנית", titleEn: "Creating a plan", descriptionHe: "מכין כרטיס תוכנית לאישור.", descriptionEn: "Preparing a plan card for approval." },
] as const;

export const BUILD_TASKS = [
  { key: "received", titleHe: "הבקשה התקבלה", titleEn: "Request received", descriptionHe: "התוכנית אושרה.", descriptionEn: "The plan was approved." },
  { key: "structure", titleHe: "בניית מבנה", titleEn: "Building structure", descriptionHe: "יוצר ניווט, עמודים ורכיבים.", descriptionEn: "Creating navigation, pages, and components." },
  { key: "design", titleHe: "עיצוב הממשק", titleEn: "Designing the UI", descriptionHe: "מגדיר צבעים, גופנים ומרווחים.", descriptionEn: "Setting colors, fonts, and spacing." },
  { key: "database", titleHe: "מסד הנתונים", titleEn: "Database", descriptionHe: "יוצר אוספים, קשרים והרשאות.", descriptionEn: "Creating collections, relations, and access." },
  { key: "auth", titleHe: "הרשמה והתחברות", titleEn: "Auth", descriptionHe: "מחבר חשבונות לפי התוכנית.", descriptionEn: "Connecting accounts from the plan." },
  { key: "forms", titleHe: "טפסים וקישורים", titleEn: "Forms and links", descriptionHe: "מוודא שטפסים נשמרים וקישורים חיים.", descriptionEn: "Checking forms save and links resolve." },
  { key: "mobile", titleHe: "התאמה למובייל", titleEn: "Mobile layout", descriptionHe: "בודק תצוגה לטלפון.", descriptionEn: "Checking phone layout." },
  { key: "testing", titleHe: "בדיקות סופיות", titleEn: "Final checks", descriptionHe: "בדיקות אמיתיות על המבנה.", descriptionEn: "Real checks against the snapshot." },
  { key: "preview", titleHe: "תצוגה מקדימה", titleEn: "Preview ready", descriptionHe: "מעדכן את התצוגה המקדימה.", descriptionEn: "Refreshing the live preview." },
] as const;

export const EDIT_TASKS = [
  { key: "received", titleHe: "הבקשה התקבלה", titleEn: "Request received", descriptionHe: "השינוי נקלט.", descriptionEn: "The change was received." },
  { key: "analyzing", titleHe: "ניתוח השינוי", titleEn: "Analyzing the change", descriptionHe: "מזהה עמוד ורכיב.", descriptionEn: "Identifying page and component." },
  { key: "structure", titleHe: "החלת השינוי", titleEn: "Applying the change", descriptionHe: "מעדכן רק את החלקים הרלוונטיים.", descriptionEn: "Updating only related parts." },
  { key: "testing", titleHe: "בדיקה", titleEn: "Testing", descriptionHe: "מוודא שהשינוי לא שבר קישורים או טפסים.", descriptionEn: "Ensuring links and forms still work." },
  { key: "preview", titleHe: "עדכון תצוגה", titleEn: "Preview update", descriptionHe: "מרענן את התצוגה המקדימה.", descriptionEn: "Refreshing preview." },
] as const;
