import prisma from "@/lib/db";
import { creditWarningLevel } from "./math";
import { ensureSubscriptionCredits, getCreditBalance } from "./ledger";

/** Customer-safe credit summary — never includes costUsd / Anthropic pricing. */
export async function getCustomerCreditSummary(userId: string) {
  await ensureSubscriptionCredits(userId);
  const balance = await getCreditBalance(userId);

  const recent = await prisma.aICreditTransaction.findMany({
    where: {
      userId,
      type: { in: ["AI_USAGE", "MONTHLY_GRANT", "PURCHASE", "REFUND", "ADMIN_ADJUSTMENT"] },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      type: true,
      amount: true,
      description: true,
      createdAt: true,
    },
  });

  const packages = await prisma.aICreditPackage.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      credits: true,
      priceUsdCents: true,
    },
  });

  const allowance = balance.cycleAllowance || balance.subscriptionCredits + balance.cycleUsed;
  const remainingDisplay = balance.remaining;
  const usedThisCycle = balance.cycleUsed;
  const warning = creditWarningLevel(remainingDisplay, Math.max(allowance, 1));

  return {
    brandName: "Liraz AI Credits",
    remaining: remainingDisplay,
    allowance,
    usedThisCycle,
    subscriptionCredits: balance.subscriptionCredits,
    purchasedCredits: balance.purchasedCredits,
    nextRenewalAt: balance.nextRenewalAt?.toISOString() ?? null,
    warning,
    packages,
    history: recent.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}
