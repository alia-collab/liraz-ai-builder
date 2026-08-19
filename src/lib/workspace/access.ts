import prisma from "@/lib/db";

export async function requireProjectEditor(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      organization: {
        OR: [
          { ownerId: userId },
          { memberships: { some: { userId, projectRole: { in: ["OWNER", "ADMIN", "EDITOR"] } } } },
        ],
      },
    },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
  });
  return project;
}

export async function requireProjectViewer(userId: string, projectId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      organization: {
        OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
      },
    },
    include: { pages: { orderBy: { sortOrder: "asc" } } },
  });
}
