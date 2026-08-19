import { requireSuperAdmin } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-simple";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function AdminSubscriptionsPage() {
  await requireSuperAdmin();

  const subscriptions = await prisma.subscription.findMany({
    include: {
      user: { select: { email: true } },
      plan: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Subscriptions</h1>
      <Card>
        <CardContent className="pt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-start">
                <th className="py-2 pe-4">User</th>
                <th className="py-2 pe-4">Plan</th>
                <th className="py-2 pe-4">Status</th>
                <th className="py-2 pe-4">Interval</th>
                <th className="py-2">Period End</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((s) => (
                <tr key={s.id} className="border-b">
                  <td className="py-3 pe-4">{s.user.email}</td>
                  <td className="py-3 pe-4">{s.plan.name}</td>
                  <td className="py-3 pe-4"><Badge variant="secondary">{s.status}</Badge></td>
                  <td className="py-3 pe-4">{s.interval}</td>
                  <td className="py-3 text-muted-foreground">
                    {s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
