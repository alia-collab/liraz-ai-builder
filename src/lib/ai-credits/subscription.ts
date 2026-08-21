import prisma from "@/lib/db";
import { getPlanAiCreditAllowance, grantMonthlyCredits } from "./ledger";

/** Grant/renew monthly credits after PayPal activate or renew (idempotent). */
export async function grantCreditsForSubscription(subscriptionId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!sub) return { granted: false, alreadyGranted: false };
  if (!["ACTIVE", "TRIALING"].includes(sub.status)) {
    return { granted: false, alreadyGranted: false };
  }

  const periodStart = sub.currentPeriodStart ?? sub.createdAt;
  const periodEnd =
    sub.currentPeriodEnd ?? new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
  const allowance = getPlanAiCreditAllowance(sub.plan.quotas);

  return grantMonthlyCredits({
    userId: sub.userId,
    subscriptionId: sub.id,
    periodStart,
    periodEnd,
    allowance,
  });
}
