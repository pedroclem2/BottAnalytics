import { type ReactNode } from "react";

import type { ComplianceStatus } from "@/lib/filters/types";
import { cn } from "@/lib/ui/cn";

const STATUS_STYLES: Record<ComplianceStatus, string> = {
  green: "bg-positive-soft text-positive border-positive/30",
  amber: "bg-warning-soft text-warning border-warning/30",
  red: "bg-negative-soft text-negative border-negative/30",
  insufficient_data: "bg-fg-muted/15 text-fg-muted border-fg-muted/20",
};

const STATUS_LABELS: Record<ComplianceStatus, string> = {
  green: "On target",
  amber: "Watch",
  red: "Below target",
  insufficient_data: "Insufficient data",
};

export function StatusPill({
  status,
  className,
  children,
}: {
  status: ComplianceStatus;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "text-xs font-medium tracking-tight",
        STATUS_STYLES[status],
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "green" && "bg-positive",
          status === "amber" && "bg-warning",
          status === "red" && "bg-negative",
          status === "insufficient_data" && "bg-fg-muted",
        )}
      />
      {children ?? STATUS_LABELS[status]}
    </span>
  );
}
