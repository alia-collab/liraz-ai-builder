import { CANONICAL_ORIGIN } from "@/lib/site-url";

const DEFAULT_ORIGINS = [CANONICAL_ORIGIN, "https://www.lirazai.com"];

function extraOriginsFromEnv(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;

  const allowed = new Set([...DEFAULT_ORIGINS, ...extraOriginsFromEnv()]);

  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:3000");
    allowed.add("http://127.0.0.1:3000");
  }

  if (allowed.has(origin)) return true;

  try {
    const host = new URL(origin).hostname;
    return host === "preview.lirazai.com" || host.endsWith(".preview.lirazai.com");
  } catch {
    return false;
  }
}

export function applyCorsHeaders(headers: Headers, origin: string | null): void {
  if (!origin || !isAllowedOrigin(origin)) return;
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.append("Vary", "Origin");
}
