import { z } from "zod";

export const PageRequirementSchema = z.object({
  slug: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  purpose: z.string().min(1).max(500),
  surface: z.enum(["public", "private", "admin"]).default("public"),
  required: z.boolean().default(true),
});

export const FeatureRequirementSchema = z.object({
  key: z.string(),
  title: z.string(),
  description: z.string(),
  requiresAuth: z.boolean().default(false),
  requiresData: z.boolean().default(false),
});

export const RoleRequirementSchema = z.object({
  key: z.string(),
  title: z.string(),
  permissions: z.array(z.string()).default([]),
});

export const DataModelRequirementSchema = z.object({
  name: z.string(),
  fields: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      required: z.boolean().optional(),
    })
  ),
});

export const IntegrationRequirementSchema = z.object({
  key: z.string(),
  title: z.string(),
  required: z.boolean().default(false),
});

export const RequirementAnalysisSchema = z.object({
  projectType: z.string(),
  businessType: z.string().optional(),
  objectives: z.array(z.string()).default([]),
  pages: z.array(PageRequirementSchema).min(1),
  features: z.array(FeatureRequirementSchema).default([]),
  roles: z.array(RoleRequirementSchema).default([]),
  dataModels: z.array(DataModelRequirementSchema).default([]),
  integrations: z.array(IntegrationRequirementSchema).default([]),
  securityRequirements: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string()).min(1),
  locale: z.enum(["HE", "EN"]).default("HE"),
  rtl: z.boolean().default(true),
});

export type RequirementAnalysis = z.infer<typeof RequirementAnalysisSchema>;

export const ArchitecturePlanSchema = z.object({
  routes: z.array(z.object({ slug: z.string(), title: z.string(), surface: z.string() })),
  entities: z.array(z.object({ name: z.string(), kind: z.string() })),
  apis: z.array(z.string()),
  auth: z.object({
    enabled: z.boolean(),
    methods: z.array(z.string()).default([]),
  }),
  layouts: z.array(z.string()).default(["main"]),
  notes: z.array(z.string()).default([]),
});

export type ArchitecturePlan = z.infer<typeof ArchitecturePlanSchema>;

export const DesignPlanSchema = z.object({
  visualDirection: z.string(),
  brandPersonality: z.string(),
  typographyStyle: z.string(),
  density: z.enum(["airy", "balanced", "dense"]).default("balanced"),
  primaryColor: z.string(),
  secondaryColor: z.string().optional(),
  fontFamily: z.string(),
  sectionPatterns: z.array(z.string()).default([]),
  imageryStrategy: z.string().default("product-focused"),
});

export type DesignPlan = z.infer<typeof DesignPlanSchema>;

export const BuilderActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_page"),
    slug: z.string(),
    title: z.string(),
    components: z.array(z.record(z.unknown())).default([]),
    seo: z.record(z.unknown()).optional(),
  }),
  z.object({
    type: z.literal("update_page"),
    slug: z.string(),
    title: z.string().optional(),
    components: z.array(z.record(z.unknown())).optional(),
    seo: z.record(z.unknown()).optional(),
  }),
  z.object({
    type: z.literal("update_navigation"),
    links: z.array(z.object({ href: z.string(), label: z.string() })),
  }),
  z.object({
    type: z.literal("set_theme"),
    primaryColor: z.string().optional(),
    fontFamily: z.string().optional(),
    borderRadius: z.string().optional(),
  }),
  z.object({
    type: z.literal("ensure_form"),
    pageSlug: z.string(),
    formType: z.enum(["ContactForm", "BookingForm", "Login", "Register", "AdminLeads"]),
  }),
  z.object({
    type: z.literal("remove_page"),
    slug: z.string(),
  }),
]);

export const BuilderActionBatchSchema = z.object({
  explanation: z.string().optional(),
  actions: z.array(BuilderActionSchema).min(1).max(40),
});

export type BuilderAction = z.infer<typeof BuilderActionSchema>;

export const FunctionalCheckSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  details: z.string(),
});

export const FunctionalQaReportSchema = z.object({
  passed: z.boolean(),
  checks: z.array(FunctionalCheckSchema),
});

export type FunctionalQaReport = z.infer<typeof FunctionalQaReportSchema>;

export const VisualScoreSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(100),
  threshold: z.number(),
  dimensions: z.array(
    z.object({
      name: z.string(),
      score: z.number(),
      notes: z.string(),
    })
  ),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

export type VisualScore = z.infer<typeof VisualScoreSchema>;

export const VISUAL_QA_MIN_SCORE = Math.max(
  50,
  Math.min(95, Math.floor(Number(process.env.BUILDER_VISUAL_QA_MIN_SCORE || "70")))
);

export const MAX_REPAIR_ATTEMPTS = Math.max(
  1,
  Math.min(5, Math.floor(Number(process.env.AGENT_MAX_REPAIR_ATTEMPTS || "3")))
);
