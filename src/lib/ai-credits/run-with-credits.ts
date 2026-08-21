import {
  AICreditsExhaustedError,
  finalizeAICredits,
  releaseReservation,
  reserveCredits,
  costUsdToCredits,
} from "@/lib/ai-credits";
import { createAnthropicAIRequest, anthropicModelName } from "@/lib/ai/log-request";
import type { AIRequestStatus } from "@prisma/client";

type ClaudeResult = {
  tokensUsed: number;
  costUsd: number;
  model?: string;
  explanation?: string | null;
};

/**
 * Reserve credits → run Claude → log AIRequest → settle usage.
 * Failed Claude calls release the reservation and do not charge AI_USAGE.
 */
export async function runClaudeWithCredits<T extends ClaudeResult>(input: {
  userId: string;
  projectId?: string | null;
  prompt: string;
  run: () => Promise<T>;
  onSuccessLog?: (result: T) => {
    status?: AIRequestStatus;
    response?: string | null;
    errorMessage?: string | null;
  };
}): Promise<{ result: T; aiRequestId: string; creditsUsed: number }> {
  const { reservationId } = await reserveCredits(input.userId);

  try {
    const result = await input.run();
    const creditsUsed = costUsdToCredits(result.costUsd);
    const log = input.onSuccessLog?.(result) ?? {};

    const aiRequest = await createAnthropicAIRequest({
      userId: input.userId,
      projectId: input.projectId,
      prompt: input.prompt,
      status: log.status ?? "COMPLETED",
      response: log.response ?? result.explanation ?? null,
      errorMessage: log.errorMessage ?? null,
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
      creditsUsed,
      model: result.model || anthropicModelName(),
    });

    await finalizeAICredits({
      reservationId,
      costUsd: result.costUsd,
      aiRequestId: aiRequest.id,
    });

    return { result, aiRequestId: aiRequest.id, creditsUsed };
  } catch (err) {
    await releaseReservation(
      reservationId,
      err instanceof Error ? err.message : "Claude request failed"
    );

    if (!(err instanceof AICreditsExhaustedError)) {
      await createAnthropicAIRequest({
        userId: input.userId,
        projectId: input.projectId,
        prompt: input.prompt,
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : "Claude request failed",
        tokensUsed: 0,
        costUsd: 0,
        creditsUsed: 0,
      });
    }

    throw err;
  }
}

export { AICreditsExhaustedError };
