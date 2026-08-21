"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

type Package = {
  id: string;
  slug: string;
  name: string;
  credits: number;
  priceUsdCents: number;
};

export function CreditsPurchasePanel({ packages }: { packages: Package[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function startPurchase(slug: string) {
    setBusy(slug);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageSlug: slug }),
      });
      const data = (await res.json()) as { error?: string; message?: string; purchaseId?: string };
      if (!res.ok) {
        setMessage(data.error || "Could not start purchase");
        return;
      }
      setMessage(
        data.message ||
          `Purchase ${data.purchaseId} is PENDING until PayPal confirms payment. No credits were granted yet.`
      );
    } catch {
      setMessage("Network error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {packages.map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <div>
            <p className="font-medium">{p.name}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(p.priceUsdCents)}</p>
          </div>
          <Button
            size="sm"
            disabled={busy === p.slug}
            onClick={() => startPurchase(p.slug)}
          >
            {busy === p.slug ? "Starting…" : "Purchase"}
          </Button>
        </div>
      ))}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
