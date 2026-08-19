import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-simple";

export default async function TeamPage() {
  const session = await requireAuth();
  const t = await getTranslations("dashboard.teamPage");

  const org = await prisma.organization.findFirst({
    where: { ownerId: session.user.id },
    include: {
      memberships: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
    },
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{org?.name ?? t("workspace")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!org?.memberships.length ? (
            <p className="text-sm text-muted-foreground py-4">{t("empty")}</p>
          ) : (
            <div className="space-y-3">
              {org.memberships.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{m.user.name ?? m.user.email}</p>
                    <p className="text-sm text-muted-foreground">{m.user.email}</p>
                  </div>
                  <Badge variant="secondary">{m.projectRole}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
