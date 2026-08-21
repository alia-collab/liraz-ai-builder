import { requireAdmin } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-simple";
import { resetAIProviderCache } from "@/lib/ai";

export default async function AdminAIProvidersPage() {
  await requireAdmin();

  let providers: Awaited<ReturnType<typeof prisma.aIProviderConfig.findMany>> = [];

  try {
    providers = await prisma.aIProviderConfig.findMany({ orderBy: { name: "asc" } });
  } catch {
    // DB not connected
  }

  resetAIProviderCache();

  const providerTypes = ["ANTHROPIC"] as const;

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">AI Provider Settings</h1>
        <p className="text-zinc-400 mt-1">
          This platform uses Anthropic Claude only. Set{" "}
          <code className="text-violet-400">ANTHROPIC_API_KEY</code> and optionally{" "}
          <code className="text-violet-400">ANTHROPIC_MODEL</code>.
        </p>
      </div>

      <div className="grid gap-4">
        {providers.map((p) => (
          <Card key={p.id} className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {p.name}
                    {p.isDefault && <Badge variant="brand">Default</Badge>}
                  </CardTitle>
                  <CardDescription className="text-zinc-400 mt-1">
                    Type: {p.type} · Env: {p.apiKeyEnvVar || "none"}
                  </CardDescription>
                </div>
                <Badge variant={p.isActive ? "brand" : "secondary"}>
                  {p.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-400">
                Models: {Array.isArray(p.models) ? (p.models as string[]).join(", ") : "—"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">Supported Provider Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {providerTypes.map((type) => (
              <Badge key={type} variant="outline" className="border-zinc-700 text-zinc-300">
                {type}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
