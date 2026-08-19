export type PaypalWebhookHeaders = {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
};

const TRUSTED_CERT_HOSTS = new Set([
  "api.paypal.com",
  "api-m.paypal.com",
  "api.sandbox.paypal.com",
  "api-m.sandbox.paypal.com",
]);

export function isTrustedPaypalCertUrl(certUrl: string): boolean {
  try {
    const url = new URL(certUrl);
    if (url.protocol !== "https:") return false;
    return TRUSTED_CERT_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function parsePaypalWebhookHeaders(headers: Headers): PaypalWebhookHeaders | null {
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  const transmissionSig = headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return null;
  }

  return { transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig };
}

export function buildVerifyPayload(
  headers: PaypalWebhookHeaders,
  webhookId: string,
  webhookEvent: unknown
) {
  return {
    transmission_id: headers.transmissionId,
    transmission_time: headers.transmissionTime,
    cert_url: headers.certUrl,
    auth_algo: headers.authAlgo,
    transmission_sig: headers.transmissionSig,
    webhook_id: webhookId,
    webhook_event: webhookEvent,
  };
}

export function isPaypalVerificationSuccess(status: string | undefined | null): boolean {
  return status === "SUCCESS";
}
