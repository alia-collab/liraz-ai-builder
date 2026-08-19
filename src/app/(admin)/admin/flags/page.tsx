import { requireSuperAdmin } from "@/lib/auth";
import prisma from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-simple";

export default async function AdminFlagsPage() {
  await requireSuperAdmin();
  const t = await getTranslations("admin.flags");

  const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-zinc-400 mt-1">{t("subtitle")}</p>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>{t("flagsCount", { count: flags.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? (
            <p className="text-zinc-500 text-sm py-4">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-start">
                    <th className="py-2 pe-4">{t("key")}</th>
                    <th className="py-2 pe-4">{t("name")}</th>
                    <th className="py-2">{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {flags.map((flag) => (
                    <tr key={flag.id} className="border-b border-zinc-800/50">
                      <td className="py-3 pe-4 font-mono text-xs text-violet-300">{flag.key}</td>
                      <td className="py-3 pe-4">{flag.name}</td>
                      <td className="py-3">
                        <Badge variant={flag.isEnabled ? "brand" : "secondary"}>
                          {flag.isEnabled ? t("enabled") : t("disabled")}
                        </Badge>
                      </td>
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
