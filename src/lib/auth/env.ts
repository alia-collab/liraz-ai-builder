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

export function isRealDatabaseUrl(url = process.env.DATABASE_URL): boolean {
  if (!url?.trim()) return false;
  if (url === PLACEHOLDER_DB) return false;
  if (!url.startsWith("postgres")) return false;
  if (url.includes("127.0.0.1") && url.includes("prisma:prisma")) return false;
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
  const db = process.env.DATABASE_URL;
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
