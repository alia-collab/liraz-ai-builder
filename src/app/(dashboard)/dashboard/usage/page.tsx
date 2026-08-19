import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getAllQuotas } from "@/lib/quotas";
import { getTranslations } from "next-intl/server";
import { UsagePanel } from "@/components/dashboard/usage-meter";

export default async function UsagePage() {
  const session = await requireAuth();
  const t = await getTranslations("dashboard.usagePage");
  const quotas = await getAllQuotas(session.user.id);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>
      <UsagePanel quotas={quotas} />
    </div>
  );
}
