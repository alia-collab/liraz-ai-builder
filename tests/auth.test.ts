import { describe, it, expect } from "vitest";
import { isAdmin, isSuperAdmin } from "@/lib/auth/config";

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
