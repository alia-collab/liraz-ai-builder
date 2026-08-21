/**
 * Liraz AI Credits — server-side configuration.
 * 1000 credits = $1.00 Anthropic cost by default.
 * Never expose Anthropic raw pricing to customers via UI.
 */

export const AI_CREDITS_PER_USD = Math.max(
  1,
  Math.floor(Number(process.env.LIRAZ_AI_CREDITS_PER_USD || "1000"))
);

/** Credits reserved before each Claude call (auth hold). */
export const AI_CREDIT_RESERVE_DEFAULT = Math.max(
  1,
  Math.floor(Number(process.env.LIRAZ_AI_CREDIT_RESERVE_DEFAULT || "500"))
);

/** Minutes until an abandoned reservation is auto-releasable. */
export const AI_CREDIT_RESERVE_TTL_MINUTES = Math.max(
  1,
  Math.floor(Number(process.env.LIRAZ_AI_CREDIT_RESERVE_TTL_MINUTES || "15"))
);

/** Pro plan ($35/mo) included credits per billing cycle. */
export const PRO_PLAN_MONTHLY_AI_CREDITS = Math.max(
  0,
  Math.floor(Number(process.env.LIRAZ_AI_CREDITS_PRO_MONTHLY || "8000"))
);

export const DEFAULT_CREDIT_PACKAGES = [
  { slug: "credits-5k", name: "5,000 Credits", credits: 5000, priceUsdCents: 1000, sortOrder: 1 },
  { slug: "credits-15k", name: "15,000 Credits", credits: 15000, priceUsdCents: 2500, sortOrder: 2 },
  { slug: "credits-35k", name: "35,000 Credits", credits: 35000, priceUsdCents: 5000, sortOrder: 3 },
] as const;

export const AI_CREDITS_EXHAUSTED_CODE = "AI_CREDITS_EXHAUSTED";

export const AI_CREDITS_EXHAUSTED_MESSAGE =
  "You've used your available AI Credits. Your included credits will renew on your next billing date, or you can purchase additional credits.";
