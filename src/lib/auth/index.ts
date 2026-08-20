import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { GlobalRole } from "@prisma/client";
import { isAdmin, isSuperAdmin } from "./config";
import type { AppSession } from "./types";
import { sessionCookieName, verifySessionToken } from "./session-cookie";

export async function getSession(): Promise<AppSession> {
  const jar = await cookies();
  const user = await verifySessionToken(jar.get(sessionCookieName())?.value);
  return user ? { user } : null;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (!isAdmin(session.user.globalRole)) redirect("/403");
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireAuth();
  if (!isSuperAdmin(session.user.globalRole)) redirect("/403");
  if (!session.user.mfaEnabled) redirect("/dashboard/security?mfa=required");
  return session;
}

export function hasRole(userRole: GlobalRole, required: GlobalRole[]): boolean {
  return required.includes(userRole);
}

export { isAdmin, isSuperAdmin };
export { getAuthOptions, authOptions } from "./config";
