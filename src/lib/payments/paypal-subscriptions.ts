import type { BillingInterval, SubscriptionStatus } from "@prisma/client";
import { encodeCustomId } from "./paypal-events";
import { findPaypalLink, paypalRequest, type PaypalLink } from "./paypal-client";
import { getPaypalBrandName, paypalCancelUrl, paypalReturnUrl } from "./paypal-config";

export type PaypalSubscriptionResource = {
  id: string;
  status: string;
  plan_id?: string;
  custom_id?: string;
  start_time?: string;
  subscriber?: {
    payer_id?: string;
    email_address?: string;
  };
  billing_info?: {
    next_billing_time?: string;
    last_payment?: {
      amount?: { value?: string; currency_code?: string };
      time?: string;
    };
    cycle_executions?: Array<{
      tenure_type?: string;
      sequence?: number;
      cycles_completed?: number;
      cycles_remaining?: number;
    }>;
  };
  links?: PaypalLink[];
};

export function mapPaypalStatus(status: string | undefined): SubscriptionStatus {
  switch ((status ?? "").toUpperCase()) {
    case "APPROVAL_PENDING":
    case "APPROVED":
      return "PENDING";
    case "ACTIVE":
      return "ACTIVE";
    case "SUSPENDED":
      return "PAST_DUE";
    case "CANCELLED":
    case "EXPIRED":
      return "CANCELED";
    default:
      return "PENDING";
  }
}

export async function createPaypalSubscription(input: {
  userId: string;
  email: string;
  planId: string;
  interval: BillingInterval;
  paypalPlanId: string;
}): Promise<{ subscriptionId: string; approveUrl: string; status: string }> {
  const brandName = await getPaypalBrandName();
  const created = await paypalRequest<PaypalSubscriptionResource>("/v1/billing/subscriptions", {
    method: "POST",
    idempotencyKey: `sub-${input.userId}-${input.interval}-${Date.now()}`,
    body: {
      plan_id: input.paypalPlanId,
      custom_id: encodeCustomId(input.userId, input.planId, input.interval),
      subscriber: {
        email_address: input.email,
      },
      application_context: {
        brand_name: brandName.slice(0, 127),
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        return_url: paypalReturnUrl(),
        cancel_url: paypalCancelUrl(),
      },
    },
  });

  const approveUrl = findPaypalLink(created.links, "approve");
  if (!created.id || !approveUrl) {
    throw new Error("PayPal did not return an approval URL. Check plan IDs and API credentials.");
  }

  return { subscriptionId: created.id, approveUrl, status: created.status };
}

export async function getPaypalSubscription(subscriptionId: string) {
  return paypalRequest<PaypalSubscriptionResource>(`/v1/billing/subscriptions/${subscriptionId}`);
}

export async function cancelPaypalSubscription(subscriptionId: string, reason = "Customer canceled from Liraz AI Builder") {
  await paypalRequest(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    body: { reason: reason.slice(0, 128) },
  });
}

export function periodFromPaypalSubscription(resource: PaypalSubscriptionResource): {
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
} {
  const start = resource.start_time ? new Date(resource.start_time) : null;
  const end = resource.billing_info?.next_billing_time
    ? new Date(resource.billing_info.next_billing_time)
    : null;
  return {
    currentPeriodStart: start && !Number.isNaN(start.getTime()) ? start : null,
    currentPeriodEnd: end && !Number.isNaN(end.getTime()) ? end : null,
  };
}
