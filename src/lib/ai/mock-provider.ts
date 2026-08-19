import type {
  AIProvider,
  AIContext,
  AIResponse,
  ProjectSnapshot,
  ValidationResult,
  ClarificationResult,
} from "./types";
import { sanitizeProjectOutput } from "./sanitize";

const BLOCKED_PATTERNS = [
  /eval\s*\(/i,
  /document\.cookie/i,
  /localStorage\.setItem/i,
  /<script[^>]*src=["']https?:\/\/(?!trusted)/i,
  /process\.env/i,
  /require\s*\(\s*['"]child_process/i,
];

function detectLocale(text: string): "HE" | "EN" {
  const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  return hebrewChars > latinChars ? "HE" : "EN";
}

function inferProjectType(prompt: string): ProjectSnapshot["type"] {
  const lower = prompt.toLowerCase();
  if (/חנות|store|shop|ecommerce|e-commerce|cart|סל/.test(lower)) return "ECOMMERCE";
  if (/בלוג|blog/.test(lower)) return "BLOG";
  if (/פורטפוליו|portfolio/.test(lower)) return "PORTFOLIO";
  if (/הזמנ|booking|תור|appointment/.test(lower)) return "BOOKING";
  if (/דף נחיתה|landing/.test(lower)) return "LANDING_PAGE";
  if (/לוח בקרה|dashboard/.test(lower)) return "DASHBOARD";
  if (/פורטל|portal/.test(lower)) return "CUSTOMER_PORTAL";
  if (/pwa|אפליקציה|app/.test(lower)) return "PWA";
  return "WEBSITE";
}

function buildMockSnapshot(prompt: string, context: AIContext): ProjectSnapshot {
  const locale = context.locale || detectLocale(prompt);
  const direction = locale === "HE" ? "RTL" : "LTR";
  const type = inferProjectType(prompt);

  const isHe = locale === "HE";
  const name = isHe ? "הפרויקט שלי" : "My Project";

  const homePage: ProjectSnapshot["pages"][0] = {
    slug: "home",
    title: isHe ? "דף הבית" : "Home",
    locale,
    direction,
    components: [
      {
        id: "hero",
        type: "Hero",
        props: {
          title: isHe ? "ברוכים הבאים" : "Welcome",
          subtitle: prompt.slice(0, 120),
          ctaText: isHe ? "התחילו עכשיו" : "Get Started",
          ctaLink: "#contact",
          background: "gradient",
        },
      },
      {
        id: "features",
        type: "Features",
        props: {
          title: isHe ? "מה אנחנו מציעים" : "What We Offer",
          items: [
            {
              title: isHe ? "איכות" : "Quality",
              description: isHe ? "מוצרים ושירותים ברמה הגבוהה ביותר" : "Top-tier products and services",
            },
            {
              title: isHe ? "שירות" : "Service",
              description: isHe ? "צוות מקצועי וזמין" : "Professional and available team",
            },
            {
              title: isHe ? "מחיר" : "Value",
              description: isHe ? "מחירים הוגנים ושקופים" : "Fair and transparent pricing",
            },
          ],
        },
      },
      {
        id: "contact",
        type: "ContactForm",
        props: {
          title: isHe ? "צרו קשר" : "Contact Us",
          fields: ["name", "email", "phone", "message"],
          submitText: isHe ? "שליחה" : "Send",
          whatsapp: prompt.toLowerCase().includes("whatsapp"),
        },
      },
    ],
    seo: {
      title: name,
      description: prompt.slice(0, 160),
    },
  };

  const pages = [homePage];

  if (type === "ECOMMERCE") {
    pages.push({
      slug: "products",
      title: isHe ? "מוצרים" : "Products",
      locale,
      direction,
      components: [
        {
          id: "catalog",
          type: "ProductGrid",
          props: {
            title: isHe ? "המוצרים שלנו" : "Our Products",
            columns: 3,
            showCart: true,
          },
        },
      ],
      seo: { title: isHe ? "מוצרים" : "Products" },
    });
  }

  return {
    name,
    description: prompt,
    type,
    locale,
    direction,
    theme: {
      primaryColor: "#2563eb",
      fontFamily: "system-ui",
      borderRadius: "0.5rem",
    },
    pages,
    backend: {
      tables: type === "ECOMMERCE"
        ? [
            { name: "products", fields: [{ name: "title", type: "string", required: true }, { name: "price", type: "number", required: true }] },
            { name: "orders", fields: [{ name: "customerEmail", type: "string", required: true }] },
          ]
        : [{ name: "contacts", fields: [{ name: "name", type: "string" }, { name: "email", type: "string" }] }],
      authEnabled: /התחברות|login|auth|register|הרשמה/.test(prompt.toLowerCase()),
      paymentsEnabled: type === "ECOMMERCE",
    },
  };
}

function applyEdit(snapshot: ProjectSnapshot, instruction: string): ProjectSnapshot {
  const lower = instruction.toLowerCase();
  const updated = structuredClone(snapshot);

  if (/כחול|blue/.test(lower)) {
    updated.theme.primaryColor = "#2563eb";
  }
  if (/ירוק|green/.test(lower)) {
    updated.theme.primaryColor = "#16a34a";
  }
  if (/אדום|red/.test(lower)) {
    updated.theme.primaryColor = "#dc2626";
  }
  if (/עברית|hebrew|rtl/.test(lower)) {
    updated.locale = "HE";
    updated.direction = "RTL";
    updated.pages.forEach((p) => {
      p.locale = "HE";
      p.direction = "RTL";
    });
  }
  if (/english|ltr|אנגלית/.test(lower)) {
    updated.locale = "EN";
    updated.direction = "LTR";
    updated.pages.forEach((p) => {
      p.locale = "EN";
      p.direction = "LTR";
    });
  }
  if (/מוצר|product|catalog/.test(lower) && !updated.pages.find((p) => p.slug === "products")) {
    updated.pages.push({
      slug: "products",
      title: updated.locale === "HE" ? "מוצרים" : "Products",
      locale: updated.locale,
      direction: updated.direction,
      components: [{ id: "catalog", type: "ProductGrid", props: { title: updated.locale === "HE" ? "מוצרים" : "Products", columns: 3 } }],
      seo: {},
    });
  }

  return updated;
}

export class MockAIProvider implements AIProvider {
  readonly name = "Mock AI";
  readonly type = "MOCK";

  async generateProject(prompt: string, context: AIContext): Promise<AIResponse> {
    await new Promise((r) => setTimeout(r, 800));
    const snapshot = buildMockSnapshot(prompt, context);
    const isHe = snapshot.locale === "HE";
    return {
      snapshot,
      explanation: isHe
        ? `יצרתי עבורך ${snapshot.type === "ECOMMERCE" ? "חנות אונליין" : "אתר"} עם ${snapshot.pages.length} עמודים. תוכל לערוך בצ'אט או בעורך החזותי.`
        : `Created a ${snapshot.type.toLowerCase().replace("_", " ")} with ${snapshot.pages.length} page(s). Edit via chat or visual editor.`,
      tokensUsed: 0,
      costUsd: 0,
    };
  }

  async editProject(snapshot: ProjectSnapshot, instruction: string, context: AIContext): Promise<AIResponse> {
    await new Promise((r) => setTimeout(r, 500));
    const updated = applyEdit(snapshot, instruction);
    const isHe = context.locale === "HE";
    return {
      snapshot: updated,
      explanation: isHe ? `בוצע: ${instruction}` : `Applied: ${instruction}`,
      tokensUsed: 0,
      costUsd: 0,
    };
  }

  async generateContent(type: string, params: Record<string, string>): Promise<string> {
    const topic = params.topic || "general";
    const templates: Record<string, string> = {
      heading: `Welcome to ${topic}`,
      text: `Discover the best ${topic} experience tailored for you.`,
      description: `Professional ${topic} services with quality and care.`,
      faq: `Q: What is ${topic}?\nA: ${topic} is our specialty.`,
    };
    return templates[type] || templates.text;
  }

  validateOutput(output: unknown): ValidationResult {
    return sanitizeProjectOutput(output);
  }
}

export async function analyzeClarificationNeeded(
  prompt: string,
  _context: AIContext
): Promise<ClarificationResult> {
  const questions: string[] = [];
  const lower = prompt.toLowerCase();

  if (prompt.length < 20) {
    questions.push(
      detectLocale(prompt) === "HE"
        ? "מה סוג העסק או הפרויקט? (חנות, אתר תדמית, בלוג...)"
        : "What type of business or project? (store, website, blog...)"
    );
  }
  if (!/(צבע|color|עיצוב|design|סגנון|style)/.test(lower) && prompt.length < 50) {
    questions.push(
      detectLocale(prompt) === "HE"
        ? "יש לך העדפת צבעים או סגנון?"
        : "Do you have color or style preferences?"
    );
  }

  return {
    needsClarification: questions.length > 0 && prompt.length < 30,
    questions: questions.slice(0, 2),
    understoodIntent: prompt,
  };
}
