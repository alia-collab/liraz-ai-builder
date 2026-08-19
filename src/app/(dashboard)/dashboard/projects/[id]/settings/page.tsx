import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-simple";
import { formatDate } from "@/lib/utils";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id,
      organization: { ownerId: session.user.id },
    },
    include: {
      domains: true,
      deployments: { orderBy: { startedAt: "desc" }, take: 5 },
      versions: { orderBy: { version: "desc" }, take: 10, select: { id: true, version: true, label: true, createdAt: true } },
    },
  });

  if (!project) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{project.name}</h1>
        <Button variant="brand" asChild>
          <Link href={`/editor/${project.id}`}>Open Editor</Link>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Project Info</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Type:</strong> {project.type}</p>
          <p><strong>Status:</strong> <Badge variant="secondary">{project.status}</Badge></p>
          <p><strong>Locale:</strong> {project.locale} · {project.direction}</p>
          {project.publishedUrl && (
            <p><strong>Published:</strong> <a href={project.publishedUrl} className="text-brand hover:underline" target="_blank" rel="noopener noreferrer">{project.publishedUrl}</a></p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Version History</CardTitle></CardHeader>
        <CardContent>
          {project.versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No versions yet.</p>
          ) : (
            <div className="space-y-2">
              {project.versions.map((v) => (
                <div key={v.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                  <span>v{v.version} — {v.label ?? "Untitled"}</span>
                  <span className="text-muted-foreground">{formatDate(v.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
