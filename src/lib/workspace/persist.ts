import prisma from "@/lib/db";
import type { ProjectSnapshot } from "@/lib/ai/types";
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import { mergeSettings } from "@/lib/ai/pipeline/memory";
import type { ProjectMemory } from "@/lib/ai/pipeline/types";
import type { ProjectType } from "@prisma/client";

export async function writeSnapshotToProject(
  projectId: string,
  snapshot: ProjectSnapshot,
  spec: BuildSpec,
  memory: ProjectMemory
) {
  await prisma.page.deleteMany({ where: { projectId } });
  for (const [index, page] of snapshot.pages.entries()) {
    await prisma.page.create({
      data: {
        projectId,
        slug: page.slug,
        title: page.title,
        locale: page.locale,
        direction: page.direction,
        components: page.components as object[],
        seo: page.seo as object,
        sortOrder: index,
        isHomePage: page.slug === "home",
      },
    });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      name: snapshot.name,
      description: snapshot.description,
      type: snapshot.type as ProjectType,
      locale: snapshot.locale,
      direction: snapshot.direction,
      settings: mergeSettings({}, memory, snapshot.theme) as object,
    },
  });
}

export async function currentSnapshotFromProject(projectId: string): Promise<ProjectSnapshot | null> {
  const lastVersion = await prisma.projectVersion.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
  });
  if (lastVersion?.snapshot) return lastVersion.snapshot as unknown as ProjectSnapshot;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
  });
  if (!project) return null;
  return {
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
}
