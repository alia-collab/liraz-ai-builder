import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { getSetting } from "@/lib/settings";
import type { BillingInterval, SubscriptionStatus } from "@prisma/client";
import {
  actionForPaypalEvent,
  extractPaypalCaptureId,
  extractPaypalCustomId,
  extractPaypalPayerId,
  extractPaypalPaymentAmountCents,
  extractPaypalPlanId,
  extractPaypalSubscriptionId,
  parseCustomId,
  type PaypalWebhookEvent,
} from "./paypal-events";
import { getPaypalSubscription, mapPaypalStatus, periodFromPaypalSubscription } from "./paypal-subscriptions";
import { resolvePaypalPlanIds } from "./paypal-config";
import { mapIntervalFromPaypalPlanId } from "./paypal-amounts";

async function graceDays(): Promise<number> {
  const days = await getSetting<number>("billing.readOnlyGraceDays", 30);
  return typeof days === "number" && days > 0 ? days : 30;
}

export async function applyReadOnlyGrace(userId: string) {
  const days = await graceDays();
  const readOnlyUntil = new Date();
  readOnlyUntil.setDate(readOnlyUntil.getDate() + days);

  await prisma.project.updateMany({
    where: { organization: { ownerId: userId } },
    data: { status: "READ_ONLY" },
  });

  return readOnlyUntil;
}

export async function upsertPendingSubscription(input: {
  userId: string;
  planId: string;
  interval: BillingInterval;
  paypalSubscriptionId: string;
  paypalPlanId: string;
}) {
  const existing = await prisma.subscription.findUnique({
    where: { paypalSubscriptionId: input.paypalSubscriptionId },
  });
  if (existing) return existing;

  return prisma.subscription.create({
    data: {
      userId: input.userId,
      planId: input.planId,
      interval: input.interval,
      status: "PENDING",
      paypalSubscriptionId: input.paypalSubscriptionId,
      paypalPlanId: input.paypalPlanId,
    },
  });
}

async function findSubscriptionForEvent(event: PaypalWebhookEvent) {
  const paypalSubscriptionId = extractPaypalSubscriptionId(event);
  if (paypalSubscriptionId) {
    const byPaypalId = await prisma.subscription.findUnique({
      where: { paypalSubscriptionId },
    });
    if (byPaypalId) return byPaypalId;
  }

  const custom = parseCustomId(extractPaypalCustomId(event));
  if (custom.userId) {
    return prisma.subscription.findFirst({
      where: { userId: custom.userId },
      orderBy: { createdAt: "desc" },
    });
  }

  return null;
}

async function grantPayingAccess(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { globalRole: "PAYING_CUSTOMER" },
  });
  await prisma.project.updateMany({
    where: { organization: { ownerId: userId }, status: "READ_ONLY" },
    data: { status: "ACTIVE" },
  });
}

async function grantCreditsIfActive(paypalSubscriptionId: string | null | undefined) {
  if (!paypalSubscriptionId) return;
  const sub = await prisma.subscription.findUnique({ where: { paypalSubscriptionId } });
  if (!sub) return;
  const { grantCreditsForSubscription } = await import("@/lib/ai-credits/subscription");
  await grantCreditsForSubscription(sub.id);
}

export async function syncSubscriptionFromPaypal(
  paypalSubscriptionId: string,
  extras?: { payerId?: string; forceStatus?: SubscriptionStatus }
) {
  const remote = await getPaypalSubscription(paypalSubscriptionId);
  const status = extras?.forceStatus ?? mapPaypalStatus(remote.status);
  const custom = parseCustomId(remote.custom_id);
  const period = periodFromPaypalSubscription(remote);
  const planIds = await resolvePaypalPlanIds();
  const interval =
    mapIntervalFromPaypalPlanId(remote.plan_id, planIds.monthlyPlanId, planIds.yearlyPlanId) ??
    custom.interval ??
    "MONTHLY";

  const existing = await prisma.subscription.findUnique({
    where: { paypalSubscriptionId },
  });

  const userId = existing?.userId ?? custom.userId;
  const planId = existing?.planId ?? custom.planId ?? planIds.planId;
  if (!userId || !planId) {
    return { status, activated: false };
  }

  const payerId = extras?.payerId ?? remote.subscriber?.payer_id ?? existing?.paypalPayerId ?? null;

  await prisma.subscription.upsert({
    where: { paypalSubscriptionId },
    create: {
      userId,
      planId,
      interval,
      status,
      paypalSubscriptionId,
      paypalPlanId: remote.plan_id,
      paypalPayerId: payerId,
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
    },
    update: {
      status,
      paypalPlanId: remote.plan_id,
      paypalPayerId: payerId,
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      canceledAt: status === "CANCELED" ? new Date() : undefined,
    },
  });

  let activated = false;
  if (status === "ACTIVE") {
    await grantPayingAccess(userId);
    activated = true;
  }

  return { status, activated };
}

export type ApplyEventResult = {
  action: string;
  activated: boolean;
  skipped: boolean;
};

export async function applyPaypalWebhookEvent(event: PaypalWebhookEvent): Promise<ApplyEventResult> {
  const action = actionForPaypalEvent(event.event_type);
  if (action === "ignore") {
    return { action, activated: false, skipped: true };
  }

  const paypalSubscriptionId = extractPaypalSubscriptionId(event);
  const payerId = extractPaypalPayerId(event);
  const captureId = extractPaypalCaptureId(event);
  const amountUsd = extractPaypalPaymentAmountCents(event);
  const custom = parseCustomId(extractPaypalCustomId(event));
  const planIds = await resolvePaypalPlanIds();
  const interval =
    mapIntervalFromPaypalPlanId(extractPaypalPlanId(event), planIds.monthlyPlanId, planIds.yearlyPlanId) ??
    custom.interval ??
    "MONTHLY";

  if (action === "pending") {
    if (paypalSubscriptionId && custom.userId && custom.planId) {
      await upsertPendingSubscription({
        userId: custom.userId,
        planId: custom.planId,
        interval,
        paypalSubscriptionId,
        paypalPlanId: extractPaypalPlanId(event) ?? "",
      });
    }
    return { action, activated: false, skipped: false };
  }

  if (action === "activate" && paypalSubscriptionId) {
    let result: { status: SubscriptionStatus; activated: boolean };
    try {
      result = await syncSubscriptionFromPaypal(paypalSubscriptionId, { payerId });
    } catch {
      if (!custom.userId || !custom.planId) {
        throw new Error("PayPal activation event missing custom_id; cannot map user");
      }
      await upsertPendingSubscription({
        userId: custom.userId,
        planId: custom.planId,
        interval,
        paypalSubscriptionId,
        paypalPlanId: extractPaypalPlanId(event) ?? "",
      });
      await prisma.subscription.update({
        where: { paypalSubscriptionId },
        data: { status: "ACTIVE", paypalPayerId: payerId },
      });
      await grantPayingAccess(custom.userId);
      result = { status: "ACTIVE", activated: true };
    }
    if (result.activated) {
      const sub = await prisma.subscription.findUnique({ where: { paypalSubscriptionId } });
      if (sub) {
        await createAuditLog({
          userId: sub.userId,
          action: "SUBSCRIPTION_CREATED",
          targetType: "Subscription",
          targetId: sub.id,
          metadata: { paypalSubscriptionId, eventType: event.event_type },
        });
      }
    }
    await grantCreditsIfActive(paypalSubscriptionId);
    return { action, activated: result.activated, skipped: false };
  }

  if (action === "renew") {
    const rawCustom = extractPaypalCustomId(event);
    if (captureId && rawCustom?.startsWith("credit_purchase:")) {
      const { grantCreditsFromPaypalCapture } = await import("@/lib/ai-credits/purchases");
      await grantCreditsFromPaypalCapture({
        paypalCaptureId: captureId,
        customId: rawCustom,
      });
      return { action: "credit_purchase", activated: false, skipped: false };
    }

    if (paypalSubscriptionId) {
      const result = await syncSubscriptionFromPaypal(paypalSubscriptionId, { payerId });
      const sub = await prisma.subscription.findUnique({ where: { paypalSubscriptionId } });
      if (sub && captureId) {
        await prisma.payment.upsert({
          where: { paypalCaptureId: captureId },
          create: {
            subscriptionId: sub.id,
            amountUsd: amountUsd || (sub.interval === "YEARLY" ? planIds.yearlyPriceUsd : planIds.monthlyPriceUsd),
            status: "SUCCEEDED",
            paypalCaptureId: captureId,
            paypalSaleId: captureId,
            paidAt: new Date(),
          },
          update: {
            status: "SUCCEEDED",
            paidAt: new Date(),
          },
        });
        await createAuditLog({
          userId: sub.userId,
          action: "PAYMENT_SUCCEEDED",
          targetType: "Subscription",
          targetId: sub.id,
          metadata: { amountUsd, captureId, eventType: event.event_type },
        });
      }
      await grantCreditsIfActive(paypalSubscriptionId);
      return { action, activated: result.activated, skipped: false };
    }
    return { action, activated: false, skipped: true };
  }

  if (action === "past_due") {
    const sub = await findSubscriptionForEvent(event);
    if (sub) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "PAST_DUE" },
      });
      await createAuditLog({
        userId: sub.userId,
        action: "PAYMENT_FAILED",
        targetType: "Subscription",
        targetId: sub.id,
        metadata: { eventType: event.event_type },
      });
    }
    return { action, activated: false, skipped: !sub };
  }

  if (action === "cancel") {
    const sub = await findSubscriptionForEvent(event);
    if (sub) {
      const readOnlyUntil = await applyReadOnlyGrace(sub.userId);
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: "CANCELED", canceledAt: new Date(), readOnlyUntil },
      });
      await createAuditLog({
        userId: sub.userId,
        action: "SUBSCRIPTION_CANCELED",
        targetType: "Subscription",
        targetId: sub.id,
        metadata: { eventType: event.event_type },
      });
    }
    return { action, activated: false, skipped: !sub };
  }

  if (action === "refund") {
    const sub = await findSubscriptionForEvent(event);
    if (sub) {
      if (captureId) {
        await prisma.payment.updateMany({
          where: {
            subscriptionId: sub.id,
            OR: [{ paypalCaptureId: captureId }, { paypalSaleId: captureId }],
          },
          data: { status: "REFUNDED" },
        });
      } else {
        await prisma.payment.create({
          data: {
            subscriptionId: sub.id,
            amountUsd,
            status: "REFUNDED",
            paypalCaptureId: captureId,
            paidAt: new Date(),
          },
        });
      }
      await createAuditLog({
        userId: sub.userId,
        action: "PAYMENT_REFUNDED",
        targetType: "Subscription",
        targetId: sub.id,
        metadata: { eventType: event.event_type, captureId, amountUsd },
      });
    }
    return { action, activated: false, skipped: !sub };
  }

  if (action === "dispute") {
    const sub = await findSubscriptionForEvent(event);
    if (sub) {
      await prisma.payment.updateMany({
        where: { subscriptionId: sub.id, status: "SUCCEEDED" },
        data: { status: "DISPUTED" },
      });
      await createAuditLog({
        userId: sub.userId,
        action: "DISPUTE_OPENED",
        targetType: "Subscription",
        targetId: sub.id,
        metadata: { eventType: event.event_type },
      });
    }
    return { action, activated: false, skipped: !sub };
  }

  return { action, activated: false, skipped: true };
}
