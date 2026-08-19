import prisma from "@/lib/db";
import { getQuotaSettings } from "@/lib/settings";

export type QuotaMetric =
  | "projects"
  | "deployments"
  | "storageMb"
  | "aiRequests"
  | "bandwidthGb"
  | "teamMembers"
  | "domains"
  | "versions";

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  metric: QuotaMetric;
  percentUsed: number;
  warning: boolean;
}

export async function getUserPlanId(userId: string): Promise<string | undefined> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: { in: ["ACTIVE", "TRIALING"] } },
    orderBy: { createdAt: "desc" },
  });
  return sub?.planId;
}

export async function getCurrentUsage(
  userId: string,
  metric: QuotaMetric
): Promise<number> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const record = await prisma.usageRecord.findFirst({
    where: { userId, metric, periodStart: { gte: periodStart } },
    orderBy: { createdAt: "desc" },
  });

  if (record) return record.value;

  switch (metric) {
    case "projects": {
      const count = await prisma.project.count({
        where: { organization: { ownerId: userId }, deletedAt: null },
      });
      return count;
    }
    case "aiRequests": {
      const count = await prisma.aIRequest.count({
        where: { userId, createdAt: { gte: periodStart } },
      });
      return count;
    }
    default:
      return 0;
  }
}

export async function checkQuota(
  userId: string,
  metric: QuotaMetric
): Promise<QuotaCheckResult> {
  const planId = await getUserPlanId(userId);
  const quotas = await getQuotaSettings(planId);
  const limit = quotas[metric] ?? 0;
  const current = await getCurrentUsage(userId, metric);
  const percentUsed = limit > 0 ? (current / limit) * 100 : 0;

  return {
    allowed: current < limit,
    current,
    limit,
    metric,
    percentUsed,
    warning: percentUsed >= 80,
  };
}

export async function incrementUsage(
  userId: string,
  metric: QuotaMetric,
  amount = 1,
  organizationId?: string
) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const existing = await prisma.usageRecord.findFirst({
    where: { userId, metric, periodStart: { gte: periodStart } },
  });

  if (existing) {
    await prisma.usageRecord.update({
      where: { id: existing.id },
      data: { value: existing.value + amount },
    });
  } else {
    await prisma.usageRecord.create({
      data: { userId, organizationId, metric, value: amount, periodStart, periodEnd },
    });
  }
}

export async function getAllQuotas(userId: string) {
  const metrics: QuotaMetric[] = [
    "projects", "deployments", "storageMb", "aiRequests",
    "bandwidthGb", "teamMembers", "domains", "versions",
  ];
  return Promise.all(metrics.map((m) => checkQuota(userId, m)));
}
