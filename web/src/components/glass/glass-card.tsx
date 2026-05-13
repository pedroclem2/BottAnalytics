import { type HTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/ui/cn";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  intensity?: "default" | "strong";
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { className, intensity = "default", ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      {...rest}
      className={cn(
        "relative overflow-hidden rounded-2xl border backdrop-blur-xl",
        "[transform:translateZ(0)] [contain:paint]",
        "transition-shadow duration-300",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px",
        "before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent",
        intensity === "strong"
          ? "bg-glass-strong border-glass-border shadow-[0_12px_36px_-22px_rgba(2,6,23,0.45)]"
          : "bg-glass border-glass-border shadow-[0_10px_30px_-22px_rgba(2,6,23,0.4)]",
        className,
      )}
    />
  );
});
