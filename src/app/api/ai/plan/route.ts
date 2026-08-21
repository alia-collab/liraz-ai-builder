import { NextRequest } from "next/server";
import { planFromPrompt } from "@/lib/ai/pipeline/planner";
import { refineDesignWithClaude } from "@/lib/ai/pipeline/claude-design";
import { isClaudeConfigured } from "@/lib/ai/anthropic-provider";
import {
  AICreditsExhaustedError,
  AI_CREDITS_EXHAUSTED_CODE,
  AI_CREDITS_EXHAUSTED_MESSAGE,
  runClaudeWithCredits,
} from "@/lib/ai-credits";
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
    const { result: design } = await runClaudeWithCredits({
      userId: session.user.id,
      prompt,
      run: async () => {
        const d = await refineDesignWithClaude(spec);
        spec = d.spec;
        return {
          tokensUsed: d.tokensUsed,
          costUsd: d.costUsd,
          model: d.model,
          explanation: `Plan: ${spec.typeLabel}`,
        };
      },
    });
    void design;
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
    if (err instanceof AICreditsExhaustedError) {
      return jsonError(AI_CREDITS_EXHAUSTED_MESSAGE, 402, AI_CREDITS_EXHAUSTED_CODE);
    }
    return jsonError(err instanceof Error ? err.message : "AI planning failed", 502);
  }
}
