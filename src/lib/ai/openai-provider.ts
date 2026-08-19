import type { AIProvider, AIContext, AIResponse, ProjectSnapshot } from "./types";
import { sanitizeProjectOutput } from "./sanitize";

export class OpenAIProvider implements AIProvider {
  readonly name = "OpenAI";
  readonly type = "OPENAI";
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    this.model = process.env.OPENAI_MODEL || "gpt-4o";
    if (!this.apiKey) throw new Error("OPENAI_API_KEY is required");
  }

  private async callAPI(messages: { role: string; content: string }[]): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async generateProject(prompt: string, context: AIContext): Promise<AIResponse> {
    const systemPrompt = `You are a website builder AI. Generate a JSON project snapshot.
Locale: ${context.locale}. Return valid JSON matching ProjectSnapshot schema.
Include pages with components (Hero, Features, ContactForm, etc.).
Never include executable code, scripts, or env variables.`;

    const content = await this.callAPI([
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ]);

    const parsed = JSON.parse(content);
    const validation = this.validateOutput(parsed);
    if (!validation.valid) {
      throw new Error(`AI output validation failed: ${validation.errors.join(", ")}`);
    }

    return {
      snapshot: parsed as ProjectSnapshot,
      explanation: parsed.explanation || "Project generated successfully.",
      tokensUsed: 0,
      costUsd: 0,
    };
  }

  async editProject(snapshot: ProjectSnapshot, instruction: string, context: AIContext): Promise<AIResponse> {
    const content = await this.callAPI([
      {
        role: "system",
        content: "Edit the project JSON based on user instruction. Return full updated snapshot as JSON.",
      },
      { role: "user", content: `Current: ${JSON.stringify(snapshot)}\n\nEdit: ${instruction}` },
    ]);

    const parsed = JSON.parse(content);
    const validation = this.validateOutput(parsed);
    if (!validation.valid) {
      throw new Error(`AI output validation failed: ${validation.errors.join(", ")}`);
    }

    return {
      snapshot: parsed as ProjectSnapshot,
      explanation: `Applied: ${instruction}`,
      tokensUsed: 0,
      costUsd: 0,
    };
  }

  async generateContent(type: string, params: Record<string, string>): Promise<string> {
    const content = await this.callAPI([
      { role: "system", content: `Generate ${type} content. Return plain text only.` },
      { role: "user", content: JSON.stringify(params) },
    ]);
    return content;
  }

  validateOutput(output: unknown) {
    return sanitizeProjectOutput(output);
  }
}
