import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { getAuthSecret, getAuthUrl, isRealDatabaseUrl } from "@/lib/auth/env";

export const dynamic = "force-dynamic";

/**
 * Public auth readiness check. Booleans only — no secrets.
 */
export async function GET() {
  const secret = Boolean(getAuthSecret());
  const url = Boolean(getAuthUrl());
  const database = isRealDatabaseUrl();
  const firebaseAdmin = isFirebaseAdminConfigured();
  const firebaseClient = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  );
  const ok = secret && firebaseAdmin && firebaseClient && (process.env.NODE_ENV !== "production" || url);

  return NextResponse.json(
    {
      ok,
      secretConfigured: secret,
      nextAuthUrlConfigured: url,
      databaseConfigured: database,
      firebaseAdminConfigured: firebaseAdmin,
      firebaseClientConfigured: firebaseClient,
    },
    { status: ok ? 200 : 503 }
  );
}
