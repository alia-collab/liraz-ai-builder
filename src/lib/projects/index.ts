import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import type { ProjectType, Locale } from "@prisma/client";
import type { ProjectSnapshot } from "@/lib/ai/types";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function registerUser(input: {
  email: string;
  password: string;
  name?: string;
  locale?: Locale;
  ipAddress?: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existing) throw new Error("EMAIL_EXISTS");

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
      locale: input.locale ?? "HE",
      globalRole: "REGISTERED_USER",
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: input.name ? `${input.name}'s Workspace` : "My Workspace",
      slug: slugify(input.email.split("@")[0]) + "-" + user.id.slice(-4),
      ownerId: user.id,
    },
  });

  await prisma.membership.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      projectRole: "OWNER",
      acceptedAt: new Date(),
    },
  });

  await createAuditLog({
    userId: user.id,
    action: "USER_REGISTER",
    ipAddress: input.ipAddress,
  });

  return { user, organization: org };
}

export async function createProjectFromSnapshot(
  userId: string,
  organizationId: string,
  snapshot: ProjectSnapshot
) {
  const slug = slugify(snapshot.name) + "-" + Date.now().toString(36).slice(-4);

  const project = await prisma.project.create({
    data: {
      organizationId,
      name: snapshot.name,
      slug,
      description: snapshot.description,
      type: snapshot.type as ProjectType,
      locale: snapshot.locale,
      direction: snapshot.direction,
      settings: snapshot.theme as object,
      seoDefaults: {} as object,
    },
  });

  for (const [index, page] of snapshot.pages.entries()) {
    await prisma.page.create({
      data: {
        projectId: project.id,
        slug: page.slug,
        title: page.title,
        locale: page.locale,
        direction: page.direction,
        components: page.components as object[],
        seo: page.seo as object,
        sortOrder: index,
        isHomePage: index === 0,
      },
    });
  }

  await prisma.projectVersion.create({
    data: {
      projectId: project.id,
      version: 1,
      label: "Initial version",
      description: "Created by AI",
      snapshot: snapshot as object,
      createdBy: userId,
    },
  });

  await createAuditLog({
    userId,
    action: "PROJECT_CREATED",
    targetType: "Project",
    targetId: project.id,
  });

  return project;
}

export async function createProjectVersion(
  projectId: string,
  snapshot: ProjectSnapshot,
  userId: string,
  label?: string
) {
  const lastVersion = await prisma.projectVersion.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
  });

  const version = (lastVersion?.version ?? 0) + 1;

  return prisma.projectVersion.create({
    data: {
      projectId,
      version,
      label: label ?? `Version ${version}`,
      snapshot: snapshot as object,
      createdBy: userId,
    },
  });
}

export async function rollbackProject(projectId: string, versionId: string, userId: string) {
  const version = await prisma.projectVersion.findUnique({ where: { id: versionId } });
  if (!version || version.projectId !== projectId) throw new Error("Version not found");

  const snapshot = version.snapshot as unknown as ProjectSnapshot;

  await prisma.page.deleteMany({ where: { projectId } });

  for (const [index, page] of snapshot.pages.entries()) {
    await prisma.page.create({
      data: {
        projectId,
        slug: page.slug,
        title: page.title,
        locale: page.locale,
        direction: page.direction,
        components: page.components as object[],
        seo: page.seo as object,
        sortOrder: index,
        isHomePage: index === 0,
      },
    });
  }

  await createProjectVersion(projectId, snapshot, userId, `Rollback to v${version.version}`);

  await createAuditLog({
    userId,
    action: "PROJECT_ROLLBACK",
    targetType: "Project",
    targetId: projectId,
    metadata: { versionId, version: version.version },
  });
}
