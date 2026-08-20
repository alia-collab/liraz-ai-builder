"use client";

import { SessionProvider } from "@/components/providers/session-provider";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
