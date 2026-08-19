import { NextRequest } from "next/server";
import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import { checkQuota } from "@/lib/quotas";
import { requireProjectEditor } from "@/lib/workspace/access";
import { startPlanJob, startEditJob } from "@/lib/workspace/orchestrator";
import { readMemory } from "@/lib/ai/pipeline/memory";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;

  const quota = await checkQuota(session.user.id, "aiRequests");
  if (!quota.allowed) return jsonError("AI usage limit reached", 429);

  const { id } = await params;
  const project = await requireProjectEditor(session.user.id, id);
  if (!project) return jsonError("Not found", 404);
  if (project.status === "READ_ONLY") return jsonError("Project is read-only", 403);

  const body = (await request.json().catch(() => ({}))) as {
    prompt?: string;
    componentId?: string;
    pageSlug?: string;
    projectType?: string;
    forcePlan?: boolean;
  };
  const prompt = String(body.prompt ?? "").trim();
  if (prompt.length < 2) return jsonError("כתבו מה תרצו לבנות או לשנות.", 400);

  const locale = project.locale === "EN" ? "EN" : "HE";
  const memory = readMemory(project.settings);
  const empty = project.pages.length === 0;
  const shouldPlan = Boolean(body.forcePlan || empty || !memory?.spec || /תבנה|build me|אתר חדש|from scratch/.test(prompt.toLowerCase()));

  try {
    if (shouldPlan && !body.componentId) {
      const jobId = await startPlanJob({
        projectId: id,
        userId: session.user.id,
        prompt,
        projectType: body.projectType,
        locale,
      });
      return jsonSuccess({ jobId, mode: "plan" }, 202);
    }
    const jobId = await startEditJob({
      projectId: id,
      userId: session.user.id,
      prompt,
      componentId: body.componentId,
      pageSlug: body.pageSlug,
      locale,
    });
    return jsonSuccess({ jobId, mode: "edit" }, 202);
  } catch (err) {
    if (err instanceof Error && err.message === "JOB_IN_PROGRESS") {
      return jsonError("פעולה כבר רצה. עצרו אותה או המתינו.", 409);
    }
    return jsonError(err instanceof Error ? err.message : "Failed", 400);
  }
}
