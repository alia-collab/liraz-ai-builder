import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import EditorPageClient from "@/components/editor/editor-page";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth();
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id,
      organization: {
        OR: [
          { ownerId: session.user.id },
          { memberships: { some: { userId: session.user.id, projectRole: { in: ["OWNER", "ADMIN", "EDITOR"] } } } },
        ],
      },
    },
  });

  if (!project) notFound();

  return <EditorPageClient projectId={id} />;
}
