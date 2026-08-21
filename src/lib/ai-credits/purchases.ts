import prisma from "@/lib/db";
import { grantPurchasedCredits } from "./ledger";

/**
 * Grant purchased credits after a verified PayPal capture.
 * Idempotent on paypalCaptureId + purchase grant key.
 */
export async function grantCreditsFromPaypalCapture(input: {
  paypalCaptureId: string;
  paypalOrderId?: string | null;
  customId?: string | null;
}) {
  const captureId = input.paypalCaptureId.trim();
  if (!captureId) return { granted: false, reason: "missing_capture" as const };

  let purchase = await prisma.aICreditPurchase.findFirst({
    where: {
      OR: [
        { paypalCaptureId: captureId },
        ...(input.paypalOrderId ? [{ paypalOrderId: input.paypalOrderId }] : []),
        ...(input.customId?.startsWith("credit_purchase:")
          ? [{ id: input.customId.replace(/^credit_purchase:/, "") }]
          : []),
      ],
    },
  });

  if (!purchase && input.customId?.startsWith("credit_purchase:")) {
    const id = input.customId.replace(/^credit_purchase:/, "");
    purchase = await prisma.aICreditPurchase.findUnique({ where: { id } });
  }

  if (!purchase) {
    return { granted: false, reason: "purchase_not_found" as const };
  }

  if (purchase.status === "SUCCEEDED" && purchase.grantedAt) {
    return { granted: false, reason: "already_granted" as const };
  }

  await prisma.aICreditPurchase.update({
    where: { id: purchase.id },
    data: {
      paypalCaptureId: captureId,
      paypalOrderId: input.paypalOrderId ?? purchase.paypalOrderId,
    },
  });

  const result = await grantPurchasedCredits({
    userId: purchase.userId,
    purchaseId: purchase.id,
    credits: purchase.credits,
    description: `Purchased ${purchase.credits} Liraz AI Credits`,
  });

  return { granted: result.granted, alreadyGranted: result.alreadyGranted, reason: "ok" as const };
}
