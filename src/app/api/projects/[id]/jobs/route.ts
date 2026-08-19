import { NextRequest } from "next/server";
import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import { requireProjectEditor } from "@/lib/workspace/access";
import { startBuildFromPlan, requestStop, applyStyle } from "@/lib/workspace/orchestrator";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;
  const { id } = await params;
  const project = await requireProjectEditor(session.user.id, id);
  if (!project) return jsonError("Not found", 404);

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    jobId?: string;
    themeId?: string;
  };
  const locale = project.locale === "EN" ? "EN" : "HE";

  try {
    if (body.action === "stop") {
      const jobId = await requestStop(id, session.user.id);
      return jsonSuccess({ jobId, action: "stop" });
    }
    if (body.action === "start") {
      if (!body.jobId) return jsonError("jobId required", 400);
      const jobId = await startBuildFromPlan({
        projectId: id,
        userId: session.user.id,
        jobId: body.jobId,
        locale,
      });
      return jsonSuccess({ jobId, action: "start" }, 202);
    }
    if (body.action === "style") {
      if (!body.themeId) return jsonError("themeId required", 400);
      const spec = await applyStyle(id, session.user.id, body.themeId, locale);
      return jsonSuccess({ spec, action: "style" });
    }
    return jsonError("Unknown action", 400);
  } catch (err) {
    if (err instanceof Error && err.message === "JOB_IN_PROGRESS") {
      return jsonError("פעולה כבר רצה.", 409);
    }
    return jsonError(err instanceof Error ? err.message : "Failed", 400);
  }
}
