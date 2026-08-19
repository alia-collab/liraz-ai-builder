import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-simple";
import { Users, DollarSign, Cpu, Activity } from "lucide-react";

export default async function AdminOverviewPage() {
  await requireAdmin();

  let stats = { users: 0, revenue: 0, aiCost: 0, aiRequests: 0 };
  let providers: Awaited<ReturnType<typeof prisma.aIProviderConfig.findMany>> = [];

  try {
    const [userCount, aiRequests, aiProviders] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.aIRequest.findMany({
        where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        select: { costUsd: true },
      }),
      prisma.aIProviderConfig.findMany({ orderBy: { name: "asc" } }),
    ]);

    stats = {
      users: userCount,
      revenue: 0,
      aiCost: aiRequests.reduce((sum, r) => sum + (r.costUsd ?? 0), 0),
      aiRequests: aiRequests.length,
    };
    providers = aiProviders;
  } catch {
    // DB not connected
  }

  const statCards = [
    { label: "Total Users", value: stats.users.toLocaleString(), icon: Users, color: "text-blue-400" },
    { label: "Monthly Revenue", value: `$${(stats.revenue / 100).toFixed(0)}`, icon: DollarSign, color: "text-emerald-400" },
    { label: "AI Cost (MTD)", value: `$${stats.aiCost.toFixed(2)}`, icon: Cpu, color: "text-violet-400" },
    { label: "AI Requests (MTD)", value: stats.aiRequests.toLocaleString(), icon: Activity, color: "text-amber-400" },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-zinc-400 mt-1">Platform metrics and configuration</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">AI Providers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-start">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Default</th>
                  <th className="pb-3 font-medium">Env Var</th>
                </tr>
              </thead>
              <tbody>
                {providers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      No providers configured — run <code className="text-violet-400">npm run db:seed</code>
                    </td>
                  </tr>
                ) : (
                  providers.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-800/50">
                      <td className="py-3 font-medium">{p.name}</td>
                      <td className="py-3">
                        <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                          {p.type}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant={p.isActive ? "brand" : "secondary"}>
                          {p.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3">{p.isDefault ? "✓" : "—"}</td>
                      <td className="py-3 text-zinc-400 font-mono text-xs">{p.apiKeyEnvVar || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
