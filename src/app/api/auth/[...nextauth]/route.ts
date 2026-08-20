import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getAuthSecret, logAuthDiagnostics } from "@/lib/auth/env";

logAuthDiagnostics("nextauth-route");

if (!getAuthSecret()) {
  console.error(
    "[auth] NextAuth will return HTTP 500 until NEXTAUTH_SECRET or AUTH_SECRET is set in Vercel (Production, Preview, Development)."
  );
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
