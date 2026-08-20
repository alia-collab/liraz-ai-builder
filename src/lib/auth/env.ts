/**
 * Auth environment helpers. Never log secret values.
 */

const PLACEHOLDER_DB =
  "postgresql://prisma:prisma@127.0.0.1:5432/prisma?schema=public";

export function getAuthSecret(): string | undefined {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret?.trim()) return undefined;
  return secret.trim();
}

export function getAuthUrl(): string | undefined {
  return process.env.NEXTAUTH_URL?.trim() || undefined;
}

export function normalizeDatabaseUrl(url: string | undefined): string {
  if (!url) return "";
  let value = url.trim();
  value = value.replace(/^DATABASE_URL\s*=\s*/i, "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

export function isHostedPostgresUrl(url: string | undefined): boolean {
  const value = normalizeDatabaseUrl(url);
  if (!value) return false;
  if (value === PLACEHOLDER_DB) return false;
  if (!value.startsWith("postgres")) return false;
  if (value.includes("127.0.0.1") || /localhost/i.test(value)) return false;
  return true;
}

export function getDatabaseUrl(): string | undefined {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL,
  ]
    .map(normalizeDatabaseUrl)
    .filter(Boolean);
  return candidates.find((url) => isHostedPostgresUrl(url));
}

export function describeDatabase(): {
  configured: boolean;
  hasDatabaseUrl: boolean;
  hasAltPostgresUrl: boolean;
  looksLocal: boolean;
  kind: "neon" | "localhost" | "missing" | "other";
} {
  const raw = normalizeDatabaseUrl(process.env.DATABASE_URL);
  const configured = Boolean(getDatabaseUrl());
  const looksLocal = Boolean(raw && (raw.includes("127.0.0.1") || /localhost/i.test(raw)));
  let kind: "neon" | "localhost" | "missing" | "other" = "missing";
  if (!raw) kind = "missing";
  else if (looksLocal) kind = "localhost";
  else if (/neon\.tech/i.test(raw)) kind = "neon";
  else kind = "other";
  return {
    configured,
    hasDatabaseUrl: Boolean(raw),
    hasAltPostgresUrl: Boolean(
      normalizeDatabaseUrl(process.env.POSTGRES_PRISMA_URL) ||
        normalizeDatabaseUrl(process.env.POSTGRES_URL)
    ),
    looksLocal,
    kind,
  };
}

export function isRealDatabaseUrl(url?: string): boolean {
  if (url !== undefined) {
    const hosted = isHostedPostgresUrl(url);
    if (hosted) return true;
    if (process.env.VERCEL === "1") return false;
    const value = normalizeDatabaseUrl(url);
    if (!value || value === PLACEHOLDER_DB || !value.startsWith("postgres")) return false;
    if (value.includes("prisma:prisma@127.0.0.1")) return false;
    return true;
  }
  if (getDatabaseUrl()) return true;
  const raw = normalizeDatabaseUrl(process.env.DATABASE_URL);
  if (process.env.VERCEL === "1") return false;
  if (!raw || raw === PLACEHOLDER_DB || !raw.startsWith("postgres")) return false;
  if (raw.includes("prisma:prisma@127.0.0.1")) return false;
  return true;
}

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url.replace(/^postgresql:/, "http:")).host;
  } catch {
    return "(unparseable)";
  }
}

export function logAuthDiagnostics(reason = "startup"): void {
  const secret = getAuthSecret();
  const authUrl = getAuthUrl();
  const db = getDatabaseUrl() || process.env.DATABASE_URL;
  console.info("[auth] diagnostics", {
    reason,
    hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET?.trim()),
    hasAuthSecret: Boolean(process.env.AUTH_SECRET?.trim()),
    secretConfigured: Boolean(secret),
    nextAuthUrlConfigured: Boolean(authUrl),
    databaseUrlConfigured: Boolean(db?.trim()),
    databaseLooksReal: isRealDatabaseUrl(db),
    databaseHost: hostOf(db),
    nodeEnv: process.env.NODE_ENV ?? "undefined",
    vercel: Boolean(process.env.VERCEL),
  });
  if (!secret) {
    console.error(
      "[auth] Missing NEXTAUTH_SECRET (or AUTH_SECRET). Set it in Vercel → Settings → Environment Variables for Production, Preview, and Development."
    );
  }
  if (!authUrl && process.env.NODE_ENV === "production") {
    console.error(
      "[auth] Missing NEXTAUTH_URL. Set NEXTAUTH_URL=https://lirazai.com in Vercel for Production."
    );
  }
  if (!isRealDatabaseUrl(db)) {
    console.error(
      "[auth] DATABASE_URL is missing or is a local placeholder. Credentials login and registration need a hosted Postgres URL in Vercel."
    );
  }
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}
