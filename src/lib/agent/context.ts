import type { ProjectSnapshot, EditorComponent } from "@/lib/ai/types";
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import { currentSnapshotFromProject } from "@/lib/workspace/persist";
import prisma from "@/lib/db";

export type ProjectContext = {
  projectId: string;
  name: string;
  locale: string;
  direction: string;
  pageSlugs: string[];
  pageSummaries: { slug: string; title: string; componentTypes: string[]; componentCount: number }[];
  componentIds: string[];
  hasAuthSurfaces: boolean;
  hasContactForm: boolean;
  hasBookingForm: boolean;
  hasAdminLeads: boolean;
  theme: ProjectSnapshot["theme"] | null;
  snapshot: ProjectSnapshot | null;
  spec: BuildSpec | null;
  recordKinds: string[];
  versionCount: number;
};

function walkComponents(components: EditorComponent[], out: EditorComponent[]) {
  for (const c of components) {
    out.push(c);
    if (c.children?.length) walkComponents(c.children, out);
  }
}

export function summarizeSnapshot(snapshot: ProjectSnapshot): Omit<ProjectContext, "projectId" | "spec" | "recordKinds" | "versionCount" | "name" | "locale" | "direction"> & {
  pageSlugs: string[];
} {
  const all: EditorComponent[] = [];
  for (const page of snapshot.pages) walkComponents(page.components, all);
  const types = (page: ProjectSnapshot["pages"][0]) => {
    const comps: EditorComponent[] = [];
    walkComponents(page.components, comps);
    return comps.map((c) => c.type);
  };

  return {
    pageSlugs: snapshot.pages.map((p) => p.slug),
    pageSummaries: snapshot.pages.map((p) => {
      const t = types(p);
      return {
        slug: p.slug,
        title: p.title,
        componentTypes: [...new Set(t)],
        componentCount: t.length,
      };
    }),
    componentIds: all.map((c) => c.id).filter(Boolean),
    hasAuthSurfaces: all.some((c) => c.type === "Login" || c.type === "Register"),
    hasContactForm: all.some((c) => c.type === "ContactForm"),
    hasBookingForm: all.some((c) => c.type === "BookingForm"),
    hasAdminLeads: all.some((c) => c.type === "AdminLeads"),
    theme: snapshot.theme,
    snapshot,
  };
}

/** Inspect live project before every agent edit/build. */
export async function inspectProjectContext(projectId: string): Promise<ProjectContext> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true, locale: true, direction: true, settings: true },
  });
  const snapshot = await currentSnapshotFromProject(projectId);
  const versions = await prisma.projectVersion.count({ where: { projectId } });
  const records = await prisma.appRecord.groupBy({
    by: ["kind"],
    where: { projectId },
    _count: true,
  });

  const settings = (project?.settings ?? {}) as { spec?: BuildSpec; memory?: { spec?: BuildSpec } };
  const spec = settings.spec ?? settings.memory?.spec ?? null;
  const base = snapshot
    ? summarizeSnapshot(snapshot)
    : {
        pageSlugs: [],
        pageSummaries: [],
        componentIds: [],
        hasAuthSurfaces: false,
        hasContactForm: false,
        hasBookingForm: false,
        hasAdminLeads: false,
        theme: null,
        snapshot: null,
      };

  return {
    projectId,
    name: project?.name ?? "Untitled",
    locale: project?.locale ?? "HE",
    direction: project?.direction ?? "RTL",
    ...base,
    spec,
    recordKinds: records.map((r) => r.kind),
    versionCount: versions,
  };
}

/** Compact context string for Claude prompts (no secrets). */
export function formatContextForClaude(ctx: ProjectContext, maxChars = 12000): string {
  const payload = {
    projectId: ctx.projectId,
    name: ctx.name,
    locale: ctx.locale,
    direction: ctx.direction,
    pageSummaries: ctx.pageSummaries,
    hasAuthSurfaces: ctx.hasAuthSurfaces,
    hasContactForm: ctx.hasContactForm,
    hasBookingForm: ctx.hasBookingForm,
    hasAdminLeads: ctx.hasAdminLeads,
    recordKinds: ctx.recordKinds,
    theme: ctx.theme,
    plannedPages: ctx.spec?.pages?.map((p) => ({ slug: p.slug, title: p.title, purpose: p.purpose })),
    plannedForms: ctx.spec?.forms,
    plannedRoles: ctx.spec?.userRoles,
    plannedDataModel: ctx.spec?.dataModel,
    integrations: ctx.spec?.integrations,
    successCriteria: ctx.spec?.successCriteria,
  };
  const text = JSON.stringify(payload, null, 2);
  return text.length > maxChars ? text.slice(0, maxChars) + "\n…(truncated)" : text;
}
