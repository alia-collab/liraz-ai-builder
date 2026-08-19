import type { AIProvider } from "./types";
import { MockAIProvider } from "./mock-provider";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";
import prisma from "@/lib/db";

let cachedProvider: AIProvider | null = null;

function normalizeProviderType(type: string | undefined): string {
  return (type ?? "mock").toLowerCase();
}

function createProvider(type: string): AIProvider | null {
  switch (type) {
    case "openai":
      if (process.env.OPENAI_API_KEY) return new OpenAIProvider();
      console.warn("OpenAI API key missing, falling back");
      return null;
    case "anthropic":
    case "claude":
      if (process.env.ANTHROPIC_API_KEY?.trim()) return new AnthropicProvider();
      console.warn("Anthropic API key missing, falling back to mock");
      return null;
    case "mock":
      return new MockAIProvider();
    default:
      console.warn(`Unknown AI provider "${type}", falling back`);
      return null;
  }
}

export async function getAIProvider(): Promise<AIProvider> {
  if (cachedProvider) return cachedProvider;

  // Design/build: Claude first whenever a key is present.
  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    cachedProvider = new AnthropicProvider();
    return cachedProvider;
  }

  const dbConfig = await prisma.aIProviderConfig.findFirst({
    where: { isDefault: true, isActive: true },
  });

  const providerType = dbConfig
    ? normalizeProviderType(dbConfig.type)
    : normalizeProviderType(process.env.AI_DEFAULT_PROVIDER);

  cachedProvider = createProvider(providerType) ?? new MockAIProvider();
  return cachedProvider;
}

export function resetAIProviderCache() {
  cachedProvider = null;
}

export { MockAIProvider };
export { OpenAIProvider };
export { AnthropicProvider, isClaudeConfigured } from "./anthropic-provider";
export type * from "./types";
