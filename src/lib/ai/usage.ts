/** Shared Anthropic usage parsing. Never invent tokens. */

export type AnthropicUsage = {
  inputTokens: number;
  outputTokens: number;
  tokensUsed: number;
  costUsd: number;
};

export function estimateAnthropicCostUsd(inputTokens: number, outputTokens: number): number {
  // Claude Sonnet-class approximate public rates (USD per token).
  return inputTokens * 0.000003 + outputTokens * 0.000015;
}

export function parseAnthropicUsage(data: unknown): AnthropicUsage {
  const usage =
    data && typeof data === "object" && "usage" in data
      ? (data as { usage?: Record<string, unknown> }).usage
      : undefined;

  const inputTokens = Number(
    usage?.input_tokens ?? usage?.inputTokens ?? 0
  );
  const outputTokens = Number(
    usage?.output_tokens ?? usage?.outputTokens ?? 0
  );

  const safeIn = Number.isFinite(inputTokens) ? Math.max(0, Math.floor(inputTokens)) : 0;
  const safeOut = Number.isFinite(outputTokens) ? Math.max(0, Math.floor(outputTokens)) : 0;
  const tokensUsed = safeIn + safeOut;
  const costUsd = estimateAnthropicCostUsd(safeIn, safeOut);

  return { inputTokens: safeIn, outputTokens: safeOut, tokensUsed, costUsd };
}

export function logAiUsageDebug(payload: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  tokensUsed: number;
  costUsd: number;
  path: string;
}) {
  console.log("[AI usage]", {
    provider: "ANTHROPIC",
    model: payload.model,
    inputTokens: payload.inputTokens,
    outputTokens: payload.outputTokens,
    tokensUsed: payload.tokensUsed,
    costUsd: payload.costUsd,
    path: payload.path,
  });
}
