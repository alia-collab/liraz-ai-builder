import prisma from "@/lib/db";
import type { AuditActionType } from "@prisma/client";

export interface AuditLogInput {
  userId?: string;
  action: AuditActionType;
  targetType?: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  reason?: string;
  result?: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      reason: input.reason,
      result: input.result ?? "success",
      metadata: (input.metadata ?? {}) as object,
      isImmutable: true,
    },
  });
}

export async function getAuditLogs(filters: {
  userId?: string;
  action?: AuditActionType;
  targetType?: string;
  targetId?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.targetType) where.targetType = filters.targetType;
  if (filters.targetId) where.targetId = filters.targetId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
      include: { user: { select: { id: true, email: true, name: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

export async function createAdminAction(input: {
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string;
  reason?: string;
  result?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}) {
  const [adminAction, auditLog] = await prisma.$transaction([
    prisma.adminAction.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        result: input.result ?? "success",
        ipAddress: input.ipAddress,
        metadata: (input.metadata ?? {}) as object,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: input.adminId,
        action: "ADMIN_ACTION",
        targetType: input.targetType,
        targetId: input.targetId,
        ipAddress: input.ipAddress,
        reason: input.reason,
        result: input.result ?? "success",
        metadata: (input.metadata ?? {}) as object,
        isImmutable: true,
      },
    }),
  ]);

  return { adminAction, auditLog };
}
