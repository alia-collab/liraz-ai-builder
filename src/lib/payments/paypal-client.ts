export type PaypalMode = "sandbox" | "live";

export class PaypalApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "PaypalApiError";
  }
}

type TokenCache = { accessToken: string; expiresAt: number };

let tokenCache: TokenCache | null = null;

export function getPaypalMode(): PaypalMode {
  return process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";
}

export function getPaypalApiBase(mode: PaypalMode = getPaypalMode()): string {
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function isPaypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim());
}

export function getPaypalWebhookId(): string | undefined {
  return process.env.PAYPAL_WEBHOOK_ID?.trim() || undefined;
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new PaypalApiError("PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.", 503);
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${getPaypalApiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    tokenCache = null;
    throw new PaypalApiError("PayPal authentication failed", response.status);
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new PaypalApiError("PayPal authentication returned no access token", 502);
  }

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 300) * 1000,
  };
  return tokenCache.accessToken;
}

export function clearPaypalTokenCache() {
  tokenCache = null;
}

export async function paypalRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    idempotencyKey?: string;
  } = {}
): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (options.idempotencyKey) {
    headers["PayPal-Request-Id"] = options.idempotencyKey;
  }

  const response = await fetch(`${getPaypalApiBase()}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T & { message?: string; name?: string }) : ({} as T);

  if (!response.ok) {
    const message =
      (data as { message?: string }).message ||
      (data as { name?: string }).name ||
      `PayPal request failed (${response.status})`;
    throw new PaypalApiError(message, response.status);
  }

  return data;
}

export type PaypalLink = { href: string; rel: string; method?: string };

export function findPaypalLink(links: PaypalLink[] | undefined, rel: string): string | undefined {
  return links?.find((link) => link.rel === rel)?.href;
}
