import { cookies } from "next/headers";
import { jsonSuccess } from "@/lib/api/helpers";
import { sessionCookieName, sessionCookieOptions } from "@/lib/auth/session-cookie";

export async function POST() {
  const jar = await cookies();
  jar.set(sessionCookieName(), "", { ...sessionCookieOptions(), maxAge: 0 });
  return jsonSuccess({ ok: true });
}
