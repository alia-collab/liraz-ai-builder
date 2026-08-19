"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import type { BuildSpec } from "@/lib/ai/pipeline/types";

const projectTypes = [
  { id: "WEBSITE", key: "website" },
  { id: "LANDING_PAGE", key: "landing" },
  { id: "ECOMMERCE", key: "ecommerce" },
  { id: "BLOG", key: "blog" },
  { id: "PORTFOLIO", key: "portfolio" },
  { id: "BOOKING", key: "booking" },
  { id: "CUSTOMER_PORTAL", key: "portal" },
  { id: "DASHBOARD", key: "dashboard" },
  { id: "WEB_APP", key: "webapp" },
  { id: "PWA", key: "pwa" },
];

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState("");
  const [prompt, setPrompt] = useState("");
  const [spec, setSpec] = useState<BuildSpec | null>(null);
  const [themeId, setThemeId] = useState("trust");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function handlePlan() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/ai/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.trim(), projectType: selectedType || undefined, locale: "HE" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "שגיאה בניתוח");
      return;
    }
    setSpec(data.spec);
    setThemeId(data.spec.visual.designOptions[0]?.id ?? "trust");
    setStep(3);
  }

  async function handleBuild() {
    if (!spec) return;
    setLoading(true);
    setProgress("מנתח את הבקשה...");
    const option = spec.visual.designOptions.find((d) => d.id === themeId);
    const res = await fetch("/api/ai/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spec: {
          ...spec,
          visual: { ...spec.visual, primaryColor: option?.primaryColor ?? spec.visual.primaryColor },
        },
        prompt,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "הבנייה נכשלה");
      return;
    }
    if (!data.complete) {
      setError(`הבנייה לא הושלמה: ${(data.qa?.errors ?? []).join(", ")}`);
      if (data.project?.id) router.push(`/editor/${data.project.id}`);
      return;
    }
    router.push(data.editorPath || `/editor/${data.project.id}`);
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <Sparkles className="h-10 w-10 text-brand mx-auto mb-2" />
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <CardDescription>{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <p className="text-sm font-medium">בחרו סוג פרויקט</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {projectTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className={`rounded-lg border p-3 text-sm text-start ${
                      selectedType === type.id ? "border-brand bg-brand/5 text-brand" : "hover:bg-muted"
                    }`}
                  >
                    {t(`projectTypes.${type.key}` as "projectTypes.website")}
                  </button>
                ))}
              </div>
              <Button className="w-full" variant="brand" onClick={() => setStep(2)}>
                {tc("next")}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <textarea
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder={t("placeholder")}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>{tc("back")}</Button>
                <Button className="flex-1" variant="brand" onClick={handlePlan} disabled={loading || prompt.trim().length < 2}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ניתוח והצגת תוכנית"}
                </Button>
              </div>
            </>
          )}

          {step === 3 && spec && (
            <>
              <div className="rounded-lg border p-4 space-y-2 text-sm">
                <p><strong>מוצר:</strong> {spec.name} ({spec.productType})</p>
                <p><strong>מטרה:</strong> {spec.purpose}</p>
                <p><strong>עמודים:</strong> {spec.pages.map((p) => p.title).join(" · ")}</p>
                <p><strong>פעולות:</strong> {spec.actions.join(" · ")}</p>
                <p><strong>נתונים:</strong> {spec.dataModel.map((t) => t.name).join(", ")}</p>
                <p><strong>עיצוב:</strong> {spec.visual.style} · {spec.direction}</p>
              </div>
              {spec.questions.length > 0 && (
                <ul className="text-sm text-muted-foreground list-disc ps-5">
                  {spec.questions.map((q) => <li key={q}>{q}</li>)}
                </ul>
              )}
              <p className="text-sm font-medium">שינוי העיצוב</p>
              <div className="grid grid-cols-3 gap-2">
                {spec.visual.designOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setThemeId(opt.id)}
                    className={`rounded-lg border p-3 text-xs text-start ${themeId === opt.id ? "border-brand ring-2 ring-brand/30" : ""}`}
                  >
                    <span className="inline-block h-4 w-4 rounded-full mb-1" style={{ background: opt.primaryColor }} />
                    <br />
                    {opt.name}
                  </button>
                ))}
              </div>
              {progress && <p className="text-sm text-muted-foreground">{progress}</p>}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>עריכת התוכנית</Button>
                <Button className="flex-1" variant="brand" onClick={handleBuild} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
                  אישור והתחלת בנייה
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
