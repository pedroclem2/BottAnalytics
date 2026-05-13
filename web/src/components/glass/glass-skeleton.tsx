import { cn } from "@/lib/ui/cn";

export function GlassSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "glass-skeleton rounded-2xl border border-glass-border",
        className,
      )}
    />
  );
}
