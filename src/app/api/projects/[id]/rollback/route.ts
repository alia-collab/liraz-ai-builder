import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import { rollbackProject } from "@/lib/projects";
import prisma from "@/lib/db";

const schema = z.object({ versionId: z.string() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;

  const { id } = await params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("versionId required", 400);

  const project = await prisma.project.findFirst({
    where: {
      id,
      organization: {
        OR: [
          { ownerId: session.user.id },
          { memberships: { some: { userId: session.user.id, projectRole: { in: ["OWNER", "ADMIN", "EDITOR"] } } } },
        ],
      },
    },
  });

  if (!project) return jsonError("Project not found", 404);

  try {
    await rollbackProject(id, parsed.data.versionId, session.user.id);
    return jsonSuccess({ success: true });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Rollback failed", 400);
  }
}
