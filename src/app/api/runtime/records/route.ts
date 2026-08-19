import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { getApiSession, jsonError, jsonSuccess } from "@/lib/api/helpers";

function parseData(value: unknown): Prisma.InputJsonValue {
  return value && typeof value === "object" ? (value as Prisma.InputJsonValue) : {};
}

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");
  const kind = request.nextUrl.searchParams.get("kind");
  if (!projectId || !kind) return jsonError("projectId and kind required", 400);

  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null }, select: { id: true } });
  if (!project) return jsonError("Not found", 404);

  const records = await prisma.appRecord.findMany({
    where: { projectId, kind },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return jsonSuccess({ records });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const projectId = String(body.projectId ?? "");
  const kind = String(body.kind ?? "");
  if (!projectId || !kind) return jsonError("projectId and kind required", 400);

  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null }, select: { id: true } });
  if (!project) return jsonError("Project not found", 404);

  if (kind === "appointment") {
    const startsAt = String((parseData(body.data) as { startsAt?: string }).startsAt ?? "");
    if (startsAt) {
      const existing = await prisma.appRecord.findMany({
        where: { projectId, kind: "appointment", status: { not: "CANCELLED" } },
        take: 200,
      });
      const clash = existing.some((row) => {
        const data = row.data as { startsAt?: string };
        return data.startsAt === startsAt;
      });
      if (clash) return jsonError("המועד תפוס. בחרו שעה אחרת.", 409);
    }
  }

  const record = await prisma.appRecord.create({
    data: {
      projectId,
      kind,
      slug: body.slug ? String(body.slug) : undefined,
      title: body.title ? String(body.title) : undefined,
      status: body.status ? String(body.status) : "ACTIVE",
      data: parseData(body.data),
    },
  });
  return jsonSuccess({ record }, 201);
}

export async function PATCH(request: NextRequest) {
  const session = await getApiSession();
  if (!session?.user?.id) return jsonError("Unauthorized", 401);

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id ?? "");
  if (!id) return jsonError("id required", 400);

  const existing = await prisma.appRecord.findUnique({ where: { id } });
  if (!existing) return jsonError("Not found", 404);

  const allowed = await prisma.project.findFirst({
    where: {
      id: existing.projectId,
      organization: {
        OR: [
          { ownerId: session.user.id },
          { memberships: { some: { userId: session.user.id, projectRole: { in: ["OWNER", "ADMIN", "EDITOR"] } } } },
        ],
      },
    },
  });
  if (!allowed) return jsonError("Forbidden", 403);

  const record = await prisma.appRecord.update({
    where: { id },
    data: {
      title: body.title ? String(body.title) : undefined,
      status: body.status ? String(body.status) : undefined,
      data: body.data ? parseData(body.data) : undefined,
    },
  });
  return jsonSuccess({ record });
}
