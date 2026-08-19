"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UsageMeterProps {
  label: string;
  current: number;
  limit: number;
  unit?: string;
  className?: string;
}

function getColorClass(percent: number): string {
  if (percent >= 90) return "bg-[hsl(var(--danger))]";
  if (percent >= 70) return "bg-[hsl(var(--warning))]";
  return "bg-[hsl(var(--success))]";
}

export function UsageMeter({ label, current, limit, unit, className }: UsageMeterProps) {
  const percent = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {current}{unit ? ` ${unit}` : ""} / {limit}{unit ? ` ${unit}` : ""}
        </span>
      </div>
      <Progress value={percent} indicatorClassName={getColorClass(percent)} />
    </div>
  );
}

const metricLabels: Record<string, string> = {
  projects: "Projects",
  deployments: "Deployments",
  storageMb: "Storage (MB)",
  aiRequests: "AI Requests",
  bandwidthGb: "Bandwidth (GB)",
  teamMembers: "Team Members",
  domains: "Domains",
  versions: "Versions",
};

interface UsagePanelProps {
  quotas: Array<{ metric: string; current: number; limit: number }>;
}

export function UsagePanel({ quotas }: UsagePanelProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {quotas.map((q) => (
        <UsageMeter
          key={q.metric}
          label={metricLabels[q.metric] ?? q.metric}
          current={q.current}
          limit={q.limit}
        />
      ))}
    </div>
  );
}
