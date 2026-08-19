import type { ProjectMemory, BuildSpec } from "./types";
import type { Prisma } from "@prisma/client";

export function emptyMemory(spec: BuildSpec): ProjectMemory {
  return {
    spec,
    decisions: [`Inferred product type ${spec.productType}`],
    protected: ["Navbar links must stay on existing slugs", "Lead form must POST to runtime API"],
    openTasks: [...spec.successCriteria],
    changelog: [],
    buildLog: [],
  };
}

export function mergeSettings(
  existing: Prisma.JsonValue | object,
  memory: ProjectMemory,
  theme?: { primaryColor: string; fontFamily: string; borderRadius: string }
) {
  const base = (existing && typeof existing === "object" ? existing : {}) as Record<string, unknown>;
  return {
    ...base,
    ...(theme ?? memory.spec.visual),
    primaryColor: theme?.primaryColor ?? memory.spec.visual.primaryColor,
    fontFamily: theme?.fontFamily ?? memory.spec.visual.fontFamily,
    borderRadius: theme?.borderRadius ?? "0.75rem",
    memory,
    spec: memory.spec,
  };
}

export function readMemory(settings: unknown): ProjectMemory | null {
  if (!settings || typeof settings !== "object") return null;
  const mem = (settings as { memory?: ProjectMemory }).memory;
  if (!mem?.spec) return null;
  return mem;
}
