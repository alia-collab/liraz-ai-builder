import { getServerSession } from "next-auth";
import { getAuthOptions, isAdmin, isSuperAdmin } from "./config";
import { redirect } from "next/navigation";
import type { GlobalRole } from "@prisma/client";

export async function getSession() {
  return getServerSession(getAuthOptions());
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

export { getAuthOptions, authOptions, isAdmin, isSuperAdmin };
