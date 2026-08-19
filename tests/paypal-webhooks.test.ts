import { describe, expect, it } from "vitest";
import {
  centsToPaypalAmount,
  DEFAULT_MONTHLY_PRICE_CENTS,
  DEFAULT_YEARLY_PRICE_CENTS,
  expectedPriceCents,
  mapIntervalFromPaypalPlanId,
  paypalAmountToCents,
} from "@/lib/payments/paypal-amounts";
import { actionForPaypalEvent } from "@/lib/payments/paypal-events";
import { processPaypalWebhookPure } from "@/lib/payments/paypal-webhook-process";

const TRUSTED_CERT = "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a704-a2024647";

function signedHeaders() {
  return new Headers({
    "paypal-transmission-id": "tx-1",
    "paypal-transmission-time": "2026-08-19T18:00:00Z",
    "paypal-cert-url": TRUSTED_CERT,
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-transmission-sig": "not-a-real-signature",
  });
}

const activationEvent = {
  id: "WH-TEST-1",
  event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
  resource: {
    id: "I-TESTSUB",
    plan_id: "P-MONTHLY",
    custom_id: "user1|plan1|MONTHLY",
    status: "ACTIVE",
  },
};

describe("PayPal plan amounts", () => {
  it("maps the default $35 monthly and $420 yearly (12 months) prices", () => {
    expect(DEFAULT_MONTHLY_PRICE_CENTS).toBe(3500);
    expect(DEFAULT_YEARLY_PRICE_CENTS).toBe(42000);
    expect(centsToPaypalAmount(DEFAULT_MONTHLY_PRICE_CENTS)).toBe("35.00");
    expect(centsToPaypalAmount(DEFAULT_YEARLY_PRICE_CENTS)).toBe("420.00");
    expect(paypalAmountToCents("35.00")).toBe(3500);
    expect(paypalAmountToCents("420.00")).toBe(42000);
    expect(expectedPriceCents("MONTHLY")).toBe(3500);
    expect(expectedPriceCents("YEARLY")).toBe(42000);
  });

  it("maps PayPal plan IDs to monthly vs yearly", () => {
    expect(mapIntervalFromPaypalPlanId("P-MONTHLY", "P-MONTHLY", "P-YEARLY")).toBe("MONTHLY");
    expect(mapIntervalFromPaypalPlanId("P-YEARLY", "P-MONTHLY", "P-YEARLY")).toBe("YEARLY");
    expect(mapIntervalFromPaypalPlanId("P-OTHER", "P-MONTHLY", "P-YEARLY")).toBeNull();
  });
});

describe("PayPal webhook verification", () => {
  it("does not activate when PayPal signature verification fails", async function () {
    let applied = false;
    const result = await processPaypalWebhookPure({
      headers: signedHeaders(),
      rawBody: JSON.stringify(activationEvent),
      webhookId: "WEBHOOK-1",
      verify: async () => "FAILURE",
      seenEventIds: new Set(),
      onVerified: async () => {
        applied = true;
        return { action: "activate", activated: true, skipped: false };
      },
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toMatch(/verification failed/i);
    expect(result.activated).toBeUndefined();
    expect(applied).toBe(false);
  });

  it("rejects untrusted certificate URLs before calling verify", async function () {
    let verified = false;
    const headers = signedHeaders();
    headers.set("paypal-cert-url", "https://evil.example/cert");
    const result = await processPaypalWebhookPure({
      headers,
      rawBody: JSON.stringify(activationEvent),
      webhookId: "WEBHOOK-1",
      verify: async () => {
        verified = true;
        return "SUCCESS";
      },
      seenEventIds: new Set(),
      onVerified: async () => ({ action: "activate", activated: true, skipped: false }),
    });

    expect(result.ok).toBe(false);
    expect(verified).toBe(false);
  });

  it("skips duplicate event IDs after the first verified process", async function () {
    const seen = new Set<string>();
    let applyCount = 0;
    const first = await processPaypalWebhookPure({
      headers: signedHeaders(),
      rawBody: JSON.stringify(activationEvent),
      webhookId: "WEBHOOK-1",
      verify: async () => "SUCCESS",
      seenEventIds: seen,
      onVerified: async () => {
        applyCount += 1;
        return { action: "activate", activated: true, skipped: false };
      },
    });
    const second = await processPaypalWebhookPure({
      headers: signedHeaders(),
      rawBody: JSON.stringify(activationEvent),
      webhookId: "WEBHOOK-1",
      verify: async () => "SUCCESS",
      seenEventIds: seen,
      onVerified: async () => {
        applyCount += 1;
        return { action: "activate", activated: true, skipped: false };
      },
    });

    expect(first.ok).toBe(true);
    expect(first.activated).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.duplicate).toBe(true);
    expect(second.activated).toBe(false);
    expect(applyCount).toBe(1);
  });

  it("maps billing failure and dispute events without treating them as activation", () => {
    expect(actionForPaypalEvent("BILLING.SUBSCRIPTION.PAYMENT.FAILED")).toBe("past_due");
    expect(actionForPaypalEvent("BILLING.SUBSCRIPTION.CANCELLED")).toBe("cancel");
    expect(actionForPaypalEvent("PAYMENT.SALE.REFUNDED")).toBe("refund");
    expect(actionForPaypalEvent("CUSTOMER.DISPUTE.CREATED")).toBe("dispute");
    expect(actionForPaypalEvent("BILLING.SUBSCRIPTION.ACTIVATED")).toBe("activate");
  });
});
