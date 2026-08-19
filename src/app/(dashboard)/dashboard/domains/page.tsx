import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-simple";

export default async function DomainsPage() {
  const session = await requireAuth();
  const t = await getTranslations("dashboard.domainsPage");

  const domains = await prisma.domain.findMany({
    where: {
      project: {
        organization: { ownerId: session.user.id },
      },
    },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>
      {domains.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => (
            <Card key={d.id}>
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{d.hostname}</CardTitle>
                  <Badge variant={d.status === "ACTIVE" ? "brand" : "secondary"}>{d.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{d.project.name}</p>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
