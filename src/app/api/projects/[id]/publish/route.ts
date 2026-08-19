import { NextRequest } from "next/server";
import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import { publishProject } from "@/lib/deploy";
import { checkQuota, incrementUsage } from "@/lib/quotas";
import { createAuditLog } from "@/lib/audit";
import { publishReadiness } from "@/lib/runtime/publish-readiness";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;

  const { id } = await params;
  const quota = await checkQuota(session.user.id, "deployments");
  if (!quota.allowed) return jsonError("Deployment limit reached", 429);

  const ready = await publishReadiness(id);
  if (!ready.ok) {
    return jsonError(`Cannot publish: ${ready.errors.join("; ")}`, 422);
  }

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
    return jsonSuccess({
      url: result.url,
      subdomain: result.subdomain,
      deploymentId: result.deployment.id,
      warnings: ready.warnings,
    });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Publish failed", 400);
  }
}
