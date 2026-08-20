import { NextResponse } from "next/server";
import { getAuthSecret, getAuthUrl, isRealDatabaseUrl } from "@/lib/auth/env";

export const dynamic = "force-dynamic";

/**
 * Public auth readiness check. Booleans only — no secrets.
 */
export async function GET() {
  const secret = Boolean(getAuthSecret());
  const url = Boolean(getAuthUrl());
  const database = isRealDatabaseUrl();
  const ok = secret && (process.env.NODE_ENV !== "production" || url);

  return NextResponse.json(
    {
      ok,
      secretConfigured: secret,
      nextAuthUrlConfigured: url,
      databaseConfigured: database,
    },
    { status: ok ? 200 : 503 }
  );
}
