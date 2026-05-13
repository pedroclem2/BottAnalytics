"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

import { GlassSection } from "@/components/glass/glass-section";
import { cn } from "@/lib/ui/cn";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard render failure:", error);
  }, [error]);

  const isDbError = /ECONNREFUSED|connection|database|relation/i.test(error.message);

  return (
    <div className="p-6">
      <GlassSection
        title={
          <span className="inline-flex items-center gap-2 text-negative">
            <AlertTriangle className="h-4 w-4" />
            Something went wrong
          </span>
        }
        description={
          isDbError
            ? "We couldn't reach Postgres. Make sure the container is up: run `just db-up` then `just etl` from the repo root."
            : "Unexpected error while rendering this page."
        }
      >
        <pre className="overflow-x-auto rounded-xl border border-glass-border bg-glass p-3 text-xs text-fg-secondary">
          {error.message}
        </pre>
        <button
          type="button"
          onClick={reset}
          className={cn(
            "mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white",
            "shadow-lg shadow-accent/30 transition hover:bg-accent/90",
          )}
        >
          Try again
        </button>
      </GlassSection>
    </div>
  );
}
