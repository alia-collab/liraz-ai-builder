import type { BuildSpec } from "./types";
import { isClaudeConfigured } from "@/lib/ai/anthropic-provider";
import { logAiUsageDebug, parseAnthropicUsage } from "@/lib/ai/usage";

interface ClaudeVisual {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  style?: string;
  name?: string;
}

export type ClaudeDesignResult = {
  spec: BuildSpec;
  model: string;
  tokensUsed: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
};

export async function refineDesignWithClaude(spec: BuildSpec): Promise<ClaudeDesignResult> {
  if (!isClaudeConfigured()) {
    throw new Error("ANTHROPIC_API_KEY is required for AI design");
  }

  const key = process.env.ANTHROPIC_API_KEY!.trim();
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      system:
        "You are a product designer. Return ONLY JSON: {\"name\":string,\"style\":string,\"primaryColor\":\"#hex\",\"secondaryColor\":\"#hex\",\"fontFamily\":string}. Hebrew sites: use Heebo or Assistant. Unique industry colors. No scripts.",
      messages: [
        {
          role: "user",
          content: `Business: ${spec.name}\nPurpose: ${spec.purpose}\nAudience: ${spec.audience}\nLocale: ${spec.locale}\nStyle hint: ${spec.visual.style}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const usage = parseAnthropicUsage(data);
  logAiUsageDebug({
    model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    tokensUsed: usage.tokensUsed,
    costUsd: usage.costUsd,
    path: "claude-design.refineDesignWithClaude",
  });

  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const base = {
    model,
    tokensUsed: usage.tokensUsed,
    costUsd: usage.costUsd,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  };

  if (start < 0 || end <= start) {
    return { ...base, spec };
  }

  try {
    const visual = JSON.parse(text.slice(start, end + 1)) as ClaudeVisual;
    return {
      ...base,
      spec: {
        ...spec,
        name: visual.name?.trim() || spec.name,
        visual: {
          ...spec.visual,
          style: visual.style || spec.visual.style,
          primaryColor: visual.primaryColor || spec.visual.primaryColor,
          secondaryColor: visual.secondaryColor || spec.visual.secondaryColor,
          fontFamily: visual.fontFamily || spec.visual.fontFamily,
        },
      },
    };
  } catch {
    return { ...base, spec };
  }
}
