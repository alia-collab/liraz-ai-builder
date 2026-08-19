"use client";

import { useEffect, useState } from "react";

type Lead = { id: string; name: string; email: string | null; phone: string | null; message: string | null; type: string; createdAt: string };

export function AdminLeadsPanel({ projectId, title }: { projectId: string; title: string }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/runtime/leads?projectId=${projectId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed");
        setLeads(data.leads);
      })
      .catch((e: Error) => setError(e.message));
  }, [projectId]);

  return (
    <section className="py-12 px-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {leads === null && !error && <p className="text-sm text-muted-foreground">טוען פניות...</p>}
      {leads && leads.length === 0 && (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-8 text-center">
          אין פניות עדיין. זה מצב ריק אמיתי — לא תוכן דמה.
        </p>
      )}
      <ul className="space-y-3">
        {leads?.map((lead) => (
          <li key={lead.id} className="border rounded-lg p-4 text-sm">
            <p className="font-medium">{lead.name}</p>
            <p className="text-muted-foreground">{lead.phone} {lead.email}</p>
            <p className="mt-2">{lead.message}</p>
            <p className="text-xs text-muted-foreground mt-2">{lead.type} · {new Date(lead.createdAt).toLocaleString("he-IL")}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
