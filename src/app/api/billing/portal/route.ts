import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import prisma from "@/lib/db";
import { applyReadOnlyGrace } from "@/lib/payments/paypal-handlers";
import { cancelPaypalSubscription, isPaypalConfigured } from "@/lib/payments";
import { createAuditLog } from "@/lib/audit";
import { getPaypalMode } from "@/lib/payments/paypal-client";

export async function POST() {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;

  if (!isPaypalConfigured()) {
    return jsonError("PayPal is not configured", 503);
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId: session.user.id, paypalSubscriptionId: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription?.paypalSubscriptionId) {
    return jsonError("No PayPal subscription found. Subscribe first.", 404);
  }

  const manageUrl =
    getPaypalMode() === "live"
      ? "https://www.paypal.com/myaccount/autopay/"
      : "https://www.sandbox.paypal.com/myaccount/autopay/";

  try {
    if (subscription.status !== "CANCELED") {
      await cancelPaypalSubscription(subscription.paypalSubscriptionId);
      const readOnlyUntil = await applyReadOnlyGrace(session.user.id);
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "CANCELED", canceledAt: new Date(), cancelAtPeriodEnd: false, readOnlyUntil },
      });
      await createAuditLog({
        userId: session.user.id,
        action: "SUBSCRIPTION_CANCELED",
        targetType: "Subscription",
        targetId: subscription.id,
        metadata: { source: "customer_portal" },
      });
    }
    return jsonSuccess({ url: manageUrl, canceled: true });
  } catch (err) {
    console.error("PayPal cancel error:", err instanceof Error ? err.message : err);
    return jsonSuccess({ url: manageUrl, canceled: false, warning: "Open PayPal to manage or cancel the subscription." });
  }
}
