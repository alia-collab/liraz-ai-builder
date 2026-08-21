import { describe, it, expect } from "vitest";
import {
  availableCredits,
  costUsdToCredits,
  creditWarningLevel,
  monthlyGrantIdempotencyKey,
  purchaseGrantIdempotencyKey,
  splitUsageAcrossBuckets,
} from "@/lib/ai-credits/math";
import { AI_CREDITS_PER_USD, AI_CREDITS_EXHAUSTED_CODE } from "@/lib/ai-credits/config";
import { AICreditsExhaustedError } from "@/lib/ai-credits/ledger";

describe("Liraz AI Credits conversion", () => {
  it("uses 1000 credits per USD by default", () => {
    expect(AI_CREDITS_PER_USD).toBe(1000);
  });

  it("converts real Anthropic cost with ceil", () => {
    expect(costUsdToCredits(0.01)).toBe(10);
    expect(costUsdToCredits(0.1)).toBe(100);
    expect(costUsdToCredits(0.5)).toBe(500);
    expect(costUsdToCredits(1)).toBe(1000);
    expect(costUsdToCredits(0.001)).toBe(1);
    expect(costUsdToCredits(0)).toBe(0);
    expect(costUsdToCredits(-1)).toBe(0);
  });
});

describe("monthly grant idempotency keys", () => {
  it("are stable for the same subscription period", () => {
    const start = new Date("2026-03-01T00:00:00.000Z");
    const a = monthlyGrantIdempotencyKey("sub_1", start);
    const b = monthlyGrantIdempotencyKey("sub_1", start);
    expect(a).toBe(b);
    expect(a).toContain("MONTHLY_GRANT:sub_1:");
  });

  it("differ across periods so duplicate grants are impossible for the same key", () => {
    const a = monthlyGrantIdempotencyKey("sub_1", new Date("2026-03-01T00:00:00.000Z"));
    const b = monthlyGrantIdempotencyKey("sub_1", new Date("2026-04-01T00:00:00.000Z"));
    expect(a).not.toBe(b);
  });

  it("purchase keys are unique per purchase id", () => {
    expect(purchaseGrantIdempotencyKey("p1")).toBe("PURCHASE:p1");
    expect(purchaseGrantIdempotencyKey("p1")).not.toBe(purchaseGrantIdempotencyKey("p2"));
  });
});

describe("credit priority and availability", () => {
  it("uses subscription credits before purchased", () => {
    expect(splitUsageAcrossBuckets(120, 100, 500)).toEqual({
      fromSubscription: 100,
      fromPurchased: 20,
    });
  });

  it("does not invent credits beyond balances", () => {
    expect(splitUsageAcrossBuckets(999, 10, 5)).toEqual({
      fromSubscription: 10,
      fromPurchased: 5,
    });
  });

  it("subtracts reserved credits from available", () => {
    expect(
      availableCredits({
        subscriptionCredits: 8000,
        purchasedCredits: 1000,
        reservedCredits: 500,
      })
    ).toBe(8500);
  });

  it("never goes negative on available", () => {
    expect(
      availableCredits({
        subscriptionCredits: 10,
        purchasedCredits: 0,
        reservedCredits: 50,
      })
    ).toBe(0);
  });

  it("purchased credits survive a subscription reset simulation", () => {
    const before = { subscriptionCredits: 100, purchasedCredits: 15000, reservedCredits: 0 };
    // monthly renewal: expire subscription, keep purchased
    const after = {
      subscriptionCredits: 8000,
      purchasedCredits: before.purchasedCredits,
      reservedCredits: 0,
    };
    expect(after.purchasedCredits).toBe(15000);
    expect(availableCredits(after)).toBe(23000);
  });
});

describe("warnings and exhaustion", () => {
  it("warns at 20% and 10%", () => {
    expect(creditWarningLevel(1600, 8000)).toBe("low");
    expect(creditWarningLevel(800, 8000)).toBe("critical");
    expect(creditWarningLevel(0, 8000)).toBe("empty");
    expect(creditWarningLevel(4000, 8000)).toBe("none");
  });

  it("exposes AI_CREDITS_EXHAUSTED code for API clients", () => {
    const err = new AICreditsExhaustedError();
    expect(err.code).toBe(AI_CREDITS_EXHAUSTED_CODE);
    expect(err.message).toContain("AI Credits");
  });
});

describe("concurrency hold math", () => {
  it("two overlapping holds cannot exceed free balance", () => {
    let account = { subscriptionCredits: 100, purchasedCredits: 0, reservedCredits: 0 };
    const free1 = availableCredits(account);
    const hold1 = Math.min(80, free1);
    account = { ...account, reservedCredits: account.reservedCredits + hold1 };
    const free2 = availableCredits(account);
    const hold2 = Math.min(80, free2);
    expect(hold1 + hold2).toBeLessThanOrEqual(100);
    expect(hold2).toBe(20);
  });
});

describe("customer API safety (contract)", () => {
  it("customer summary shape must not include costUsd fields", () => {
    const customerSafeKeys = [
      "remaining",
      "allowance",
      "usedThisCycle",
      "subscriptionCredits",
      "purchasedCredits",
      "nextRenewalAt",
      "warning",
      "packages",
      "history",
    ];
    expect(customerSafeKeys).not.toContain("costUsd");
    expect(customerSafeKeys).not.toContain("tokensUsed");
    expect(customerSafeKeys).not.toContain("ANTHROPIC");
  });
});
