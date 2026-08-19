import { requireSuperAdmin } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-simple";
import { formatDate } from "@/lib/utils";

export default async function AdminUsersPage() {
  await requireSuperAdmin();

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      globalRole: true,
      isBlocked: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">User Management</h1>
      <Card>
        <CardHeader><CardTitle>{users.length} Users</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-start">
                  <th className="py-2 pe-4">Email</th>
                  <th className="py-2 pe-4">Role</th>
                  <th className="py-2 pe-4">Status</th>
                  <th className="py-2 pe-4">Joined</th>
                  <th className="py-2">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="py-3 pe-4">{u.email}</td>
                    <td className="py-3 pe-4"><Badge variant="secondary">{u.globalRole}</Badge></td>
                    <td className="py-3 pe-4">
                      <Badge variant={u.isBlocked ? "destructive" : "brand"}>
                        {u.isBlocked ? "Blocked" : "Active"}
                      </Badge>
                    </td>
                    <td className="py-3 pe-4 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="py-3 text-muted-foreground">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
