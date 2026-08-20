import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** NextAuth is no longer used. Login goes through Firebase + /api/auth/firebase. */
function gone() {
  return NextResponse.json(
    { error: "This auth endpoint is disabled. Use email/password or Google on /login." },
    { status: 410 }
  );
}

export async function GET() {
  return gone();
}

export async function POST() {
  return gone();
}
