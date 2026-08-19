/**
 * Create PayPal Catalog product + monthly/yearly Subscription plans.
 *
 * Usage (PowerShell):
 *   npm.cmd run paypal:setup-plans
 *
 * Requires PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env (sandbox recommended).
 * Prints plan IDs. Copy them into .env and/or Admin → Settings.
 * Does not fail the app if you skip this — checkout will show a clear error instead.
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_MONTHLY_PRICE_CENTS, DEFAULT_YEARLY_PRICE_CENTS } from "../src/lib/payments/paypal-amounts";
import { createPaypalCatalogPlans } from "../src/lib/payments/paypal-setup";
import { isPaypalConfigured } from "../src/lib/payments/paypal-client";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile();
  if (!isPaypalConfigured()) {
    console.error("Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env first (sandbox).");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  let monthly = DEFAULT_MONTHLY_PRICE_CENTS;
  let yearly = DEFAULT_YEARLY_PRICE_CENTS;
  let trialDays = 14;
  let productId: string | undefined;
  let planId: string | undefined;

  try {
    const plan = await prisma.plan.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    if (plan) {
      monthly = plan.monthlyPriceUsd;
      yearly = plan.yearlyPriceUsd;
      trialDays = plan.trialDays;
      productId = plan.paypalProductId ?? undefined;
      planId = plan.id;
    }
  } catch (error) {
    console.warn("Could not read Plan from the database; using default $35 / $420.", error instanceof Error ? error.message : error);
  }

  console.log(`Creating PayPal plans at $${(monthly / 100).toFixed(2)}/mo and $${(yearly / 100).toFixed(2)} / 12 months (trial ${trialDays} days).`);
  const created = await createPaypalCatalogPlans({
    monthlyPriceCents: monthly,
    yearlyPriceCents: yearly,
    trialDays,
    productId,
  });

  console.log("PayPal product/plans created. Add these to .env (do not commit secrets):");
  console.log(`PAYPAL_PRODUCT_ID=${created.productId}`);
  console.log(`PAYPAL_MONTHLY_PLAN_ID=${created.monthlyPlanId}`);
  console.log(`PAYPAL_YEARLY_PLAN_ID=${created.yearlyPlanId}`);

  if (planId) {
    try {
      await prisma.plan.update({
        where: { id: planId },
        data: {
          paypalProductId: created.productId,
          paypalMonthlyPlanId: created.monthlyPlanId,
          paypalYearlyPlanId: created.yearlyPlanId,
        },
      });
      await prisma.systemSetting.upsert({
        where: { key: "billing.paypalMonthlyPlanId" },
        create: { key: "billing.paypalMonthlyPlanId", value: created.monthlyPlanId, category: "billing" },
        update: { value: created.monthlyPlanId },
      });
      await prisma.systemSetting.upsert({
        where: { key: "billing.paypalYearlyPlanId" },
        create: { key: "billing.paypalYearlyPlanId", value: created.yearlyPlanId, category: "billing" },
        update: { value: created.yearlyPlanId },
      });
      console.log("Saved plan IDs to Plan + SystemSetting.");
    } catch (error) {
      console.warn("Created in PayPal but could not save to DB:", error instanceof Error ? error.message : error);
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
