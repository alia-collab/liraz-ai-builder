"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2, Bot, User } from "lucide-react";

interface AIChatPanelProps {
  projectId: string;
  onEditComplete?: (explanation: string) => void;
}

export function AIChatPanel({ projectId, onEditComplete }: AIChatPanelProps) {
  const t = useTranslations("editor");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, instruction: userMsg }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.explanation }]);
        onEditComplete?.(data.explanation);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error || t("editFailed") },
        ]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t("editFailed") }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full border-s bg-card">
      <div className="p-3 border-b font-medium text-sm">{t("aiChat")}</div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">{t("chatHint")}</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && <Bot className="h-4 w-4 shrink-0 text-brand mt-1" />}
            <div
              className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                msg.role === "user" ? "bg-brand text-white" : "bg-muted"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && <User className="h-4 w-4 shrink-0 mt-1" />}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("applyingChanges")}
          </div>
        )}
      </div>
      <div className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chatPlaceholder")}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={loading}
        />
        <Button size="icon" variant="brand" onClick={handleSend} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
