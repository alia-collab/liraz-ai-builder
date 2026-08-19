import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderOpen, Cpu, Rocket } from "lucide-react";

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const t = await getTranslations("admin.analytics");

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  let stats = {
    users: 0,
    projects: 0,
    aiRequests: 0,
    deployments: 0,
  };

  try {
    const [users, projects, aiRequests, deployments] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.aIRequest.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.deployment.count({ where: { startedAt: { gte: monthStart } } }),
    ]);
    stats = { users, projects, aiRequests, deployments };
  } catch {
    // DB unavailable
  }

  const cards = [
    { label: t("totalUsers"), value: stats.users, icon: Users, color: "text-blue-400" },
    { label: t("totalProjects"), value: stats.projects, icon: FolderOpen, color: "text-emerald-400" },
    { label: t("aiRequestsMtd"), value: stats.aiRequests, icon: Cpu, color: "text-violet-400" },
    { label: t("deploymentsMtd"), value: stats.deployments, icon: Rocket, color: "text-amber-400" },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-zinc-400 mt-1">{t("subtitle")}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((stat) => (
          <Card key={stat.label} className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
