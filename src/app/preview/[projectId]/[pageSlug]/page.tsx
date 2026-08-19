import { PreviewClient } from "@/components/preview/preview-client";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ projectId: string; pageSlug: string }>;
}) {
  const { projectId, pageSlug } = await params;
  return <PreviewClient projectId={projectId} pageSlug={pageSlug} />;
}
