"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PlanRow = {
  id: string;
  name: string;
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  trialDays: number;
  paypalMonthlyPlanId: string | null;
  paypalYearlyPlanId: string | null;
  paypalProductId: string | null;
};

export function PaypalSettingsForm({ plans }: { plans: PlanRow[] }) {
  const [rows, setRows] = useState(plans);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function save(plan: PlanRow) {
    setSavingId(plan.id);
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: plan.id,
        monthlyPriceUsd: plan.monthlyPriceUsd,
        yearlyPriceUsd: plan.yearlyPriceUsd,
        trialDays: plan.trialDays,
        paypalMonthlyPlanId: plan.paypalMonthlyPlanId ?? "",
        paypalYearlyPlanId: plan.paypalYearlyPlanId ?? "",
        paypalProductId: plan.paypalProductId ?? "",
      }),
    });
    const data = await res.json();
    setSavingId(null);
    setMessage(res.ok ? "Saved." : data.error || "Save failed");
  }

  async function setupPlans() {
    setSetupLoading(true);
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setup-paypal-plans" }),
    });
    const data = await res.json();
    setSetupLoading(false);
    if (!res.ok) {
      setMessage(data.error || "PayPal plan setup failed");
      return;
    }
    setMessage(`Created PayPal plans. Monthly ${data.monthlyPlanId} · Yearly ${data.yearlyPlanId}. Also copy them into .env.`);
    setRows((current) =>
      current.map((row) => ({
        ...row,
        paypalProductId: data.productId,
        paypalMonthlyPlanId: data.monthlyPlanId,
        paypalYearlyPlanId: data.yearlyPlanId,
      }))
    );
  }

  return (
    <div className="space-y-6">
      {rows.map((plan, index) => (
        <div key={plan.id} className="space-y-3 py-3 border-b last:border-0">
          <p className="font-medium">{plan.name}</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Monthly (cents)</Label>
              <Input
                type="number"
                value={plan.monthlyPriceUsd}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...plan, monthlyPriceUsd: Number(e.target.value) };
                  setRows(next);
                }}
              />
            </div>
            <div>
              <Label>Yearly (cents)</Label>
              <Input
                type="number"
                value={plan.yearlyPriceUsd}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...plan, yearlyPriceUsd: Number(e.target.value) };
                  setRows(next);
                }}
              />
            </div>
            <div>
              <Label>Trial days</Label>
              <Input
                type="number"
                value={plan.trialDays}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...plan, trialDays: Number(e.target.value) };
                  setRows(next);
                }}
              />
            </div>
          </div>
          <div className="grid gap-3">
            <div>
              <Label>PayPal monthly plan ID</Label>
              <Input
                value={plan.paypalMonthlyPlanId ?? ""}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...plan, paypalMonthlyPlanId: e.target.value };
                  setRows(next);
                }}
                placeholder="P-..."
              />
            </div>
            <div>
              <Label>PayPal yearly plan ID</Label>
              <Input
                value={plan.paypalYearlyPlanId ?? ""}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...plan, paypalYearlyPlanId: e.target.value };
                  setRows(next);
                }}
                placeholder="P-..."
              />
            </div>
            <div>
              <Label>PayPal product ID</Label>
              <Input
                value={plan.paypalProductId ?? ""}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...plan, paypalProductId: e.target.value };
                  setRows(next);
                }}
                placeholder="PROD-..."
              />
            </div>
          </div>
          <Button onClick={() => save(plan)} disabled={savingId === plan.id}>
            {savingId === plan.id ? "Saving..." : "Save plan & PayPal IDs"}
          </Button>
        </div>
      ))}
      <div className="space-y-2">
        <Button variant="outline" onClick={setupPlans} disabled={setupLoading}>
          {setupLoading ? "Creating in PayPal..." : "Create sandbox plans via PayPal API"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Super Admin only. Requires PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET. Does not fail the rest of the app if skipped.
        </p>
      </div>
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
