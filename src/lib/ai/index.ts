import type { AIProvider } from "./types";
import { AnthropicProvider, isClaudeConfigured } from "./anthropic-provider";

let cachedProvider: AIProvider | null = null;

export class AIProviderNotConfiguredError extends Error {
  constructor() {
    super(
      "No AI provider is configured. Set ANTHROPIC_API_KEY in the environment."
    );
    this.name = "AIProviderNotConfiguredError";
  }
}

export async function getAIProvider(): Promise<AIProvider> {
  if (cachedProvider) return cachedProvider;

  if (!isClaudeConfigured()) {
    throw new AIProviderNotConfiguredError();
  }

  cachedProvider = new AnthropicProvider();
  return cachedProvider;
}

export function resetAIProviderCache() {
  cachedProvider = null;
}

export { AnthropicProvider, isClaudeConfigured } from "./anthropic-provider";
export type * from "./types";
