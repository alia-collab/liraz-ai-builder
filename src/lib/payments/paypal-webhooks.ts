import prisma from "@/lib/db";
import { getPaypalWebhookId, paypalRequest } from "./paypal-client";
import { applyPaypalWebhookEvent, type ApplyEventResult } from "./paypal-handlers";
import { parsePaypalWebhookEvent, type PaypalWebhookEvent } from "./paypal-events";
import { processPaypalWebhookPure, type VerifyWebhookFn, type WebhookProcessResult } from "./paypal-webhook-process";
import {
  buildVerifyPayload,
  isPaypalVerificationSuccess,
  isTrustedPaypalCertUrl,
  parsePaypalWebhookHeaders,
} from "./paypal-verify";

export type { WebhookProcessResult, VerifyWebhookFn };
export { processPaypalWebhookPure } from "./paypal-webhook-process";

export async function verifyPaypalWebhookWithApi(payload: unknown): Promise<string> {
  const result = await paypalRequest<{ verification_status?: string }>(
    "/v1/notifications/verify-webhook-signature",
    { method: "POST", body: payload }
  );
  return result.verification_status ?? "FAILURE";
}

export async function processPaypalWebhook(input: {
  headers: Headers;
  rawBody: string;
  verify?: VerifyWebhookFn;
}): Promise<WebhookProcessResult> {
  const webhookId = getPaypalWebhookId();
  if (!webhookId) {
    return { ok: false, status: 503, error: "PAYPAL_WEBHOOK_ID is not configured" };
  }

  const parsedHeaders = parsePaypalWebhookHeaders(input.headers);
  if (!parsedHeaders) {
    return { ok: false, status: 400, error: "Missing PayPal webhook signature headers" };
  }

  if (!isTrustedPaypalCertUrl(parsedHeaders.certUrl)) {
    return { ok: false, status: 400, error: "Untrusted PayPal certificate URL" };
  }

  const event = parsePaypalWebhookEvent(input.rawBody);
  if (!event) {
    return { ok: false, status: 400, error: "Invalid webhook payload" };
  }

  const verifyPayload = buildVerifyPayload(parsedHeaders, webhookId, event);
  const verify = input.verify ?? verifyPaypalWebhookWithApi;
  const verificationStatus = await verify(verifyPayload);
  if (!isPaypalVerificationSuccess(verificationStatus)) {
    return { ok: false, status: 400, error: "PayPal webhook signature verification failed" };
  }

  return persistAndApplyEvent(event);
}

export async function persistAndApplyEvent(event: PaypalWebhookEvent): Promise<WebhookProcessResult> {
  try {
    await prisma.payPalWebhookEvent.create({
      data: {
        paypalEventId: event.id,
        eventType: event.event_type,
        status: "received",
        payload: event as object,
        paypalResourceId:
          typeof event.resource?.id === "string" ? event.resource.id : undefined,
      },
    });
  } catch (error) {
    const isDuplicate =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002";
    if (isDuplicate) {
      return {
        ok: true,
        status: 200,
        duplicate: true,
        eventId: event.id,
        eventType: event.event_type,
        activated: false,
      };
    }
    throw error;
  }

  let result: ApplyEventResult;
  try {
    result = await applyPaypalWebhookEvent(event);
    await prisma.payPalWebhookEvent.update({
      where: { paypalEventId: event.id },
      data: {
        status: result.skipped ? "ignored" : "processed",
        processedAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handler failed";
    await prisma.payPalWebhookEvent.update({
      where: { paypalEventId: event.id },
      data: { status: "failed", errorMessage: message },
    });
    return { ok: false, status: 500, error: message, eventId: event.id, eventType: event.event_type };
  }

  return {
    ok: true,
    status: 200,
    eventId: event.id,
    eventType: event.event_type,
    activated: result.activated,
    duplicate: false,
  };
}
