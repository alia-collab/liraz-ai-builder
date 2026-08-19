import type { ProjectType, Locale, Direction } from "@prisma/client";

export type ProductKind =
  | "BUSINESS_SITE"
  | "LANDING"
  | "BLOG"
  | "PORTFOLIO"
  | "STORE"
  | "BOOKING"
  | "NEWS"
  | "PORTAL"
  | "WEB_APP"
  | "SAAS"
  | "CRM"
  | "MARKETPLACE"
  | "COMMUNITY"
  | "PWA"
  | "NATIVE_MOBILE"
  | "COMBINED";

export interface SpecPage {
  slug: string;
  title: string;
  purpose: string;
  isHome?: boolean;
  isAdmin?: boolean;
  surface?: "public" | "private" | "admin";
}

export interface SpecForm {
  name: string;
  type: "contact" | "booking" | "lead" | "auth" | "checkout" | "search";
  fields: string[];
  submitTo: "leads" | "records" | "auth";
}

export interface SetupItem {
  key: string;
  label: string;
  requiredForPublish: boolean;
  status: "needed" | "optional" | "configured";
}

export interface TypeOption {
  id: string;
  label: string;
}

export interface BuildSpec {
  name: string;
  productType: ProjectType;
  productKind: ProductKind;
  typeLabel: string;
  purpose: string;
  audience: string;
  locale: Locale;
  direction: Direction;
  pages: SpecPage[];
  actions: string[];
  userRoles: string[];
  dataModel: { name: string; fields: { name: string; type: string; required?: boolean }[] }[];
  forms: SpecForm[];
  integrations: {
    whatsapp?: boolean;
    whatsappNote?: string;
    auth?: boolean;
    payments?: boolean;
    cms?: boolean;
    push?: boolean;
    nativeStores?: boolean;
  };
  visual: {
    style: string;
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    designOptions: { id: string; name: string; primaryColor: string; style: string }[];
  };
  mobile: boolean;
  admin: boolean;
  surfaces: ("public" | "private" | "admin")[];
  cmsCollections: string[];
  missingBusinessFacts: string[];
  needsSetup: SetupItem[];
  estimatedComplexity: "small" | "medium" | "large";
  estimatedMinutes: number;
  successCriteria: string[];
  questions: string[];
  typeOptions?: TypeOption[];
  needsClarification: boolean;
  inferredFrom: string;
}

export interface ProjectMemory {
  spec: BuildSpec;
  decisions: string[];
  protected: string[];
  openTasks: string[];
  changelog: { at: string; summary: string; files: string[]; by: string }[];
  buildLog: { stage: string; status: "done" | "failed" | "running" | "pending"; detail: string }[];
  qa?: { passed: boolean; errors: string[]; warnings?: string[] };
}

export const BUILD_STAGES = [
  "received",
  "analyzing",
  "planning",
  "structure",
  "design",
  "database",
  "auth",
  "forms",
  "navigation",
  "mobile",
  "testing",
  "preview",
] as const;

export type BuildStageKey = (typeof BUILD_STAGES)[number];
