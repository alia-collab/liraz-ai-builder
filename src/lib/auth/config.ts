import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import type { GlobalRole } from "@prisma/client";
import { getAuthSecret, isRealDatabaseUrl, safeErrorMessage } from "@/lib/auth/env";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      globalRole: GlobalRole;
      mfaEnabled: boolean;
    };
  }
  interface User {
    globalRole: GlobalRole;
    mfaEnabled: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    globalRole: GlobalRole;
    mfaEnabled: boolean;
  }
}

async function loadPrisma() {
  const { default: prisma } = await import("@/lib/db");
  return prisma;
}

export function getAuthOptions(): NextAuthOptions {
  const secret = getAuthSecret();
  const options: NextAuthOptions = {
  // JWT + credentials. Do not load PrismaAdapter at import time — a missing
  // generated client or DATABASE_URL must not 500 /api/auth/providers.
  adapter: undefined,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
    newUser: "/onboarding",
    verifyRequest: "/verify-email",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) {
          console.info("[auth] authorize rejected: missing email or password");
          return null;
        }

        if (!isRealDatabaseUrl()) {
          console.error("[auth] authorize aborted: DATABASE_URL is not a usable Postgres URL");
          return null;
        }

        try {
          const prisma = await loadPrisma();
          const user = await prisma.user.findUnique({ where: { email } });

          if (!user || !user.passwordHash || user.isBlocked || user.deletedAt) {
            console.info("[auth] authorize rejected: no matching active user");
            return null;
          }

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) {
            console.info("[auth] authorize rejected: password mismatch");
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            globalRole: user.globalRole,
            mfaEnabled: user.mfaEnabled,
          };
        } catch (error) {
          console.error("[auth] authorize failed:", safeErrorMessage(error));
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.globalRole = user.globalRole;
        token.mfaEnabled = user.mfaEnabled;
      }
      if (trigger === "update" && session) {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.globalRole = token.globalRole;
        session.user.mfaEnabled = token.mfaEnabled;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (!user.id) return true;
      if (!isRealDatabaseUrl()) return true;
      try {
        const prisma = await loadPrisma();
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser?.isBlocked) return false;

        if (dbUser) {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
        }

        const { createAuditLog } = await import("@/lib/audit");
        await createAuditLog({
          userId: user.id,
          action: "USER_LOGIN",
          metadata: { provider: account?.provider ?? "credentials" },
        });
      } catch (error) {
        console.error("[auth] signIn callback error:", safeErrorMessage(error));
      }
      return true;
    },
  },
  events: {
    async signOut({ token }) {
      if (!token?.id || !isRealDatabaseUrl()) return;
      try {
        const { createAuditLog } = await import("@/lib/audit");
        await createAuditLog({
          userId: token.id as string,
          action: "USER_LOGOUT",
        });
      } catch (error) {
        console.error("[auth] signOut event error:", safeErrorMessage(error));
      }
    },
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" || process.env.NEXTAUTH_URL?.startsWith("https://")
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production" || Boolean(process.env.NEXTAUTH_URL?.startsWith("https://")),
        // Host-only (no Domain). Do not set Domain=.lirazai.com.
      },
    },
  },
  };

  // Never pass secret: undefined — that overrides process.env.NEXTAUTH_SECRET.
  if (secret) options.secret = secret;
  return options;
}

export const authOptions: NextAuthOptions = getAuthOptions();

export function isAdmin(role: GlobalRole): boolean {
  return role === "ADMINISTRATOR" || role === "SUPER_ADMINISTRATOR";
}

export function isSuperAdmin(role: GlobalRole): boolean {
  return role === "SUPER_ADMINISTRATOR";
}

export function isSupportAgent(role: GlobalRole): boolean {
  return role === "SUPPORT_AGENT" || isAdmin(role);
}
