"use client";

import { useEffect, useMemo, useState } from "react";

export function ProductGridLive({ projectId, title, emptyHint }: { projectId: string; title: string; emptyHint: string }) {
  const [records, setRecords] = useState<Array<{ id: string; title: string | null; status: string; data: { priceCents?: number; note?: string; isSample?: boolean; category?: string } }>>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch(`/api/runtime/records?projectId=${projectId}&kind=product`)
      .then((r) => r.json())
      .then((d) => setRecords(d.records ?? []))
      .catch(() => setRecords([]));
  }, [projectId]);

  const filtered = records.filter((r) => {
    const blob = `${r.title} ${r.data.category ?? ""}`.toLowerCase();
    return blob.includes(q.toLowerCase());
  });

  return (
    <section className="py-16 px-6">
      <h2 className="text-2xl font-bold text-center mb-6">{title}</h2>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="חיפוש"
        className="mx-auto mb-6 block w-full max-w-md rounded-md border px-3 py-2 text-sm"
      />
      {filtered.length === 0 && (
        <p className="mx-auto max-w-md rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{emptyHint}</p>
      )}
      <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-3">
        {filtered.map((item) => (
          <article key={item.id} className="rounded-xl border p-4">
            <h3 className="font-semibold">{item.title}</h3>
            {item.data.isSample && (
              <p className="mt-1 text-xs text-amber-700">פריט לדוגמה — החליפו לפני פרסום</p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">{item.data.note}</p>
            <button
              type="button"
              className="mt-3 text-sm underline"
              onClick={() => {
                const cart = JSON.parse(localStorage.getItem(`cart-${projectId}`) ?? "[]") as string[];
                cart.push(item.id);
                localStorage.setItem(`cart-${projectId}`, JSON.stringify(cart));
              }}
            >
              הוספה לעגלה
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CartLive({ projectId, title, checkoutHref }: { projectId: string; title: string; checkoutHref: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem(`cart-${projectId}`) ?? "[]") as string[];
    setCount(cart.length);
  }, [projectId]);
  return (
    <section className="mx-auto max-w-lg px-6 py-16 text-center">
      <h2 className="text-2xl font-bold mb-3">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6">{count} פריטים בעגלה</p>
      <a href={checkoutHref} className="inline-block rounded-md border px-5 py-2 text-sm font-medium">
        לתשלום
      </a>
    </section>
  );
}

export function CheckoutLive({ projectId, title, note }: { projectId: string; title: string; note: string }) {
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/runtime/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        kind: "order",
        title: String(form.get("name") ?? "order"),
        status: "PENDING_PAYMENT",
        data: { email: form.get("email"), note: "Awaiting Stripe keys" },
      }),
    });
    setStatus(res.ok ? "ok" : "err");
  }
  return (
    <section className="mx-auto max-w-lg px-6 py-16">
      <h2 className="text-2xl font-bold text-center mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground text-center mb-6">{note}</p>
      {status === "ok" && <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm">ההזמנה נשמרה. התשלום לא חויב.</p>}
      <form className="space-y-3" onSubmit={submit}>
        <input required name="name" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="שם" />
        <input required name="email" type="email" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="אימייל" />
        <button type="submit" className="w-full rounded-md border px-3 py-2 text-sm font-medium">שמירת הזמנה</button>
      </form>
    </section>
  );
}

export function BookingCalendarLive({ projectId, title, hint }: { projectId: string; title: string; hint: string }) {
  const [startsAt, setStartsAt] = useState("");
  const [msg, setMsg] = useState("");
  async function book() {
    if (!startsAt) return;
    const res = await fetch("/api/runtime/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        kind: "appointment",
        title: "Booking",
        status: "PENDING",
        data: { startsAt, source: "calendar" },
      }),
    });
    const data = await res.json();
    setMsg(res.ok ? "התור נשמר." : data.error || "שגיאה");
  }
  return (
    <section className="mx-auto max-w-lg px-6 py-8">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{hint}</p>
      <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" />
      <button type="button" onClick={book} className="mt-3 w-full rounded-md border px-3 py-2 text-sm">שמירת מועד</button>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </section>
  );
}

export function AuthFormLive({
  projectId,
  mode,
  title,
  nextHref,
}: {
  projectId: string;
  mode: string;
  title: string;
  nextHref: string;
}) {
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/runtime/app-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        action: mode === "register" ? "register" : "login",
        email: form.get("email"),
        password: form.get("password"),
        name: form.get("name"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error || "שגיאה");
      return;
    }
    localStorage.setItem(`app-user-${projectId}`, JSON.stringify(data.user));
    window.location.href = nextHref;
  }
  return (
    <section className="mx-auto max-w-sm px-6 py-16">
      <h2 className="text-2xl font-bold text-center mb-6">{title}</h2>
      <form className="space-y-3" onSubmit={submit}>
        {mode === "register" && <input name="name" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="שם" />}
        <input required name="email" type="email" className="w-full rounded-md border px-3 py-2 text-sm" placeholder="אימייל" />
        <input required name="password" type="password" minLength={6} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="סיסמה" />
        <button type="submit" className="w-full rounded-md border px-3 py-2 text-sm font-medium">המשך</button>
      </form>
      {msg && <p className="mt-3 text-sm text-red-700">{msg}</p>}
    </section>
  );
}

export function AppDashboardLive({ projectId, title, hint }: { projectId: string; title: string; hint: string }) {
  const [titleVal, setTitleVal] = useState("");
  const [rows, setRows] = useState<Array<{ id: string; title: string | null }>>([]);
  async function load() {
    const res = await fetch(`/api/runtime/records?projectId=${projectId}&kind=record`);
    const data = await res.json();
    setRows(data.records ?? []);
  }
  useEffect(() => {
    load();
  }, [projectId]);
  async function add() {
    if (!titleVal.trim()) return;
    await fetch("/api/runtime/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, kind: "record", title: titleVal, data: {} }),
    });
    setTitleVal("");
    load();
  }
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6">{hint}</p>
      <div className="flex gap-2 mb-6">
        <input value={titleVal} onChange={(e) => setTitleVal(e.target.value)} className="flex-1 rounded-md border px-3 py-2 text-sm" placeholder="רשומה חדשה" />
        <button type="button" onClick={add} className="rounded-md border px-3 py-2 text-sm">שמירה</button>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-md border px-3 py-2 text-sm">{r.title}</li>
        ))}
      </ul>
    </section>
  );
}

export function AccountPanelLive({ projectId, title, kind }: { projectId: string; title: string; kind: string }) {
  const recordKind = kind === "orders" ? "order" : kind === "appointments" ? "appointment" : "customer";
  const [rows, setRows] = useState<Array<{ id: string; title: string | null; status: string }>>([]);
  useEffect(() => {
    fetch(`/api/runtime/records?projectId=${projectId}&kind=${recordKind}`)
      .then((r) => r.json())
      .then((d) => setRows(d.records ?? []));
  }, [projectId, recordKind]);
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">אין נתונים עדיין.</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-md border px-3 py-2 text-sm">{r.title} · {r.status}</li>
        ))}
      </ul>
    </section>
  );
}

export function AdminRecordsLive({ projectId, title, kind, label }: { projectId: string; title: string; kind: string; label: string }) {
  const [rows, setRows] = useState<Array<{ id: string; title: string | null; status: string }>>([]);
  const [name, setName] = useState("");
  async function load() {
    const res = await fetch(`/api/runtime/records?projectId=${projectId}&kind=${kind}`);
    setRows((await res.json()).records ?? []);
  }
  useEffect(() => {
    load();
  }, [projectId, kind]);
  async function add() {
    if (!name.trim()) return;
    await fetch("/api/runtime/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, kind, title: name, status: "ACTIVE", data: {} }),
    });
    setName("");
    load();
  }
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className="flex gap-2 mb-6">
        <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-md border px-3 py-2 text-sm" placeholder={label} />
        <button type="button" onClick={add} className="rounded-md border px-3 py-2 text-sm">הוספה</button>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-md border px-3 py-2 text-sm">{r.title} · {r.status}</li>
        ))}
      </ul>
    </section>
  );
}

export function AdminCmsLive({ projectId, title }: { projectId: string; title: string }) {
  const [headline, setHeadline] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [id, setId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/runtime/records?projectId=${projectId}&kind=cms`)
      .then((r) => r.json())
      .then((d) => {
        const rec = (d.records ?? [])[0];
        if (!rec) return;
        setId(rec.id);
        setHeadline(rec.data?.headline ?? rec.title ?? "");
        setPhone(rec.data?.contact?.phone ?? "");
        setEmail(rec.data?.contact?.email ?? "");
      });
  }, [projectId]);

  async function save() {
    if (!id) return;
    await fetch("/api/runtime/records", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        data: { headline, contact: { phone, email } },
      }),
    });
    setSaved(true);
  }

  return (
    <section className="mx-auto max-w-lg px-6 py-16">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <div className="space-y-3">
        <input value={headline} onChange={(e) => setHeadline(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="כותרת" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="טלפון אמיתי" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" placeholder="אימייל אמיתי" />
        <button type="button" onClick={save} className="w-full rounded-md border px-3 py-2 text-sm">שמירה למסד</button>
        {saved && <p className="text-sm text-emerald-700">נשמר.</p>}
      </div>
    </section>
  );
}

export function AdminStatsLive({ projectId, title, note }: { projectId: string; title: string; note: string }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    Promise.all(
      ["lead", "product", "order", "appointment", "customer", "record"].map(async (kind) => {
        const res = await fetch(`/api/runtime/records?projectId=${projectId}&kind=${kind}`);
        const data = await res.json();
        return [kind, (data.records ?? []).length] as const;
      })
    ).then((entries) => setCounts(Object.fromEntries(entries)));
  }, [projectId]);
  return (
    <section className="mx-auto max-w-lg px-6 py-16">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground mb-6">{note}</p>
      <ul className="space-y-2 text-sm">
        {Object.entries(counts).map(([k, n]) => (
          <li key={k} className="flex justify-between rounded-md border px-3 py-2"><span>{k}</span><span>{n}</span></li>
        ))}
      </ul>
    </section>
  );
}

export function ArticleListLive({ projectId, title, emptyHint }: { projectId: string; title: string; emptyHint: string }) {
  const [rows, setRows] = useState<Array<{ id: string; title: string | null }>>([]);
  useEffect(() => {
    fetch(`/api/runtime/records?projectId=${projectId}&kind=article`)
      .then((r) => r.json())
      .then((d) => setRows(d.records ?? []));
  }, [projectId]);
  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      {rows.length === 0 && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{emptyHint}</p>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border p-4 font-medium">{r.title}</li>
        ))}
      </ul>
    </section>
  );
}
