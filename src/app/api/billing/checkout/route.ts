import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import {
  createPaypalSubscription,
  isPaypalConfigured,
  paypalNotConfiguredMessage,
  resolvePaypalPlanForInterval,
  upsertPendingSubscription,
} from "@/lib/payments";
import { PaypalApiError } from "@/lib/payments/paypal-client";

const schema = z.object({
  interval: z.enum(["MONTHLY", "YEARLY"]),
  couponCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;

  if (!isPaypalConfigured()) {
    return jsonError(paypalNotConfiguredMessage(), 503);
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input", 400);

  try {
    const plan = await resolvePaypalPlanForInterval(parsed.data.interval);
    const paypal = await createPaypalSubscription({
      userId: session.user.id,
      email: session.user.email!,
      planId: plan.planId,
      interval: parsed.data.interval,
      paypalPlanId: plan.paypalPlanId,
    });

    await upsertPendingSubscription({
      userId: session.user.id,
      planId: plan.planId,
      interval: parsed.data.interval,
      paypalSubscriptionId: paypal.subscriptionId,
      paypalPlanId: plan.paypalPlanId,
    });

    return jsonSuccess({ url: paypal.approveUrl, status: "PENDING" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    const status = err instanceof PaypalApiError ? err.status : 500;
    console.error("PayPal checkout error:", message);
    return jsonError(message, status >= 400 && status < 600 ? status : 500);
  }
}
