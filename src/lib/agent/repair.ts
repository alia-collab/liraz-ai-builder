import type { ProjectSnapshot } from "@/lib/ai/types";
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import { getAIProvider } from "@/lib/ai";
import { runClaudeWithCredits } from "@/lib/ai-credits";
import { formatContextForClaude, type ProjectContext } from "./context";
import type { GateResult } from "./validators";

export type RepairResult = {
  snapshot: ProjectSnapshot;
  attempts: number;
  lastErrors: string[];
  repaired: boolean;
};

/**
 * Send validation errors + current project context to Claude for a targeted repair.
 * Does not regenerate from scratch blindly — includes current snapshot and error list.
 */
export async function repairSnapshotWithClaude(input: {
  userId: string;
  projectId: string;
  snapshot: ProjectSnapshot;
  spec: BuildSpec;
  context: ProjectContext;
  gate: GateResult;
  attempt: number;
}): Promise<ProjectSnapshot> {
  const errorBlock = input.gate.errors.slice(0, 40).join("\n- ");
  const warnBlock = input.gate.warnings.slice(0, 20).join("\n- ");
  const contextText = formatContextForClaude(input.context);

  const instruction = [
    `AUTO_REPAIR attempt ${input.attempt}.`,
    `Fix the CURRENT project so all validation errors are resolved.`,
    `Do NOT invent placeholder pages. Do NOT add mock-only flows.`,
    `Preserve working pages and components that are unrelated to the errors.`,
    `Hebrew sites must stay locale HE and direction RTL.`,
    `Forms must use real LirazAI runtime endpoints (ContactForm/BookingForm/Login/Register/AdminLeads).`,
    ``,
    `VALIDATION ERRORS:`,
    `- ${errorBlock || "(none)"}`,
    ``,
    `WARNINGS:`,
    `- ${warnBlock || "(none)"}`,
    ``,
    `PROJECT CONTEXT:`,
    contextText,
    ``,
    `Return a complete corrected ProjectSnapshot JSON.`,
  ].join("\n");

  const { result: ai } = await runClaudeWithCredits({
    userId: input.userId,
    projectId: input.projectId,
    prompt: instruction.slice(0, 4000),
    run: async () => {
      const provider = await getAIProvider();
      return provider.editProject(input.snapshot, instruction, {
        userId: input.userId,
        projectId: input.projectId,
        locale: input.spec.locale,
        currentSnapshot: input.snapshot,
      });
    },
    onSuccessLog: () => ({
      response: `AUTO_REPAIR attempt ${input.attempt}`,
    }),
  });

  if (!ai.snapshot?.pages?.length) {
    throw new Error("Repair returned empty snapshot");
  }

  return {
    ...ai.snapshot,
    theme: {
      ...ai.snapshot.theme,
      primaryColor: input.spec.visual.primaryColor || ai.snapshot.theme.primaryColor,
    },
    locale: input.spec.locale,
    direction: input.spec.direction,
  };
}
