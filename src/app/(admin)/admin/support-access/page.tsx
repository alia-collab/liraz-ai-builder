import { requireSuperAdmin } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-simple";
import { formatDate } from "@/lib/utils";

export default async function AdminSupportAccessPage() {
  await requireSuperAdmin();

  const requests = await prisma.supportAccessRequest.findMany({
    include: {
      agent: { select: { email: true } },
      customer: { select: { email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Support Access Requests</h1>
      <p className="text-muted-foreground">
        Time-limited, customer-approved access. All actions are audit-logged.
      </p>
      <Card>
        <CardContent className="pt-6">
          {requests.length === 0 ? (
            <p className="text-muted-foreground">No support access requests yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-start">
                  <th className="py-2 pe-4">Agent</th>
                  <th className="py-2 pe-4">Customer</th>
                  <th className="py-2 pe-4">Status</th>
                  <th className="py-2 pe-4">Reason</th>
                  <th className="py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-3 pe-4">{r.agent.email}</td>
                    <td className="py-3 pe-4">{r.customer.email}</td>
                    <td className="py-3 pe-4"><Badge variant="secondary">{r.status}</Badge></td>
                    <td className="py-3 pe-4 max-w-xs truncate">{r.reason}</td>
                    <td className="py-3 text-muted-foreground">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
