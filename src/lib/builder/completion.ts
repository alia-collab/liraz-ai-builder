import type { ProjectSnapshot } from "@/lib/ai/types";
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import type { GateResult } from "@/lib/agent/validators";
import type { FunctionalQaReport } from "./schemas";
import type { VisualScore } from "./schemas";
import { VISUAL_QA_MIN_SCORE } from "./schemas";

export type ReadyInput = {
  stagesCompleted: string[];
  requiredStages: string[];
  architecturePresent: boolean;
  snapshot: ProjectSnapshot;
  spec: BuildSpec;
  security: GateResult;
  buildTest: GateResult;
  functional: FunctionalQaReport;
  visual: VisualScore;
  unresolvedPlaceholders: boolean;
  repairExhaustedWithErrors: boolean;
};

/**
 * Single completion gate — no other path should mark READY/COMPLETED.
 */
export function canMarkProjectReady(input: ReadyInput): {
  ready: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  for (const stage of input.requiredStages) {
    if (!input.stagesCompleted.includes(stage)) {
      reasons.push(`Stage not completed: ${stage}`);
    }
  }

  if (!input.architecturePresent) reasons.push("Architecture plan missing");
  if (!input.snapshot.pages.length) reasons.push("No pages");
  if (input.unresolvedPlaceholders) reasons.push("Unresolved placeholders/TODOs");
  if (!input.security.passed) reasons.push(`Security gate failed: ${input.security.errors[0] ?? "errors"}`);
  if (!input.buildTest.passed) reasons.push(`Build test failed: ${input.buildTest.errors[0] ?? "errors"}`);
  if (!input.functional.passed) reasons.push("Functional QA failed");
  if (!input.visual.passed || input.visual.score < VISUAL_QA_MIN_SCORE) {
    reasons.push(`Visual QA below threshold (${input.visual.score}/${VISUAL_QA_MIN_SCORE})`);
  }
  if (input.repairExhaustedWithErrors) reasons.push("Repair loop exhausted with remaining errors");

  // Spec pages must exist
  for (const page of input.spec.pages) {
    if (!input.snapshot.pages.some((p) => p.slug === page.slug)) {
      reasons.push(`Missing required page: ${page.slug}`);
    }
  }

  return { ready: reasons.length === 0, reasons };
}
