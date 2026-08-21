import prisma from "@/lib/db";
import type { AIRequestStatus } from "@prisma/client";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export function anthropicModelName() {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

export async function createAnthropicAIRequest(input: {
  userId: string;
  projectId?: string | null;
  prompt: string;
  status: AIRequestStatus;
  response?: string | null;
  errorMessage?: string | null;
  tokensUsed?: number;
  costUsd?: number;
  model?: string;
  completedAt?: Date | null;
}) {
  const tokensUsed = Math.max(0, Math.floor(Number(input.tokensUsed ?? 0)));
  const costUsd = Number.isFinite(Number(input.costUsd)) ? Number(input.costUsd) : 0;

  return prisma.aIRequest.create({
    data: {
      userId: input.userId,
      projectId: input.projectId ?? undefined,
      provider: "ANTHROPIC",
      model: input.model || anthropicModelName(),
      prompt: input.prompt,
      status: input.status,
      response: input.response ?? undefined,
      errorMessage: input.errorMessage ?? undefined,
      tokensUsed,
      costUsd,
      completedAt:
        input.completedAt === null
          ? undefined
          : input.completedAt ?? (input.status === "COMPLETED" || input.status === "FAILED" ? new Date() : undefined),
    },
  });
}
