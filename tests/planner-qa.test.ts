import { describe, it, expect } from "vitest";
import { planFromPrompt } from "@/lib/ai/pipeline/planner";
import { buildSnapshotFromSpec } from "@/lib/ai/pipeline/blueprint";
import { qaSnapshot } from "@/lib/ai/pipeline/qa";

describe("planner", () => {
  it("infers technician booking site with WhatsApp and RTL", () => {
    const spec = planFromPrompt("תבנה לי אתר לטכנאי מחשבים עם הזמנת שירות ווואטסאפ");
    const slugs = spec.pages.map((p) => p.slug);
    expect(spec.productType).toBe("BOOKING");
    expect(spec.productKind).toBe("BOOKING");
    expect(spec.locale).toBe("HE");
    expect(spec.direction).toBe("RTL");
    expect(spec.integrations.whatsapp).toBe(true);
    expect(slugs).toContain("home");
    expect(slugs).toContain("services");
    expect(slugs).toContain("book");
    expect(slugs).toContain("contact");
    expect(slugs).toContain("admin-leads");
    expect(spec.dataModel.some((t) => t.name === "leads")).toBe(true);
    expect(spec.dataModel.some((t) => t.name === "appointments")).toBe(true);
  });

  it("asks what to build when the prompt is vague", () => {
    const spec = planFromPrompt("תבנה לי אתר");
    expect(spec.needsClarification).toBe(true);
    expect(spec.questions[0]).toContain("מה תרצו לבנות");
    expect(spec.typeOptions?.length).toBeGreaterThan(3);
  });

  it("plans a real store with cart, checkout, and orders", () => {
    const spec = planFromPrompt("Build me an online store for handmade candles with checkout");
    expect(spec.productKind).toBe("STORE");
    const slugs = spec.pages.map((p) => p.slug);
    expect(slugs).toEqual(expect.arrayContaining(["products", "cart", "checkout", "account", "admin-orders"]));
    expect(spec.integrations.payments).toBe(true);
    expect(spec.needsSetup.some((s) => s.key === "stripe")).toBe(true);
  });

  it("does not claim native store readiness for a mobile app", () => {
    const spec = planFromPrompt("I need an iOS App Store app for my studio");
    expect(spec.productKind).toBe("NATIVE_MOBILE");
    expect(spec.integrations.nativeStores).toBe(true);
    expect(spec.needsSetup.some((s) => s.key === "native")).toBe(true);
  });
});

describe("QA", () => {
  it("catches dead preview links", () => {
    const spec = planFromPrompt("אתר תדמית קטן עם טופס יצירת קשר");
    const snapshot = buildSnapshotFromSpec(spec, "proj_1");
    snapshot.pages[0].components.push({
      id: "bad",
      type: "Button",
      props: { href: "/preview/proj_1/does-not-exist" },
    });
    const qa = qaSnapshot(snapshot, "proj_1");
    expect(qa.passed).toBe(false);
    expect(qa.errors.some((e) => e.includes("Dead page"))).toBe(true);
  });

  it("passes a spec-built technician snapshot", () => {
    const spec = planFromPrompt("תבנה לי אתר לטכנאי מחשבים עם הזמנת שירות ווואטסאפ");
    const snapshot = buildSnapshotFromSpec(spec, "proj_ok");
    const qa = qaSnapshot(snapshot, "proj_ok", spec);
    expect(qa.passed, qa.errors.join("; ")).toBe(true);
  });

  it("passes a store snapshot with working checkout structure", () => {
    const spec = planFromPrompt("Build me an online store for handmade candles with checkout");
    const snapshot = buildSnapshotFromSpec(spec, "shop_1");
    const qa = qaSnapshot(snapshot, "shop_1", spec);
    expect(qa.passed, qa.errors.join("; ")).toBe(true);
    expect(snapshot.pages.some((p) => p.slug === "checkout")).toBe(true);
  });
});
