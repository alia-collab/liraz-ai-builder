import { requireAuth } from "@/lib/auth";
import { getCustomerCreditSummary } from "@/lib/ai-credits/customer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditsPurchasePanel } from "@/components/dashboard/credits-purchase";

export default async function CreditsPage() {
  const session = await requireAuth();
  const summary = await getCustomerCreditSummary(session.user.id);

  const pctRemaining =
    summary.allowance + summary.purchasedCredits > 0
      ? Math.min(
          100,
          Math.round(
            (summary.remaining / Math.max(summary.allowance + summary.purchasedCredits, 1)) * 100
          )
        )
      : summary.remaining > 0
        ? 100
        : 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">{summary.brandName}</h1>
        <p className="text-muted-foreground mt-1">
          Included with your plan and any purchased packs. Credits renew with your billing cycle.
        </p>
      </div>

      {summary.warning === "empty" && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          You&apos;ve used your available AI Credits. Your included credits will renew on your next billing
          date, or you can purchase additional credits.
        </div>
      )}
      {summary.warning === "critical" && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm">
          Critical: only about 10% of your included AI Credits remain this cycle.
        </div>
      )}
      {summary.warning === "low" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          Low credits: about 20% of your included AI Credits remain this cycle.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            {summary.remaining.toLocaleString()} /{" "}
            {(summary.allowance + summary.purchasedCredits).toLocaleString()} remaining
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={pctRemaining} className="h-2" />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Credits remaining</p>
              <p className="font-semibold">{summary.remaining.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Used this billing cycle</p>
              <p className="font-semibold">{summary.usedThisCycle.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Plan credits left</p>
              <p className="font-semibold">{summary.subscriptionCredits.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Purchased credits</p>
              <p className="font-semibold">{summary.purchasedCredits.toLocaleString()}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Next renewal / reset</p>
              <p className="font-semibold">
                {summary.nextRenewalAt ? formatDate(new Date(summary.nextRenewalAt)) : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Buy extra credits</CardTitle>
        </CardHeader>
        <CardContent>
          <CreditsPurchasePanel packages={summary.packages} />
          <p className="text-xs text-muted-foreground mt-3">
            Credits are added only after PayPal confirms payment on the server. Your browser cannot grant
            credits.
          </p>
          <ul className="mt-2 text-sm text-muted-foreground space-y-1">
            {summary.packages.map((p) => (
              <li key={p.id}>
                {p.name} — {formatCurrency(p.priceUsdCents)}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Recent credit activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {summary.history.length === 0 && (
              <li className="text-muted-foreground">No credit activity yet.</li>
            )}
            {summary.history.map((h) => (
              <li key={h.id} className="flex justify-between gap-3 border-b pb-2">
                <span>
                  <span className="font-medium">{h.type}</span>
                  <span className="text-muted-foreground"> — {h.description}</span>
                </span>
                <span className={h.amount < 0 ? "text-destructive" : "text-emerald-600"}>
                  {h.amount > 0 ? "+" : ""}
                  {h.amount.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
