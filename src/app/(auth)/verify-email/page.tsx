import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";

export default async function VerifyEmailPage() {
  const t = await getTranslations("auth");
  const tc = await getTranslations("common");

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Mail className="h-8 w-8 text-brand" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl">{t("verifyEmail")}</CardTitle>
        <CardDescription>{t("verifyEmailSent")}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground mb-6">
          Email verification requires SMTP configuration. Check your inbox after SMTP is set up.
        </p>
        <Button variant="brand" asChild>
          <Link href="/dashboard">{tc("dashboard")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
