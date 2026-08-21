import { requireSuperAdmin } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AI_CREDITS_PER_USD } from "@/lib/ai-credits/config";

export default async function AdminAIUsagePage() {
  await requireSuperAdmin();

  const requests = await prisma.aIRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true } } },
  });

  const accounts = await prisma.aICreditAccount.findMany({
    take: 50,
    orderBy: { updatedAt: "desc" },
    include: { user: { select: { email: true } } },
  });

  const purchases = await prisma.aICreditPurchase.findMany({
    where: { status: "SUCCEEDED" },
    orderBy: { grantedAt: "desc" },
    take: 50,
    include: { user: { select: { email: true } }, package: true },
  });

  const totalCost = requests.reduce((sum, r) => sum + r.costUsd, 0);
  const totalTokens = requests.reduce((sum, r) => sum + r.tokensUsed, 0);
  const totalCreditsUsed = requests.reduce((sum, r) => sum + r.creditsUsed, 0);
  const purchaseRevenueCents = purchases.reduce((sum, p) => sum + p.amountUsdCents, 0);
  const purchaseCredits = purchases.reduce((sum, p) => sum + p.credits, 0);
  // Rough margin: credit pack revenue vs Anthropic cost on sampled requests
  const estimatedGrossMarginUsd = purchaseRevenueCents / 100 - totalCost;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Usage & Credits (Admin)</h1>
      <p className="text-sm text-muted-foreground">
        Internal view — includes Anthropic costUsd. Conversion: {AI_CREDITS_PER_USD} credits = $1.00 API cost.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Requests (sample)</p><p className="text-2xl font-bold">{requests.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Tokens</p><p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Anthropic cost</p><p className="text-2xl font-bold">${totalCost.toFixed(4)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Credits charged</p><p className="text-2xl font-bold">{totalCreditsUsed.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Extra credit revenue</p><p className="text-2xl font-bold">{formatCurrency(purchaseRevenueCents)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Purchased credits granted</p><p className="text-2xl font-bold">{purchaseCredits.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Est. gross margin (sample)</p><p className="text-2xl font-bold">${estimatedGrossMarginUsd.toFixed(2)}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h2 className="font-semibold mb-3">User credit balances</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-start">
                <th className="py-2 pe-4">User</th>
                <th className="py-2 pe-4">Subscription</th>
                <th className="py-2 pe-4">Purchased</th>
                <th className="py-2 pe-4">Reserved</th>
                <th className="py-2">Cycle used</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="py-3 pe-4">{a.user.email}</td>
                  <td className="py-3 pe-4">{a.subscriptionCredits.toLocaleString()}</td>
                  <td className="py-3 pe-4">{a.purchasedCredits.toLocaleString()}</td>
                  <td className="py-3 pe-4">{a.reservedCredits.toLocaleString()}</td>
                  <td className="py-3">{a.cycleUsed.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h2 className="font-semibold mb-3">Recent AI requests</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-start">
                <th className="py-2 pe-4">Time</th>
                <th className="py-2 pe-4">User</th>
                <th className="py-2 pe-4">Status</th>
                <th className="py-2 pe-4">Model</th>
                <th className="py-2 pe-4">Tokens</th>
                <th className="py-2 pe-4">Credits</th>
                <th className="py-2">costUsd</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-3 pe-4 text-muted-foreground">{formatDate(r.createdAt)}</td>
                  <td className="py-3 pe-4">{r.user.email}</td>
                  <td className="py-3 pe-4">{r.status}</td>
                  <td className="py-3 pe-4">{r.model}</td>
                  <td className="py-3 pe-4">{r.tokensUsed}</td>
                  <td className="py-3 pe-4">{r.creditsUsed}</td>
                  <td className="py-3">${r.costUsd.toFixed(6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
