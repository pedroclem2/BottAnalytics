import { type ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

import { GlassCard } from "./glass-card";

export interface GlassSectionProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  intensity?: "default" | "strong";
}

export function GlassSection({
  title,
  description,
  actions,
  children,
  className,
  intensity = "default",
}: GlassSectionProps) {
  return (
    <GlassCard intensity={intensity} className={cn("p-6", className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 pb-5">
          <div>
            {title ? (
              <h2 className="text-base font-semibold tracking-tight text-fg">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-fg-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </GlassCard>
  );
}
