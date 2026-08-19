import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default async function SettingsPage() {
  const session = await requireAuth();
  const t = await getTranslations("dashboard.settingsPage");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, locale: true },
  });

  const org = await prisma.organization.findFirst({
    where: { ownerId: session.user.id },
    select: { name: true, slug: true },
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">{t("name")}</Label>
            <p className="font-medium">{user?.name ?? "—"}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">{t("email")}</Label>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">{t("locale")}</Label>
            <p className="font-medium">{user?.locale ?? "HE"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("workspace")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">{t("workspaceName")}</Label>
            <p className="font-medium">{org?.name ?? t("noWorkspace")}</p>
          </div>
          {org?.slug && (
            <div>
              <Label className="text-muted-foreground">{t("workspaceSlug")}</Label>
              <p className="font-mono text-sm">{org.slug}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
