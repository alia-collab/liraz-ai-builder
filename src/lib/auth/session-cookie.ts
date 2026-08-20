import { SignJWT, jwtVerify } from "jose";
import type { AppUser } from "@/lib/auth/types";
import { getAuthSecret } from "@/lib/auth/env";

export const SESSION_COOKIE = "liraz-session";
export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;

function secretKey() {
  const secret = getAuthSecret();
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export function sessionCookieName() {
  return process.env.NODE_ENV === "production" ? `__Secure-${SESSION_COOKIE}` : SESSION_COOKIE;
}

export async function signSessionToken(user: AppUser): Promise<string | null> {
  const key = secretKey();
  if (!key) return null;
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    globalRole: user.globalRole,
    mfaEnabled: user.mfaEnabled,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(key);
}

export async function verifySessionToken(token: string | undefined): Promise<AppUser | null> {
  if (!token) return null;
  const key = secretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (!payload.id || !payload.email || !payload.globalRole) return null;
    return {
      id: String(payload.id),
      email: String(payload.email),
      name: (payload.name as string | null) ?? null,
      image: (payload.image as string | null) ?? null,
      globalRole: payload.globalRole as AppUser["globalRole"],
      mfaEnabled: Boolean(payload.mfaEnabled),
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure,
    maxAge: SESSION_MAX_AGE_SEC,
  };
}
