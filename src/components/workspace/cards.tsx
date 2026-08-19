"use client";

import { useState } from "react";
import {
  Check,
  Circle,
  Loader2,
  XCircle,
  AlertTriangle,
  Wrench,
  FileText,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import type { BuildSpec } from "@/lib/ai/pipeline/types";

export type ChatMsg = {
  id: string;
  role: string;
  kind: string;
  content: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type BuildTask = {
  id: string;
  key: string;
  title: string;
  description: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  detail: string | null;
  sortOrder: number;
};

function StatusIcon({ status }: { status: string }) {
  if (status === "COMPLETED" || status === "FIXED") return <Check className="h-4 w-4 text-emerald-600" />;
  if (status === "RUNNING") return <Loader2 className="h-4 w-4 animate-spin text-brand" />;
  if (status === "FAILED") return <XCircle className="h-4 w-4 text-red-600" />;
  if (status === "NEEDS_APPROVAL") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  if (status === "CANCELLED") return <Circle className="h-4 w-4 text-muted-foreground" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

export function ActivityCard({
  title,
  body,
  status,
}: {
  title: string;
  body: string;
  status: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <StatusIcon status={status} />
        {title}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

export function PlanCard({
  spec,
  jobId,
  onStart,
  onStyle,
  busy,
}: {
  spec: BuildSpec;
  jobId: string;
  onStart: (jobId: string) => void;
  onStyle: (themeId: string) => void;
  busy?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">תוכנית בנייה</p>
      <h3 className="mt-1 text-base font-semibold">{spec.typeLabel}</h3>
      <dl className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <div><span className="font-medium text-foreground">עמודים: </span>{spec.pages.map((p) => p.title).join(" · ")}</div>
        <div><span className="font-medium text-foreground">פעולות: </span>{spec.actions.join(" · ")}</div>
        <div><span className="font-medium text-foreground">עיצוב: </span>{spec.visual.style}</div>
        <div><span className="font-medium text-foreground">מסד נתונים: </span>{spec.dataModel.map((t) => t.name).join(", ")}</div>
        <div><span className="font-medium text-foreground">משתמשים: </span>{spec.userRoles.join(" · ")}</div>
        <div><span className="font-medium text-foreground">חיבורים: </span>
          {[spec.integrations.auth && "הרשמה", spec.integrations.payments && "תשלום (דורש מפתחות)", spec.integrations.whatsapp && "וואטסאפ", spec.integrations.cms && "CMS"].filter(Boolean).join(" · ") || "אין"}
        </div>
        <div><span className="font-medium text-foreground">מורכבות: </span>{spec.estimatedComplexity} · ~{spec.estimatedMinutes} דק׳ עבודה משוערות</div>
      </dl>
      {spec.needsClarification && spec.typeOptions && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {spec.typeOptions.map((opt) => (
            <span key={opt.id} className="rounded-full border px-2 py-0.5 text-[11px]">{opt.label}</span>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || spec.needsClarification}
          onClick={() => onStart(jobId)}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground disabled:opacity-50"
        >
          התחל לבנות
        </button>
        <button type="button" className="rounded-lg border px-3 py-1.5 text-xs" onClick={() => {}}>
          ערוך תוכנית
        </button>
        {spec.visual.designOptions.map((opt) => (
          <button key={opt.id} type="button" className="rounded-lg border px-3 py-1.5 text-xs" onClick={() => onStyle(opt.id)}>
            {opt.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FilesCard({
  countLabel,
  files,
  technical,
}: {
  countLabel: string;
  files: Array<{ name: string; action?: string; page?: string; summary?: string }>;
  technical?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tech, setTech] = useState(false);
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <button type="button" className="flex w-full items-center justify-between text-sm font-medium" onClick={() => setOpen(!open)}>
        <span className="flex items-center gap-2"><FileText className="h-4 w-4" />{countLabel}</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="mt-3 space-y-2 text-xs">
          {files.map((f) => (
            <li key={f.name} className="rounded-md bg-muted/50 px-2 py-1.5">
              <p className="font-medium">{f.name}</p>
              <p className="text-muted-foreground">{f.action ?? "updated"} {f.page ? `· ${f.page}` : ""}</p>
              {f.summary && <p className="mt-0.5 text-muted-foreground">{f.summary}</p>}
            </li>
          ))}
        </ul>
      )}
      {technical && (
        <button type="button" className="mt-2 text-[11px] underline" onClick={() => setTech(!tech)}>
          הצג פרטים טכניים
        </button>
      )}
      {tech && technical && <pre className="mt-2 overflow-auto rounded-md bg-muted p-2 text-[10px]">{technical}</pre>}
    </div>
  );
}

export function ReadyCard({
  payload,
  onView,
  onContinue,
  onDomain,
  onPublish,
  onRollback,
}: {
  payload: Record<string, unknown>;
  onView: () => void;
  onContinue: () => void;
  onDomain: () => void;
  onPublish: () => void;
  onRollback: () => void;
}) {
  const pages = Number(payload.pages ?? 0);
  const functions = (payload.functions as string[]) ?? [];
  const needsSetup = (payload.needsSetup as Array<{ label: string }>) ?? [];
  const qa = payload.qa as { passed?: boolean; warnings?: string[] } | undefined;
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-brand" /> הפרויקט מוכן</div>
      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        <li>{pages} עמודים נוצרו</li>
        <li>{functions.length} פעולות נוספו</li>
        <li>בדיקות קריטיות: {qa?.passed ? "עברו" : "לא הושלמו"}</li>
        <li>{qa?.warnings?.length ?? 0} אזהרות</li>
      </ul>
      {needsSetup.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-50 p-2 text-xs dark:bg-amber-950/30">
          <p className="font-medium">דורש הגדרה:</p>
          <ul className="mt-1 list-disc ps-4">
            {needsSetup.map((s) => <li key={s.label}>{s.label}</li>)}
          </ul>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-lg bg-brand px-3 py-1.5 text-xs text-brand-foreground" onClick={onView}>צפה בפרויקט</button>
        <button type="button" className="rounded-lg border px-3 py-1.5 text-xs" onClick={onContinue}>בצע שינויים</button>
        <button type="button" className="rounded-lg border px-3 py-1.5 text-xs" onClick={onDomain}>חבר דומיין</button>
        <button type="button" className="rounded-lg border px-3 py-1.5 text-xs" onClick={onPublish}>פרסם</button>
        <button type="button" className="rounded-lg border px-3 py-1.5 text-xs" onClick={onRollback}>חזור לגרסה קודמת</button>
      </div>
    </div>
  );
}

export function ErrorCard({ content, onRetry }: { content: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-red-700"><Wrench className="h-4 w-4" /> תקלה</div>
      <p className="mt-1 text-xs text-muted-foreground">{content}</p>
      <button type="button" className="mt-3 rounded-lg border px-3 py-1.5 text-xs" onClick={onRetry}>נסה לתקן</button>
    </div>
  );
}

export function ProcessBoard({ tasks, open }: { tasks: BuildTask[]; open: boolean }) {
  const [details, setDetails] = useState<string | null>(null);
  if (!open) return null;
  return (
    <div className="border-t bg-background/80 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">תהליך הבנייה</p>
      <ol className="space-y-2">
        {tasks.map((t) => (
          <li key={t.id}>
            <button type="button" className="flex w-full items-start gap-2 text-start" onClick={() => setDetails(details === t.id ? null : t.id)}>
              <StatusIcon status={t.status} />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium">{t.title}</span>
                <span className="block text-[11px] text-muted-foreground">{t.status.toLowerCase()}</span>
              </span>
            </button>
            {details === t.id && (
              <div className="ms-6 mt-1 rounded-md bg-muted/60 p-2 text-[11px] text-muted-foreground">
                <p>{t.description}</p>
                {t.detail && <p className="mt-1">{t.detail}</p>}
                {t.startedAt && <p>התחלה: {new Date(t.startedAt).toLocaleTimeString()}</p>}
                {t.completedAt && <p>סיום: {new Date(t.completedAt).toLocaleTimeString()}</p>}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function SkeletonPreview() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-3xl space-y-4">
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

export const QUICK_PROMPTS = [
  { he: "שפר את העיצוב", en: "Improve the design" },
  { he: "הוסף עמוד", en: "Add a page" },
  { he: "תקן את המובייל", en: "Fix mobile" },
  { he: "שנה צבעים", en: "Change colors" },
  { he: "בדוק תקלות", en: "Check for issues" },
  { he: "הוסף מערכת התחברות", en: "Add login" },
];
