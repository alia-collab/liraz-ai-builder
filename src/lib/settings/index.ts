import prisma from "@/lib/db";
import type { SystemSetting } from "@prisma/client";

type SettingValue = string | number | boolean | object;

const cache = new Map<string, { value: SettingValue; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export async function getSetting<T = SettingValue>(
  key: string,
  defaultValue?: T
): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const setting = await prisma.systemSetting.findUnique({ where: { key } });
  if (!setting) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`System setting not found: ${key}`);
  }

  const value = setting.value as T;
  cache.set(key, { value: value as SettingValue, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export async function setSetting(
  key: string,
  value: SettingValue,
  category = "general",
  updatedBy?: string
): Promise<SystemSetting> {
  cache.delete(key);
  return prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: value as object, category, updatedBy },
    update: { value: value as object, updatedBy },
  });
}

export async function getBrandSettings() {
  const [name, logo, primaryColor, domain] = await Promise.all([
    getSetting<string>("brand.name", "Liraz AI Builder"),
    getSetting<string>("brand.logo", "/logo.svg"),
    getSetting<string>("brand.primaryColor", "220 90% 56%"),
    getSetting<string>("brand.domain", "lirazai.com"),
  ]);
  return { name, logo, primaryColor, domain };
}

export async function getPricingSettings() {
  const plan = await prisma.plan.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  if (!plan) {
    return {
      monthlyPriceUsd: 3500,
      yearlyPriceUsd: 42000,
      trialDays: 14,
      planName: "Pro",
    };
  }
  return {
    monthlyPriceUsd: plan.monthlyPriceUsd,
    yearlyPriceUsd: plan.yearlyPriceUsd,
    trialDays: plan.trialDays,
    planId: plan.id,
    planName: plan.name,
  };
}

export async function getQuotaSettings(planId?: string) {
  if (planId) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (plan?.quotas) return plan.quotas as Record<string, number>;
  }
  return getSetting<Record<string, number>>("quotas.default", {
    projects: 3,
    deployments: 10,
    storageMb: 512,
    aiRequests: 50,
    bandwidthGb: 10,
    teamMembers: 1,
    domains: 1,
    versions: 20,
  });
}

export function clearSettingsCache() {
  cache.clear();
}
