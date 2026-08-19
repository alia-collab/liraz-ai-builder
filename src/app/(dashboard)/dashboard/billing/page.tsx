import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BillingActions } from "./billing-actions";
import { getPricingSettings } from "@/lib/settings";
import { isPaypalConfigured } from "@/lib/payments/paypal-client";
import { syncSubscriptionFromPaypal } from "@/lib/payments/paypal-handlers";

function subscriptionStatusLabel(
  status: string,
  t: (key: string) => string
): string {
  switch (status) {
    case "PENDING":
      return t("statusPending");
    case "TRIALING":
      return t("statusTrialing");
    case "ACTIVE":
      return t("statusActive");
    case "PAST_DUE":
    case "UNPAID":
    case "PAUSED":
      return t("statusPastDue");
    case "CANCELED":
    case "READ_ONLY":
      return t("statusCanceled");
    default:
      return status;
  }
}

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireAuth();
  const t = await getTranslations("dashboard.billingPage");
  const params = await searchParams;
  const paypalConfigured = isPaypalConfigured();
  const paypalReturn = firstParam(params, "paypal");
  const subscriptionId = firstParam(params, "subscription_id");

  let pricing = { monthlyPriceUsd: 3500, yearlyPriceUsd: 42000 };
  try {
    pricing = await getPricingSettings();
  } catch {
    // defaults
  }

  if (paypalConfigured && paypalReturn === "return" && subscriptionId) {
    try {
      const owned = await prisma.subscription.findFirst({
        where: { userId: session.user.id, paypalSubscriptionId: subscriptionId },
      });
      if (owned) {
        await syncSubscriptionFromPaypal(subscriptionId);
      }
    } catch {
      // Stay pending until webhook / confirm succeeds
    }
  }

  let subscription = null;
  try {
    subscription = await prisma.subscription.findFirst({
      where: { userId: session.user.id },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // DB unavailable
  }

  const statusLabel = subscription ? subscriptionStatusLabel(subscription.status, t) : null;
  const notice = paypalReturn === "cancel" ? "cancel" : paypalReturn === "return" ? "return" : null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>{t("currentPlan")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{subscription.plan.name}</p>
            <p className="text-sm text-muted-foreground">{statusLabel ?? subscription.status}</p>
            {subscription.interval === "YEARLY" && (
              <p className="text-sm text-muted-foreground mt-1">{t("yearlyInterval")}</p>
            )}
          </CardContent>
        </Card>
      )}

      {paypalConfigured ? (
        <BillingActions
          monthlyPriceUsd={pricing.monthlyPriceUsd}
          yearlyPriceUsd={pricing.yearlyPriceUsd}
          hasPaypalSubscription={Boolean(subscription?.paypalSubscriptionId)}
          notice={notice}
        />
      ) : (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <p className="font-medium">{t("paypalNotConfigured")}</p>
            <p className="text-sm text-muted-foreground">{t("paypalNotConfiguredHint")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
