import prisma from "@/lib/db";
import type { BuildSpec } from "@/lib/ai/pipeline/types";

export async function seedAppData(projectId: string, spec: BuildSpec) {
  await prisma.appRecord.deleteMany({ where: { projectId, kind: { in: ["cms", "product", "service"] }, status: "SAMPLE" } });

  await prisma.appRecord.create({
    data: {
      projectId,
      kind: "cms",
      slug: "site",
      title: "CMS",
      status: "ACTIVE",
      data: {
        headline: spec.name,
        cta: spec.actions[0] ?? "",
        hours: "",
        social: {},
        contact: { phone: "", email: "", address: "" },
        seo: { title: spec.name, description: spec.purpose },
      },
    },
  });

  if (spec.productKind === "STORE" || spec.productKind === "MARKETPLACE") {
    const he = spec.locale === "HE";
    for (const title of he ? ["פריט לדוגמה א׳", "פריט לדוגמה ב׳"] : ["Sample item A", "Sample item B"]) {
      await prisma.appRecord.create({
        data: {
          projectId,
          kind: "product",
          slug: title.toLowerCase().replace(/\s+/g, "-"),
          title,
          status: "SAMPLE",
          data: {
            priceCents: 0,
            inventory: 0,
            category: he ? "כללי" : "General",
            isSample: true,
            note: he ? "החליפו או מחקו לפני פרסום" : "Replace or delete before publish",
          },
        },
      });
    }
  }

  if (spec.productKind === "BOOKING") {
    const he = spec.locale === "HE";
    for (const title of he ? ["שירות ראשי", "שירות משני"] : ["Primary service", "Follow-up"]) {
      await prisma.appRecord.create({
        data: {
          projectId,
          kind: "service",
          title,
          status: "ACTIVE",
          data: { durationMin: 60, isPlaceholder: true },
        },
      });
    }
  }
}
