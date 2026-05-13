import { GlassCard } from "@/components/glass/glass-card";
import type { ComplianceStatus } from "@/lib/filters/types";
import { cn } from "@/lib/ui/cn";

const META: Record<
  ComplianceStatus,
  { label: string; chip: string; ring: string }
> = {
  green: { label: "On target", chip: "text-positive", ring: "ring-positive/30" },
  amber: { label: "Watch", chip: "text-warning", ring: "ring-warning/30" },
  red: { label: "Below target", chip: "text-negative", ring: "ring-negative/30" },
  insufficient_data: { label: "Low volume", chip: "text-fg-muted", ring: "ring-fg-muted/20" },
};

export function ComplianceStatCard({
  status,
  count,
  total,
}: {
  status: ComplianceStatus;
  count: number;
  total: number;
}) {
  const meta = META[status];
  const pct = total === 0 ? 0 : (count / total) * 100;
  return (
    <GlassCard className={cn("p-4", "ring-1", meta.ring)}>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-fg-muted">
        <span>{meta.label}</span>
        <span className={meta.chip}>{pct.toFixed(0)}%</span>
      </div>
      <div className="num mt-2 text-2xl font-semibold text-fg">
        {count}
        <span className="ml-1 text-base text-fg-muted">/ {total}</span>
      </div>
    </GlassCard>
  );
}
