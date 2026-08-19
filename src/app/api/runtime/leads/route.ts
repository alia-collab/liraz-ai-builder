import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { getApiSession, jsonError, jsonSuccess } from "@/lib/api/helpers";

import { parseLeadInput } from "@/lib/runtime/leads";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseLeadInput(body);
  if (!parsed.ok) return jsonError(parsed.error, 400);

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, deletedAt: null },
    select: { id: true },
  });
  if (!project) return jsonError("Project not found", 404);

  const lead = await prisma.projectLead.create({
    data: parsed.data,
  });

  return jsonSuccess({ ok: true, id: lead.id }, 201);
}

export async function GET(request: NextRequest) {
  const session = await getApiSession();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) return jsonError("projectId required", 400);

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organization: {
        OR: [
          { ownerId: session.user.id },
          { memberships: { some: { userId: session.user.id, projectRole: { in: ["OWNER", "ADMIN"] } } } },
        ],
      },
    },
  });
  if (!project) return jsonError("Forbidden", 403);

  const leads = await prisma.projectLead.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return jsonSuccess({ leads });
}
