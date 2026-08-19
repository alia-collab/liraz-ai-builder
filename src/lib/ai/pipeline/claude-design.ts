import type { BuildSpec } from "./types";
import { isClaudeConfigured } from "@/lib/ai/anthropic-provider";

interface ClaudeVisual {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  style?: string;
  name?: string;
}

export async function refineDesignWithClaude(spec: BuildSpec): Promise<BuildSpec> {
  if (!isClaudeConfigured()) return spec;

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
    console.warn("Claude design refine failed:", response.status);
    return spec;
  }

  const data = await response.json();
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return spec;

  try {
    const visual = JSON.parse(text.slice(start, end + 1)) as ClaudeVisual;
    return {
      ...spec,
      name: visual.name?.trim() || spec.name,
      visual: {
        ...spec.visual,
        style: visual.style || spec.visual.style,
        primaryColor: visual.primaryColor || spec.visual.primaryColor,
        secondaryColor: visual.secondaryColor || spec.visual.secondaryColor,
        fontFamily: visual.fontFamily || spec.visual.fontFamily,
      },
    };
  } catch {
    return spec;
  }
}
