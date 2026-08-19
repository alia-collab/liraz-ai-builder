import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Stripe is no longer used. Platform billing webhooks are at /api/webhooks/paypal." },
    { status: 410 }
  );
}
