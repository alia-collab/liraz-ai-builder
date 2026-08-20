import { cookies } from "next/headers";
import { jsonSuccess } from "@/lib/api/helpers";
import { sessionCookieName, verifySessionToken } from "@/lib/auth/session-cookie";

export async function GET() {
  const jar = await cookies();
  const user = await verifySessionToken(jar.get(sessionCookieName())?.value);
  return jsonSuccess({ user: user ?? null });
}
