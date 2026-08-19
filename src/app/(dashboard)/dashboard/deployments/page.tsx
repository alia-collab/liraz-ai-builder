import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-simple";
import { formatDate } from "@/lib/utils";

export default async function DeploymentsPage() {
  const session = await requireAuth();

  const deployments = await prisma.deployment.findMany({
    where: {
      project: {
        organization: { ownerId: session.user.id },
      },
    },
    include: { project: { select: { name: true } } },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold">Deployments</h1>
      {deployments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No deployments yet. Publish a project from the editor.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {deployments.map((d) => (
            <Card key={d.id}>
              <CardHeader className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{d.project.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{formatDate(d.startedAt)} · {d.environment}</p>
                  </div>
                  <Badge variant={d.status === "LIVE" ? "brand" : "secondary"}>{d.status}</Badge>
                </div>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand hover:underline">
                    {d.url}
                  </a>
                )}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
