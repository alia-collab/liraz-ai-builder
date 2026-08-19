import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { jsonError } from "@/lib/api/helpers";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
  if (!project) return jsonError("Not found", 404);
  const base = process.env.NEXTAUTH_URL || "https://lirazai.com";
  const body = `User-agent: *\nAllow: /\nSitemap: ${base}/preview/${projectId}/sitemap.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}
