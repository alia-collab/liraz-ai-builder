import { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import prisma from "@/lib/db";
import { isPaypalConfigured } from "@/lib/payments";
import { syncSubscriptionFromPaypal } from "@/lib/payments/paypal-handlers";

const schema = z.object({
  subscriptionId: z.string().min(3).optional(),
});

export async function POST(request: NextRequest) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;
  if (!isPaypalConfigured()) {
    return jsonError("PayPal is not configured", 503);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid input", 400);

  const local = parsed.data.subscriptionId
    ? await prisma.subscription.findFirst({
        where: {
          userId: session.user.id,
          paypalSubscriptionId: parsed.data.subscriptionId,
        },
      })
    : await prisma.subscription.findFirst({
        where: { userId: session.user.id, paypalSubscriptionId: { not: null } },
        orderBy: { createdAt: "desc" },
      });

  if (!local?.paypalSubscriptionId) {
    return jsonError("No PayPal subscription to confirm", 404);
  }

  const result = await syncSubscriptionFromPaypal(local.paypalSubscriptionId);
  return jsonSuccess({
    status: result.status,
    activated: result.activated,
    pending: result.status === "PENDING",
  });
}
