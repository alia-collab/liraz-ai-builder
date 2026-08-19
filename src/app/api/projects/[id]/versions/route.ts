import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import prisma from "@/lib/db";
import { createProjectVersion } from "@/lib/projects";
import { currentSnapshotFromProject } from "@/lib/workspace/persist";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: {
      id,
      organization: {
        OR: [
          { ownerId: session.user.id },
          { memberships: { some: { userId: session.user.id } } },
        ],
      },
    },
  });

  if (!project) return jsonError("Project not found", 404);

  const versions = await prisma.projectVersion.findMany({
    where: { projectId: id },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      label: true,
      description: true,
      createdBy: true,
      isPublished: true,
      createdAt: true,
    },
  });

  return jsonSuccess({ versions });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;
  const { id } = await params;

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

  const snapshot = await currentSnapshotFromProject(id);
  if (!snapshot) return jsonError("Nothing to save", 400);
  const version = await createProjectVersion(id, snapshot, session.user.id, "Saved version");
  return jsonSuccess({ version: { id: version.id, version: version.version } }, 201);
}
