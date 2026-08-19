/** Default platform prices in USD cents. Runtime values come from Plan / SystemSetting. */
export const DEFAULT_MONTHLY_PRICE_CENTS = 3500;
export const DEFAULT_YEARLY_PRICE_CENTS = 42000;

export function centsToPaypalAmount(cents: number): string {
  if (!Number.isFinite(cents) || cents < 0) {
    throw new Error("Invalid amount in cents");
  }
  return (cents / 100).toFixed(2);
}

export function paypalAmountToCents(value: string | number | undefined | null): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? "0"));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function expectedPriceCents(interval: "MONTHLY" | "YEARLY"): number {
  return interval === "YEARLY" ? DEFAULT_YEARLY_PRICE_CENTS : DEFAULT_MONTHLY_PRICE_CENTS;
}

export function mapIntervalFromPaypalPlanId(
  paypalPlanId: string | undefined | null,
  monthlyPlanId: string | undefined | null,
  yearlyPlanId: string | undefined | null
): "MONTHLY" | "YEARLY" | null {
  if (!paypalPlanId) return null;
  if (yearlyPlanId && paypalPlanId === yearlyPlanId) return "YEARLY";
  if (monthlyPlanId && paypalPlanId === monthlyPlanId) return "MONTHLY";
  return null;
}
