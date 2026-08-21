import type { Locale, ProjectType, Direction } from "@prisma/client";

export interface EditorComponent {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: EditorComponent[];
}

export interface PageSnapshot {
  slug: string;
  title: string;
  locale: Locale;
  direction: Direction;
  components: EditorComponent[];
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };
}

export interface ProjectSnapshot {
  name: string;
  description?: string;
  type: ProjectType;
  locale: Locale;
  direction: Direction;
  theme: {
    primaryColor: string;
    fontFamily: string;
    borderRadius: string;
  };
  pages: PageSnapshot[];
  backend?: {
    tables: DatabaseTable[];
    authEnabled: boolean;
    paymentsEnabled: boolean;
  };
}

export interface DatabaseTable {
  name: string;
  fields: { name: string; type: string; required?: boolean; unique?: boolean }[];
  relations?: { table: string; type: "oneToMany" | "manyToMany" }[];
}

export interface AIContext {
  userId: string;
  projectId?: string;
  locale: Locale;
  currentSnapshot?: ProjectSnapshot;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
}

export interface AIResponse {
  snapshot: ProjectSnapshot;
  explanation: string;
  questions?: string[];
  previewRequired?: boolean;
  tokensUsed: number;
  costUsd: number;
  model?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: unknown;
}

export interface AIProvider {
  readonly name: string;
  readonly type: string;
  generateProject(prompt: string, context: AIContext): Promise<AIResponse>;
  editProject(
    snapshot: ProjectSnapshot,
    instruction: string,
    context: AIContext
  ): Promise<AIResponse>;
  generateContent(
    type: "text" | "heading" | "description" | "faq",
    params: Record<string, string>
  ): Promise<string>;
  validateOutput(output: unknown): ValidationResult;
}

export interface ClarificationResult {
  needsClarification: boolean;
  questions: string[];
  understoodIntent: string;
}
