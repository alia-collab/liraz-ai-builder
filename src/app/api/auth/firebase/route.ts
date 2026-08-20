import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { isFirebaseAdminConfigured, verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { isRealDatabaseUrl, getAuthSecret, safeErrorMessage } from "@/lib/auth/env";
import { upsertFirebaseUser } from "@/lib/projects";
import { jsonError, jsonSuccess } from "@/lib/api/helpers";
import {
  sessionCookieName,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/auth/session-cookie";

export const runtime = "nodejs";

const bodySchema = z.object({
  idToken: z.string().min(20),
  name: z.string().min(1).max(120).optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!isFirebaseAdminConfigured()) {
      console.error("[auth] Firebase project id is not configured");
      return jsonError("Firebase is not configured on the server.", 503);
    }
    if (!getAuthSecret()) {
      console.error("[auth] Missing NEXTAUTH_SECRET / AUTH_SECRET for session cookie");
      return jsonError("Server session secret is missing.", 503);
    }
    if (!isRealDatabaseUrl()) {
      console.error("[auth] DATABASE_URL is not a hosted Postgres URL");
      return jsonError(
        "אין מסד נתונים בענן. ב-Vercel עורכים את DATABASE_URL ומדביקים את מחרוזת Prisma מ-Neon שמתחילה ב-postgresql://",
        503
      );
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("Invalid token", 400);

    const decoded = await verifyFirebaseIdToken(parsed.data.idToken);
    const email = decoded.email?.trim().toLowerCase();
    if (!email) return jsonError("Google/email account has no email address", 400);

    const { user, created } = await upsertFirebaseUser({
      firebaseUid: decoded.uid,
      email,
      name: parsed.data.name ?? decoded.name ?? null,
      image: decoded.picture ?? null,
      emailVerified: Boolean(decoded.email_verified),
    });

    const token = await signSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      globalRole: user.globalRole,
      mfaEnabled: user.mfaEnabled,
    });
    if (!token) return jsonError("Could not create session", 500);

    const jar = await cookies();
    jar.set(sessionCookieName(), token, sessionCookieOptions());

    return jsonSuccess({
      created,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    const message = safeErrorMessage(error);
    if (message === "USER_BLOCKED") return jsonError("This account is blocked", 403);
    console.error("[auth] firebase session failed:", message);
    return jsonError("Sign-in failed", 401);
  }
}
