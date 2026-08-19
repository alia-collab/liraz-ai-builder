import { requireApiAuth, jsonSuccess } from "@/lib/api/helpers";
import prisma from "@/lib/db";

export async function GET() {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;

  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      organization: {
        OR: [
          { ownerId: session.user.id },
          { memberships: { some: { userId: session.user.id } } },
        ],
      },
    },
    include: {
      _count: { select: { pages: true, deployments: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return jsonSuccess({ projects });
}
