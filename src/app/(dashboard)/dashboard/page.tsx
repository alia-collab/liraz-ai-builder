import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import { getAllQuotas } from "@/lib/quotas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectCard } from "@/components/dashboard/project-card";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import { Plus, Sparkles } from "lucide-react";

function mapStatus(status: string): "draft" | "published" | "archived" {
  if (status === "ACTIVE") return "published";
  if (status === "ARCHIVED") return "archived";
  return "draft";
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const t = await getTranslations("dashboard");
  const userId = session.user.id;

  let projects: Awaited<ReturnType<typeof prisma.project.findMany>> = [];
  let quotas: Awaited<ReturnType<typeof getAllQuotas>> = [];

  try {
    const org = await prisma.organization.findFirst({ where: { ownerId: userId } });
    if (org) {
      projects = await prisma.project.findMany({
        where: { organizationId: org.id, deletedAt: null },
        orderBy: { updatedAt: "desc" },
        take: 12,
      });
    }
    quotas = await getAllQuotas(userId);
  } catch {
    // DB not connected — show empty state
  }

  const keyQuotas = quotas.filter((q) =>
    ["projects", "aiRequests", "storageMb", "deployments"].includes(q.metric)
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {t("welcome")}, {session.user.name ?? session.user.email?.split("@")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">{t("myProjects")}</p>
        </div>
        <Button variant="brand" asChild>
          <Link href="/onboarding">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("newProject")}
          </Link>
        </Button>
      </div>

      {keyQuotas.length > 0 && (
        <Card className="shadow-luxury">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("usage")}</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {keyQuotas.map((q) => (
              <UsageMeter
                key={q.metric}
                label={q.metric.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                current={q.current}
                limit={q.limit}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {projects.length === 0 ? (
        <Card className="border-dashed shadow-luxury">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 mb-4">
              <Sparkles className="h-8 w-8 text-brand" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t("noProjects")}</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {t("emptyProjectsHint")}
            </p>
            <Button variant="brand" size="lg" asChild>
              <Link href="/onboarding">{t("newProject")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              name={project.name}
              status={mapStatus(project.status)}
              type={project.type}
              updatedAt={project.updatedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
