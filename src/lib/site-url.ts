/** Canonical production origin. www redirects here (see vercel.json + middleware). */
export const CANONICAL_HOST = "lirazai.com";
export const CANONICAL_ORIGIN = "https://lirazai.com";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Runtime app origin: local in development, https://lirazai.com in production.
 * Prefer NEXT_PUBLIC_APP_URL / NEXTAUTH_URL so Vercel env stays the source of truth.
 */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (fromEnv) return stripTrailingSlash(fromEnv);

  if (process.env.VERCEL_ENV === "production") return CANONICAL_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return "http://localhost:3000";
}

/** SEO / sitemap / Open Graph always use the apex domain in production. */
export function getCanonicalOrigin(): string {
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    return CANONICAL_ORIGIN;
  }
  return getSiteUrl();
}
