import { requireSuperAdmin } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function AdminAIUsagePage() {
  await requireSuperAdmin();

  const requests = await prisma.aIRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true } } },
  });

  const totalCost = requests.reduce((sum, r) => sum + r.costUsd, 0);
  const totalTokens = requests.reduce((sum, r) => sum + r.tokensUsed, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">AI Usage & Costs</h1>
      <div className="grid sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Requests</p><p className="text-2xl font-bold">{requests.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Tokens</p><p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Est. Cost</p><p className="text-2xl font-bold">${totalCost.toFixed(2)}</p></CardContent></Card>
      </div>
      <Card>
        <CardContent className="pt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-start">
                <th className="py-2 pe-4">Time</th>
                <th className="py-2 pe-4">User</th>
                <th className="py-2 pe-4">Status</th>
                <th className="py-2 pe-4">Provider</th>
                <th className="py-2">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="py-3 pe-4 text-muted-foreground">{formatDate(r.createdAt)}</td>
                  <td className="py-3 pe-4">{r.user.email}</td>
                  <td className="py-3 pe-4">{r.status}</td>
                  <td className="py-3 pe-4">{r.provider}</td>
                  <td className="py-3">{r.tokensUsed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
