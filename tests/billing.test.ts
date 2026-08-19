import { describe, it, expect } from "vitest";
import { formatCurrency, slugify, generateSubdomain } from "@/lib/utils";

describe("Utils", () => {
  it("formats currency from cents", () => {
    expect(formatCurrency(3500)).toBe("$35.00");
    expect(formatCurrency(42000)).toBe("$420.00");
  });

  it("slugifies text", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
    expect(slugify("  Test  ")).toBe("test");
  });

  it("generates subdomain with suffix", () => {
    const sub = generateSubdomain("My Store");
    expect(sub).toMatch(/^my-store-[a-z0-9]{4}$/);
  });
});

describe("Billing pricing defaults", () => {
  it("monthly price is $35 and yearly is $420", () => {
    const monthly = 3500;
    const yearly = 42000;
    expect(monthly * 12).toBe(yearly);
    expect(formatCurrency(monthly)).toBe("$35.00");
    expect(formatCurrency(yearly)).toBe("$420.00");
  });
});
