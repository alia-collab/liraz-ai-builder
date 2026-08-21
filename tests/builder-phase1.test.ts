import { describe, it, expect } from "vitest";
import { analysisFromSpec, architectureFromSpec, designFromSpec } from "@/lib/builder/analyze";
import { applyBuilderActions } from "@/lib/builder/actions";
import { canMarkProjectReady } from "@/lib/builder/completion";
import { scoreVisualQa } from "@/lib/builder/visual-score";
import { VISUAL_QA_MIN_SCORE } from "@/lib/builder/schemas";
import { planFromPrompt } from "@/lib/ai/pipeline/planner";
import type { ProjectSnapshot } from "@/lib/ai/types";
import { runSecurityGate } from "@/lib/agent/security-gate";
import { runBuildTest } from "@/lib/agent/validators";

describe("Phase 1 builder analysis", () => {
  it("produces Zod-valid requirement analysis from spec", () => {
    const spec = planFromPrompt("אתר תיקון מחשבים עם טופס יצירת קשר");
    const analysis = analysisFromSpec(spec);
    expect(analysis.pages.length).toBeGreaterThan(0);
    expect(analysis.acceptanceCriteria.length).toBeGreaterThan(0);
    expect(architectureFromSpec(spec).routes.length).toBe(analysis.pages.length);
    expect(designFromSpec(spec).primaryColor).toBeTruthy();
  });
});

describe("builder tools", () => {
  const base = (): ProjectSnapshot => ({
    name: "Biz",
    type: "WEBSITE",
    locale: "HE",
    direction: "RTL",
    theme: { primaryColor: "#111", fontFamily: "Heebo", borderRadius: "8px" },
    pages: [
      {
        slug: "home",
        title: "בית",
        locale: "HE",
        direction: "RTL",
        components: [{ id: "n", type: "Navbar", props: { links: [] } }],
        seo: {},
      },
    ],
  });

  it("creates a page and updates navigation without destroying home", () => {
    const { snapshot, applied } = applyBuilderActions(base(), [
      {
        type: "create_page",
        slug: "pricing",
        title: "מחירון",
        components: [{ id: "h", type: "Hero", props: { title: "מחירון" } }],
      },
      {
        type: "update_navigation",
        links: [
          { href: "/preview/p1/home", label: "בית" },
          { href: "/preview/p1/pricing", label: "מחירון" },
        ],
      },
      { type: "ensure_form", pageSlug: "contact", formType: "ContactForm" },
    ], "p1");

    expect(applied).toContain("create_page:pricing");
    expect(snapshot.pages.some((p) => p.slug === "home")).toBe(true);
    expect(snapshot.pages.some((p) => p.slug === "pricing")).toBe(true);
    expect(snapshot.pages.some((p) => p.slug === "contact")).toBe(true);
    expect(JSON.stringify(snapshot)).toContain("ContactForm");
  });

  it("blocks removing home", () => {
    const { rejected } = applyBuilderActions(base(), [{ type: "remove_page", slug: "home" }]);
    expect(rejected.some((r) => r.includes("home"))).toBe(true);
  });
});

describe("completion gate", () => {
  it("refuses READY when security fails", () => {
    const spec = planFromPrompt("business site with contact");
    const snapshot: ProjectSnapshot = {
      name: "X",
      type: "WEBSITE",
      locale: "HE",
      direction: "RTL",
      theme: { primaryColor: "#0f766e", fontFamily: "Heebo", borderRadius: "8px" },
      pages: spec.pages.map((p) => ({
        slug: p.slug,
        title: p.title,
        locale: "HE" as const,
        direction: "RTL" as const,
        components: [
          { id: "n", type: "Navbar", props: {} },
          { id: "h", type: "Hero", props: { title: p.title } },
          { id: "f", type: "Footer", props: {} },
          ...(p.slug === "contact"
            ? [{ id: "c", type: "ContactForm", props: { action: "/api/runtime/leads" } }]
            : []),
        ],
        seo: {},
      })),
    };
    // inject secret
    snapshot.pages[0].components[1].props = { title: "x", leak: "ANTHROPIC_API_KEY=secret" };
    const security = runSecurityGate(snapshot, spec);
    const buildTest = runBuildTest(snapshot, "pid", spec);
    const visual = scoreVisualQa(snapshot, spec);
    const decision = canMarkProjectReady({
      stagesCompleted: [
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
      ],
      requiredStages: [
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
      ],
      architecturePresent: true,
      snapshot,
      spec,
      security,
      buildTest,
      functional: { passed: true, checks: [{ name: "ok", passed: true, details: "ok" }] },
      visual,
      unresolvedPlaceholders: false,
      repairExhaustedWithErrors: false,
    });
    expect(security.passed).toBe(false);
    expect(decision.ready).toBe(false);
    expect(VISUAL_QA_MIN_SCORE).toBeGreaterThanOrEqual(50);
  });
});
