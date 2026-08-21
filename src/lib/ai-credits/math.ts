import { AI_CREDITS_PER_USD } from "./config";

/** Convert real Anthropic costUsd → integer Liraz AI Credits (ceil). */
export function costUsdToCredits(costUsd: number, creditsPerUsd = AI_CREDITS_PER_USD): number {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return 0;
  return Math.ceil(costUsd * creditsPerUsd);
}

export function availableCredits(input: {
  subscriptionCredits: number;
  purchasedCredits: number;
  reservedCredits: number;
}): number {
  const sub = Math.max(0, Math.floor(input.subscriptionCredits));
  const purchased = Math.max(0, Math.floor(input.purchasedCredits));
  const reserved = Math.max(0, Math.floor(input.reservedCredits));
  return Math.max(0, sub + purchased - reserved);
}

/** Deduct usage: subscription first, then purchased. */
export function splitUsageAcrossBuckets(
  used: number,
  subscriptionCredits: number,
  purchasedCredits: number
): { fromSubscription: number; fromPurchased: number } {
  const need = Math.max(0, Math.floor(used));
  const sub = Math.max(0, Math.floor(subscriptionCredits));
  const purchased = Math.max(0, Math.floor(purchasedCredits));
  const fromSubscription = Math.min(need, sub);
  const fromPurchased = Math.min(need - fromSubscription, purchased);
  return { fromSubscription, fromPurchased };
}

export function monthlyGrantIdempotencyKey(subscriptionId: string, periodStart: Date): string {
  return `MONTHLY_GRANT:${subscriptionId}:${periodStart.toISOString()}`;
}

export function purchaseGrantIdempotencyKey(purchaseId: string): string {
  return `PURCHASE:${purchaseId}`;
}

export function creditWarningLevel(remaining: number, allowance: number): "none" | "low" | "critical" | "empty" {
  if (remaining <= 0) return "empty";
  if (allowance <= 0) return remaining > 0 ? "none" : "empty";
  const pct = remaining / allowance;
  if (pct <= 0.1) return "critical";
  if (pct <= 0.2) return "low";
  return "none";
}
