"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Props = {
  monthlyPriceUsd: number;
  yearlyPriceUsd: number;
  hasPaypalSubscription: boolean;
  notice?: "return" | "cancel" | null;
};

export function BillingActions({ monthlyPriceUsd, yearlyPriceUsd, hasPaypalSubscription, notice }: Props) {
  const t = useTranslations("dashboard.billingPage");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function checkout(interval: "MONTHLY" | "YEARLY") {
    setLoading(interval);
    setError("");
    setInfo("");
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error || t("checkoutFailed"));
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  async function cancelSubscription() {
    if (!window.confirm(t("cancelConfirm"))) return;
    setLoading("portal");
    setError("");
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error || t("portalFailed"));
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  async function confirmReturn() {
    setLoading("confirm");
    setError("");
    const params = new URLSearchParams(window.location.search);
    const subscriptionId = params.get("subscription_id") || undefined;
    const res = await fetch("/api/billing/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error || t("confirmFailed"));
      return;
    }
    if (data.activated) {
      setInfo(t("activated"));
      window.location.reload();
      return;
    }
    setInfo(t("stillPending"));
  }

  return (
    <>
      {notice === "return" && (
        <div className="rounded-md bg-muted p-3 text-sm space-y-2">
          <p>{t("returnPending")}</p>
          <Button size="sm" onClick={confirmReturn} disabled={!!loading}>
            {loading === "confirm" ? t("loading") : t("refreshStatus")}
          </Button>
        </div>
      )}
      {notice === "cancel" && (
        <div className="rounded-md bg-muted p-3 text-sm">{t("checkoutCanceled")}</div>
      )}
      {info && (
        <div className="rounded-md bg-muted p-3 text-sm">{info}</div>
      )}
      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive p-3 text-sm" role="alert">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t("subscription")}
          </CardTitle>
          <CardDescription>
            {t("pricingNote", {
              monthly: formatCurrency(monthlyPriceUsd),
              yearly: formatCurrency(yearlyPriceUsd),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Button variant="outline" onClick={() => checkout("MONTHLY")} disabled={!!loading}>
              {loading === "MONTHLY"
                ? t("loading")
                : t("subscribeMonthly", { price: formatCurrency(monthlyPriceUsd) })}
            </Button>
            <Button variant="brand" onClick={() => checkout("YEARLY")} disabled={!!loading}>
              {loading === "YEARLY"
                ? t("loading")
                : t("subscribeYearly", { price: formatCurrency(yearlyPriceUsd) })}
            </Button>
          </div>
          {hasPaypalSubscription && (
            <Button variant="ghost" onClick={cancelSubscription} disabled={!!loading}>
              <ExternalLink className="h-4 w-4 me-2" />
              {t("manageBilling")}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">{t("paypalNote")}</p>
        </CardContent>
      </Card>
    </>
  );
}
