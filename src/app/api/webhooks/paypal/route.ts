import { NextRequest, NextResponse } from "next/server";
import { processPaypalWebhook } from "@/lib/payments/paypal-webhooks";
import { consumeRateLimit } from "@/lib/payments/rate-limit";
import { getClientIp } from "@/lib/api/helpers";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = consumeRateLimit(`paypal-webhook:${ip}`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const rawBody = await request.text();
  try {
    const result = await processPaypalWebhook({ headers: request.headers, rawBody });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      received: true,
      duplicate: Boolean(result.duplicate),
      eventId: result.eventId,
    });
  } catch (err) {
    console.error("PayPal webhook handler error:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
