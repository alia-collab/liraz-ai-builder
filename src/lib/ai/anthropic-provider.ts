import type { AIProvider, AIContext, AIResponse, ProjectSnapshot } from "./types";
import { sanitizeProjectOutput } from "./sanitize";
import { logAiUsageDebug, parseAnthropicUsage } from "./usage";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

const DESIGN_SYSTEM_PROMPT = `You are Claude, the lead product designer and UX architect for Liraz AI Builder.
You design REAL, professional websites and web apps for non-technical business owners.

Return ONLY valid JSON for a ProjectSnapshot. No markdown fences. No scripts. No eval. No env vars.

## Visual quality (mandatory)
- Unique look per industry. Never default generic blue SaaS unless the user asked for it.
- Define theme: primaryColor, secondaryColor, background, text, fontFamily, borderRadius, heroStyle.
- Consistent spacing, hierarchy, and contrast (WCAG-minded).
- Mobile-first. Hebrew prompts → locale HE, direction RTL, Hebrew copy, Hebrew-capable fonts (e.g. "Assistant", "Heebo", "Rubik", system-ui).
- English prompts → locale EN, direction LTR.
- No Lorem Ipsum. No fake customer names presented as real reviews. Mark sample content with isSample: true if needed.
- No clashing colors, no excessive gradients, no giant empty headlines.

## Allowed component types
Navbar, Hero, Features, Services, Stats, ContactForm, BookingForm, ProductGrid, Gallery, FAQ, Footer, Section, Heading, Text, Button, Image, Card, Testimonials, Pricing, WhatsAppButton, CTABanner.

## Structure
- Every project has Navbar with links to REAL page slugs that exist in pages[].
- Footer with contact details.
- If the user mentioned WhatsApp / וואטסאפ, include WhatsAppButton with a wa.me URL placeholder they can replace.
- If they mentioned booking / הזמנה / תור, include BookingForm (fields: name, phone, email, service, datetime, notes).
- ContactForm must include action: "/api/runtime/leads" (do not fake success-only buttons).
- CTA links must point to existing slugs like /services or #contact — never dead pages.

## ProjectSnapshot JSON shape
{
  "name": string,
  "description": string,
  "type": "WEBSITE" | "LANDING_PAGE" | "ECOMMERCE" | "BLOG" | "PORTFOLIO" | "BOOKING" | "CUSTOMER_PORTAL" | "DASHBOARD" | "WEB_APP" | "PWA",
  "locale": "HE" | "EN",
  "direction": "RTL" | "LTR",
  "theme": {
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "background": "#hex",
    "text": "#hex",
    "fontFamily": string,
    "borderRadius": string
  },
  "pages": [{
    "slug": string,
    "title": string,
    "locale": "HE" | "EN",
    "direction": "RTL" | "LTR",
    "components": [{ "id": string, "type": string, "props": object, "children": [] }],
    "seo": { "title": string, "description": string }
  }],
  "backend": {
    "tables": [{ "name": string, "fields": [{ "name": string, "type": string, "required": boolean }] }],
    "authEnabled": boolean,
    "paymentsEnabled": boolean
  },
  "explanation": string
}

Infer missing non-critical details with professional defaults. Do not invent fake revenue or fake clients.
`;

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export class AnthropicProvider implements AIProvider {
  readonly name = "Anthropic Claude";
  readonly type = "ANTHROPIC";
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY?.trim() || "";
    this.model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    if (!this.apiKey) throw new Error("ANTHROPIC_API_KEY is required");
  }

  private async callAPI(
    systemPrompt: string,
    messages: { role: "user" | "assistant"; content: string }[]
  ): Promise<{
    content: string;
    inputTokens: number;
    outputTokens: number;
    tokensUsed: number;
    costUsd: number;
  }> {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 8192,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find(
      (block: { type: string }) => block.type === "text"
    );
    const content = textBlock?.text ?? "";
    const usage = parseAnthropicUsage(data);
    logAiUsageDebug({
      model: this.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      tokensUsed: usage.tokensUsed,
      costUsd: usage.costUsd,
      path: "anthropic-provider.callAPI",
    });

    return {
      content: this.extractJson(content),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      tokensUsed: usage.tokensUsed,
      costUsd: usage.costUsd,
    };
  }

  private extractJson(text: string): string {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced) return fenced[1].trim();

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) return text.slice(start, end + 1);

    return text.trim();
  }

  async generateProject(prompt: string, context: AIContext): Promise<AIResponse> {
    const { content, tokensUsed, costUsd } = await this.callAPI(
      `${DESIGN_SYSTEM_PROMPT}\nLocale hint: ${context.locale}.`,
      [
        {
          role: "user",
          content: `Design and specify a complete site for this request:\n${prompt}`,
        },
      ]
    );

    const parsed = JSON.parse(content);
    const validation = this.validateOutput(parsed);
    if (!validation.valid) {
      throw new Error(`AI output validation failed: ${validation.errors.join(", ")}`);
    }

    return {
      snapshot: parsed as ProjectSnapshot,
      explanation:
        ((parsed as Record<string, unknown>).explanation as string) ||
        "Claude designed the layout, theme, and pages for this project.",
      tokensUsed,
      costUsd,
      model: this.model,
    };
  }

  async editProject(
    snapshot: ProjectSnapshot,
    instruction: string,
    context: AIContext
  ): Promise<AIResponse> {
    const { content, tokensUsed, costUsd } = await this.callAPI(
      `${DESIGN_SYSTEM_PROMPT}\nYou are applying a SURGICAL design/content edit. Change only what the user asked. Keep all other pages, copy, and data model. Locale: ${context.locale}.`,
      [
        {
          role: "user",
          content: `Current snapshot:\n${JSON.stringify(snapshot)}\n\nEdit instruction: ${instruction}`,
        },
      ]
    );

    const parsed = JSON.parse(content);
    const validation = this.validateOutput(parsed);
    if (!validation.valid) {
      throw new Error(`AI output validation failed: ${validation.errors.join(", ")}`);
    }

    return {
      snapshot: parsed as ProjectSnapshot,
      explanation: `Claude applied: ${instruction}`,
      tokensUsed,
      costUsd,
      model: this.model,
    };
  }

  async generateContent(
    type: "text" | "heading" | "description" | "faq",
    params: Record<string, string>
  ): Promise<string> {
    const { content } = await this.callAPI(
      `Write ${type} for a professional website. Locale: ${params.locale ?? "HE"}. Plain text only. No HTML.`,
      [{ role: "user", content: JSON.stringify(params) }]
    );

    return content.trim();
  }

  validateOutput(output: unknown) {
    return sanitizeProjectOutput(output);
  }
}
