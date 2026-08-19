import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import type { ProjectSnapshot } from "@/lib/ai/types";
import { createProjectVersion } from "@/lib/projects";
import { checkQuota, incrementUsage } from "@/lib/quotas";
import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import { applySurgicalEdit, qaSnapshot } from "@/lib/ai/pipeline/qa";
import { readMemory, mergeSettings } from "@/lib/ai/pipeline/memory";

const schema = z.object({
  projectId: z.string(),
  instruction: z.string().min(1).max(2000),
  componentId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input", 400);

  const quota = await checkQuota(session.user.id, "aiRequests");
  if (!quota.allowed) return jsonError("AI usage limit reached", 429);

  const project = await prisma.project.findFirst({
    where: {
      id: parsed.data.projectId,
      organization: {
        OR: [
          { ownerId: session.user.id },
          { memberships: { some: { userId: session.user.id, projectRole: { in: ["OWNER", "ADMIN", "EDITOR"] } } } },
        ],
      },
    },
    include: { pages: true },
  });

  if (!project) return jsonError("Project not found", 404);
  if (project.status === "READ_ONLY") return jsonError("Project is read-only", 403);

  const lastVersion = await prisma.projectVersion.findFirst({
    where: { projectId: project.id },
    orderBy: { version: "desc" },
  });

  const currentSnapshot: ProjectSnapshot = lastVersion?.snapshot
    ? (lastVersion.snapshot as unknown as ProjectSnapshot)
    : {
        name: project.name,
        type: project.type,
        locale: project.locale,
        direction: project.direction,
        theme: {
          primaryColor: "#0f766e",
          fontFamily: "system-ui",
          borderRadius: "0.75rem",
        },
        pages: project.pages.map((p) => ({
          slug: p.slug,
          title: p.title,
          locale: p.locale,
          direction: p.direction,
          components: p.components as unknown as ProjectSnapshot["pages"][0]["components"],
          seo: p.seo as unknown as ProjectSnapshot["pages"][0]["seo"],
        })),
      };

  await createProjectVersion(
    project.id,
    currentSnapshot,
    session.user.id,
    `checkpoint before: ${parsed.data.instruction.slice(0, 40)}`
  );

  const memory = readMemory(project.settings);
  const instruction = parsed.data.componentId
    ? `[component ${parsed.data.componentId}] ${parsed.data.instruction}`
    : parsed.data.instruction;

  const surgical = applySurgicalEdit(currentSnapshot, instruction, parsed.data.componentId);
  let nextSnapshot = surgical.snapshot;

  const provider = await getAIProvider();
  if (provider.type !== "MOCK" && !/צבע|color|כחול|ירוק|אדום|וואטסאפ|whatsapp/.test(instruction.toLowerCase())) {
    try {
      const ai = await provider.editProject(currentSnapshot, instruction, {
        userId: session.user.id,
        projectId: project.id,
        locale: project.locale,
        currentSnapshot,
      });
      nextSnapshot = ai.snapshot;
    } catch {
      nextSnapshot = surgical.snapshot;
    }
  }

  const qa = qaSnapshot(nextSnapshot, project.id);
  if (!qa.passed) {
    return jsonError(`השינוי נחסם בבדיקה: ${qa.errors.join("; ")}`, 422);
  }

  await prisma.page.deleteMany({ where: { projectId: project.id } });
  for (const [index, page] of nextSnapshot.pages.entries()) {
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
        isHomePage: index === 0,
      },
    });
  }

  if (memory) {
    memory.changelog.push({
      at: new Date().toISOString(),
      summary: surgical.summary,
      files: surgical.files,
      by: session.user.id,
    });
    await prisma.project.update({
      where: { id: project.id },
      data: {
        settings: mergeSettings(project.settings as object, memory, nextSnapshot.theme) as object,
      },
    });
  }

  await incrementUsage(session.user.id, "aiRequests");

  return jsonSuccess({
    explanation: surgical.summary,
    qa,
    previewRequired: false,
  });
}
