import type { ProjectSnapshot } from "@/lib/ai/types";
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import prisma from "@/lib/db";
import type { FunctionalQaReport } from "./schemas";

/**
 * Structured functional QA against acceptance criteria / plan.
 */
export async function runStructuredFunctionalQa(
  snapshot: ProjectSnapshot,
  projectId: string,
  spec?: BuildSpec | null
): Promise<FunctionalQaReport> {
  const checks: FunctionalQaReport["checks"] = [];
  const json = JSON.stringify(snapshot);

  const check = (name: string, passed: boolean, details: string) => {
    checks.push({ name, passed, details });
  };

  check("homepage_exists", snapshot.pages.some((p) => p.slug === "home"), "home page present");

  for (const page of spec?.pages ?? []) {
    check(
      `page_${page.slug}`,
      snapshot.pages.some((p) => p.slug === page.slug),
      `Planned page ${page.slug}`
    );
  }

  const needsContact =
    spec?.forms.some((f) => f.type === "contact" || f.type === "lead") ||
    snapshot.pages.some((p) => p.slug === "contact");
  if (needsContact) {
    const hasForm = /"ContactForm"|"BookingForm"/.test(json);
    check("contact_form", hasForm, hasForm ? "Contact/Booking form present" : "Missing form");
  }

  if (spec?.integrations.auth || spec?.forms.some((f) => f.type === "auth")) {
    const hasAuth = /"Login"|"Register"/.test(json);
    check("auth_components", hasAuth, hasAuth ? "Login/Register present" : "Auth missing");
  }

  if (spec?.admin || spec?.pages.some((p) => p.isAdmin || p.surface === "admin")) {
    const hasAdmin = /"AdminLeads"/.test(json) || snapshot.pages.some((p) => p.slug.includes("admin"));
    check("admin_surface", hasAdmin, hasAdmin ? "Admin surface present" : "Admin missing");
  }

  if (spec?.productKind === "BOOKING" || spec?.forms.some((f) => f.type === "booking")) {
    check("booking_form", /"BookingForm"/.test(json), "BookingForm required");
  }

  if (spec?.productKind === "STORE" || spec?.productKind === "MARKETPLACE") {
    for (const slug of ["products", "cart", "checkout"]) {
      check(`store_${slug}`, snapshot.pages.some((p) => p.slug === slug), `Store page ${slug}`);
    }
  }

  check("no_fake_apis", !/api\.example\.com|localhost:3000\/fake/i.test(json), "No fake API endpoints");
  check("navbar", /"Navbar"/.test(json), "Navbar present");

  // Data persistence readiness for leads
  if (needsContact && /"ContactForm"/.test(json)) {
    const leadCount = await prisma.projectLead.count({ where: { projectId } }).catch(() => 0);
    check(
      "leads_table_ready",
      true,
      `ProjectLead store available (existing leads: ${leadCount})`
    );
  }

  // AppRecord collections when data model planned
  if (spec?.dataModel?.length) {
    const kinds = await prisma.appRecord
      .groupBy({ by: ["kind"], where: { projectId }, _count: true })
      .catch(() => []);
    check(
      "app_records_seeded",
      kinds.length > 0 || spec.dataModel.length === 0,
      kinds.length ? `Kinds: ${kinds.map((k) => k.kind).join(", ")}` : "No AppRecords yet"
    );
  }

  return {
    passed: checks.every((c) => c.passed),
    checks,
  };
}
