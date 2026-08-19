import prisma from "@/lib/db";
import { generateSubdomain } from "@/lib/utils";

export async function publishProject(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organization: {
        OR: [
          { ownerId: userId },
          { memberships: { some: { userId, projectRole: { in: ["OWNER", "ADMIN"] } } } },
        ],
      },
    },
    include: { pages: true },
  });

  if (!project) throw new Error("Project not found");
  if (project.status === "READ_ONLY") throw new Error("Project is read-only");

  const subdomain = project.subdomain || generateSubdomain(project.slug);
  const baseDomain = process.env.DEPLOY_BASE_DOMAIN || "preview.lirazbuilder.local";
  const url = `https://${subdomain}.${baseDomain}`;

  const deployment = await prisma.deployment.create({
    data: {
      projectId,
      environment: "PREVIEW",
      status: "BUILDING",
      deployedBy: userId,
    },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: {
      subdomain,
      publishedUrl: url,
      status: "ACTIVE",
    },
  });

  await prisma.deployment.update({
    where: { id: deployment.id },
    data: {
      status: "LIVE",
      url,
      completedAt: new Date(),
      buildLogs: `Published to ${url}\nPages: ${project.pages.length}`,
    },
  });

  return { deployment, url, subdomain };
}

export async function getUserOrganization(userId: string) {
  const membership = await prisma.membership.findFirst({
    where: { userId, projectRole: "OWNER" },
    include: { organization: true },
  });
  return membership?.organization ?? null;
}
