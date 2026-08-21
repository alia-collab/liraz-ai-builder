import type { ProjectSnapshot, EditorComponent, PageSnapshot } from "@/lib/ai/types";
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import type { BuilderAction } from "./schemas";

function walk(components: EditorComponent[], fn: (c: EditorComponent) => void) {
  for (const c of components) {
    fn(c);
    if (c.children?.length) walk(c.children, fn);
  }
}

function asComponents(raw: Record<string, unknown>[]): EditorComponent[] {
  return raw.map((c, i) => ({
    id: typeof c.id === "string" ? c.id : `gen_${i}_${Date.now().toString(36)}`,
    type: String(c.type ?? "Section"),
    props: (c.props as Record<string, unknown>) ?? {},
    children: Array.isArray(c.children)
      ? asComponents(c.children as Record<string, unknown>[])
      : undefined,
  }));
}

function ensureNavbarLinks(snapshot: ProjectSnapshot, links: { href: string; label: string }[]) {
  for (const page of snapshot.pages) {
    walk(page.components, (c) => {
      if (c.type === "Navbar") {
        c.props = { ...c.props, links };
      }
    });
  }
}

function ensureFormOnPage(
  snapshot: ProjectSnapshot,
  pageSlug: string,
  formType: "ContactForm" | "BookingForm" | "Login" | "Register" | "AdminLeads"
) {
  let page = snapshot.pages.find((p) => p.slug === pageSlug);
  if (!page) {
    page = {
      slug: pageSlug,
      title: pageSlug,
      locale: snapshot.locale,
      direction: snapshot.direction,
      components: [],
      seo: { title: pageSlug, description: pageSlug },
    };
    snapshot.pages.push(page);
  }
  const blob = JSON.stringify(page.components);
  if (blob.includes(`"${formType}"`)) return;
  page.components.push({
    id: `${formType.toLowerCase()}_${Date.now().toString(36)}`,
    type: formType,
    props:
      formType === "ContactForm"
        ? { action: "/api/runtime/leads" }
        : formType === "BookingForm"
          ? { action: "/api/runtime/records" }
          : {},
  });
}

/**
 * Server-controlled tool executor. Claude proposes WHAT; we persist HOW safely.
 */
export function applyBuilderActions(
  snapshot: ProjectSnapshot,
  actions: BuilderAction[],
  projectId?: string
): { snapshot: ProjectSnapshot; applied: string[]; rejected: string[] } {
  const next = structuredClone(snapshot);
  const applied: string[] = [];
  const rejected: string[] = [];

  for (const action of actions) {
    try {
      switch (action.type) {
        case "create_page": {
          if (next.pages.some((p) => p.slug === action.slug)) {
            rejected.push(`create_page:${action.slug} exists`);
            break;
          }
          const page: PageSnapshot = {
            slug: action.slug,
            title: action.title,
            locale: next.locale,
            direction: next.direction,
            components: asComponents(action.components),
            seo: (action.seo as PageSnapshot["seo"]) ?? {
              title: action.title,
              description: action.title,
            },
          };
          next.pages.push(page);
          applied.push(`create_page:${action.slug}`);
          break;
        }
        case "update_page": {
          const page = next.pages.find((p) => p.slug === action.slug);
          if (!page) {
            rejected.push(`update_page:${action.slug} missing`);
            break;
          }
          if (action.title) page.title = action.title;
          if (action.components) page.components = asComponents(action.components);
          if (action.seo) page.seo = { ...page.seo, ...(action.seo as object) };
          applied.push(`update_page:${action.slug}`);
          break;
        }
        case "update_navigation": {
          const links = action.links.map((l) => ({
            href:
              projectId && l.href.startsWith("/") && !l.href.includes("/preview/")
                ? `/preview/${projectId}${l.href.startsWith("/") ? l.href : `/${l.href}`}`
                : l.href,
            label: l.label,
          }));
          ensureNavbarLinks(next, links);
          applied.push("update_navigation");
          break;
        }
        case "set_theme": {
          next.theme = {
            ...next.theme,
            ...(action.primaryColor ? { primaryColor: action.primaryColor } : {}),
            ...(action.fontFamily ? { fontFamily: action.fontFamily } : {}),
            ...(action.borderRadius ? { borderRadius: action.borderRadius } : {}),
          };
          applied.push("set_theme");
          break;
        }
        case "ensure_form": {
          ensureFormOnPage(next, action.pageSlug, action.formType);
          applied.push(`ensure_form:${action.formType}@${action.pageSlug}`);
          break;
        }
        case "remove_page": {
          if (action.slug === "home") {
            rejected.push("remove_page:home blocked");
            break;
          }
          next.pages = next.pages.filter((p) => p.slug !== action.slug);
          applied.push(`remove_page:${action.slug}`);
          break;
        }
        default:
          rejected.push("unknown_action");
      }
    } catch (err) {
      rejected.push(`${(action as BuilderAction).type}: ${err instanceof Error ? err.message : "fail"}`);
    }
  }

  return { snapshot: next, applied, rejected };
}

export function buildNavLinksFromSpec(spec: BuildSpec, projectId: string) {
  return spec.pages.slice(0, 8).map((p) => ({
    href: `/preview/${projectId}/${p.slug}`,
    label: p.title,
  }));
}
