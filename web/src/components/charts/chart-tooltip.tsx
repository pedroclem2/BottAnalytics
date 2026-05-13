"use client";

import { type ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

export interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayloadItem[];
  format?: (value: number, name?: string) => ReactNode;
}

export function ChartTooltip({ active, label, payload, format }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className={cn(
        "rounded-xl border border-glass-border bg-glass-strong/80 px-3 py-2 text-xs shadow-xl backdrop-blur-2xl",
      )}
    >
      {label ? <div className="mb-1 font-medium text-fg-secondary">{label}</div> : null}
      <div className="flex flex-col gap-1">
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ background: item.color }}
            />
            <span className="text-fg-muted">{item.name}</span>
            <span className="num ml-auto font-semibold text-fg">
              {typeof item.value === "number"
                ? format
                  ? format(item.value, item.name)
                  : item.value.toLocaleString()
                : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
