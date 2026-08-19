import { requireSuperAdmin } from "@/lib/auth";
import { getAuditLogs } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function AdminAuditLogsPage() {
  await requireSuperAdmin();
  const { logs, total } = await getAuditLogs({ limit: 100 });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Audit Logs</h1>
      <p className="text-muted-foreground">{total} total entries (immutable)</p>
      <Card>
        <CardContent className="pt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-start">
                <th className="py-2 pe-4">Time</th>
                <th className="py-2 pe-4">Action</th>
                <th className="py-2 pe-4">User</th>
                <th className="py-2 pe-4">Target</th>
                <th className="py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="py-3 pe-4 text-muted-foreground whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td className="py-3 pe-4 font-mono text-xs">{log.action}</td>
                  <td className="py-3 pe-4">{log.user?.email ?? "—"}</td>
                  <td className="py-3 pe-4 text-muted-foreground">{log.targetType ?? "—"}</td>
                  <td className="py-3">{log.result ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
