import prisma from "@/lib/db";
import { getSetting } from "@/lib/settings";
import type { BillingInterval } from "@prisma/client";
import { DEFAULT_MONTHLY_PRICE_CENTS, DEFAULT_YEARLY_PRICE_CENTS } from "./paypal-amounts";
import { isPaypalConfigured } from "./paypal-client";

export type PaypalPlanResolution = {
  interval: BillingInterval;
  paypalPlanId: string;
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  trialDays: number;
  planId: string;
  planName: string;
  paypalProductId: string | null;
};

export function paypalNotConfiguredMessage() {
  return "PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in the environment (sandbox first).";
}

export function paypalPlansMissingMessage() {
  return "PayPal subscription plan IDs are missing. Set PAYPAL_MONTHLY_PLAN_ID and PAYPAL_YEARLY_PLAN_ID, or save them in Admin → Settings, then retry. You can create plans with: npm.cmd run paypal:setup-plans";
}

export async function getPaypalBrandName(): Promise<string> {
  return (
    process.env.PAYPAL_BRAND_NAME?.trim() ||
    (await getSetting<string>("brand.name", "Liraz AI Builder"))
  );
}

export async function resolvePaypalPlanIds(): Promise<{
  monthlyPlanId?: string;
  yearlyPlanId?: string;
  productId?: string;
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  trialDays: number;
  planId?: string;
  planName: string;
}> {
  const plan = await prisma.plan.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const settingMonthly = await getSetting<string>("billing.paypalMonthlyPlanId", "");
  const settingYearly = await getSetting<string>("billing.paypalYearlyPlanId", "");

  const monthlyPlanId =
    plan?.paypalMonthlyPlanId ||
    settingMonthly ||
    process.env.PAYPAL_MONTHLY_PLAN_ID?.trim() ||
    undefined;
  const yearlyPlanId =
    plan?.paypalYearlyPlanId ||
    settingYearly ||
    process.env.PAYPAL_YEARLY_PLAN_ID?.trim() ||
    undefined;

  return {
    monthlyPlanId: monthlyPlanId || undefined,
    yearlyPlanId: yearlyPlanId || undefined,
    productId: plan?.paypalProductId || process.env.PAYPAL_PRODUCT_ID?.trim() || undefined,
    monthlyPriceUsd: plan?.monthlyPriceUsd ?? DEFAULT_MONTHLY_PRICE_CENTS,
    yearlyPriceUsd: plan?.yearlyPriceUsd ?? DEFAULT_YEARLY_PRICE_CENTS,
    trialDays: plan?.trialDays ?? 14,
    planId: plan?.id,
    planName: plan?.name ?? "Pro",
  };
}

export async function resolvePaypalPlanForInterval(
  interval: BillingInterval
): Promise<PaypalPlanResolution> {
  if (!isPaypalConfigured()) {
    throw new Error(paypalNotConfiguredMessage());
  }

  const resolved = await resolvePaypalPlanIds();
  const paypalPlanId = interval === "YEARLY" ? resolved.yearlyPlanId : resolved.monthlyPlanId;
  if (!paypalPlanId) {
    throw new Error(paypalPlansMissingMessage());
  }
  if (!resolved.planId) {
    throw new Error("No active billing plan found. Run npm.cmd run db:seed.");
  }

  return {
    interval,
    paypalPlanId,
    monthlyPriceUsd: resolved.monthlyPriceUsd,
    yearlyPriceUsd: resolved.yearlyPriceUsd,
    trialDays: resolved.trialDays,
    planId: resolved.planId,
    planName: resolved.planName,
    paypalProductId: resolved.productId ?? null,
  };
}

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function paypalReturnUrl(): string {
  return process.env.PAYPAL_RETURN_URL?.trim() || `${appBaseUrl()}/dashboard/billing?paypal=return`;
}

export function paypalCancelUrl(): string {
  return process.env.PAYPAL_CANCEL_URL?.trim() || `${appBaseUrl()}/dashboard/billing?paypal=cancel`;
}
