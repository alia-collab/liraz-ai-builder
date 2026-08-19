import { parsePaypalWebhookEvent, type PaypalWebhookEvent } from "./paypal-events";
import {
  buildVerifyPayload,
  isPaypalVerificationSuccess,
  isTrustedPaypalCertUrl,
  parsePaypalWebhookHeaders,
} from "./paypal-verify";

export type WebhookProcessResult = {
  ok: boolean;
  status: number;
  error?: string;
  duplicate?: boolean;
  activated?: boolean;
  eventId?: string;
  eventType?: string;
};

export type VerifyWebhookFn = (payload: unknown) => Promise<string>;

export type VerifiedEventResult = {
  action: string;
  activated: boolean;
  skipped: boolean;
};

/** Never mutates subscription state unless PayPal verification succeeds. */
export async function processPaypalWebhookPure(input: {
  headers: Headers;
  rawBody: string;
  webhookId: string;
  verify: VerifyWebhookFn;
  seenEventIds: Set<string>;
  onVerified: (event: PaypalWebhookEvent) => Promise<VerifiedEventResult> | VerifiedEventResult;
}): Promise<WebhookProcessResult & { applied?: VerifiedEventResult }> {
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

  const verificationStatus = await input.verify(
    buildVerifyPayload(parsedHeaders, input.webhookId, event)
  );
  if (!isPaypalVerificationSuccess(verificationStatus)) {
    return { ok: false, status: 400, error: "PayPal webhook signature verification failed" };
  }

  if (input.seenEventIds.has(event.id)) {
    return {
      ok: true,
      status: 200,
      duplicate: true,
      activated: false,
      eventId: event.id,
      eventType: event.event_type,
    };
  }
  input.seenEventIds.add(event.id);
  const applied = await input.onVerified(event);
  return {
    ok: true,
    status: 200,
    activated: applied.activated,
    duplicate: false,
    eventId: event.id,
    eventType: event.event_type,
    applied,
  };
}
