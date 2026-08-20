"use client";

import { SessionProvider } from "@/components/providers/session-provider";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default function EditorPageClient({ projectId }: { projectId: string }) {
  return (
    <SessionProvider>
      <WorkspaceShell projectId={projectId} />
    </SessionProvider>
  );
}
