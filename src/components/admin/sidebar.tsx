"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logoutApp } from "@/lib/firebase/complete-login";
import {
  LayoutDashboard, Users, CreditCard, FileText, Settings,
  Sparkles, Shield, Flag, LogOut, Cpu, BarChart3, X, DollarSign, LayoutTemplate,
} from "lucide-react";

const adminNav = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/subscriptions", icon: CreditCard, label: "Subscriptions" },
  { href: "/admin/billing", icon: DollarSign, label: "Revenue" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/admin/ai", icon: Cpu, label: "AI Providers" },
  { href: "/admin/ai-usage", icon: Sparkles, label: "AI Usage" },
  { href: "/admin/flags", icon: Flag, label: "Feature Flags" },
  { href: "/admin/audit-logs", icon: FileText, label: "Audit Logs" },
  { href: "/admin/settings", icon: Settings, label: "System Settings" },
  { href: "/admin/templates", icon: LayoutTemplate, label: "Templates" },
  { href: "/admin/support-access", icon: Shield, label: "Support Access" },
];

interface AdminSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ open = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 start-0 z-50 flex h-full w-64 flex-col border-e bg-card transition-transform lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <div className="flex items-center gap-2 font-bold text-destructive">
            <Shield className="h-5 w-5" />
            Admin Panel
          </div>
          <p className="text-xs text-muted-foreground mt-1">MFA required for admins</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Admin navigation">
        {adminNav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                active ? "bg-destructive/10 text-destructive font-medium" : "text-muted-foreground hover:bg-muted"
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t">
        <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => void logoutApp()}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
