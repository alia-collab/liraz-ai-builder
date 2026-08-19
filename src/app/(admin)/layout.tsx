"use client";

import { SessionProvider } from "next-auth/react";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
