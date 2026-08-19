import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { getApiSession } from "@/lib/api/helpers";
import { jsonError, jsonSuccess } from "@/lib/api/helpers";

type RouteParams = { params: Promise<{ projectId: string; pageSlug: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { projectId, pageSlug } = await params;
  const session = await getApiSession();

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
  });
  if (!project) return jsonError("Not found", 404);

  const isOwner = session?.user?.id
    ? await prisma.project.findFirst({
        where: {
          id: projectId,
          organization: {
            OR: [
              { ownerId: session.user.id },
              { memberships: { some: { userId: session.user.id } } },
            ],
          },
        },
        select: { id: true },
      })
    : null;

  if (project.status === "DRAFT" && !isOwner) {
    return jsonError("Unauthorized", 401);
  }

  const page = project.pages.find((p) => p.slug === pageSlug) ?? project.pages[0];
  if (!page) return jsonError("Page not found", 404);

  return jsonSuccess({
    project: {
      id: project.id,
      name: project.name,
      locale: project.locale,
      direction: project.direction,
      settings: project.settings,
      pages: project.pages.map((p) => ({ slug: p.slug, title: p.title })),
    },
    page,
  });
}
