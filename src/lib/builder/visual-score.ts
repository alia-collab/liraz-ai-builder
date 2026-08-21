import type { ProjectSnapshot } from "@/lib/ai/types";
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import { VISUAL_QA_MIN_SCORE, type VisualScore } from "./schemas";

function dim(name: string, score: number, notes: string) {
  return { name, score: Math.max(0, Math.min(100, score)), notes };
}

/**
 * Visual/UX quality scoring — READY requires score >= threshold.
 */
export function scoreVisualQa(snapshot: ProjectSnapshot, spec?: BuildSpec | null): VisualScore {
  const dimensions: VisualScore["dimensions"] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const json = JSON.stringify(snapshot);

  // Hierarchy
  const hasHero = /"Hero"/.test(json);
  const hasNav = /"Navbar"/.test(json);
  const hasFooter = /"Footer"/.test(json);
  let hierarchy = 40;
  if (hasHero) hierarchy += 20;
  if (hasNav) hierarchy += 20;
  if (hasFooter) hierarchy += 20;
  dimensions.push(dim("hierarchy", hierarchy, hasHero && hasNav ? "Hero+Nav present" : "Missing core hierarchy"));

  // Typography / theme
  let typeScore = 50;
  if (snapshot.theme?.fontFamily) typeScore += 25;
  if (snapshot.theme?.primaryColor) typeScore += 25;
  dimensions.push(dim("typography", typeScore, snapshot.theme.fontFamily || "missing font"));

  // Spacing / density heuristics
  let spacing = 70;
  if (/gradient|glow|shadow-2xl/i.test(json)) {
    spacing -= 10;
    warnings.push("Heavy decorative effects detected");
  }
  dimensions.push(dim("spacing", spacing, "Heuristic density check"));

  // Responsive intent
  let responsive = 75;
  if (/width"\s*:\s*"?[0-9]{4,}px/i.test(json)) {
    responsive -= 30;
    warnings.push("Fixed wide widths may break mobile");
  }
  if (spec?.mobile !== false) responsive += 10;
  dimensions.push(dim("responsive", responsive, "Mobile-minded layout intent"));

  // CTA clarity
  const cta = /"Button"|"CTABanner"|"WhatsAppButton"|ctaLink/i.test(json) ? 85 : 45;
  dimensions.push(dim("cta", cta, cta >= 70 ? "CTA elements present" : "Weak CTA presence"));

  // Content density / anti-generic
  let content = 80;
  if (/lorem ipsum|coming soon|TODO|award-winning|1000\+/i.test(json)) {
    content = 20;
    errors.push("Placeholder or fabricated claims in copy");
  }
  if (snapshot.pages.some((p) => !p.components?.length)) {
    content = Math.min(content, 30);
    errors.push("Empty page(s)");
  }
  dimensions.push(dim("content", content, "Business-specific content check"));

  // RTL
  let rtl = 80;
  if (snapshot.locale === "HE") {
    if (snapshot.direction !== "RTL") {
      rtl = 0;
      errors.push("Hebrew requires RTL");
    } else {
      rtl = 95;
    }
  }
  dimensions.push(dim("rtl", rtl, snapshot.locale === "HE" ? "RTL required" : "LTR ok"));

  // Forms usability
  let forms = 70;
  if (/"ContactForm"|"BookingForm"/.test(json)) forms = 90;
  dimensions.push(dim("forms", forms, "Form presence"));

  // Navigation
  let nav = hasNav ? 85 : 30;
  if (hasNav && snapshot.pages.length > 1) nav = 95;
  dimensions.push(dim("navigation", nav, hasNav ? "Navbar present" : "Missing Navbar"));

  // Mobile usability proxy
  dimensions.push(dim("mobile", responsive, "Same as responsive intent"));

  const score = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / Math.max(1, dimensions.length)
  );

  return {
    passed: errors.length === 0 && score >= VISUAL_QA_MIN_SCORE,
    score,
    threshold: VISUAL_QA_MIN_SCORE,
    dimensions,
    errors,
    warnings,
  };
}
