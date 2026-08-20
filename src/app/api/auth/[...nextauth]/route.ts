import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth/config";
import { getAuthSecret, logAuthDiagnostics } from "@/lib/auth/env";

export const dynamic = "force-dynamic";

function handler(req: NextRequest, context: { params: Promise<Record<string, string>> }) {
  logAuthDiagnostics("nextauth-route");
  if (!getAuthSecret()) {
    console.error(
      "[auth] NextAuth will return HTTP 500 until NEXTAUTH_SECRET or AUTH_SECRET is set in Vercel (Production, Preview, Development)."
    );
  }
  return NextAuth(getAuthOptions())(req, context);
}

export { handler as GET, handler as POST };
