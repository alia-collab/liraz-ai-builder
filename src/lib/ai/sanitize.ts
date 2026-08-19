import type { ValidationResult } from "./types";

const BLOCKED_PATTERNS = [
  /eval\s*\(/i,
  /Function\s*\(/i,
  /document\.cookie/i,
  /localStorage\.setItem/i,
  /sessionStorage\.setItem/i,
  /process\.env/i,
  /require\s*\(\s*['"]child_process/i,
  /require\s*\(\s*['"]fs['"]\s*\)/i,
  /__proto__/i,
  /constructor\s*\[/i,
  /javascript:/i,
  /on\w+\s*=\s*["']/i,
];

const ALLOWED_COMPONENT_TYPES = new Set([
  "Hero", "Features", "ContactForm", "ProductGrid", "Gallery", "FAQ",
  "Navbar", "Footer", "Section", "Heading", "Text", "Button", "Image",
  "Video", "Map", "Table", "Card", "Form", "Menu", "Testimonials",
  "Pricing", "Blog", "Portfolio", "Booking", "Login", "Register",
  "Services", "BookingForm", "WhatsAppButton", "AdminLeads", "Stats", "CTABanner",
]);

export function sanitizeProjectOutput(output: unknown): ValidationResult {
  const errors: string[] = [];
  const json = JSON.stringify(output);

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(json)) {
      errors.push(`Blocked pattern detected: ${pattern.source}`);
    }
  }

  if (typeof output !== "object" || output === null) {
    return { valid: false, errors: ["Output must be an object"] };
  }

  const snapshot = output as Record<string, unknown>;

  if (Array.isArray(snapshot.pages)) {
    for (const page of snapshot.pages as Record<string, unknown>[]) {
      if (Array.isArray(page.components)) {
        validateComponents(page.components as Record<string, unknown>[], errors);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? output : undefined,
  };
}

function validateComponents(components: Record<string, unknown>[], errors: string[]) {
  for (const comp of components) {
    if (typeof comp.type !== "string" || !ALLOWED_COMPONENT_TYPES.has(comp.type)) {
      errors.push(`Unknown component type: ${comp.type}`);
    }
    if (comp.children && Array.isArray(comp.children)) {
      validateComponents(comp.children as Record<string, unknown>[], errors);
    }
    const propsJson = JSON.stringify(comp.props ?? {});
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(propsJson)) {
        errors.push(`Malicious props in component ${comp.id}`);
      }
    }
  }
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "");
}
