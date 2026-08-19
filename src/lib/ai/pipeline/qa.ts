import type { ProjectSnapshot } from "../types";
import type { BuildSpec } from "./types";

export interface QAResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export function qaSnapshot(snapshot: ProjectSnapshot, projectId?: string, spec?: BuildSpec | null): QAResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const slugs = new Set(snapshot.pages.map((p) => p.slug));

  if (snapshot.pages.length === 0) errors.push("No pages");
  if (snapshot.direction === "RTL" && snapshot.locale !== "HE") {
    errors.push("RTL set without HE locale");
  }

  const json = JSON.stringify(snapshot);
  if (/lorem ipsum/i.test(json)) errors.push("Placeholder lorem copy");
  if (/40,000|1000\+|best in the world|award-winning clients/i.test(json)) {
    errors.push("Invented business stats");
  }

  for (const required of ["home"]) {
    if (!slugs.has(required)) errors.push(`Missing required page: ${required}`);
  }

  const needsContact = spec ? spec.forms.some((f) => f.type === "contact" || f.type === "lead") : slugs.has("contact");
  if (needsContact && slugs.has("contact")) {
    const contact = snapshot.pages.find((p) => p.slug === "contact");
    if (contact && !/ContactForm|BookingForm/.test(JSON.stringify(contact.components))) {
      errors.push("Missing form on contact");
    }
  }

  if (spec?.productKind === "STORE" || spec?.productKind === "MARKETPLACE") {
    for (const s of ["products", "cart", "checkout"]) {
      if (!slugs.has(s)) errors.push(`Store missing page: ${s}`);
    }
  }
  if (spec?.productKind === "BOOKING" && !slugs.has("book")) {
    errors.push("Booking site missing book page");
  }

  for (const page of snapshot.pages) {
    const blob = JSON.stringify(page.components);
    const hrefs = [...blob.matchAll(/"href"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
    const links = [...blob.matchAll(/"ctaLink"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
    for (const raw of [...hrefs, ...links]) {
      if (raw.startsWith("#") && raw !== "#") {
        errors.push(`Hash link on ${page.slug}: ${raw}`);
      }
      const preview = raw.match(/\/preview\/[^/]+\/([^/?#]+)/);
      if (preview && !slugs.has(preview[1])) {
        errors.push(`Dead page link ${raw} from ${page.slug}`);
      }
      if (projectId && raw.includes("/preview/") && !raw.includes(projectId)) {
        errors.push(`Preview link missing project id: ${raw}`);
      }
    }

    const hasInertSubmit =
      blob.includes('"type":"button"') &&
      (page.slug === "contact" || page.slug === "book") &&
      blob.includes("ContactForm");
    if (hasInertSubmit) {
      errors.push(`Inert submit button on ${page.slug}`);
    }

    const needsForm = page.slug === "contact" || page.slug === "book";
    if (needsForm && !/ContactForm|BookingForm/.test(blob)) {
      errors.push(`Missing form on ${page.slug}`);
    }
  }

  if (spec?.integrations.payments) {
    warnings.push("Payments UI exists but live charging needs provider keys");
  }
  if (spec?.integrations.nativeStores) {
    warnings.push("Native store builds are not generated — do not claim App Store readiness");
  }
  if (spec?.missingBusinessFacts.length) {
    warnings.push("Business facts (phone, address, reviews) are unset");
  }

  return { passed: errors.length === 0, errors, warnings };
}

export function applySurgicalEdit(
  snapshot: ProjectSnapshot,
  instruction: string,
  componentId?: string
): { snapshot: ProjectSnapshot; summary: string; files: string[] } {
  const updated = structuredClone(snapshot);
  const lower = instruction.toLowerCase();
  const files: string[] = [];
  let summary = instruction.slice(0, 80);

  if (componentId) {
    for (const page of updated.pages) {
      const comp = findComponent(page.components, componentId);
      if (!comp) continue;
      files.push(`pages/${page.slug}#${comp.type}`);
      if (/צבע|color|כחול|blue/.test(lower)) {
        updated.theme.primaryColor = "#1d4ed8";
        files.push("theme");
        summary = `Updated selected ${comp.type} context: primary color`;
      } else if (/כותרת|title|headline/.test(lower)) {
        const next = instruction.replace(/^(שנה|change|update)\s+(the\s+)?(title|כותרת)\s+(ל|to)?\s*/i, "").trim();
        if (next && typeof comp.props.title === "string") {
          comp.props.title = next.slice(0, 120);
          summary = `Updated ${comp.type} title only`;
        } else {
          summary = `Targeted edit on ${comp.type}`;
        }
      } else {
        summary = `Targeted instruction recorded for ${comp.type}`;
      }
      return { snapshot: updated, summary, files: files.length ? files : [`pages/${page.slug}`] };
    }
  }

  if (/כחול|blue/.test(lower)) {
    updated.theme.primaryColor = "#1d4ed8";
    summary = "Updated primary color to blue";
    files.push("theme");
  } else if (/ירוק|teal|טורקיז|green/.test(lower)) {
    updated.theme.primaryColor = "#0f766e";
    summary = "Updated primary color";
    files.push("theme");
  } else if (/אדום|כתום|orange|red/.test(lower)) {
    updated.theme.primaryColor = "#c2410c";
    summary = "Updated primary color";
    files.push("theme");
  }

  const colorOnly = /צבע|color|כחול|ירוק|אדום/.test(lower) && !/עמוד|page|טופס|form|וואטסאפ/.test(lower);
  if (colorOnly) {
    return { snapshot: updated, summary, files: files.length ? files : ["theme"] };
  }

  if (/וואטסאפ|whatsapp/.test(lower)) {
    for (const page of updated.pages) {
      if (page.slug === "contact" || page.slug === "home") {
        const exists = JSON.stringify(page.components).includes("WhatsAppButton");
        if (!exists) {
          page.components.splice(page.components.length - 1, 0, {
            id: `wa-${page.slug}`,
            type: "WhatsAppButton",
            props: { label: updated.locale === "HE" ? "וואטסאפ" : "WhatsApp", href: "https://wa.me/", needsSetup: true },
          });
          files.push(`pages/${page.slug}`);
        }
      }
    }
    summary = "Added WhatsApp control (number still required)";
  }

  return { snapshot: updated, summary, files: files.length ? files : ["theme"] };
}

function findComponent(
  components: ProjectSnapshot["pages"][0]["components"],
  id: string
): ProjectSnapshot["pages"][0]["components"][0] | null {
  for (const c of components) {
    if (c.id === id) return c;
    if (c.children) {
      const found = findComponent(c.children, id);
      if (found) return found;
    }
  }
  return null;
}
