"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Sparkles, LayoutDashboard, FolderOpen, CreditCard, Users,
  Globe, Settings, HelpCircle, LogOut, BarChart3, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutApp } from "@/lib/firebase/complete-login";

const navItems: Array<{
  href: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
  useCommon?: boolean;
}> = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "dashboard", useCommon: true },
  { href: "/dashboard/projects", icon: FolderOpen, labelKey: "myProjects" },
  { href: "/dashboard/credits", icon: Sparkles, labelKey: "credits" },
  { href: "/dashboard/usage", icon: BarChart3, labelKey: "usage" },
  { href: "/dashboard/billing", icon: CreditCard, labelKey: "billing" },
  { href: "/dashboard/team", icon: Users, labelKey: "team" },
  { href: "/dashboard/domains", icon: Globe, labelKey: "domains" },
  { href: "/dashboard/settings", icon: Settings, useCommon: true, labelKey: "settings" as const },
  { href: "/help", icon: HelpCircle, useCommon: true, labelKey: "help" as const },
];

interface DashboardSidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function DashboardSidebar({ open = false, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  return (
    <aside
      className={cn(
        "fixed inset-y-0 start-0 z-50 flex h-full w-64 flex-col border-e bg-card/50 glass transition-transform lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-5">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-6 w-6 text-brand shrink-0" aria-hidden="true" />
          <span className="font-bold text-lg truncate">{tc("appName")}</span>
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

      <nav className="flex-1 space-y-1 p-3 overflow-y-auto" aria-label="Dashboard navigation">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand/10 text-brand"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.useCommon ? tc(item.labelKey as "dashboard") : t(item.labelKey as "myProjects")}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => void logoutApp()}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {tc("logout")}
        </Button>
      </div>
    </aside>
  );
}
