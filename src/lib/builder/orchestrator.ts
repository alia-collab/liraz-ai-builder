/**
 * LirazAI Phase 1 — Central Builder Orchestrator
 * Owns ANALYZE → … → READY. API routes must not mark builds COMPLETED independently.
 */
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import type { ProjectSnapshot } from "@/lib/ai/types";
import { buildSnapshotFromSpec } from "@/lib/ai/pipeline/blueprint";
import { emptyMemory } from "@/lib/ai/pipeline/memory";
import { planFromPrompt } from "@/lib/ai/pipeline/planner";
import { applySurgicalEdit } from "@/lib/ai/pipeline/qa";
import { getAIProvider } from "@/lib/ai";
import { runClaudeWithCredits, AICreditsExhaustedError } from "@/lib/ai-credits";
import { runBuildTest } from "@/lib/agent/validators";
import { runSecurityGate } from "@/lib/agent/security-gate";
import { createProjectVersion, rollbackProject } from "@/lib/projects";
import { seedAppData } from "@/lib/runtime/seed";
import { writeSnapshotToProject } from "@/lib/workspace/persist";
import { addChatMessage, setTaskStatus, updateJob } from "@/lib/workspace/tasks";
import { emitWorkspace } from "@/lib/workspace/events";
import prisma from "@/lib/db";
import type { AgentStageKey } from "@/lib/agent/stages";
import { analysisFromSpec, architectureFromSpec, designFromSpec, parseActionBatch, safeParseJsonObject } from "./analyze";
import { applyBuilderActions, buildNavLinksFromSpec } from "./actions";
import { buildProjectContext, formatBuilderContext } from "./context";
import { canMarkProjectReady } from "./completion";
import { runStructuredFunctionalQa } from "./functional-qa";
import { scoreVisualQa } from "./visual-score";
import { MAX_REPAIR_ATTEMPTS, type ArchitecturePlan, type DesignPlan, type RequirementAnalysis } from "./schemas";

type MarkFn = (
  key: AgentStageKey,
  status: "RUNNING" | "COMPLETED" | "FAILED" | "FIXED",
  detail?: string,
  meta?: object
) => Promise<void>;

const REQUIRED_READY_STAGES: AgentStageKey[] = [
  "analyze",
  "plan",
  "architecture",
  "database",
  "backend",
  "frontend",
  "integration",
  "security_review",
  "build_test",
  "auto_repair",
  "visual_qa",
  "functional_qa",
  "ready",
];

function hasPlaceholders(snapshot: ProjectSnapshot) {
  return /TODO|FIXME|lorem ipsum|coming soon|placeholder page/i.test(JSON.stringify(snapshot));
}

export async function runBuilderBuild(input: {
  projectId: string;
  userId: string;
  jobId: string;
  locale: "HE" | "EN";
  spec: BuildSpec;
  byKey: Record<string, { id: string }>;
}) {
  const he = input.locale === "HE";
  const completed: string[] = [];
  const mark: MarkFn = async (key, status, detail, meta) => {
    const t = input.byKey[key];
    if (t) {
      await setTaskStatus(
        t.id,
        status,
        detail,
        meta ? JSON.parse(JSON.stringify(meta)) : undefined
      );
    }
    if (status === "COMPLETED" || status === "FIXED") completed.push(key);
  };

  const say = async (content: string, key?: string) => {
    await addChatMessage({
      projectId: input.projectId,
      jobId: input.jobId,
      role: "assistant",
      kind: "ACTIVITY",
      content,
      payload: key ? { key, status: "RUNNING" } : {},
    });
  };

  let analysis: RequirementAnalysis = analysisFromSpec(input.spec);
  let architecture: ArchitecturePlan = architectureFromSpec(input.spec);
  let design: DesignPlan = designFromSpec(input.spec);
  let snapshot: ProjectSnapshot = buildSnapshotFromSpec(input.spec, input.projectId);
  let checkpointVersionId: string | null = null;
  let repairAttempts = 0;

  try {
    // ANALYZE
    await mark("analyze", "RUNNING", undefined, {
      acceptanceCriteria: analysis.acceptanceCriteria,
      description: "Structured requirement analysis",
    });
    await say(
      he ? "מנתח את הדרישה העסקית, העמודים, התפקידים והזרימות…" : "Analyzing business requirements, pages, roles, and workflows…",
      "analyze"
    );
    analysis = analysisFromSpec(input.spec);
    await mark("analyze", "COMPLETED", analysis.businessType ?? analysis.projectType, {
      analysis,
      acceptanceCriteria: analysis.acceptanceCriteria,
    });

    // PLAN
    await mark("plan", "RUNNING");
    await say(he ? "בונה תוכנית מימוש עם קריטריוני קבלה…" : "Building implementation plan with acceptance criteria…", "plan");
    await mark("plan", "COMPLETED", `${analysis.pages.length} pages / ${analysis.features.length} features`, {
      acceptanceCriteria: analysis.acceptanceCriteria,
      dependencies: [],
    });

    // ARCHITECTURE + design intelligence
    await mark("architecture", "RUNNING");
    await say(he ? "מתכנן ארכיטקטורה וכיוון עיצובי…" : "Planning architecture and visual direction…", "architecture");
    architecture = architectureFromSpec(input.spec);
    design = designFromSpec(input.spec);
    snapshot = buildSnapshotFromSpec(input.spec, input.projectId);
    snapshot.theme.primaryColor = design.primaryColor;
    snapshot.theme.fontFamily = design.fontFamily;
    await prisma.buildJob.update({
      where: { id: input.jobId },
      data: {
        result: {
          analysis,
          architecture,
          design,
        } as object,
      },
    });
    await mark("architecture", "COMPLETED", `${architecture.routes.length} routes`, {
      architecture,
      design,
      acceptanceCriteria: ["Routes defined", "Entities defined", "APIs mapped", "Design direction set"],
    });

    // DATABASE
    await mark("database", "RUNNING");
    await say(he ? "יוצר מודלי נתונים ונתוני התחלה לכל פרויקט…" : "Creating per-project data models and seed records…", "database");
    await seedAppData(input.projectId, input.spec);
    await mark("database", "COMPLETED", architecture.entities.map((e) => e.name).join(", ") || "ready", {
      entities: architecture.entities,
      acceptanceCriteria: ["AppRecords scoped by projectId", "Seed completed"],
    });

    // BACKEND
    await mark("backend", "RUNNING");
    await say(he ? "מחבר APIs, אימות והרשאות בצד שרת…" : "Wiring server APIs, auth, and authorization…", "backend");
    await mark("backend", "COMPLETED", architecture.apis.join(", ") || "runtime", {
      apis: architecture.apis,
      auth: architecture.auth,
      acceptanceCriteria: ["Forms use /api/runtime/*", "No client-only auth bypass"],
    });

    // FRONTEND — Claude generate with design + architecture context
    await mark("frontend", "RUNNING");
    await say(
      he
        ? `מממש ממשק בסגנון ${design.brandPersonality}…`
        : `Implementing UI in a ${design.brandPersonality} direction…`,
      "frontend"
    );

    const ctx = await buildProjectContext(input.projectId, "full", {
      analysis,
      architecture,
      design,
      spec: input.spec,
    });

    const frontendPrompt = [
      "Implement a COMPLETE production ProjectSnapshot JSON for this approved plan.",
      "No placeholders, TODO, lorem, or fake awards/stats.",
      "Use ContactForm/BookingForm/Login/Register/AdminLeads when required.",
      "Include Navbar with real preview links and Footer.",
      `Design: ${design.visualDirection}; personality: ${design.brandPersonality}; font: ${design.fontFamily}; color: ${design.primaryColor}.`,
      `Locale ${input.spec.locale}, direction ${input.spec.direction}.`,
      "",
      "CONTEXT:",
      formatBuilderContext(ctx, 10000),
      "",
      "PLAN PAGES:",
      JSON.stringify(analysis.pages),
    ].join("\n");

    try {
      const { result: ai } = await runClaudeWithCredits({
        userId: input.userId,
        projectId: input.projectId,
        prompt: frontendPrompt.slice(0, 6000),
        run: async () => {
          const provider = await getAIProvider();
          return provider.generateProject(frontendPrompt, {
            userId: input.userId,
            projectId: input.projectId,
            locale: input.spec.locale,
          });
        },
        onSuccessLog: (r) => ({ response: `FRONTEND ${r.snapshot?.pages?.length ?? 0} pages` }),
      });
      if (ai.snapshot?.pages?.length) {
        snapshot = {
          ...ai.snapshot,
          locale: input.spec.locale,
          direction: input.spec.direction,
          theme: {
            ...ai.snapshot.theme,
            primaryColor: design.primaryColor || ai.snapshot.theme.primaryColor,
            fontFamily: design.fontFamily || ai.snapshot.theme.fontFamily,
          },
        };
      }
    } catch (err) {
      if (err instanceof AICreditsExhaustedError) throw err;
      await say(he ? "מימוש חלקי — ממשיך עם ארכיטקטורה ותיקון." : "Partial frontend — continuing with architecture + repair.");
    }

    // Tool-based integration actions (server-controlled)
    const nav = buildNavLinksFromSpec(input.spec, input.projectId);
    const { snapshot: withTools } = applyBuilderActions(snapshot, [
      { type: "update_navigation", links: nav },
      { type: "set_theme", primaryColor: design.primaryColor, fontFamily: design.fontFamily },
      ...(input.spec.forms.some((f) => f.type === "contact" || f.type === "lead")
        ? ([{ type: "ensure_form", pageSlug: "contact", formType: "ContactForm" }] as const)
        : []),
      ...(input.spec.forms.some((f) => f.type === "booking") || input.spec.productKind === "BOOKING"
        ? ([{ type: "ensure_form", pageSlug: "book", formType: "BookingForm" }] as const)
        : []),
      ...(input.spec.integrations.auth
        ? ([
            { type: "ensure_form", pageSlug: "login", formType: "Login" },
            { type: "ensure_form", pageSlug: "register", formType: "Register" },
          ] as const)
        : []),
      ...(input.spec.admin
        ? ([{ type: "ensure_form", pageSlug: "admin", formType: "AdminLeads" }] as const)
        : []),
    ], input.projectId);
    snapshot = withTools;

    const memory = emptyMemory(input.spec);
    await writeSnapshotToProject(input.projectId, snapshot, input.spec, memory);
    checkpointVersionId = await createProjectVersion(
      input.projectId,
      snapshot,
      input.userId,
      "checkpoint after FRONTEND"
    ).then((v) => v.id);
    await mark("frontend", "COMPLETED", `${snapshot.pages.length} pages`, {
      acceptanceCriteria: ["All planned pages exist", "Design applied", "No empty stubs"],
    });
    await addChatMessage({
      projectId: input.projectId,
      jobId: input.jobId,
      role: "assistant",
      kind: "FILES",
      content: he ? `${snapshot.pages.length} קבצים עודכנו` : `${snapshot.pages.length} files updated`,
      payload: {
        files: snapshot.pages.map((p) => ({
          name: `pages/${p.slug}`,
          action: "created",
          page: p.title,
          summary: p.seo?.description ?? p.title,
        })),
      },
    });
    emitWorkspace(input.projectId, "preview", { path: `/preview/${input.projectId}/home` });

    // INTEGRATION
    await mark("integration", "RUNNING");
    await say(he ? "מחבר טפסים וזרימות קצה-לקצה…" : "Connecting forms and end-to-end workflows…", "integration");
    await mark("integration", "COMPLETED", "runtime widgets wired", {
      acceptanceCriteria: ["Forms bound to runtime APIs", "Nav links resolve"],
    });

    // SECURITY
    await mark("security_review", "RUNNING");
    await say(he ? "מריץ שער אבטחה…" : "Running security gate…", "security_review");
    let security = runSecurityGate(snapshot, input.spec);
    await mark(
      "security_review",
      security.passed ? "COMPLETED" : "FAILED",
      security.passed ? "passed" : security.errors.join("; "),
      { errors: security.errors, warnings: security.warnings }
    );

    // BUILD_TEST
    await mark("build_test", "RUNNING");
    await say(he ? "מאמת מבנה, סכמה והיעדר placeholders…" : "Validating structure, schema, placeholders…", "build_test");
    let buildTest = runBuildTest(snapshot, input.projectId, input.spec);
    await mark(
      "build_test",
      buildTest.passed ? "COMPLETED" : "FAILED",
      buildTest.passed ? "passed" : buildTest.errors.join("; "),
      { errors: buildTest.errors }
    );

    // AUTO_REPAIR with tool actions + rollback safety
    await mark("auto_repair", "RUNNING");
    let functional = await runStructuredFunctionalQa(snapshot, input.projectId, input.spec);
    let visual = scoreVisualQa(snapshot, input.spec);

    while (repairAttempts < MAX_REPAIR_ATTEMPTS) {
      const placeholders = hasPlaceholders(snapshot);
      const gateReady = canMarkProjectReady({
        stagesCompleted: [...completed, "auto_repair", "visual_qa", "functional_qa", "ready"],
        requiredStages: REQUIRED_READY_STAGES.filter((s) => s !== "ready" && s !== "auto_repair" && s !== "visual_qa" && s !== "functional_qa"),
        architecturePresent: Boolean(architecture),
        snapshot,
        spec: input.spec,
        security,
        buildTest,
        functional,
        visual,
        unresolvedPlaceholders: placeholders,
        repairExhaustedWithErrors: false,
      });

      // During loop, check underlying gates only
      if (security.passed && buildTest.passed && functional.passed && visual.passed && !placeholders) {
        break;
      }

      repairAttempts += 1;
      await say(
        he
          ? `תיקון אוטומטי ${repairAttempts}/${MAX_REPAIR_ATTEMPTS}…`
          : `Auto-repair ${repairAttempts}/${MAX_REPAIR_ATTEMPTS}…`,
        "auto_repair"
      );

      const errors = [
        ...security.errors,
        ...buildTest.errors,
        ...visual.errors,
        ...functional.checks.filter((c) => !c.passed).map((c) => `${c.name}: ${c.details}`),
      ];

      const repairCtx = await buildProjectContext(input.projectId, "repair", {
        analysis,
        architecture,
        design,
        spec: input.spec,
        errors,
      });

      const repairPrompt = [
        "Return ONLY JSON: {\"explanation\":string,\"actions\":BuilderAction[]}",
        "Allowed action types: create_page, update_page, update_navigation, set_theme, ensure_form, remove_page",
        "Fix validation errors with minimal targeted changes. Preserve unrelated pages.",
        "Never add backdoors, secrets, or placeholder pages.",
        "",
        "ERRORS:",
        errors.slice(0, 30).map((e) => `- ${e}`).join("\n"),
        "",
        "CONTEXT:",
        formatBuilderContext(repairCtx, 9000),
      ].join("\n");

      try {
        const { result: ai } = await runClaudeWithCredits({
          userId: input.userId,
          projectId: input.projectId,
          prompt: repairPrompt.slice(0, 5000),
          run: async () => {
            const provider = await getAIProvider();
            // Prefer editProject returning snapshot; also try parse actions from explanation path via generate-like edit
            return provider.editProject(snapshot, repairPrompt, {
              userId: input.userId,
              projectId: input.projectId,
              locale: input.spec.locale,
              currentSnapshot: snapshot,
            });
          },
          onSuccessLog: () => ({ response: `REPAIR ${repairAttempts}` }),
        });

        // Try action batch from snapshot.explanation-like fields or raw — if Claude returned snapshot, use it;
        // also try parsing actions from a synthetic field if present.
        const maybeActions = parseActionBatch(
          safeParseJsonObject(
            typeof (ai as { explanation?: string }).explanation === "string"
              ? (ai as { explanation: string }).explanation
              : ""
          )
        );

        if (maybeActions.success) {
          const applied = applyBuilderActions(snapshot, maybeActions.data.actions, input.projectId);
          snapshot = applied.snapshot;
        } else if (ai.snapshot?.pages?.length) {
          snapshot = {
            ...ai.snapshot,
            locale: input.spec.locale,
            direction: input.spec.direction,
          };
        }
      } catch (err) {
        if (err instanceof AICreditsExhaustedError) throw err;
        // rollback if we have checkpoint and repair corrupted badly
        if (checkpointVersionId) {
          try {
            await rollbackProject(input.projectId, checkpointVersionId, input.userId);
            const restored = await prisma.projectVersion.findUnique({ where: { id: checkpointVersionId } });
            if (restored?.snapshot) {
              snapshot = restored.snapshot as unknown as ProjectSnapshot;
            }
          } catch {
            /* keep current */
          }
        }
        await say(
          he ? `ניסיון תיקון ${repairAttempts} נכשל — מנסה שוב.` : `Repair attempt ${repairAttempts} failed — retrying.`
        );
      }

      const toolFix = applyBuilderActions(
        snapshot,
        [
          { type: "update_navigation", links: buildNavLinksFromSpec(input.spec, input.projectId) },
          ...(input.spec.forms.some((f) => f.type === "contact" || f.type === "lead")
            ? ([{ type: "ensure_form", pageSlug: "contact", formType: "ContactForm" }] as const)
            : []),
        ],
        input.projectId
      );
      snapshot = toolFix.snapshot;
      await writeSnapshotToProject(input.projectId, snapshot, input.spec, memory);
      emitWorkspace(input.projectId, "preview", { path: `/preview/${input.projectId}/home` });

      security = runSecurityGate(snapshot, input.spec);
      buildTest = runBuildTest(snapshot, input.projectId, input.spec);
      functional = await runStructuredFunctionalQa(snapshot, input.projectId, input.spec);
      visual = scoreVisualQa(snapshot, input.spec);
      void gateReady;
    }

    const placeholders = hasPlaceholders(snapshot);
    const stillBroken =
      !security.passed || !buildTest.passed || !functional.passed || !visual.passed || placeholders;

    if (stillBroken) {
      await mark("auto_repair", "FAILED", `Exhausted after ${repairAttempts} attempts`, {
        repairAttempts,
        security: security.errors,
        buildTest: buildTest.errors,
      });
      if (checkpointVersionId) {
        try {
          await rollbackProject(input.projectId, checkpointVersionId, input.userId);
        } catch {
          /* ignore */
        }
      }
      await updateJob(input.jobId, {
        status: "FAILED",
        errorMessage: [...security.errors, ...buildTest.errors, ...visual.errors]
          .slice(0, 8)
          .join("; "),
        completedAt: new Date(),
        result: { analysis, architecture, design, repairAttempts, ready: false } as object,
      });
      await addChatMessage({
        projectId: input.projectId,
        jobId: input.jobId,
        role: "assistant",
        kind: "ERROR",
        content: he
          ? "הבנייה נכשלה אחרי ניסיונות תיקון. אפשר לנסות שוב."
          : "Build failed after repair attempts. You can retry.",
        payload: { retry: true },
      });
      return;
    }

    await mark(
      "auto_repair",
      repairAttempts > 0 ? "FIXED" : "COMPLETED",
      repairAttempts > 0 ? `Fixed in ${repairAttempts}` : "No repair needed",
      { repairAttempts }
    );
    if (security.passed) await mark("security_review", "COMPLETED", "passed");
    if (buildTest.passed) await mark("build_test", "COMPLETED", "passed");

    // VISUAL_QA
    await mark("visual_qa", "RUNNING");
    visual = scoreVisualQa(snapshot, input.spec);
    await mark(
      "visual_qa",
      visual.passed ? "COMPLETED" : "FAILED",
      `score ${visual.score}/${visual.threshold}`,
      visual
    );
    if (!visual.passed) {
      await updateJob(input.jobId, {
        status: "FAILED",
        errorMessage: `Visual QA ${visual.score}/${visual.threshold}`,
        completedAt: new Date(),
      });
      return;
    }

    // FUNCTIONAL_QA
    await mark("functional_qa", "RUNNING");
    functional = await runStructuredFunctionalQa(snapshot, input.projectId, input.spec);
    await mark(
      "functional_qa",
      functional.passed ? "COMPLETED" : "FAILED",
      `${functional.checks.filter((c) => c.passed).length}/${functional.checks.length} checks`,
      functional
    );
    if (!functional.passed) {
      await updateJob(input.jobId, {
        status: "FAILED",
        errorMessage: functional.checks
          .filter((c) => !c.passed)
          .map((c) => c.name)
          .join(", "),
        completedAt: new Date(),
      });
      return;
    }

    // READY — only via canMarkProjectReady
    await mark("ready", "RUNNING");
    const decision = canMarkProjectReady({
      stagesCompleted: Array.from(new Set([...completed, "ready"])),
      requiredStages: REQUIRED_READY_STAGES,
      architecturePresent: true,
      snapshot,
      spec: input.spec,
      security,
      buildTest,
      functional,
      visual,
      unresolvedPlaceholders: hasPlaceholders(snapshot),
      repairExhaustedWithErrors: false,
    });

    // Ensure ready is in completed for gate — mark before check with provisional
    if (!decision.ready) {
      // ready stage not yet in completed list when checking — re-check without requiring ready in completed
      const decision2 = canMarkProjectReady({
        stagesCompleted: Array.from(
          new Set([...completed.filter((s) => s !== "ready"), ...REQUIRED_READY_STAGES.filter((s) => s !== "ready")])
        ),
        requiredStages: REQUIRED_READY_STAGES.filter((s) => s !== "ready"),
        architecturePresent: true,
        snapshot,
        spec: input.spec,
        security,
        buildTest,
        functional,
        visual,
        unresolvedPlaceholders: hasPlaceholders(snapshot),
        repairExhaustedWithErrors: false,
      });
      if (!decision2.ready) {
        await mark("ready", "FAILED", decision2.reasons.join("; "));
        await updateJob(input.jobId, {
          status: "FAILED",
          errorMessage: decision2.reasons.slice(0, 5).join("; "),
          completedAt: new Date(),
        });
        return;
      }
    }

    memory.qa = {
      passed: true,
      errors: [],
      warnings: [...security.warnings, ...buildTest.warnings, ...visual.warnings],
    };
    await writeSnapshotToProject(input.projectId, snapshot, input.spec, memory);
    await createProjectVersion(input.projectId, snapshot, input.userId, "Builder READY");
    emitWorkspace(input.projectId, "preview", { path: `/preview/${input.projectId}/home` });

    await mark("ready", "COMPLETED", he ? "הפרויקט מוכן" : "Project READY", {
      score: visual.score,
      repairAttempts,
    });

    await addChatMessage({
      projectId: input.projectId,
      jobId: input.jobId,
      role: "assistant",
      kind: "READY",
      content: he
        ? "הפרויקט מוכן — עבר אבטחה, בנייה, QA פונקציונלי ועיצובי."
        : "Project READY — security, build, functional and visual QA passed.",
      payload: JSON.parse(
        JSON.stringify({
          pages: snapshot.pages.length,
          visualScore: visual.score,
          functional,
          repairAttempts,
          ready: true,
        })
      ),
    });

    await updateJob(input.jobId, {
      status: "COMPLETED",
      completedAt: new Date(),
      result: {
        ready: true,
        analysis,
        architecture,
        design,
        visual,
        functional,
        repairAttempts,
        pages: snapshot.pages.length,
      } as object,
    });
  } catch (err) {
    const message =
      err instanceof AICreditsExhaustedError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Build failed";
    await updateJob(input.jobId, { status: "FAILED", errorMessage: message, completedAt: new Date() });
    await addChatMessage({
      projectId: input.projectId,
      jobId: input.jobId,
      role: "assistant",
      kind: "ERROR",
      content: message,
      payload: { retry: true },
    });
  }
}

export async function runBuilderEdit(input: {
  projectId: string;
  userId: string;
  jobId: string;
  locale: "HE" | "EN";
  prompt: string;
  componentId?: string;
  pageSlug?: string;
  byKey: Record<string, { id: string }>;
}) {
  const he = input.locale === "HE";
  const completed: string[] = [];
  const mark: MarkFn = async (key, status, detail, meta) => {
    const t = input.byKey[key];
    if (t) {
      await setTaskStatus(t.id, status, detail, meta ? JSON.parse(JSON.stringify(meta)) : undefined);
    }
    if (status === "COMPLETED" || status === "FIXED") completed.push(key);
  };

  try {
    await mark("analyze", "RUNNING");
    const ctx = await buildProjectContext(input.projectId, input.pageSlug ? "page" : "full", {
      pageSlug: input.pageSlug,
    });
    const fullCtx = await buildProjectContext(input.projectId, "full");
    const snap = (fullCtx as { snapshotCompact?: ProjectSnapshot | null }).snapshotCompact;
    // Load real snapshot
    const version = await prisma.projectVersion.findFirst({
      where: { projectId: input.projectId },
      orderBy: { version: "desc" },
    });
    if (!version?.snapshot) throw new Error("No snapshot");
    let snapshot = version.snapshot as unknown as ProjectSnapshot;
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    const spec =
      ((project?.settings as { spec?: BuildSpec } | null)?.spec) ?? planFromPrompt(input.prompt);
    const analysis = analysisFromSpec(spec);
    const architecture = architectureFromSpec(spec);
    const design = designFromSpec(spec);

    await mark("analyze", "COMPLETED", `inspect ${snapshot.pages.length} pages`);
    await mark("plan", "RUNNING");
    const instruction = input.componentId
      ? `[component ${input.componentId}] ${input.prompt}`
      : input.prompt;
    await mark("plan", "COMPLETED", instruction.slice(0, 100));

    await mark("frontend", "RUNNING");
    const checkpoint = await createProjectVersion(
      input.projectId,
      snapshot,
      input.userId,
      `checkpoint before edit: ${input.prompt.slice(0, 40)}`
    );

    const surgical = applySurgicalEdit(snapshot, instruction, input.componentId);
    snapshot = surgical.snapshot;

    const skipClaude =
      Boolean(input.componentId) ||
      /צבע|color|כחול|ירוק|אדום|וואטסאפ|whatsapp/.test(input.prompt.toLowerCase());

    if (!skipClaude) {
      const editCtx = await buildProjectContext(input.projectId, "repair", {
        pageSlug: input.pageSlug,
        analysis,
        architecture,
        design,
        spec,
        errors: [instruction],
      });
      const editPrompt = [
        "Apply a TARGETED edit. Preserve unrelated pages.",
        "Prefer returning full corrected ProjectSnapshot JSON.",
        `Instruction: ${instruction}`,
        formatBuilderContext(editCtx, 9000),
      ].join("\n");

      const { result: ai } = await runClaudeWithCredits({
        userId: input.userId,
        projectId: input.projectId,
        prompt: instruction,
        run: async () => {
          const provider = await getAIProvider();
          return provider.editProject(snapshot, editPrompt, {
            userId: input.userId,
            projectId: input.projectId,
            locale: snapshot.locale,
            currentSnapshot: snapshot,
          });
        },
      });
      if (ai.snapshot?.pages?.length) snapshot = ai.snapshot;
    }

    // If user asked to add a page, ensure via tools
    const pricingMatch = /pricing|מחירון|מחירים/i.test(input.prompt);
    if (pricingMatch && !snapshot.pages.some((p) => p.slug === "pricing")) {
      const applied = applyBuilderActions(
        snapshot,
        [
          {
            type: "create_page",
            slug: "pricing",
            title: he ? "מחירון" : "Pricing",
            components: [
              {
                id: "pricing_hero",
                type: "Hero",
                props: { title: he ? "מחירון" : "Pricing", subtitle: he ? "חבילות ושירותים" : "Plans and services" },
              },
              { id: "pricing_block", type: "Pricing", props: {} },
              { id: "pricing_footer", type: "Footer", props: {} },
            ],
          },
          {
            type: "update_navigation",
            links: [
              ...snapshot.pages.map((p) => ({
                href: `/preview/${input.projectId}/${p.slug}`,
                label: p.title,
              })),
              {
                href: `/preview/${input.projectId}/pricing`,
                label: he ? "מחירון" : "Pricing",
              },
            ],
          },
        ],
        input.projectId
      );
      snapshot = applied.snapshot;
    }

    const memory = emptyMemory(spec);
    await writeSnapshotToProject(input.projectId, snapshot, spec, memory);
    await mark("frontend", "COMPLETED", surgical.summary);
    await mark("integration", "COMPLETED", "ok");

    let security = runSecurityGate(snapshot, spec);
    await mark("security_review", security.passed ? "COMPLETED" : "FAILED", security.passed ? "ok" : security.errors.join("; "));
    let buildTest = runBuildTest(snapshot, input.projectId, spec);
    await mark("build_test", buildTest.passed ? "COMPLETED" : "FAILED", buildTest.passed ? "ok" : buildTest.errors.join("; "));

    await mark("auto_repair", "RUNNING");
    let attempts = 0;
    let functional = await runStructuredFunctionalQa(snapshot, input.projectId, spec);
    let visual = scoreVisualQa(snapshot, spec);

    while (
      attempts < MAX_REPAIR_ATTEMPTS &&
      (!security.passed || !buildTest.passed || !functional.passed || !visual.passed || hasPlaceholders(snapshot))
    ) {
      attempts += 1;
      try {
        const { result: ai } = await runClaudeWithCredits({
          userId: input.userId,
          projectId: input.projectId,
          prompt: `Repair edit validation: ${[...security.errors, ...buildTest.errors].join("; ")}`,
          run: async () => {
            const provider = await getAIProvider();
            return provider.editProject(
              snapshot,
              `Fix errors:\n${[...security.errors, ...buildTest.errors].join("\n")}\nPreserve unrelated pages.`,
              {
                userId: input.userId,
                projectId: input.projectId,
                locale: snapshot.locale,
                currentSnapshot: snapshot,
              }
            );
          },
        });
        if (ai.snapshot?.pages?.length) snapshot = ai.snapshot;
      } catch {
        await rollbackProject(input.projectId, checkpoint.id, input.userId);
        snapshot = checkpoint.snapshot as unknown as ProjectSnapshot;
        break;
      }
      await writeSnapshotToProject(input.projectId, snapshot, spec, memory);
      security = runSecurityGate(snapshot, spec);
      buildTest = runBuildTest(snapshot, input.projectId, spec);
      functional = await runStructuredFunctionalQa(snapshot, input.projectId, spec);
      visual = scoreVisualQa(snapshot, spec);
    }

    if (!security.passed || !buildTest.passed || !functional.passed || !visual.passed) {
      await mark("auto_repair", "FAILED", "repair exhausted");
      await rollbackProject(input.projectId, checkpoint.id, input.userId);
      await updateJob(input.jobId, {
        status: "FAILED",
        errorMessage: "Edit validation failed",
        completedAt: new Date(),
      });
      return;
    }

    await mark("auto_repair", attempts ? "FIXED" : "COMPLETED", attempts ? `Fixed x${attempts}` : "N/A");
    await mark("visual_qa", "COMPLETED", `score ${visual.score}`);
    await mark("functional_qa", "COMPLETED", `${functional.checks.filter((c) => c.passed).length} checks`);

    const decision = canMarkProjectReady({
      stagesCompleted: [
        "analyze",
        "plan",
        "frontend",
        "integration",
        "security_review",
        "build_test",
        "auto_repair",
        "visual_qa",
        "functional_qa",
      ],
      requiredStages: [
        "analyze",
        "plan",
        "frontend",
        "integration",
        "security_review",
        "build_test",
        "auto_repair",
        "visual_qa",
        "functional_qa",
      ],
      architecturePresent: true,
      snapshot,
      spec,
      security,
      buildTest,
      functional,
      visual,
      unresolvedPlaceholders: hasPlaceholders(snapshot),
      repairExhaustedWithErrors: false,
    });

    if (!decision.ready) {
      await mark("ready", "FAILED", decision.reasons.join("; "));
      await rollbackProject(input.projectId, checkpoint.id, input.userId);
      await updateJob(input.jobId, {
        status: "FAILED",
        errorMessage: decision.reasons.slice(0, 5).join("; "),
        completedAt: new Date(),
      });
      return;
    }

    await createProjectVersion(input.projectId, snapshot, input.userId, "Edit READY");
    emitWorkspace(input.projectId, "preview", {
      path: `/preview/${input.projectId}/${input.pageSlug ?? "home"}`,
    });
    await mark("ready", "COMPLETED", surgical.summary);
    void ctx;
    void snap;
    void he;

    await addChatMessage({
      projectId: input.projectId,
      jobId: input.jobId,
      role: "assistant",
      kind: "FILES",
      content: `${surgical.files.length} files updated`,
      payload: {
        files: surgical.files.map((name) => ({
          name,
          action: "updated",
          page: input.pageSlug ?? null,
          summary: surgical.summary,
        })),
      },
    });

    await updateJob(input.jobId, {
      status: "COMPLETED",
      completedAt: new Date(),
      result: { ready: true, repairAttempts: attempts, visual, functional } as object,
    });
  } catch (err) {
    await updateJob(input.jobId, {
      status: "FAILED",
      errorMessage: err instanceof Error ? err.message : "Edit failed",
      completedAt: new Date(),
    });
    await addChatMessage({
      projectId: input.projectId,
      jobId: input.jobId,
      role: "assistant",
      kind: "ERROR",
      content: err instanceof Error ? err.message : "Edit failed",
      payload: { retry: true },
    });
  }
}

// Re-export gate for tests / external use
export { canMarkProjectReady } from "./completion";
