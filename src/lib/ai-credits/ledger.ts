import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import {
  AI_CREDIT_RESERVE_DEFAULT,
  AI_CREDIT_RESERVE_TTL_MINUTES,
  AI_CREDITS_EXHAUSTED_CODE,
  AI_CREDITS_EXHAUSTED_MESSAGE,
  PRO_PLAN_MONTHLY_AI_CREDITS,
} from "./config";
import {
  availableCredits,
  costUsdToCredits,
  monthlyGrantIdempotencyKey,
  purchaseGrantIdempotencyKey,
  splitUsageAcrossBuckets,
} from "./math";

export class AICreditsExhaustedError extends Error {
  readonly code = AI_CREDITS_EXHAUSTED_CODE;
  constructor(message = AI_CREDITS_EXHAUSTED_MESSAGE) {
    super(message);
    this.name = "AICreditsExhaustedError";
  }
}

async function lockAccount(tx: Prisma.TransactionClient, userId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "AICreditAccount" WHERE "userId" = ${userId} FOR UPDATE
  `;
  return rows[0]?.id ?? null;
}

export async function ensureCreditAccount(userId: string) {
  return prisma.aICreditAccount.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export function getPlanAiCreditAllowance(quotas: unknown): number {
  if (quotas && typeof quotas === "object" && "aiCredits" in quotas) {
    const n = Number((quotas as { aiCredits?: unknown }).aiCredits);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return PRO_PLAN_MONTHLY_AI_CREDITS;
}

export async function getCreditBalance(userId: string) {
  const account = await ensureCreditAccount(userId);
  const remaining = availableCredits(account);
  const allowance = account.cycleAllowance > 0 ? account.cycleAllowance : PRO_PLAN_MONTHLY_AI_CREDITS;
  return {
    account,
    remaining,
    subscriptionCredits: account.subscriptionCredits,
    purchasedCredits: account.purchasedCredits,
    reservedCredits: account.reservedCredits,
    cycleAllowance: allowance,
    cycleUsed: account.cycleUsed,
    nextRenewalAt: account.nextRenewalAt,
  };
}

/**
 * Idempotent monthly subscription grant.
 * Resets subscription bucket only; purchased credits are preserved.
 */
export async function grantMonthlyCredits(input: {
  userId: string;
  subscriptionId: string;
  periodStart: Date;
  periodEnd: Date;
  allowance: number;
}): Promise<{ granted: boolean; alreadyGranted: boolean }> {
  const allowance = Math.max(0, Math.floor(input.allowance));
  const key = monthlyGrantIdempotencyKey(input.subscriptionId, input.periodStart);

  await ensureCreditAccount(input.userId);

  try {
    await prisma.$transaction(async (tx) => {
      await lockAccount(tx, input.userId);
      const existing = await tx.aICreditTransaction.findUnique({ where: { idempotencyKey: key } });
      if (existing) {
        throw new Error("ALREADY_GRANTED");
      }

      const account = await tx.aICreditAccount.findUniqueOrThrow({ where: { userId: input.userId } });

      if (account.subscriptionCredits > 0) {
        await tx.aICreditTransaction.create({
          data: {
            userId: input.userId,
            accountId: account.id,
            type: "EXPIRATION",
            amount: -account.subscriptionCredits,
            bucket: "SUBSCRIPTION",
            description: "Unused subscription credits expired at cycle renewal",
            metadata: { previousCycleKey: account.cycleKey },
          },
        });
      }

      await tx.aICreditTransaction.create({
        data: {
          userId: input.userId,
          accountId: account.id,
          type: "MONTHLY_GRANT",
          amount: allowance,
          bucket: "SUBSCRIPTION",
          description: `Monthly Liraz AI Credits grant (${allowance})`,
          idempotencyKey: key,
          metadata: {
            subscriptionId: input.subscriptionId,
            periodStart: input.periodStart.toISOString(),
            periodEnd: input.periodEnd.toISOString(),
          },
        },
      });

      await tx.aICreditAccount.update({
        where: { id: account.id },
        data: {
          subscriptionCredits: allowance,
          cycleKey: key,
          cycleAllowance: allowance,
          cycleUsed: 0,
          nextRenewalAt: input.periodEnd,
          // purchasedCredits untouched
        },
      });
    });
    return { granted: true, alreadyGranted: false };
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_GRANTED") {
      return { granted: false, alreadyGranted: true };
    }
    // Unique constraint race
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { granted: false, alreadyGranted: true };
    }
    throw err;
  }
}

export async function ensureSubscriptionCredits(userId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "TRIALING"] } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) return null;

  const periodStart = sub.currentPeriodStart ?? sub.createdAt;
  const periodEnd =
    sub.currentPeriodEnd ??
    new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
  const allowance = getPlanAiCreditAllowance(sub.plan.quotas);

  await grantMonthlyCredits({
    userId,
    subscriptionId: sub.id,
    periodStart,
    periodEnd,
    allowance,
  });

  return getCreditBalance(userId);
}

export async function reserveCredits(
  userId: string,
  amount = AI_CREDIT_RESERVE_DEFAULT
): Promise<{ reservationId: string; amount: number }> {
  const reserveAmount = Math.max(1, Math.floor(amount));
  await ensureCreditAccount(userId);
  await ensureSubscriptionCredits(userId);

  return prisma.$transaction(async (tx) => {
    await lockAccount(tx, userId);
    const account = await tx.aICreditAccount.findUniqueOrThrow({ where: { userId } });
    const free = availableCredits(account);
    if (free < 1) {
      throw new AICreditsExhaustedError();
    }
    const hold = Math.min(reserveAmount, free);
    if (hold < 1) {
      throw new AICreditsExhaustedError();
    }

    const expiresAt = new Date(Date.now() + AI_CREDIT_RESERVE_TTL_MINUTES * 60 * 1000);
    const reservation = await tx.aICreditReservation.create({
      data: {
        userId,
        accountId: account.id,
        amount: hold,
        status: "PENDING",
        expiresAt,
      },
    });

    await tx.aICreditTransaction.create({
      data: {
        userId,
        accountId: account.id,
        type: "RESERVATION",
        amount: -hold,
        description: `Reserved ${hold} credits for AI request`,
        reservationId: reservation.id,
        metadata: { hold },
      },
    });

    await tx.aICreditAccount.update({
      where: { id: account.id },
      data: { reservedCredits: account.reservedCredits + hold },
    });

    return { reservationId: reservation.id, amount: hold };
  });
}

export async function releaseReservation(reservationId: string, reason = "Claude request failed") {
  await prisma.$transaction(async (tx) => {
    const reservation = await tx.aICreditReservation.findUnique({ where: { id: reservationId } });
    if (!reservation || reservation.status !== "PENDING") return;

    await lockAccount(tx, reservation.userId);
    const account = await tx.aICreditAccount.findUniqueOrThrow({ where: { id: reservation.accountId } });

    await tx.aICreditReservation.update({
      where: { id: reservationId },
      data: { status: "RELEASED", settledAt: new Date() },
    });

    await tx.aICreditTransaction.create({
      data: {
        userId: reservation.userId,
        accountId: account.id,
        type: "RESERVATION_RELEASE",
        amount: reservation.amount,
        description: reason,
        reservationId,
      },
    });

    await tx.aICreditAccount.update({
      where: { id: account.id },
      data: {
        reservedCredits: Math.max(0, account.reservedCredits - reservation.amount),
      },
    });
  });
}

export async function settleReservation(input: {
  reservationId: string;
  costUsd: number;
  aiRequestId?: string;
}): Promise<{ creditsUsed: number }> {
  const creditsUsed = costUsdToCredits(input.costUsd);

  return prisma.$transaction(async (tx) => {
    const reservation = await tx.aICreditReservation.findUnique({ where: { id: input.reservationId } });
    if (!reservation || reservation.status !== "PENDING") {
      throw new Error("Invalid or already settled reservation");
    }

    await lockAccount(tx, reservation.userId);
    const account = await tx.aICreditAccount.findUniqueOrThrow({ where: { id: reservation.accountId } });

    // Release the hold first
    const reservedAfter = Math.max(0, account.reservedCredits - reservation.amount);

    let sub = account.subscriptionCredits;
    let purchased = account.purchasedCredits;
    let used = creditsUsed;

    // If actual usage exceeds hold, still charge what is available (subscription first)
    const { fromSubscription, fromPurchased } = splitUsageAcrossBuckets(used, sub, purchased);
    const charged = fromSubscription + fromPurchased;
    used = charged;

    sub -= fromSubscription;
    purchased -= fromPurchased;

    if (fromSubscription > 0) {
      await tx.aICreditTransaction.create({
        data: {
          userId: reservation.userId,
          accountId: account.id,
          type: "AI_USAGE",
          amount: -fromSubscription,
          bucket: "SUBSCRIPTION",
          description: `AI usage (−${fromSubscription} subscription credits)`,
          aiRequestId: input.aiRequestId,
          reservationId: reservation.id,
          metadata: { costUsd: input.costUsd, creditsUsed: used },
        },
      });
    }
    if (fromPurchased > 0) {
      await tx.aICreditTransaction.create({
        data: {
          userId: reservation.userId,
          accountId: account.id,
          type: "AI_USAGE",
          amount: -fromPurchased,
          bucket: "PURCHASED",
          description: `AI usage (−${fromPurchased} purchased credits)`,
          aiRequestId: input.aiRequestId,
          reservationId: reservation.id,
          metadata: { costUsd: input.costUsd, creditsUsed: used },
        },
      });
    }

    // Return unused reserved credits (audit)
    const unusedHold = Math.max(0, reservation.amount - used);
    if (unusedHold > 0) {
      await tx.aICreditTransaction.create({
        data: {
          userId: reservation.userId,
          accountId: account.id,
          type: "RESERVATION_RELEASE",
          amount: unusedHold,
          description: `Released unused reservation (${unusedHold})`,
          reservationId: reservation.id,
          aiRequestId: input.aiRequestId,
        },
      });
    }

    await tx.aICreditReservation.update({
      where: { id: reservation.id },
      data: { status: "SETTLED", settledUsed: used, settledAt: new Date() },
    });

    await tx.aICreditAccount.update({
      where: { id: account.id },
      data: {
        subscriptionCredits: Math.max(0, sub),
        purchasedCredits: Math.max(0, purchased),
        reservedCredits: reservedAfter,
        cycleUsed: account.cycleUsed + used,
      },
    });

    if (input.aiRequestId) {
      await tx.aIRequest.update({
        where: { id: input.aiRequestId },
        data: { creditsUsed: used },
      });
    }

    return { creditsUsed: used };
  });
}

/**
 * Grant purchased credits only after verified payment (idempotent).
 */
export async function grantPurchasedCredits(input: {
  userId: string;
  purchaseId: string;
  credits: number;
  description?: string;
}): Promise<{ granted: boolean; alreadyGranted: boolean }> {
  const credits = Math.max(0, Math.floor(input.credits));
  const key = purchaseGrantIdempotencyKey(input.purchaseId);
  await ensureCreditAccount(input.userId);

  try {
    await prisma.$transaction(async (tx) => {
      await lockAccount(tx, input.userId);
      const existing = await tx.aICreditTransaction.findUnique({ where: { idempotencyKey: key } });
      if (existing) throw new Error("ALREADY_GRANTED");

      const account = await tx.aICreditAccount.findUniqueOrThrow({ where: { userId: input.userId } });

      await tx.aICreditTransaction.create({
        data: {
          userId: input.userId,
          accountId: account.id,
          type: "PURCHASE",
          amount: credits,
          bucket: "PURCHASED",
          description: input.description ?? `Purchased ${credits} Liraz AI Credits`,
          purchaseId: input.purchaseId,
          idempotencyKey: key,
        },
      });

      await tx.aICreditAccount.update({
        where: { id: account.id },
        data: { purchasedCredits: account.purchasedCredits + credits },
      });

      await tx.aICreditPurchase.update({
        where: { id: input.purchaseId },
        data: { status: "SUCCEEDED", grantedAt: new Date() },
      });
    });
    return { granted: true, alreadyGranted: false };
  } catch (err) {
    if (err instanceof Error && err.message === "ALREADY_GRANTED") {
      return { granted: false, alreadyGranted: true };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { granted: false, alreadyGranted: true };
    }
    throw err;
  }
}

export async function withAICredits<T extends { costUsd: number; tokensUsed: number }>(
  userId: string,
  run: () => Promise<T>
): Promise<{ result: T; reservationId: string; creditsUsed: number }> {
  const { reservationId } = await reserveCredits(userId);
  try {
    const result = await run();
    return { result, reservationId, creditsUsed: costUsdToCredits(result.costUsd) };
  } catch (err) {
    await releaseReservation(reservationId, err instanceof Error ? err.message : "AI failed");
    throw err;
  }
}

export async function finalizeAICredits(input: {
  reservationId: string;
  costUsd: number;
  aiRequestId?: string;
}) {
  return settleReservation(input);
}
