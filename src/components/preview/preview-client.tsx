"use client";

import { useEffect, useState } from "react";
import { ComponentRenderer } from "@/components/editor/component-renderer";
import type { EditorComponent } from "@/lib/ai/types";

export function PreviewClient({ projectId, pageSlug }: { projectId: string; pageSlug: string }) {
  const [data, setData] = useState<{
    project: { name: string; direction: string; settings: { primaryColor?: string }; pages: { slug: string; title: string }[] };
    page: { slug: string; title: string; components: EditorComponent[] };
  } | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState(false);

  useEffect(() => {
    setWorkspace(new URLSearchParams(window.location.search).get("workspace") === "1");
  }, []);

  useEffect(() => {
    setData(null);
    fetch(`/api/preview/${projectId}/${pageSlug}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Failed");
        setData(json);
      })
      .catch((e: Error) => setError(e.message));
  }, [projectId, pageSlug]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg || msg.source !== "liraz-workspace") return;
      if (msg.type === "reload") window.location.reload();
      if (msg.type === "set-selected") setSelectedId(msg.componentId ?? null);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (error) {
    return <p className="p-8 text-center text-destructive">{error}</p>;
  }
  if (!data) {
    return (
      <div className="min-h-screen p-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-12 animate-pulse rounded-lg bg-muted" />
          <div className="h-48 animate-pulse rounded-2xl bg-muted" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-28 animate-pulse rounded-xl bg-muted" />
            <div className="h-28 animate-pulse rounded-xl bg-muted" />
            <div className="h-28 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  const dir = data.project.direction === "RTL" ? "rtl" : "ltr";

  return (
    <div dir={dir} className="min-h-screen bg-background" style={{ fontFamily: "Assistant, Heebo, system-ui, sans-serif" }}>
      <ComponentRenderer
        components={data.page.components}
        theme={data.project.settings}
        projectId={projectId}
        selectable={workspace}
        selectedId={selectedId}
        onSelect={(component) => {
          setSelectedId(component.id);
          window.parent.postMessage(
            {
              source: "liraz-preview",
              type: "select",
              componentId: component.id,
              componentType: component.type,
              pageSlug: data.page.slug,
            },
            "*"
          );
        }}
      />
    </div>
  );
}
