import type { AIProvider } from "./types";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider, isClaudeConfigured } from "./anthropic-provider";
import prisma from "@/lib/db";

let cachedProvider: AIProvider | null = null;

function normalizeProviderType(type: string | undefined): string {
  return (type ?? "anthropic").toLowerCase();
}

function createProvider(type: string): AIProvider | null {
  switch (type) {
    case "openai":
      if (process.env.OPENAI_API_KEY?.trim()) return new OpenAIProvider();
      console.warn("OpenAI API key missing");
      return null;
    case "anthropic":
    case "claude":
      if (process.env.ANTHROPIC_API_KEY?.trim()) return new AnthropicProvider();
      console.warn("Anthropic API key missing");
      return null;
    default:
      console.warn(`Unknown AI provider "${type}"`);
      return null;
  }
}

export class AIProviderNotConfiguredError extends Error {
  constructor() {
    super(
      "No AI provider is configured. Set ANTHROPIC_API_KEY (recommended) or OPENAI_API_KEY in the environment."
    );
    this.name = "AIProviderNotConfiguredError";
  }
}

export async function getAIProvider(): Promise<AIProvider> {
  if (cachedProvider) return cachedProvider;

  if (isClaudeConfigured()) {
    cachedProvider = new AnthropicProvider();
    return cachedProvider;
  }

  if (process.env.OPENAI_API_KEY?.trim()) {
    cachedProvider = new OpenAIProvider();
    return cachedProvider;
  }

  const dbConfig = await prisma.aIProviderConfig.findFirst({
    where: { isDefault: true, isActive: true },
  });

  const providerType = dbConfig
    ? normalizeProviderType(dbConfig.type)
    : normalizeProviderType(process.env.AI_DEFAULT_PROVIDER);

  const provider = createProvider(providerType);
  if (!provider) {
    throw new AIProviderNotConfiguredError();
  }

  cachedProvider = provider;
  return cachedProvider;
}

export function resetAIProviderCache() {
  cachedProvider = null;
}

export { OpenAIProvider };
export { AnthropicProvider, isClaudeConfigured } from "./anthropic-provider";
export type * from "./types";
