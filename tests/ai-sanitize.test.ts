import { describe, it, expect } from "vitest";
import { sanitizeProjectOutput, sanitizeHtml } from "@/lib/ai/sanitize";

describe("AI sanitize", () => {
  it("blocks eval patterns in output", () => {
    const result = sanitizeProjectOutput({
      name: "Test",
      type: "WEBSITE",
      locale: "EN",
      direction: "LTR",
      theme: { primaryColor: "#000", fontFamily: "sans", borderRadius: "0" },
      pages: [{
        slug: "home",
        title: "Home",
        locale: "EN",
        direction: "LTR",
        components: [{
          id: "x",
          type: "Hero",
          props: { title: "eval(malicious)" },
        }],
        seo: {},
      }],
    });
    expect(result.valid).toBe(false);
  });

  it("accepts safe hero output", () => {
    const result = sanitizeProjectOutput({
      name: "Test",
      type: "WEBSITE",
      locale: "EN",
      direction: "LTR",
      theme: { primaryColor: "#000", fontFamily: "sans", borderRadius: "0" },
      pages: [{
        slug: "home",
        title: "Home",
        locale: "EN",
        direction: "LTR",
        components: [{
          id: "x",
          type: "Hero",
          props: { title: "Welcome" },
        }],
        seo: {},
      }],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects non-object output", () => {
    const result = sanitizeProjectOutput("not an object");
    expect(result.valid).toBe(false);
  });

  it("rejects unknown component types", () => {
    const result = sanitizeProjectOutput({
      name: "Test",
      pages: [{ components: [{ id: "1", type: "MaliciousWidget", props: {} }] }],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Unknown component"))).toBe(true);
  });

  it("sanitizes HTML scripts", () => {
    const clean = sanitizeHtml('<p>Hello</p><script>alert(1)</script>');
    expect(clean).not.toContain("<script");
    expect(clean).toContain("Hello");
  });
});
