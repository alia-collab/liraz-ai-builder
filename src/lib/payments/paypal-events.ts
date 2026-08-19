export const PAYPAL_WEBHOOK_EVENT_TYPES = [
  "BILLING.SUBSCRIPTION.CREATED",
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "PAYMENT.SALE.COMPLETED",
  "PAYMENT.SALE.REFUNDED",
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.REFUNDED",
  "CUSTOMER.DISPUTE.CREATED",
] as const;

export type PaypalWebhookEventType = (typeof PAYPAL_WEBHOOK_EVENT_TYPES)[number] | string;

export type PaypalWebhookEvent = {
  id: string;
  event_type: string;
  resource?: Record<string, unknown>;
  create_time?: string;
  summary?: string;
};

export function parsePaypalWebhookEvent(body: string): PaypalWebhookEvent | null {
  try {
    const parsed = JSON.parse(body) as PaypalWebhookEvent;
    if (!parsed || typeof parsed !== "object" || !parsed.id || !parsed.event_type) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function extractPaypalSubscriptionId(event: PaypalWebhookEvent): string | undefined {
  const resource = asRecord(event.resource);
  if (!resource) return undefined;

  const id = asString(resource.id);
  if (id?.startsWith("I-")) return id;

  const billingAgreement = asString(resource.billing_agreement_id);
  if (billingAgreement) return billingAgreement;

  const supplementary = asRecord(resource.supplementary_data);
  const related = asRecord(supplementary?.related_ids);
  const relatedSub = asString(related?.billing_agreement_id) ?? asString(related?.subscription_id);
  if (relatedSub) return relatedSub;

  return asString(resource.subscription_id);
}

export function extractPaypalPayerId(event: PaypalWebhookEvent): string | undefined {
  const resource = asRecord(event.resource);
  if (!resource) return undefined;
  const subscriber = asRecord(resource.subscriber);
  const payer = asRecord(resource.payer);
  return (
    asString(resource.payer_id) ??
    asString(subscriber?.payer_id) ??
    asString(asRecord(payer?.payer_id) ? undefined : payer?.payer_id) ??
    asString(asRecord(subscriber)?.payer_id)
  );
}

export function extractPaypalPlanId(event: PaypalWebhookEvent): string | undefined {
  const resource = asRecord(event.resource);
  return asString(resource?.plan_id);
}

export function extractPaypalCustomId(event: PaypalWebhookEvent): string | undefined {
  const resource = asRecord(event.resource);
  return asString(resource?.custom_id) ?? asString(resource?.custom);
}

export function extractPaypalPaymentAmountCents(event: PaypalWebhookEvent): number {
  const resource = asRecord(event.resource);
  if (!resource) return 0;
  const amount = asRecord(resource.amount);
  const total = amount?.total ?? amount?.value;
  if (typeof total === "string" || typeof total === "number") {
    const parsed = Number.parseFloat(String(total));
    if (Number.isFinite(parsed)) return Math.round(parsed * 100);
  }
  return 0;
}

export function extractPaypalCaptureId(event: PaypalWebhookEvent): string | undefined {
  const resource = asRecord(event.resource);
  if (!resource) return undefined;
  const id = asString(resource.id);
  if (event.event_type.startsWith("PAYMENT.") && id) return id;
  return asString(resource.sale_id) ?? id;
}

export function parseCustomId(customId: string | undefined): {
  userId?: string;
  planId?: string;
  interval?: "MONTHLY" | "YEARLY";
} {
  if (!customId) return {};
  const [userId, planId, interval] = customId.split("|");
  const billingInterval = interval === "YEARLY" || interval === "MONTHLY" ? interval : undefined;
  return { userId, planId, interval: billingInterval };
}

export function encodeCustomId(userId: string, planId: string, interval: "MONTHLY" | "YEARLY"): string {
  return `${userId}|${planId}|${interval}`.slice(0, 127);
}

export type SubscriptionAction =
  | "ignore"
  | "pending"
  | "activate"
  | "renew"
  | "past_due"
  | "cancel"
  | "refund"
  | "dispute";

export function actionForPaypalEvent(eventType: string): SubscriptionAction {
  switch (eventType) {
    case "BILLING.SUBSCRIPTION.CREATED":
      return "pending";
    case "BILLING.SUBSCRIPTION.ACTIVATED":
      return "activate";
    case "BILLING.SUBSCRIPTION.UPDATED":
      return "renew";
    case "PAYMENT.SALE.COMPLETED":
    case "PAYMENT.CAPTURE.COMPLETED":
      return "renew";
    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
    case "BILLING.SUBSCRIPTION.SUSPENDED":
      return "past_due";
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED":
      return "cancel";
    case "PAYMENT.SALE.REFUNDED":
    case "PAYMENT.CAPTURE.REFUNDED":
      return "refund";
    case "CUSTOMER.DISPUTE.CREATED":
      return "dispute";
    default:
      return "ignore";
  }
}
