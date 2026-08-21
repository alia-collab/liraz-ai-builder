import type { ProjectSnapshot } from "@/lib/ai/types";
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import { sanitizeProjectOutput } from "@/lib/ai/sanitize";
import { qaSnapshot, type QAResult } from "@/lib/ai/pipeline/qa";

export type GateResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
  stage: string;
};

function merge(...parts: GateResult[]): GateResult {
  const errors = parts.flatMap((p) => p.errors);
  const warnings = parts.flatMap((p) => p.warnings);
  return {
    passed: errors.length === 0,
    errors,
    warnings,
    stage: parts.map((p) => p.stage).join("+"),
  };
}

const PLACEHOLDER_PATTERNS = [
  /\bTODO\b/,
  /\bFIXME\b/,
  /\bTBD\b/,
  /coming soon/i,
  /lorem ipsum/i,
  /placeholder page/i,
  /under construction/i,
  /sample text only/i,
  /\[insert .*\]/i,
  /your (company|business) name here/i,
];

/** Structural + placeholder + sanitize build test (snapshot model). */
export function runBuildTest(snapshot: ProjectSnapshot, projectId: string, spec?: BuildSpec | null): GateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const sanitized = sanitizeProjectOutput(snapshot);
  if (!sanitized.valid) errors.push(...sanitized.errors.map((e) => `sanitize: ${e}`));

  const qa = qaSnapshot(snapshot, projectId, spec);
  errors.push(...qa.errors);
  warnings.push(...qa.warnings);

  if (snapshot.pages.length === 0) errors.push("No pages generated");

  for (const page of snapshot.pages) {
    const blob = JSON.stringify(page);
    for (const re of PLACEHOLDER_PATTERNS) {
      if (re.test(blob)) errors.push(`Placeholder content on page ${page.slug}: ${re.source}`);
    }
    if (!page.components?.length) errors.push(`Empty page (no components): ${page.slug}`);
    // Shallow stub: only a single empty Section
    if (page.components.length === 1 && page.components[0].type === "Section" && !(page.components[0].children?.length)) {
      errors.push(`Stub page rejected: ${page.slug}`);
    }
  }

  if (spec?.pages?.length) {
    for (const planned of spec.pages) {
      if (!snapshot.pages.some((p) => p.slug === planned.slug)) {
        errors.push(`Missing planned page: ${planned.slug}`);
      }
    }
  }

  return { passed: errors.length === 0, errors, warnings, stage: "build_test" };
}

export function runVisualQa(snapshot: ProjectSnapshot, spec?: BuildSpec | null): GateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (snapshot.locale === "HE" && snapshot.direction !== "RTL") {
    errors.push("Hebrew locale requires RTL direction");
  }
  if (snapshot.direction === "RTL" && snapshot.locale !== "HE") {
    warnings.push("RTL without HE locale");
  }
  if (!snapshot.theme?.primaryColor) errors.push("Missing theme.primaryColor");
  if (!snapshot.theme?.fontFamily) errors.push("Missing theme.fontFamily");

  const hasNavbar = snapshot.pages.some((p) => JSON.stringify(p.components).includes('"Navbar"'));
  const hasFooter = snapshot.pages.some((p) => JSON.stringify(p.components).includes('"Footer"'));
  if (!hasNavbar) errors.push("Missing Navbar");
  if (!hasFooter) warnings.push("Missing Footer");

  // Responsive intent: avoid fixed huge pixel-only layouts in props
  const json = JSON.stringify(snapshot);
  if (/width"\s*:\s*"?[0-9]{4,}px/i.test(json)) {
    warnings.push("Possible fixed wide layout — verify mobile");
  }

  if (spec?.mobile === false) {
    warnings.push("Plan marked mobile=false");
  }

  return { passed: errors.length === 0, errors, warnings, stage: "visual_qa" };
}

export function runFunctionalQa(snapshot: ProjectSnapshot, spec?: BuildSpec | null): GateResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const json = JSON.stringify(snapshot);

  const needsContact =
    spec?.forms.some((f) => f.type === "contact" || f.type === "lead") ||
    snapshot.pages.some((p) => p.slug === "contact");
  if (needsContact) {
    if (!/"ContactForm"/.test(json) && !/"BookingForm"/.test(json)) {
      errors.push("Contact/lead flow required but no ContactForm/BookingForm");
    }
    // Real persistence: ContactForm widgets post to /api/runtime/leads in the renderer
    if (/"ContactForm"/.test(json) && !snapshot.pages.some((p) => p.slug === "contact" || p.slug === "home")) {
      warnings.push("ContactForm present but no obvious contact landing page");
    }
  }

  if (spec?.integrations.auth || spec?.forms.some((f) => f.type === "auth")) {
    if (!/"Login"/.test(json) && !/"Register"/.test(json)) {
      errors.push("Auth required but Login/Register components missing");
    }
  }

  if (spec?.admin || spec?.pages.some((p) => p.isAdmin || p.surface === "admin")) {
    if (!/"AdminLeads"/.test(json) && !snapshot.pages.some((p) => p.slug.includes("admin"))) {
      errors.push("Admin surface required but no admin page/AdminLeads");
    }
  }

  if (spec?.productKind === "BOOKING" || spec?.forms.some((f) => f.type === "booking")) {
    if (!/"BookingForm"/.test(json)) errors.push("Booking required but BookingForm missing");
  }

  if (spec?.productKind === "STORE" || spec?.productKind === "MARKETPLACE") {
    for (const slug of ["products", "cart", "checkout"]) {
      if (!snapshot.pages.some((p) => p.slug === slug)) errors.push(`Store missing ${slug}`);
    }
  }

  // Dead API pretenders
  if (/api\.example\.com|localhost:3000\/fake/i.test(json)) {
    errors.push("Fake API endpoints in snapshot");
  }

  return { passed: errors.length === 0, errors, warnings, stage: "functional_qa" };
}

export function toQAResult(gate: GateResult): QAResult {
  return { passed: gate.passed, errors: gate.errors, warnings: gate.warnings };
}

export function runAllQualityGates(
  snapshot: ProjectSnapshot,
  projectId: string,
  spec?: BuildSpec | null
): GateResult {
  return merge(
    runBuildTest(snapshot, projectId, spec),
    runVisualQa(snapshot, spec),
    runFunctionalQa(snapshot, spec)
  );
}
