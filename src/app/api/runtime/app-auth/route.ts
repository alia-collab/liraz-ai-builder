import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { jsonError, jsonSuccess } from "@/lib/api/helpers";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const projectId = String(body.projectId ?? "");
  const action = String(body.action ?? "register");
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();

  if (!projectId || !email || password.length < 6) {
    return jsonError("נדרשים אימייל וסיסמה (6 תווים לפחות).", 400);
  }

  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null }, select: { id: true } });
  if (!project) return jsonError("Project not found", 404);

  if (action === "register") {
    const exists = await prisma.appRecord.findFirst({
      where: { projectId, kind: "customer", slug: email },
    });
    if (exists) return jsonError("החשבון כבר קיים.", 409);
    const passwordHash = await bcrypt.hash(password, 10);
    const record = await prisma.appRecord.create({
      data: {
        projectId,
        kind: "customer",
        slug: email,
        title: name || email,
        status: "ACTIVE",
        data: { email, name, role: "customer", passwordHash },
      },
    });
    return jsonSuccess({ user: { id: record.id, email, name: record.title, role: "customer" } }, 201);
  }

  const record = await prisma.appRecord.findFirst({
    where: { projectId, kind: "customer", slug: email },
  });
  if (!record) return jsonError("פרטי התחברות שגויים.", 401);
  const hash = (record.data as { passwordHash?: string }).passwordHash;
  if (!hash || !(await bcrypt.compare(password, hash))) {
    return jsonError("פרטי התחברות שגויים.", 401);
  }
  return jsonSuccess({
    user: { id: record.id, email, name: record.title, role: (record.data as { role?: string }).role ?? "customer" },
  });
}
