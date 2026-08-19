import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { jsonError } from "@/lib/api/helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null, status: "ACTIVE" },
    include: { pages: { select: { slug: true, updatedAt: true } } },
  });
  if (!project) return jsonError("Not found", 404);
  const base = process.env.NEXTAUTH_URL || "https://lirazai.com";
  const urls = project.pages
    .map((p) => `  <url><loc>${base}/preview/${projectId}/${p.slug}</loc><lastmod>${p.updatedAt.toISOString()}</lastmod></url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml" } });
}
