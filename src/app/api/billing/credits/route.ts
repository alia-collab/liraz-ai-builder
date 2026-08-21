import { NextRequest } from "next/server";
import { requireApiAuth, jsonError, jsonSuccess } from "@/lib/api/helpers";
import { getCustomerCreditSummary } from "@/lib/ai-credits/customer";
import prisma from "@/lib/db";

export async function GET() {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;

  const summary = await getCustomerCreditSummary(session.user.id);
  return jsonSuccess(summary);
}

/** Create a PENDING credit purchase — credits grant only after verified PayPal capture. */
export async function POST(request: NextRequest) {
  const { error, session } = await requireApiAuth();
  if (error || !session) return error!;

  const body = (await request.json().catch(() => ({}))) as { packageSlug?: string };
  const slug = String(body.packageSlug ?? "").trim();
  if (!slug) return jsonError("packageSlug is required", 400);

  const pkg = await prisma.aICreditPackage.findFirst({
    where: { slug, isActive: true },
  });
  if (!pkg) return jsonError("Package not found", 404);

  const purchase = await prisma.aICreditPurchase.create({
    data: {
      userId: session.user.id,
      packageId: pkg.id,
      credits: pkg.credits,
      amountUsdCents: pkg.priceUsdCents,
      status: "PENDING",
    },
  });

  // Do not grant credits here. Grant only from verified PayPal webhook / capture.
  return jsonSuccess(
    {
      purchaseId: purchase.id,
      package: {
        slug: pkg.slug,
        name: pkg.name,
        credits: pkg.credits,
        priceUsdCents: pkg.priceUsdCents,
      },
      status: "PENDING",
      message:
        "Purchase created as PENDING. Credits are granted only after a verified PayPal payment capture — never from the browser.",
    },
    201
  );
}
