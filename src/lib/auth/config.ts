import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import type { GlobalRole } from "@prisma/client";

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

export const authOptions: NextAuthOptions = {
  // JWT + credentials. PrismaAdapter is only needed for OAuth account linking.
  adapter:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? (PrismaAdapter(prisma) as NextAuthOptions["adapter"])
      : undefined,
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
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!user || !user.passwordHash || user.isBlocked || user.deletedAt) {
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          globalRole: user.globalRole,
          mfaEnabled: user.mfaEnabled,
        };
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
      try {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (dbUser?.isBlocked) return false;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        await createAuditLog({
          userId: user.id,
          action: "USER_LOGIN",
          metadata: { provider: account?.provider ?? "credentials" },
        });
      } catch (error) {
        console.error("signIn callback error:", error);
      }
      return true;
    },
  },
  events: {
    async signOut({ token }) {
      if (token?.id) {
        await createAuditLog({
          userId: token.id as string,
          action: "USER_LOGOUT",
        });
      }
    },
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // Host-only (no Domain). Do not set Domain=.lirazai.com — that would
        // send session cookies to future customer preview hosts like
        // {slug}.preview.lirazai.com.
      },
    },
  },
};

export function isAdmin(role: GlobalRole): boolean {
  return role === "ADMINISTRATOR" || role === "SUPER_ADMINISTRATOR";
}

export function isSuperAdmin(role: GlobalRole): boolean {
  return role === "SUPER_ADMINISTRATOR";
}

export function isSupportAgent(role: GlobalRole): boolean {
  return role === "SUPPORT_AGENT" || isAdmin(role);
}
