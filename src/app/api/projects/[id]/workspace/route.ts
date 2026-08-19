import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import { requireProjectViewer } from "@/lib/workspace/access";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;
  const { id } = await params;
  const project = await requireProjectViewer(session.user.id, id);
  if (!project) return jsonError("Not found", 404);

  const [messages, jobs, tasks, versions] = await Promise.all([
    prisma.projectChatMessage.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    prisma.buildJob.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.buildTask.findMany({
      where: { projectId: id },
      orderBy: [{ createdAt: "desc" }, { sortOrder: "asc" }],
      take: 80,
    }),
    prisma.projectVersion.findMany({
      where: { projectId: id },
      orderBy: { version: "desc" },
      take: 12,
      select: { id: true, version: true, label: true, createdAt: true, isPublished: true },
    }),
  ]);

  const activeJob = jobs.find((j) => ["PENDING", "PLANNING", "RUNNING", "AWAITING_APPROVAL"].includes(j.status)) ?? jobs[0] ?? null;
  const activeTasks = activeJob ? tasks.filter((t) => t.jobId === activeJob.id).sort((a, b) => a.sortOrder - b.sortOrder) : [];

  return jsonSuccess({
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      locale: project.locale,
      direction: project.direction,
      type: project.type,
      settings: project.settings,
      publishedUrl: project.publishedUrl,
      pages: project.pages.map((p) => ({ id: p.id, slug: p.slug, title: p.title, isHomePage: p.isHomePage })),
    },
    messages,
    jobs,
    tasks: activeTasks,
    allTasks: tasks,
    versions,
    activeJob,
  });
}
