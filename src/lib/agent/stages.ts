/**
 * Autonomous agent stage machine for LirazAI builds.
 *
 * Projects are ProjectSnapshot JSON + AppRecord runtime (not generated Next.js repos).
 * BUILD_TEST validates schema, wiring, placeholders, and security — not `tsc` of a generated app.
 */

export const AGENT_MAX_REPAIR_ATTEMPTS = Math.max(
  1,
  Math.min(8, Math.floor(Number(process.env.AGENT_MAX_REPAIR_ATTEMPTS || "3")))
);

export type AgentStageKey =
  | "analyze"
  | "plan"
  | "architecture"
  | "database"
  | "backend"
  | "frontend"
  | "integration"
  | "security_review"
  | "build_test"
  | "auto_repair"
  | "visual_qa"
  | "functional_qa"
  | "ready";

export type AgentStageDef = {
  key: AgentStageKey;
  titleHe: string;
  titleEn: string;
  descriptionHe: string;
  descriptionEn: string;
  /** Measurable completion criteria shown in task metadata */
  criteria: string[];
};

export const AGENT_BUILD_STAGES: AgentStageDef[] = [
  {
    key: "analyze",
    titleHe: "ניתוח דרישות",
    titleEn: "ANALYZE",
    descriptionHe: "מנתח את הדרישה המלאה והמבנה הקיים.",
    descriptionEn: "Analyze full requirements and current project context.",
    criteria: ["Requirements listed", "Existing pages/components inspected", "Roles and workflows identified"],
  },
  {
    key: "plan",
    titleHe: "תוכנית מימוש",
    titleEn: "PLAN",
    descriptionHe: "בונה תוכנית מימוש מפורטת עם קריטריוני הצלחה.",
    descriptionEn: "Detailed implementation plan with success criteria.",
    criteria: ["Pages listed", "Data models listed", "APIs/workflows listed", "Success criteria defined"],
  },
  {
    key: "architecture",
    titleHe: "ארכיטקטורה",
    titleEn: "ARCHITECTURE",
    descriptionHe: "מגדיר מבנה עמודים, רכיבים והפרדת אחריות.",
    descriptionEn: "Define pages, components, and boundaries.",
    criteria: ["Page map complete", "Component inventory", "Auth surfaces defined"],
  },
  {
    key: "database",
    titleHe: "מסד נתונים",
    titleEn: "DATABASE",
    descriptionHe: "יוצר מודלים ונתוני התחלה אמיתיים.",
    descriptionEn: "Create real data models and seed records.",
    criteria: ["Collections seeded", "No fake production data unless prototype", "Schema matches plan"],
  },
  {
    key: "backend",
    titleHe: "בקאנד",
    titleEn: "BACKEND",
    descriptionHe: "מחבר APIs, אימות והרשאות בצד שרת.",
    descriptionEn: "Wire APIs, auth, and server-side enforcement.",
    criteria: ["Form actions point to runtime APIs", "Auth endpoints referenced", "No client-only auth bypass"],
  },
  {
    key: "frontend",
    titleHe: "פרונטאנד",
    titleEn: "FRONTEND",
    descriptionHe: "מממש ממשק מלא לפי התוכנית.",
    descriptionEn: "Implement complete UI from the plan.",
    criteria: ["All planned pages exist", "No empty placeholder pages", "Navbar/Footer consistent"],
  },
  {
    key: "integration",
    titleHe: "אינטגרציה",
    titleEn: "INTEGRATION",
    descriptionHe: "מחבר טפסים, דשבורדים וזרימות קצה לקצה.",
    descriptionEn: "Connect forms, dashboards, and end-to-end flows.",
    criteria: ["Forms submit to real APIs", "Dashboard reads records", "Links resolve"],
  },
  {
    key: "security_review",
    titleHe: "ביקורת אבטחה",
    titleEn: "SECURITY_REVIEW",
    descriptionHe: "בודק אימות, הרשאות, XSS וגבולות שרת/לקוח.",
    descriptionEn: "Authz, XSS, secrets, and server/client boundaries.",
    criteria: ["No blocked patterns", "No secret leakage", "No auth bypass", "Protected surfaces marked"],
  },
  {
    key: "build_test",
    titleHe: "בדיקת בנייה",
    titleEn: "BUILD_TEST",
    descriptionHe: "מאמת מבנה, סכמה והיעדר placeholders.",
    descriptionEn: "Validate structure, schema, and no placeholders.",
    criteria: ["Schema valid", "Sanitize pass", "No TODO/placeholder pages", "QA structure pass"],
  },
  {
    key: "auto_repair",
    titleHe: "תיקון אוטומטי",
    titleEn: "AUTO_REPAIR",
    descriptionHe: "שולח שגיאות ל-Claude ומתקן עד הצלחה.",
    descriptionEn: "Send errors to Claude and repair until green.",
    criteria: ["Errors captured", "Targeted fixes applied", "Re-validated"],
  },
  {
    key: "visual_qa",
    titleHe: "בדיקת עיצוב",
    titleEn: "VISUAL_QA",
    descriptionHe: "בודק RTL, מובייל והיררכיה ויזואלית.",
    descriptionEn: "RTL, responsive intent, and visual hierarchy.",
    criteria: ["RTL when HE", "Theme complete", "No empty hero-only stubs"],
  },
  {
    key: "functional_qa",
    titleHe: "בדיקה פונקציונלית",
    titleEn: "FUNCTIONAL_QA",
    descriptionHe: "מוודא שזרימות מבוקשות עובדות מקצה לקצה.",
    descriptionEn: "Requested workflows work end-to-end.",
    criteria: ["Forms wired", "Auth pages present if required", "CRUD/admin surfaces if required"],
  },
  {
    key: "ready",
    titleHe: "מוכן",
    titleEn: "READY",
    descriptionHe: "הפרויקט עבר את כל השערים.",
    descriptionEn: "All gates passed — production-ready snapshot.",
    criteria: ["All prior stages COMPLETED", "No unresolved errors", "READY card emitted"],
  },
];

export const AGENT_EDIT_STAGES: AgentStageDef[] = [
  {
    key: "analyze",
    titleHe: "ניתוח השינוי",
    titleEn: "ANALYZE",
    descriptionHe: "בודק את המבנה הקיים לפני שינוי.",
    descriptionEn: "Inspect current project before editing.",
    criteria: ["Current snapshot loaded", "Change scope identified"],
  },
  {
    key: "plan",
    titleHe: "תכנון השינוי",
    titleEn: "PLAN",
    descriptionHe: "מגדיר שינוי ממוקד בלי לשבור פונקציונליות.",
    descriptionEn: "Targeted change plan preserving existing behavior.",
    criteria: ["Affected pages listed", "Preserve list defined"],
  },
  {
    key: "frontend",
    titleHe: "החלת שינוי",
    titleEn: "FRONTEND",
    descriptionHe: "מיישם שינוי ממוקד בפרויקט הקיים.",
    descriptionEn: "Apply targeted change to current project.",
    criteria: ["Snapshot updated", "Unrelated pages preserved"],
  },
  {
    key: "integration",
    titleHe: "אינטגרציה",
    titleEn: "INTEGRATION",
    descriptionHe: "מוודא שקישורים וטפסים נשארו תקינים.",
    descriptionEn: "Ensure links and forms still work.",
    criteria: ["No new dead links", "Forms still wired"],
  },
  {
    key: "security_review",
    titleHe: "ביקורת אבטחה",
    titleEn: "SECURITY_REVIEW",
    descriptionHe: "בודק שלא הוכנסו דפוסים מסוכנים.",
    descriptionEn: "Ensure no unsafe patterns were introduced.",
    criteria: ["Sanitize pass", "No auth bypass"],
  },
  {
    key: "build_test",
    titleHe: "בדיקת בנייה",
    titleEn: "BUILD_TEST",
    descriptionHe: "מאמת את ה-snapshot אחרי העריכה.",
    descriptionEn: "Validate snapshot after edit.",
    criteria: ["Structure QA pass", "No placeholders"],
  },
  {
    key: "auto_repair",
    titleHe: "תיקון אוטומטי",
    titleEn: "AUTO_REPAIR",
    descriptionHe: "מתקן שגיאות אוטומטית אם נמצאו.",
    descriptionEn: "Auto-fix validation failures.",
    criteria: ["Repairs applied or N/A", "Re-validated"],
  },
  {
    key: "visual_qa",
    titleHe: "בדיקת עיצוב",
    titleEn: "VISUAL_QA",
    descriptionHe: "בודק RTL ועיצוב אחרי השינוי.",
    descriptionEn: "RTL and visual checks after change.",
    criteria: ["Locale/direction consistent"],
  },
  {
    key: "functional_qa",
    titleHe: "בדיקה פונקציונלית",
    titleEn: "FUNCTIONAL_QA",
    descriptionHe: "מוודא שהזרימות עדיין עובדות.",
    descriptionEn: "Workflows still function.",
    criteria: ["Critical flows intact"],
  },
  {
    key: "ready",
    titleHe: "מוכן",
    titleEn: "READY",
    descriptionHe: "השינוי מוכן בתצוגה המקדימה.",
    descriptionEn: "Change ready in preview.",
    criteria: ["All gates passed"],
  },
];

export function stagesToBuildTasks(stages: AgentStageDef[]) {
  return stages.map((s) => ({
    key: s.key,
    titleHe: s.titleHe,
    titleEn: s.titleEn,
    descriptionHe: s.descriptionHe,
    descriptionEn: s.descriptionEn,
  }));
}
