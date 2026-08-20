import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { isFirebaseClientConfigured } from "@/lib/firebase/web-config";
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
  const firebaseClient = isFirebaseClientConfigured();
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
