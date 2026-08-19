import { NextRequest } from "next/server";
import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import { publishProject } from "@/lib/deploy";
import { checkQuota, incrementUsage } from "@/lib/quotas";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
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
    include: { pages: { orderBy: { sortOrder: "asc" } } },
  });

  if (!project) return jsonError("Project not found", 404);
  return jsonSuccess({ project });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;

  const { id } = await params;
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "publish") {
    const quota = await checkQuota(session.user.id, "deployments");
    if (!quota.allowed) return jsonError("Deployment limit reached", 429);

    try {
      const result = await publishProject(id, session.user.id);
      await incrementUsage(session.user.id, "deployments");
      await createAuditLog({
        userId: session.user.id,
        action: "PROJECT_PUBLISHED",
        targetType: "Project",
        targetId: id,
        metadata: { url: result.url },
      });
      return jsonSuccess({ url: result.url, subdomain: result.subdomain, deploymentId: result.deployment.id });
    } catch (err) {
      return jsonError(err instanceof Error ? err.message : "Publish failed", 400);
    }
  }

  return jsonError("Unknown action", 400);
}
