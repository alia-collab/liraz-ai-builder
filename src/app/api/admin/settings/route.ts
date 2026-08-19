import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions, isSuperAdmin } from "@/lib/auth/config";
import { setSetting } from "@/lib/settings";
import { jsonError, jsonSuccess } from "@/lib/api/helpers";
import prisma from "@/lib/db";
import { createPaypalCatalogPlans } from "@/lib/payments/paypal-setup";
import { isPaypalConfigured, paypalNotConfiguredMessage, resolvePaypalPlanIds } from "@/lib/payments";
import { PaypalApiError } from "@/lib/payments/paypal-client";
import { createAdminAction } from "@/lib/audit";

const settingSchema = z.object({
  key: z.string(),
  value: z.unknown(),
  category: z.string().optional(),
});

const planPatchSchema = z.object({
  planId: z.string(),
  monthlyPriceUsd: z.number().int().positive().optional(),
  yearlyPriceUsd: z.number().int().positive().optional(),
  trialDays: z.number().int().min(0).max(365).optional(),
  paypalMonthlyPlanId: z.string().optional(),
  paypalYearlyPlanId: z.string().optional(),
  paypalProductId: z.string().optional(),
});

async function requireApiSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSuperAdmin(session.user.globalRole)) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireApiSuperAdmin();
  if (!session) return jsonError("Forbidden", 403);

  const settings = await prisma.systemSetting.findMany();
  const plans = await prisma.plan.findMany();
  const paypal = await resolvePaypalPlanIds();
  return jsonSuccess({
    settings,
    plans,
    paypal: {
      configured: isPaypalConfigured(),
      mode: process.env.PAYPAL_MODE === "live" ? "live" : "sandbox",
      monthlyPlanId: paypal.monthlyPlanId ?? "",
      yearlyPlanId: paypal.yearlyPlanId ?? "",
      productId: paypal.productId ?? "",
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await requireApiSuperAdmin();
  if (!session) return jsonError("Forbidden", 403);

  const body = await request.json();
  const parsed = settingSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input", 400);

  const setting = await setSetting(
    parsed.data.key,
    parsed.data.value as string | number | boolean | object,
    parsed.data.category,
    session.user.id
  );

  return jsonSuccess({ setting });
}

export async function PATCH(request: NextRequest) {
  const session = await requireApiSuperAdmin();
  if (!session) return jsonError("Forbidden", 403);

  const body = await request.json();
  const parsed = planPatchSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input", 400);

  const data: Record<string, string | number> = {};
  if (parsed.data.monthlyPriceUsd !== undefined) data.monthlyPriceUsd = parsed.data.monthlyPriceUsd;
  if (parsed.data.yearlyPriceUsd !== undefined) data.yearlyPriceUsd = parsed.data.yearlyPriceUsd;
  if (parsed.data.trialDays !== undefined) data.trialDays = parsed.data.trialDays;
  if (parsed.data.paypalMonthlyPlanId !== undefined) data.paypalMonthlyPlanId = parsed.data.paypalMonthlyPlanId;
  if (parsed.data.paypalYearlyPlanId !== undefined) data.paypalYearlyPlanId = parsed.data.paypalYearlyPlanId;
  if (parsed.data.paypalProductId !== undefined) data.paypalProductId = parsed.data.paypalProductId;

  const plan = await prisma.plan.update({
    where: { id: parsed.data.planId },
    data,
  });

  if (typeof data.paypalMonthlyPlanId === "string") {
    await setSetting("billing.paypalMonthlyPlanId", data.paypalMonthlyPlanId, "billing", session.user.id);
  }
  if (typeof data.paypalYearlyPlanId === "string") {
    await setSetting("billing.paypalYearlyPlanId", data.paypalYearlyPlanId, "billing", session.user.id);
  }

  await createAdminAction({
    adminId: session.user.id,
    action: "UPDATE_PLAN",
    targetType: "Plan",
    targetId: plan.id,
    metadata: data,
  });

  return jsonSuccess({ plan });
}

export async function PUT(request: NextRequest) {
  const session = await requireApiSuperAdmin();
  if (!session) return jsonError("Forbidden", 403);

  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "setup-paypal-plans") {
    return jsonError("Unknown action", 400);
  }
  if (!isPaypalConfigured()) {
    return jsonError(paypalNotConfiguredMessage(), 503);
  }

  try {
    const current = await resolvePaypalPlanIds();
    const created = await createPaypalCatalogPlans({
      monthlyPriceCents: current.monthlyPriceUsd,
      yearlyPriceCents: current.yearlyPriceUsd,
      trialDays: current.trialDays,
      productId: current.productId,
    });

    const plan = await prisma.plan.findFirst({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    if (plan) {
      await prisma.plan.update({
        where: { id: plan.id },
        data: {
          paypalProductId: created.productId,
          paypalMonthlyPlanId: created.monthlyPlanId,
          paypalYearlyPlanId: created.yearlyPlanId,
        },
      });
    }
    await setSetting("billing.paypalMonthlyPlanId", created.monthlyPlanId, "billing", session.user.id);
    await setSetting("billing.paypalYearlyPlanId", created.yearlyPlanId, "billing", session.user.id);
    await setSetting("billing.paypalProductId", created.productId, "billing", session.user.id);

    await createAdminAction({
      adminId: session.user.id,
      action: "PAYPAL_SETUP_PLANS",
      targetType: "Plan",
      targetId: plan?.id,
      metadata: { productId: created.productId },
    });

    return jsonSuccess({ ...created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PayPal plan setup failed";
    const status = err instanceof PaypalApiError ? err.status : 500;
    console.error("PayPal plan setup error:", message);
    return jsonError(message, status >= 400 && status < 600 ? status : 500);
  }
}
