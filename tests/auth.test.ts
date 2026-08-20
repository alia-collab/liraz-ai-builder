import { describe, it, expect } from "vitest";
import { isAdmin, isSuperAdmin } from "@/lib/auth/config";
import { getAuthSecret, isRealDatabaseUrl, safeErrorMessage } from "@/lib/auth/env";
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
    expect(isRealDatabaseUrl("postgresql://prisma:prisma@127.0.0.1:5432/prisma?schema=public")).toBe(false);
    expect(isRealDatabaseUrl("")).toBe(false);
    expect(isRealDatabaseUrl("postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require")).toBe(true);
  });

  it("safeErrorMessage never stringifies objects blindly as secrets", () => {
    expect(safeErrorMessage(new Error("db down"))).toBe("db down");
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
