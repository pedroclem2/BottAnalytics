import { ArrowDownRight, ArrowUpRight, type LucideIcon, Minus } from "lucide-react";

import { GlassCard } from "@/components/glass/glass-card";
import { cn } from "@/lib/ui/cn";

import { CountUp } from "./count-up";

export interface KpiCardProps {
  label: string;
  value: number;
  fractionDigits?: number;
  suffix?: string;
  prefix?: string;
  icon?: LucideIcon;
  hint?: string;
  delta?: {
    value: number;
    label?: string;
    fractionDigits?: number;
    suffix?: string;
    invert?: boolean;
  };
  accent?: "violet" | "emerald" | "amber" | "rose";
}

const ACCENT_GRADIENT: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  violet: "from-violet-500/30 via-fuchsia-500/15 to-transparent",
  emerald: "from-emerald-500/30 via-teal-500/15 to-transparent",
  amber: "from-amber-500/30 via-orange-500/15 to-transparent",
  rose: "from-rose-500/30 via-pink-500/15 to-transparent",
};

export function KpiCard({
  label,
  value,
  fractionDigits = 0,
  suffix,
  prefix,
  icon: Icon,
  hint,
  delta,
  accent = "violet",
}: KpiCardProps) {
  const positive = delta ? (delta.invert ? delta.value < 0 : delta.value > 0) : null;
  const isFlat = delta ? Math.abs(delta.value) < 0.0001 : false;

  return (
    <GlassCard className="relative p-5">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90",
          ACCENT_GRADIENT[accent],
        )}
      />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-fg-muted">
          <span>{label}</span>
          {Icon ? (
            <span className="rounded-lg border border-glass-border bg-glass-strong p-1.5">
              <Icon className="h-3.5 w-3.5 text-fg-secondary" />
            </span>
          ) : null}
        </div>
        <div className="num text-3xl font-semibold leading-none tracking-tight text-fg sm:text-4xl">
          <CountUp
            value={value}
            fractionDigits={fractionDigits}
            suffix={suffix}
            prefix={prefix}
          />
        </div>
        <div className="flex items-end justify-between gap-3 text-xs text-fg-muted">
          {hint ? <span className="leading-tight">{hint}</span> : <span />}
          {delta ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                isFlat
                  ? "border-fg-muted/20 bg-fg-muted/10 text-fg-muted"
                  : positive
                    ? "border-positive/30 bg-positive-soft text-positive"
                    : "border-negative/30 bg-negative-soft text-negative",
              )}
            >
              {isFlat ? (
                <Minus className="h-3 w-3" />
              ) : positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              <span className="num">
                {(delta.value > 0 ? "+" : "") + delta.value.toFixed(delta.fractionDigits ?? 1)}
                {delta.suffix ?? ""}
              </span>
              {delta.label ? <span className="text-fg-muted/80">vs {delta.label}</span> : null}
            </span>
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}
