import prisma from "@/lib/db";
import { readMemory } from "@/lib/ai/pipeline/memory";
import { qaSnapshot } from "@/lib/ai/pipeline/qa";
import type { ProjectSnapshot } from "@/lib/ai/types";

export async function publishReadiness(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { pages: true },
  });
  if (!project) return { ok: false, errors: ["Project not found"], warnings: [] as string[] };

  const memory = readMemory(project.settings);
  const last = await prisma.projectVersion.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
  });
  const snapshot = last?.snapshot as ProjectSnapshot | undefined;
  const qa = snapshot ? qaSnapshot(snapshot, projectId, memory?.spec) : { passed: false, errors: ["No snapshot"], warnings: [] };

  const errors = [...qa.errors];
  const warnings = [...(qa.warnings ?? [])];

  if (!qa.passed) errors.push("Critical QA failed — cannot publish");

  const cms = await prisma.appRecord.findFirst({ where: { projectId, kind: "cms", slug: "site" } });
  const contact = (cms?.data as { contact?: { phone?: string; email?: string } } | null)?.contact;
  if (!contact?.phone && !contact?.email) {
    warnings.push("No real phone or email filled in CMS");
  }

  const samples = await prisma.appRecord.count({ where: { projectId, status: "SAMPLE" } });
  if (samples > 0) {
    errors.push("Sample / dummy catalog items must be replaced before publish");
  }

  const setup = memory?.spec.needsSetup.filter((s) => s.requiredForPublish && s.status === "needed") ?? [];
  for (const item of setup) {
    if (item.key === "contact") continue;
    if (item.key === "stripe") warnings.push(item.label);
    else errors.push(item.label);
  }

  return { ok: errors.length === 0, errors, warnings };
}
