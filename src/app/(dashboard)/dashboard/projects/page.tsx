import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/dashboard/project-card";
import { Sparkles } from "lucide-react";

function mapStatus(status: string): "draft" | "published" | "archived" {
  if (status === "ACTIVE") return "published";
  if (status === "ARCHIVED") return "archived";
  return "draft";
}

export default async function ProjectsPage() {
  const session = await requireAuth();
  const t = await getTranslations("dashboard");

  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      organization: {
        OR: [
          { ownerId: session.user.id },
          { memberships: { some: { userId: session.user.id } } },
        ],
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center gap-4">
        <h1 className="text-3xl font-bold">{t("myProjects")}</h1>
        <Button variant="brand" asChild>
          <Link href="/onboarding">
            <Sparkles className="h-4 w-4 me-2" />
            {t("newProject")}
          </Link>
        </Button>
      </div>
      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          {t("noProjects")}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              id={p.id}
              name={p.name}
              status={mapStatus(p.status)}
              type={p.type}
              updatedAt={p.updatedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
