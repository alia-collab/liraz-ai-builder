import type { ProjectSnapshot } from "@/lib/ai/types";
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import { sanitizeProjectOutput } from "@/lib/ai/sanitize";
import type { GateResult } from "./validators";

/**
 * Production security gate for generated ProjectSnapshots.
 * Complements runtime route protections — rejects unsafe generated UI/config.
 */
export function runSecurityGate(snapshot: ProjectSnapshot, spec?: BuildSpec | null): GateResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const json = JSON.stringify(snapshot);

  const sanitized = sanitizeProjectOutput(snapshot);
  if (!sanitized.valid) {
    errors.push(...sanitized.errors.map((e) => `security: ${e}`));
  }

  // Secret / env leakage
  if (/ANTHROPIC_API_KEY|DATABASE_URL|PAYPAL_CLIENT_SECRET|NEXTAUTH_SECRET|private[_-]?key/i.test(json)) {
    errors.push("Possible secret/credential leakage in snapshot");
  }

  // Hidden backdoors / undocumented bypasses
  if (/backdoor|god.?mode|secret.?admin|bypass.?auth|always.?admin|skip.?auth/i.test(json)) {
    errors.push("Possible authentication bypass / backdoor wording in snapshot");
  }

  // Dangerous client handlers
  if (/javascript:/i.test(json) || /on\w+\s*=\s*["']/i.test(json)) {
    errors.push("Inline JS / DOM handler patterns blocked");
  }

  // Client-only “auth” that pretends to be secure
  if (/localStorage\.setItem\s*\(\s*["']token/i.test(json) || /sessionStorage\.setItem\s*\(\s*["']token/i.test(json)) {
    errors.push("Client token storage patterns are not allowed in generated UI");
  }

  // Unescaped HTML injection vectors in props
  if (/<script/i.test(json) || /<\/script>/i.test(json)) {
    errors.push("Script tags in snapshot content");
  }

  // Admin without surface marking
  if (/"AdminLeads"/.test(json)) {
    const adminPages = snapshot.pages.filter(
      (p) => p.slug.includes("admin") || JSON.stringify(p.components).includes("AdminLeads")
    );
    if (adminPages.length === 0) {
      warnings.push("AdminLeads present but no admin slug — verify access control in UI routing");
    }
  }

  // File upload without validation markers (if any upload fields)
  if (/"type"\s*:\s*"file"/i.test(json) && !/accept|maxSize|mime/i.test(json)) {
    warnings.push("File input without explicit accept/size constraints in props");
  }

  // CSRF: forms must post to same-origin runtime APIs (renderer enforces); flag external posts
  const actions = [...json.matchAll(/"action"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  for (const action of actions) {
    if (/^https?:\/\//i.test(action) && !action.includes("/api/runtime/")) {
      errors.push(`External form action blocked: ${action}`);
    }
  }

  // Auth required by plan must not rely on client-only checks in copy
  if (spec?.integrations.auth && /password\s*=\s*["']admin["']/i.test(json)) {
    errors.push("Hardcoded credentials in snapshot");
  }

  // Rate limiting / webhook verification are platform-level (documented as platform responsibility)
  warnings.push("Platform enforces rate limits and webhook verification on LirazAI APIs");

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    stage: "security_review",
  };
}
