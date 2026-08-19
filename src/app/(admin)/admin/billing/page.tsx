import { requireSuperAdmin } from "@/lib/auth";
import prisma from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-simple";
import { formatDate } from "@/lib/utils";
import { DollarSign, CreditCard } from "lucide-react";

export default async function AdminBillingPage() {
  await requireSuperAdmin();
  const t = await getTranslations("admin.billing");

  const [subscriptions, plans, revenueAgg] = await Promise.all([
    prisma.subscription.findMany({
      include: {
        user: { select: { email: true, name: true } },
        plan: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.subscription.aggregate({
      where: { status: { in: ["ACTIVE", "TRIALING"] } },
      _count: true,
    }),
  ]);

  const activeCount = revenueAgg._count;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-zinc-400 mt-1">{t("subtitle")}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">{t("activeSubscriptions")}</CardTitle>
            <CreditCard className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">{t("plans")}</CardTitle>
            <DollarSign className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plans.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>{t("recentSubscriptions")}</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-zinc-500 text-sm py-4">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-start">
                    <th className="py-2 pe-4">{t("user")}</th>
                    <th className="py-2 pe-4">{t("plan")}</th>
                    <th className="py-2 pe-4">{t("status")}</th>
                    <th className="py-2">{t("started")}</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-zinc-800/50">
                      <td className="py-3 pe-4">{sub.user.email}</td>
                      <td className="py-3 pe-4">{sub.plan.name}</td>
                      <td className="py-3 pe-4">
                        <Badge variant={sub.status === "ACTIVE" ? "brand" : "secondary"}>
                          {sub.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-zinc-400">{formatDate(sub.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
