import { describe, it, expect } from "vitest";
import { runSecurityGate } from "@/lib/agent/security-gate";
import { runBuildTest, runVisualQa, runFunctionalQa } from "@/lib/agent/validators";
import { AGENT_BUILD_STAGES, AGENT_MAX_REPAIR_ATTEMPTS } from "@/lib/agent/stages";
import type { ProjectSnapshot } from "@/lib/ai/types";

const baseSnapshot = (): ProjectSnapshot => ({
  name: "Test Biz",
  type: "WEBSITE",
  locale: "HE",
  direction: "RTL",
  theme: { primaryColor: "#0f766e", fontFamily: "Heebo", borderRadius: "0.75rem" },
  pages: [
    {
      slug: "home",
      title: "בית",
      locale: "HE",
      direction: "RTL",
      components: [
        { id: "n1", type: "Navbar", props: { links: [{ href: "/preview/p1/home", label: "בית" }] } },
        { id: "h1", type: "Hero", props: { title: "עסק אמיתי", subtitle: "שירות מקצועי" } },
        { id: "f1", type: "Footer", props: { text: "יצירת קשר" } },
      ],
      seo: { title: "בית", description: "עמוד הבית" },
    },
    {
      slug: "contact",
      title: "צור קשר",
      locale: "HE",
      direction: "RTL",
      components: [
        { id: "c1", type: "ContactForm", props: { action: "/api/runtime/leads" } },
        { id: "f2", type: "Footer", props: {} },
      ],
      seo: { title: "צור קשר", description: "טופס" },
    },
  ],
});

describe("agent stages", () => {
  it("includes the full production stage pipeline", () => {
    const keys = AGENT_BUILD_STAGES.map((s) => s.key);
    expect(keys).toEqual([
      "analyze",
      "plan",
      "architecture",
      "database",
      "backend",
      "frontend",
      "integration",
      "security_review",
      "build_test",
      "auto_repair",
      "visual_qa",
      "functional_qa",
      "ready",
    ]);
    expect(AGENT_MAX_REPAIR_ATTEMPTS).toBeGreaterThanOrEqual(1);
  });
});

describe("security gate", () => {
  it("rejects secret leakage and backdoors", () => {
    const snap = baseSnapshot();
    snap.pages[0].components[1].props = {
      title: "x",
      note: "ANTHROPIC_API_KEY=sk-secret",
    };
    const result = runSecurityGate(snap);
    expect(result.passed).toBe(false);
    expect(result.errors.some((e) => /secret/i.test(e))).toBe(true);
  });

  it("passes a clean snapshot", () => {
    expect(runSecurityGate(baseSnapshot()).passed).toBe(true);
  });
});

describe("build / visual / functional gates", () => {
  it("rejects TODO placeholders", () => {
    const snap = baseSnapshot();
    snap.pages[0].components[1].props = { title: "TODO finish this page" };
    const result = runBuildTest(snap, "p1");
    expect(result.passed).toBe(false);
  });

  it("requires RTL for Hebrew", () => {
    const snap = baseSnapshot();
    snap.direction = "LTR";
    expect(runVisualQa(snap).passed).toBe(false);
  });

  it("requires contact form when contact page exists", () => {
    const snap = baseSnapshot();
    snap.pages = snap.pages.filter((p) => p.slug === "home");
    snap.pages.push({
      slug: "contact",
      title: "contact",
      locale: "HE",
      direction: "RTL",
      components: [{ id: "t", type: "Text", props: { text: "call us" } }],
      seo: {},
    });
    expect(runFunctionalQa(snap).passed).toBe(false);
  });
});
