import { NextRequest } from "next/server";
import { planFromPrompt } from "@/lib/ai/pipeline/planner";
import { refineDesignWithClaude } from "@/lib/ai/pipeline/claude-design";
import { isClaudeConfigured } from "@/lib/ai/anthropic-provider";
import { createAnthropicAIRequest } from "@/lib/ai/log-request";
import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import { checkQuota, incrementUsage } from "@/lib/quotas";

export async function POST(request: NextRequest) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;

  if (!isClaudeConfigured()) {
    return jsonError("ANTHROPIC_API_KEY is required for AI planning", 503);
  }

  const quota = await checkQuota(session.user.id, "aiRequests");
  if (!quota.allowed) return jsonError("AI usage limit reached", 429);

  const body = (await request.json().catch(() => ({}))) as {
    prompt?: unknown;
    projectType?: unknown;
  };
  const prompt = String(body.prompt ?? "").trim();
  if (prompt.length < 2) {
    return jsonError("כתבי מה תרצו לבנות.", 400);
  }

  try {
    let spec = planFromPrompt(prompt, body.projectType ? String(body.projectType) : undefined);
    const design = await refineDesignWithClaude(spec);
    spec = design.spec;

    await createAnthropicAIRequest({
      userId: session.user.id,
      prompt,
      status: "COMPLETED",
      response: `Plan: ${spec.typeLabel}`,
      model: design.model,
      tokensUsed: design.tokensUsed,
      costUsd: design.costUsd,
    });
    await incrementUsage(session.user.id, "aiRequests");

    return jsonSuccess({
      spec,
      designer: "claude",
      needsClarification: spec.needsClarification,
      questions: spec.questions,
      typeOptions: spec.typeOptions ?? [],
      productKind: spec.productKind,
      typeLabel: spec.typeLabel,
    });
  } catch (err) {
    await createAnthropicAIRequest({
      userId: session.user.id,
      prompt,
      status: "FAILED",
      errorMessage: err instanceof Error ? err.message : "Anthropic plan failed",
      tokensUsed: 0,
      costUsd: 0,
    });
    return jsonError(err instanceof Error ? err.message : "AI planning failed", 502);
  }
}
