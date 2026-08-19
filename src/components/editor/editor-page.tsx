"use client";

import { SessionProvider } from "next-auth/react";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default function EditorPageClient({ projectId }: { projectId: string }) {
  return (
    <SessionProvider>
      <WorkspaceShell projectId={projectId} />
    </SessionProvider>
  );
}
