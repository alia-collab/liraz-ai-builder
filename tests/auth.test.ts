import { describe, it, expect } from "vitest";
import { isAdmin, isSuperAdmin } from "@/lib/auth/config";
import { getAuthSecret, getDatabaseUrl, isRealDatabaseUrl, safeErrorMessage, toDirectDatabaseUrl, withPrismaFriendlyDatabaseUrl } from "@/lib/auth/env";
import { hashPassword } from "@/lib/projects";
import bcrypt from "bcryptjs";

describe("Auth roles", () => {
  it("identifies admin roles", () => {
    expect(isAdmin("ADMINISTRATOR")).toBe(true);
    expect(isAdmin("SUPER_ADMINISTRATOR")).toBe(true);
    expect(isAdmin("REGISTERED_USER")).toBe(false);
    expect(isAdmin("PAYING_CUSTOMER")).toBe(false);
  });

  it("identifies super admin", () => {
    expect(isSuperAdmin("SUPER_ADMINISTRATOR")).toBe(true);
    expect(isSuperAdmin("ADMINISTRATOR")).toBe(false);
  });
});

describe("Auth env", () => {
  it("reads NEXTAUTH_SECRET or AUTH_SECRET without exposing values", () => {
    const prevN = process.env.NEXTAUTH_SECRET;
    const prevA = process.env.AUTH_SECRET;
    try {
      process.env.NEXTAUTH_SECRET = "";
      process.env.AUTH_SECRET = "from-auth-secret";
      expect(getAuthSecret()).toBe("from-auth-secret");
    } finally {
      process.env.NEXTAUTH_SECRET = prevN;
      process.env.AUTH_SECRET = prevA;
    }
  });

  it("rejects placeholder DATABASE_URL", () => {
    const prevVercel = process.env.VERCEL;
    delete process.env.VERCEL;
    expect(isRealDatabaseUrl("postgresql://prisma:prisma@127.0.0.1:5432/prisma?schema=public")).toBe(false);
    expect(isRealDatabaseUrl("postgresql://postgres:x@127.0.0.1:5432/liraz_ai_builder")).toBe(true);
    expect(isRealDatabaseUrl("")).toBe(false);
    expect(isRealDatabaseUrl("postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require")).toBe(true);
    expect(
      isRealDatabaseUrl('"postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"')
    ).toBe(true);
    expect(
      isRealDatabaseUrl("DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require")
    ).toBe(true);
    process.env.VERCEL = "1";
    expect(isRealDatabaseUrl("postgresql://postgres:x@127.0.0.1:5432/liraz_ai_builder")).toBe(false);
    if (prevVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
  });

  it("uses Neon POSTGRES_PRISMA_URL when DATABASE_URL is localhost", () => {
    const prevDb = process.env.DATABASE_URL;
    const prevPrisma = process.env.POSTGRES_PRISMA_URL;
    const prevVercel = process.env.VERCEL;
    process.env.VERCEL = "1";
    process.env.DATABASE_URL = "postgresql://postgres:x@127.0.0.1:5432/liraz_ai_builder";
    process.env.POSTGRES_PRISMA_URL = "postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require";
    expect(getDatabaseUrl()).toContain("neon.tech");
    expect(isRealDatabaseUrl()).toBe(true);
    process.env.DATABASE_URL = prevDb;
    process.env.POSTGRES_PRISMA_URL = prevPrisma;
    if (prevVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
  });

  it("safeErrorMessage never stringifies objects blindly as secrets", () => {
    expect(safeErrorMessage(new Error("db down"))).toBe("db down");
  });

  it("makes Neon pooler URLs Prisma-friendly", () => {
    const pooled =
      "postgresql://u:p@ep-x-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
    const friendly = withPrismaFriendlyDatabaseUrl(pooled);
    expect(friendly).toContain("pgbouncer=true");
    expect(friendly).not.toContain("channel_binding");
    const direct = toDirectDatabaseUrl(pooled);
    expect(direct).not.toContain("-pooler");
  });
});

describe("Password hashing", () => {
  it("bcrypt hash compares successfully", async () => {
    const password = "TestPass123!";
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    await expect(bcrypt.compare(password, hash)).resolves.toBe(true);
    await expect(bcrypt.compare("wrong", hash)).resolves.toBe(false);
  });
});

describe("Session cookie", () => {
  it("signs and verifies a user token", async () => {
    const prev = process.env.NEXTAUTH_SECRET;
    process.env.NEXTAUTH_SECRET = "test-session-secret-at-least-32-chars!!";
    const { signSessionToken, verifySessionToken } = await import("@/lib/auth/session-cookie");
    const token = await signSessionToken({
      id: "user_1",
      email: "liraz@lirazai.com",
      name: "Liraz",
      image: null,
      globalRole: "REGISTERED_USER",
      mfaEnabled: false,
    });
    expect(token).toBeTruthy();
    const user = await verifySessionToken(token ?? undefined);
    expect(user?.email).toBe("liraz@lirazai.com");
    expect(user?.id).toBe("user_1");
    process.env.NEXTAUTH_SECRET = prev;
  });
});

describe("Firebase server config", () => {
  it("uses NEXT_PUBLIC_FIREBASE_PROJECT_ID when admin key is missing", async () => {
    const prevPublic = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const prevPrivate = process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_PROJECT_ID;
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "liraz-ai-builder";
    const { getFirebaseProjectId, isFirebaseAdminConfigured } = await import("@/lib/firebase/admin");
    expect(getFirebaseProjectId()).toBe("liraz-ai-builder");
    expect(isFirebaseAdminConfigured()).toBe(true);
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = prevPublic;
    if (prevPrivate === undefined) delete process.env.FIREBASE_PROJECT_ID;
    else process.env.FIREBASE_PROJECT_ID = prevPrivate;
  });
});
