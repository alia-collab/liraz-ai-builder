import { requireSuperAdmin } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge-simple";

export default async function AdminTemplatesPage() {
  await requireSuperAdmin();
  const templates = await prisma.template.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Template Management</h1>
      <Card>
        <CardContent className="pt-6">
          {templates.length === 0 ? (
            <p className="text-muted-foreground">No templates. Run db:seed.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-start">
                  <th className="py-2 pe-4">Name</th>
                  <th className="py-2 pe-4">Category</th>
                  <th className="py-2 pe-4">Type</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b">
                    <td className="py-3 pe-4">{t.name}</td>
                    <td className="py-3 pe-4">{t.category}</td>
                    <td className="py-3 pe-4">{t.type}</td>
                    <td className="py-3">
                      <Badge variant={t.isActive ? "brand" : "secondary"}>
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
