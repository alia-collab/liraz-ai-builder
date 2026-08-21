import type { ProjectSnapshot } from "@/lib/ai/types";
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import { inspectProjectContext, summarizeSnapshot } from "@/lib/agent/context";
import type { ArchitecturePlan, DesignPlan, RequirementAnalysis } from "./schemas";

export type BuilderTaskFocus =
  | "navigation"
  | "page"
  | "forms"
  | "auth"
  | "data"
  | "design"
  | "security"
  | "repair"
  | "full";

/**
 * Relevant-context retrieval for Claude — avoid dumping the entire project every time.
 */
export async function buildProjectContext(
  projectId: string,
  focus: BuilderTaskFocus = "full",
  opts?: {
    pageSlug?: string;
    componentId?: string;
    analysis?: RequirementAnalysis | null;
    architecture?: ArchitecturePlan | null;
    design?: DesignPlan | null;
    spec?: BuildSpec | null;
    errors?: string[];
  }
) {
  const full = await inspectProjectContext(projectId);
  const snapshot = full.snapshot;
  const summary = snapshot ? summarizeSnapshot(snapshot) : null;

  const base = {
    projectId,
    name: full.name,
    locale: full.locale,
    direction: full.direction,
    recordKinds: full.recordKinds,
    versionCount: full.versionCount,
    focus,
  };

  if (focus === "full" || !snapshot) {
    return {
      ...base,
      pageSummaries: summary?.pageSummaries ?? [],
      theme: summary?.theme ?? null,
      analysis: opts?.analysis ?? null,
      architecture: opts?.architecture ?? null,
      design: opts?.design ?? null,
      plannedPages: opts?.spec?.pages ?? full.spec?.pages ?? null,
      errors: opts?.errors?.slice(0, 30) ?? [],
      // Include compact snapshot for repair/full only
      snapshotCompact: compactSnapshot(snapshot, undefined),
    };
  }

  if (focus === "navigation") {
    return {
      ...base,
      navPages: summary?.pageSummaries.map((p) => ({ slug: p.slug, title: p.title })) ?? [],
      navbarPages: pagesWithType(snapshot, "Navbar"),
    };
  }

  if (focus === "page" && opts?.pageSlug) {
    const page = snapshot.pages.find((p) => p.slug === opts.pageSlug);
    return {
      ...base,
      page,
      siblingSlugs: snapshot.pages.map((p) => p.slug),
    };
  }

  if (focus === "forms") {
    return {
      ...base,
      formPages: pagesWithType(snapshot, "ContactForm", "BookingForm"),
      plannedForms: opts?.spec?.forms ?? full.spec?.forms ?? [],
    };
  }

  if (focus === "auth") {
    return {
      ...base,
      authPages: pagesWithType(snapshot, "Login", "Register"),
      authPlanned: Boolean(opts?.spec?.integrations.auth ?? full.spec?.integrations.auth),
    };
  }

  if (focus === "design") {
    return {
      ...base,
      theme: snapshot.theme,
      design: opts?.design ?? null,
      homeHero: snapshot.pages.find((p) => p.slug === "home"),
    };
  }

  if (focus === "repair") {
    return {
      ...base,
      pageSummaries: summary?.pageSummaries ?? [],
      errors: opts?.errors?.slice(0, 40) ?? [],
      snapshotCompact: compactSnapshot(snapshot, opts?.errors),
      analysis: opts?.analysis ?? null,
      architecture: opts?.architecture ?? null,
    };
  }

  return {
    ...base,
    pageSummaries: summary?.pageSummaries ?? [],
    theme: summary?.theme ?? null,
  };
}

function pagesWithType(snapshot: ProjectSnapshot, ...types: string[]) {
  return snapshot.pages
    .filter((p) => types.some((t) => JSON.stringify(p.components).includes(`"${t}"`)))
    .map((p) => ({ slug: p.slug, title: p.title, components: p.components }));
}

function compactSnapshot(snapshot: ProjectSnapshot | null, errors?: string[]) {
  if (!snapshot) return null;
  const errorText = (errors ?? []).join(" ").toLowerCase();
  const pages = snapshot.pages.map((p) => {
    const relevant =
      !errors?.length ||
      errorText.includes(p.slug) ||
      errorText.includes(p.title.toLowerCase()) ||
      p.slug === "home" ||
      p.slug === "contact";
    if (!relevant) {
      return {
        slug: p.slug,
        title: p.title,
        componentTypes: collectTypes(p.components),
        omitted: true,
      };
    }
    return {
      slug: p.slug,
      title: p.title,
      locale: p.locale,
      direction: p.direction,
      components: p.components,
      seo: p.seo,
    };
  });
  return {
    name: snapshot.name,
    type: snapshot.type,
    locale: snapshot.locale,
    direction: snapshot.direction,
    theme: snapshot.theme,
    pages,
  };
}

function collectTypes(components: ProjectSnapshot["pages"][0]["components"]): string[] {
  const out: string[] = [];
  const walk = (list: typeof components) => {
    for (const c of list) {
      out.push(c.type);
      if (c.children?.length) walk(c.children);
    }
  };
  walk(components);
  return [...new Set(out)];
}

export function formatBuilderContext(ctx: unknown, maxChars = 14000): string {
  const text = JSON.stringify(ctx, null, 2);
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n…(truncated)` : text;
}
