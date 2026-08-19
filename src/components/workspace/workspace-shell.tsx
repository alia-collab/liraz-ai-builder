"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Monitor, Tablet, Smartphone, Undo2, RefreshCw,
  ExternalLink, MousePointer2, Save, Rocket, Send, Square, Paperclip,
  ListChecks, MessageSquare, Eye, PanelLeftClose, PanelLeftOpen, Loader2,
} from "lucide-react";
import type { BuildSpec } from "@/lib/ai/pipeline/types";
import {
  ActivityCard, PlanCard, FilesCard, ReadyCard, ErrorCard, ProcessBoard,
  SkeletonPreview, QUICK_PROMPTS, type ChatMsg, type BuildTask,
} from "@/components/workspace/cards";

type Tab = "chat" | "preview" | "process";

export function WorkspaceShell({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<{
    id: string; name: string; status: string; locale: string; direction: string; pages: { id: string; slug: string; title: string }[];
  } | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [tasks, setTasks] = useState<BuildTask[]>([]);
  const [activeJob, setActiveJob] = useState<{ id: string; status: string; kind: string } | null>(null);
  const [versions, setVersions] = useState<Array<{ id: string; version: number; label: string | null }>>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pageSlug, setPageSlug] = useState("home");
  const [breakpoint, setBreakpoint] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [zoom, setZoom] = useState(100);
  const [selectMode, setSelectMode] = useState(true);
  const [selected, setSelected] = useState<{ id: string; type: string; page: string } | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [processOpen, setProcessOpen] = useState(true);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<Tab>("preview");
  const [error, setError] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const he = project?.locale !== "EN";
  const dir = project?.direction === "LTR" ? "ltr" : "rtl";
  const running = activeJob && ["PLANNING", "RUNNING", "PENDING"].includes(activeJob.status);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/workspace`);
    if (!res.ok) {
      router.push("/dashboard/projects");
      return;
    }
    const data = await res.json();
    setProject(data.project);
    setMessages(data.messages);
    setTasks(data.tasks);
    setActiveJob(data.activeJob);
    setVersions(data.versions ?? []);
    if (data.project.pages?.length && !data.project.pages.some((p: { slug: string }) => p.slug === pageSlug)) {
      setPageSlug(data.project.pages[0].slug);
    }
    setLoading(false);
  }, [projectId, router, pageSlug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const es = new EventSource(`/api/projects/${projectId}/events`);
    es.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data) as { type: string };
        if (event.type === "heartbeat") return;
        if (event.type === "preview") setPreviewKey((k) => k + 1);
        load();
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [projectId, load]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg || msg.source !== "liraz-preview" || msg.type !== "select") return;
      setSelected({ id: msg.componentId, type: msg.componentType, page: msg.pageSlug });
      setSelectMode(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  async function sendPrompt(text?: string, extra?: { forcePlan?: boolean; projectType?: string }) {
    const prompt = (text ?? input).trim();
    if (!prompt || busy) return;
    setInput("");
    setBusy(true);
    setError("");
    const res = await fetch(`/api/projects/${projectId}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        componentId: selected?.id,
        pageSlug: selected?.page ?? pageSlug,
        ...extra,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setError(data.error || "שגיאה");
    await load();
  }

  async function jobAction(action: string, extra?: Record<string, string>) {
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, jobId: activeJob?.id, ...extra }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setError(data.error || "שגיאה");
    await load();
    if (action === "start") setPreviewKey((k) => k + 1);
  }

  async function publish() {
    setBusy(true);
    const res = await fetch(`/api/projects/${projectId}/publish`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setError(data.error || "פרסום נחסם");
    else setError(`פורסם: ${data.url}`);
    await load();
  }

  async function saveVersion() {
    await fetch(`/api/projects/${projectId}/versions`, { method: "POST" });
    await load();
  }

  async function undo() {
    const previous = versions[1];
    if (!previous) return;
    await fetch(`/api/projects/${projectId}/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId: previous.id }),
    });
    setPreviewKey((k) => k + 1);
    await load();
  }

  const widths = { desktop: "100%", tablet: "768px", mobile: "375px" };
  const hasPages = (project?.pages.length ?? 0) > 0;
  const previewSrc = hasPages
    ? `/preview/${projectId}/${pageSlug}?workspace=${selectMode ? "1" : "0"}&k=${previewKey}`
    : "";

  if (loading || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  const chat = (
    <aside className={`flex h-full min-h-0 flex-col border-e bg-card ${chatCollapsed ? "hidden lg:hidden" : ""}`}>
      <div className="border-b px-4 py-3">
        <p className="truncate text-sm font-semibold">{project.name}</p>
        <p className="text-[11px] text-muted-foreground">{project.status} {running ? "· בתהליך" : ""}</p>
      </div>
      <div ref={chatRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            {he ? "תארו מה תרצו לבנות. אציג תוכנית ואז אבנה בשלבים." : "Describe what to build. I will show a plan, then build in stages."}
          </p>
        )}
        {messages.map((msg) => {
          if (msg.kind === "USER") {
            return (
              <div key={msg.id} className="ms-8 rounded-xl bg-brand px-3 py-2 text-sm text-brand-foreground">
                {msg.content}
              </div>
            );
          }
          if (msg.kind === "PLAN") {
            return (
              <PlanCard
                key={msg.id}
                spec={msg.payload as unknown as BuildSpec}
                jobId={activeJob?.id ?? ""}
                busy={busy}
                onStart={() => jobAction("start")}
                onStyle={(themeId) => jobAction("style", { themeId })}
              />
            );
          }
          if (msg.kind === "ACTIVITY") {
            return (
              <ActivityCard
                key={msg.id}
                title={msg.content.slice(0, 48)}
                body={msg.content}
                status={String(msg.payload?.status ?? (running ? "RUNNING" : "COMPLETED"))}
              />
            );
          }
          if (msg.kind === "FILES") {
            return (
              <FilesCard
                key={msg.id}
                countLabel={msg.content}
                files={(msg.payload.files as Array<{ name: string; action?: string; page?: string; summary?: string }>) ?? []}
                technical={msg.payload.technical as string | undefined}
              />
            );
          }
          if (msg.kind === "READY") {
            return (
              <ReadyCard
                key={msg.id}
                payload={msg.payload}
                onView={() => { setMobileTab("preview"); setPreviewKey((k) => k + 1); }}
                onContinue={() => setInput(he ? "שפר את העיצוב" : "Improve the design")}
                onDomain={() => router.push(`/dashboard/projects/${projectId}/settings`)}
                onPublish={publish}
                onRollback={undo}
              />
            );
          }
          if (msg.kind === "ERROR") {
            return <ErrorCard key={msg.id} content={msg.content} onRetry={() => sendPrompt(he ? "תקן את התקלות שנמצאו" : "Fix the failed checks")} />;
          }
          return (
            <div key={msg.id} className="me-6 rounded-xl border bg-muted/40 px-3 py-2 text-sm">
              {msg.content}
            </div>
          );
        })}
      </div>
      <ProcessBoard tasks={tasks} open={processOpen && mobileTab !== "process"} />
      {selected && (
        <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
          רכיב נבחר: {selected.type} · השינוי יתייחס רק אליו
          <button type="button" className="ms-2 underline" onClick={() => setSelected(null)}>נקה</button>
        </div>
      )}
      {error && <p className="px-3 text-xs text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-1.5 border-t px-3 py-2">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q.he}
            type="button"
            className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-muted"
            onClick={() => sendPrompt(he ? q.he : q.en)}
          >
            {he ? q.he : q.en}
          </button>
        ))}
      </div>
      <form
        className="flex items-end gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          sendPrompt();
        }}
      >
        <button type="button" className="rounded-lg p-2 text-muted-foreground" aria-label="Attach" disabled>
          <Paperclip className="h-4 w-4" />
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder={he ? "תארו מה תרצו לבנות או לשנות…" : "Describe what you want to build or change…"}
          className="min-h-[44px] flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendPrompt();
            }
          }}
        />
        {running ? (
          <button type="button" onClick={() => jobAction("stop")} className="rounded-lg border p-2" aria-label="Stop">
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button type="submit" disabled={busy || !input.trim()} className="rounded-lg bg-brand p-2 text-brand-foreground disabled:opacity-40" aria-label="Send">
            <Send className="h-4 w-4" />
          </button>
        )}
      </form>
    </aside>
  );

  const preview = (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/30">
      <div className="flex flex-wrap items-center gap-1 border-b bg-card px-2 py-1.5">
        <select
          value={pageSlug}
          onChange={(e) => { setPageSlug(e.target.value); setPreviewKey((k) => k + 1); }}
          className="h-8 rounded-md border bg-background px-2 text-xs"
        >
          {project.pages.map((p) => (
            <option key={p.id} value={p.slug}>{p.title}</option>
          ))}
        </select>
        <IconBtn label="רענון" onClick={() => setPreviewKey((k) => k + 1)}><RefreshCw className="h-4 w-4" /></IconBtn>
        <IconBtn label="חלון חדש" onClick={() => window.open(`/preview/${projectId}/${pageSlug}`, "_blank")}><ExternalLink className="h-4 w-4" /></IconBtn>
        <div className="mx-1 flex rounded-md border">
          {(["desktop", "tablet", "mobile"] as const).map((bp) => (
            <button key={bp} type="button" onClick={() => setBreakpoint(bp)} className={`p-1.5 ${breakpoint === bp ? "bg-muted" : ""}`} aria-label={bp}>
              {bp === "desktop" && <Monitor className="h-4 w-4" />}
              {bp === "tablet" && <Tablet className="h-4 w-4" />}
              {bp === "mobile" && <Smartphone className="h-4 w-4" />}
            </button>
          ))}
        </div>
        <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="h-8 rounded-md border bg-background px-1 text-xs">
          {[50, 75, 100, 125].map((z) => <option key={z} value={z}>{z}%</option>)}
        </select>
        <IconBtn label="בחירת רכיב" onClick={() => setSelectMode(!selectMode)} active={selectMode}><MousePointer2 className="h-4 w-4" /></IconBtn>
        <IconBtn label="ביטול" onClick={undo}><Undo2 className="h-4 w-4" /></IconBtn>
        <IconBtn label="שמירת גרסה" onClick={saveVersion}><Save className="h-4 w-4" /></IconBtn>
        <button type="button" onClick={publish} className="ms-auto inline-flex h-8 items-center gap-1 rounded-md bg-brand px-3 text-xs font-semibold text-brand-foreground">
          <Rocket className="h-3.5 w-3.5" /> פרסום
        </button>
      </div>
      <div className="flex min-h-0 flex-1 justify-center overflow-auto p-4">
        {!hasPages ? (
          <SkeletonPreview />
        ) : (
          <div
            className="h-full overflow-hidden rounded-xl border bg-background shadow-sm transition-all"
            style={{ width: widths[breakpoint], maxWidth: "100%", transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
          >
            <iframe
              ref={iframeRef}
              title="preview"
              src={previewSrc}
              className="h-full min-h-[640px] w-full border-0"
            />
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="flex h-screen flex-col bg-background" dir={dir}>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <button type="button" className="rounded-md p-2 hover:bg-muted" onClick={() => router.push("/dashboard/projects")} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="truncate text-sm font-semibold">{project.name}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{project.status}</span>
        <button type="button" className="ms-auto hidden rounded-md p-2 hover:bg-muted md:inline-flex lg:hidden" onClick={() => setChatCollapsed(!chatCollapsed)}>
          {chatCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
        <button type="button" className="hidden rounded-md p-2 hover:bg-muted md:inline-flex" onClick={() => setProcessOpen(!processOpen)} aria-label="Process">
          <ListChecks className="h-4 w-4" />
        </button>
      </header>

      <div className="hidden min-h-0 flex-1 md:flex">
        <div className={`${chatCollapsed ? "w-0" : "w-[380px]"} shrink-0 overflow-hidden transition-[width]`}>{chat}</div>
        {preview}
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        {mobileTab === "chat" && <div className="min-h-0 flex-1">{chat}</div>}
        {mobileTab === "preview" && preview}
        {mobileTab === "process" && (
          <div className="flex-1 overflow-y-auto">
            <ProcessBoard tasks={tasks} open />
          </div>
        )}
        <nav className="grid grid-cols-3 border-t bg-card">
          {([
            ["chat", "צ׳אט", MessageSquare],
            ["preview", "תצוגה", Eye],
            ["process", "תהליך", ListChecks],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMobileTab(id)}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${mobileTab === id ? "text-brand" : "text-muted-foreground"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, label, active }: { children: React.ReactNode; onClick: () => void; label: string; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`rounded-md p-1.5 hover:bg-muted ${active ? "bg-muted text-brand" : ""}`}>
      {children}
    </button>
  );
}
