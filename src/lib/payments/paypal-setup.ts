import { centsToPaypalAmount } from "./paypal-amounts";
import { paypalRequest } from "./paypal-client";
import { getPaypalBrandName } from "./paypal-config";

type BillingCycle = {
  frequency: { interval_unit: "DAY" | "MONTH" | "YEAR"; interval_count: number };
  tenure_type: "TRIAL" | "REGULAR";
  sequence: number;
  total_cycles: number;
  pricing_scheme: { fixed_price: { value: string; currency_code: "USD" } };
};

export type CreatedPaypalPlans = {
  productId: string;
  monthlyPlanId: string;
  yearlyPlanId: string;
};

function regularCycle(
  sequence: number,
  intervalUnit: "MONTH" | "YEAR",
  amountCents: number
): BillingCycle {
  return {
    frequency: { interval_unit: intervalUnit, interval_count: 1 },
    tenure_type: "REGULAR",
    sequence,
    total_cycles: 0,
    pricing_scheme: {
      fixed_price: { value: centsToPaypalAmount(amountCents), currency_code: "USD" },
    },
  };
}

function trialCycle(days: number): BillingCycle {
  return {
    frequency: { interval_unit: "DAY", interval_count: Math.max(1, days) },
    tenure_type: "TRIAL",
    sequence: 1,
    total_cycles: 1,
    pricing_scheme: { fixed_price: { value: "0.00", currency_code: "USD" } },
  };
}

async function createPlan(input: {
  productId: string;
  name: string;
  description: string;
  amountCents: number;
  intervalUnit: "MONTH" | "YEAR";
  trialDays: number;
}) {
  const cycles: BillingCycle[] = [];
  if (input.trialDays > 0) {
    cycles.push(trialCycle(input.trialDays));
    cycles.push(regularCycle(2, input.intervalUnit, input.amountCents));
  } else {
    cycles.push(regularCycle(1, input.intervalUnit, input.amountCents));
  }

  const created = await paypalRequest<{ id: string }>("/v1/billing/plans", {
    method: "POST",
    body: {
      product_id: input.productId,
      name: input.name,
      description: input.description,
      status: "ACTIVE",
      billing_cycles: cycles,
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    },
  });

  if (!created.id) {
    throw new Error(`PayPal did not return a plan ID for ${input.name}`);
  }
  return created.id;
}

export async function createPaypalCatalogPlans(input: {
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  trialDays: number;
  productId?: string;
}): Promise<CreatedPaypalPlans> {
  let brand = process.env.PAYPAL_BRAND_NAME?.trim() || "Liraz AI Builder";
  try {
    brand = await getPaypalBrandName();
  } catch {
    // Script/admin setup still works if SystemSetting is unavailable
  }
  let productId = input.productId;
  if (!productId) {
    const product = await paypalRequest<{ id: string }>("/v1/catalogs/products", {
      method: "POST",
      body: {
        name: `${brand} Pro`,
        description: "Liraz AI Builder platform subscription",
        type: "SERVICE",
        category: "SOFTWARE",
      },
    });
    productId = product.id;
  }
  if (!productId) {
    throw new Error("PayPal did not return a product ID");
  }

  const monthlyPlanId = await createPlan({
    productId,
    name: `${brand} Monthly`,
    description: "Monthly platform subscription",
    amountCents: input.monthlyPriceCents,
    intervalUnit: "MONTH",
    trialDays: input.trialDays,
  });

  const yearlyPlanId = await createPlan({
    productId,
    name: `${brand} Yearly`,
    description: "Yearly platform subscription (12 months)",
    amountCents: input.yearlyPriceCents,
    intervalUnit: "YEAR",
    trialDays: input.trialDays,
  });

  return { productId, monthlyPlanId, yearlyPlanId };
}
