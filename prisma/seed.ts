import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const plan = await prisma.plan.upsert({
    where: { slug: "pro" },
    create: {
      name: "Pro",
      slug: "pro",
      description: "Full access to all platform features",
      monthlyPriceUsd: 3500,
      yearlyPriceUsd: 42000,
      trialDays: 14,
      isActive: true,
      sortOrder: 0,
      features: [
        "Unlimited projects (within quotas)",
        "Visual editor",
        "One-click publishing",
        "Custom domains",
        "AI generation",
        "Version history",
        "Team collaboration",
      ],
      quotas: {
        projects: 10,
        deployments: 50,
        storageMb: 5120,
        aiRequests: 500,
        aiCredits: 8000,
        bandwidthGb: 100,
        teamMembers: 5,
        domains: 3,
        versions: 100,
      },
    },
    update: {
      monthlyPriceUsd: 3500,
      yearlyPriceUsd: 42000,
      trialDays: 14,
      quotas: {
        projects: 10,
        deployments: 50,
        storageMb: 5120,
        aiRequests: 500,
        aiCredits: 8000,
        bandwidthGb: 100,
        teamMembers: 5,
        domains: 3,
        versions: 100,
      },
    },
  });
  console.log("Plan:", plan.name);

  const creditPackages = [
    { slug: "credits-5k", name: "5,000 Credits", credits: 5000, priceUsdCents: 1000, sortOrder: 1 },
    { slug: "credits-15k", name: "15,000 Credits", credits: 15000, priceUsdCents: 2500, sortOrder: 2 },
    { slug: "credits-35k", name: "35,000 Credits", credits: 35000, priceUsdCents: 5000, sortOrder: 3 },
  ];
  for (const pkg of creditPackages) {
    await prisma.aICreditPackage.upsert({
      where: { slug: pkg.slug },
      create: pkg,
      update: {
        name: pkg.name,
        credits: pkg.credits,
        priceUsdCents: pkg.priceUsdCents,
        sortOrder: pkg.sortOrder,
        isActive: true,
      },
    });
  }
  console.log("AI credit packages seeded");

  const brandSettings = [
    { key: "brand.name", value: "Liraz AI Builder", category: "brand" },
    { key: "brand.logo", value: "/logo.svg", category: "brand" },
    { key: "brand.primaryColor", value: "220 90% 56%", category: "brand" },
    { key: "brand.domain", value: "lirazai.com", category: "brand" },
    { key: "quotas.default", value: plan.quotas as object, category: "quotas" },
    { key: "billing.readOnlyGraceDays", value: 30, category: "billing" },
    { key: "billing.trialDays", value: 14, category: "billing" },
    { key: "billing.paypalMonthlyPlanId", value: process.env.PAYPAL_MONTHLY_PLAN_ID || "", category: "billing" },
    { key: "billing.paypalYearlyPlanId", value: process.env.PAYPAL_YEARLY_PLAN_ID || "", category: "billing" },
    { key: "billing.paypalProductId", value: process.env.PAYPAL_PRODUCT_ID || "", category: "billing" },
  ];

  for (const s of brandSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      create: s,
      update: { value: s.value as object },
    });
  }
  console.log("System settings seeded");

  const featureFlags = [
    { key: "maintenance_mode", name: "Maintenance Mode", isEnabled: false },
    { key: "ai_generation", name: "AI Generation", isEnabled: true },
    { key: "visual_editor", name: "Visual Editor", isEnabled: true },
    { key: "custom_domains", name: "Custom Domains", isEnabled: true },
    { key: "team_collaboration", name: "Team Collaboration", isEnabled: true },
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      create: flag,
      update: {},
    });
  }
  console.log("Feature flags seeded");

  const anthropicProvider = {
    id: "anthropic-default",
    name: "Anthropic Claude",
    type: "ANTHROPIC" as const,
    isActive: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
    isDefault: true,
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    models: [process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514"],
  };

  await prisma.aIProviderConfig.deleteMany({
    where: { id: { not: "anthropic-default" } },
  });

  await prisma.aIProviderConfig.upsert({
    where: { id: "anthropic-default" },
    create: anthropicProvider,
    update: {
      name: anthropicProvider.name,
      type: anthropicProvider.type,
      isActive: anthropicProvider.isActive,
      isDefault: true,
      apiKeyEnvVar: anthropicProvider.apiKeyEnvVar,
      models: anthropicProvider.models,
    },
  });

  console.log("AI providers seeded");

  const templates = [
    { name: "Business Website", slug: "business-website", category: "Business", type: "WEBSITE" as const },
    { name: "SaaS Landing Page", slug: "landing-saas", category: "Landing", type: "LANDING_PAGE" as const },
    { name: "Online Store", slug: "online-store", category: "E-commerce", type: "ECOMMERCE" as const },
    { name: "Restaurant & Menu", slug: "restaurant", category: "Food", type: "WEBSITE" as const },
    { name: "Creative Portfolio", slug: "portfolio", category: "Creative", type: "PORTFOLIO" as const },
    { name: "Blog & Magazine", slug: "blog-magazine", category: "Content", type: "BLOG" as const },
  ];

  for (const [i, tpl] of templates.entries()) {
    await prisma.template.upsert({
      where: { slug: tpl.slug },
      create: { ...tpl, sortOrder: i, isActive: true, structure: {} },
      update: { isActive: true },
    });
  }
  console.log("Templates seeded");

  const adminEmail = process.env.SUPER_ADMIN_EMAIL;
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
  const adminName = process.env.SUPER_ADMIN_NAME || "Super Admin";

  if (adminEmail && adminPassword) {
    if (adminPassword.length < 12) {
      throw new Error("SUPER_ADMIN_PASSWORD must be at least 12 characters");
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      create: {
        email: adminEmail.toLowerCase(),
        passwordHash,
        name: adminName,
        globalRole: "SUPER_ADMINISTRATOR",
        emailVerified: new Date(),
        locale: "HE",
      },
      update: {
        globalRole: "SUPER_ADMINISTRATOR",
        passwordHash,
      },
    });

    const orgSlug = `admin-${admin.id.slice(-6)}`;
    const org = await prisma.organization.upsert({
      where: { slug: orgSlug },
      create: {
        name: "Admin Workspace",
        slug: orgSlug,
        ownerId: admin.id,
      },
      update: {},
    });

    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
      create: {
        userId: admin.id,
        organizationId: org.id,
        projectRole: "OWNER",
        acceptedAt: new Date(),
      },
      update: {},
    });

    console.log(`Super Admin created: ${adminEmail}`);
    console.log("IMPORTANT: Remove SUPER_ADMIN_PASSWORD from .env after first login");
  } else {
    console.log("Skipping Super Admin — set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD in .env");
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
