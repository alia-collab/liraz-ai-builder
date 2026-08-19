"use client";

import { useState } from "react";

export function LeadCaptureForm({
  projectId,
  title,
  submitText,
  leadType,
  primary,
  emptyHint,
}: {
  projectId: string;
  title: string;
  submitText: string;
  leadType: string;
  primary: string;
  emptyHint?: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("loading");
    const res = await fetch("/api/runtime/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        type: leadType,
        name: data.get("name"),
        email: data.get("email"),
        phone: data.get("phone"),
        message: data.get("message"),
      }),
    });
    setStatus(res.ok ? "ok" : "err");
    if (res.ok) form.reset();
  }

  return (
    <section className="py-16 px-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-2 text-center">{title}</h2>
      {emptyHint && <p className="text-sm text-muted-foreground text-center mb-6">{emptyHint}</p>}
      {status === "ok" && (
        <p className="mb-4 rounded-md bg-emerald-50 text-emerald-800 text-sm p-3 text-center">הפנייה נשמרה בהצלחה.</p>
      )}
      {status === "err" && (
        <p className="mb-4 rounded-md bg-red-50 text-red-800 text-sm p-3 text-center">לא הצלחנו לשמור. נסו שוב.</p>
      )}
      <form className="space-y-4" onSubmit={onSubmit}>
        <input required name="name" className="w-full border rounded-md px-3 py-2 text-sm" placeholder="שם מלא" />
        <input name="phone" className="w-full border rounded-md px-3 py-2 text-sm" placeholder="טלפון" />
        <input name="email" type="email" className="w-full border rounded-md px-3 py-2 text-sm" placeholder="אימייל" />
        <textarea name="message" className="w-full border rounded-md px-3 py-2 text-sm min-h-[100px]" placeholder="פרטי הפנייה" />
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full py-2 rounded-md text-white font-medium disabled:opacity-60"
          style={{ backgroundColor: primary }}
        >
          {status === "loading" ? "שולח..." : submitText}
        </button>
      </form>
    </section>
  );
}
