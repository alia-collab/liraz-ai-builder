import type { BuildSpec } from "@/lib/ai/pipeline/types";
import {
  RequirementAnalysisSchema,
  ArchitecturePlanSchema,
  DesignPlanSchema,
  BuilderActionBatchSchema,
  type RequirementAnalysis,
  type ArchitecturePlan,
  type DesignPlan,
} from "./schemas";

/** Deterministic analysis from approved BuildSpec (always valid). */
export function analysisFromSpec(spec: BuildSpec): RequirementAnalysis {
  return RequirementAnalysisSchema.parse({
    projectType: spec.productType,
    businessType: spec.typeLabel,
    objectives: [spec.purpose, ...spec.actions.slice(0, 8)],
    pages: spec.pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      purpose: p.purpose,
      surface: p.surface ?? (p.isAdmin ? "admin" : "public"),
      required: true,
    })),
    features: spec.forms.map((f) => ({
      key: f.type,
      title: f.name,
      description: `Form ${f.name} → ${f.submitTo}`,
      requiresAuth: f.type === "auth",
      requiresData: true,
    })),
    roles: spec.userRoles.map((r) => ({ key: r, title: r, permissions: [] })),
    dataModels: spec.dataModel,
    integrations: Object.entries(spec.integrations)
      .filter(([, v]) => Boolean(v))
      .map(([key]) => ({ key, title: key, required: key === "auth" })),
    securityRequirements: [
      "Validate all form inputs server-side",
      "Scope all AppRecord queries by projectId",
      "No auth bypasses or secret admin URLs",
      "No secrets in client snapshot",
      ...(spec.locale === "HE" ? ["Full RTL layout"] : []),
    ],
    acceptanceCriteria:
      spec.successCriteria.length > 0
        ? spec.successCriteria
        : [
            "All planned pages render",
            "Required forms submit to runtime APIs",
            "Security gate passes",
            "Functional and visual QA pass",
          ],
    locale: spec.locale,
    rtl: spec.direction === "RTL",
  });
}

export function architectureFromSpec(spec: BuildSpec): ArchitecturePlan {
  return ArchitecturePlanSchema.parse({
    routes: spec.pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      surface: p.surface ?? (p.isAdmin ? "admin" : "public"),
    })),
    entities: spec.dataModel.map((m) => ({ name: m.name, kind: m.name.toLowerCase() })),
    apis: [
      ...(spec.forms.some((f) => f.submitTo === "leads") ? ["/api/runtime/leads"] : []),
      ...(spec.forms.some((f) => f.submitTo === "records" || f.type === "booking")
        ? ["/api/runtime/records"]
        : []),
      ...(spec.integrations.auth || spec.forms.some((f) => f.type === "auth")
        ? ["/api/runtime/app-auth"]
        : []),
    ],
    auth: {
      enabled: Boolean(spec.integrations.auth || spec.forms.some((f) => f.type === "auth")),
      methods: ["email_password"],
    },
    layouts: ["main"],
    notes: [
      "Customer data isolated via projectId on AppRecord/ProjectLead",
      "UI is ProjectSnapshot components rendered by preview",
    ],
  });
}

export function designFromSpec(spec: BuildSpec): DesignPlan {
  const kind = spec.productKind;
  const personality =
    kind === "BOOKING"
      ? "warm and welcoming"
      : kind === "STORE" || kind === "MARKETPLACE"
        ? "commercial and clear"
        : kind === "SAAS" || kind === "PORTAL"
          ? "precise and trustworthy"
          : kind === "PORTFOLIO"
            ? "editorial and visual"
            : "professional and local";

  return DesignPlanSchema.parse({
    visualDirection: `${spec.visual.style} for ${spec.typeLabel}`,
    brandPersonality: personality,
    typographyStyle: spec.locale === "HE" ? "Hebrew-capable sans (Heebo/Assistant)" : "Clean sans",
    density: kind === "SAAS" || kind === "CRM" ? "dense" : "balanced",
    primaryColor: spec.visual.primaryColor,
    secondaryColor: spec.visual.secondaryColor,
    fontFamily: spec.visual.fontFamily,
    sectionPatterns: ["navbar", "hero", "services-or-features", "proof-or-faq", "cta", "footer"],
    imageryStrategy: "industry-appropriate, no fake stock claims",
  });
}

export function parseActionBatch(raw: unknown) {
  return BuilderActionBatchSchema.safeParse(raw);
}

export function safeParseJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function validateAnalysis(raw: unknown) {
  return RequirementAnalysisSchema.safeParse(raw);
}
