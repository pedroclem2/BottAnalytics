import Link from "next/link";

import { GlassSection } from "@/components/glass/glass-section";
import { cn } from "@/lib/ui/cn";
import { formatNumber, formatPercent } from "@/lib/ui/format";

export interface LeaderboardRow {
  id: number;
  name: string;
  subtitle?: string | null;
  responseCount: number;
  pctTop2Box: number;
  avgScore: number;
}

export function Leaderboard({
  title,
  description,
  rows,
  variant,
  linkBase,
}: {
  title: string;
  description?: string;
  rows: LeaderboardRow[];
  variant: "best" | "worst";
  /** If provided, each row's name links to `${linkBase}/${row.id}`. */
  linkBase?: string;
}) {
  if (rows.length === 0) {
    return (
      <GlassSection title={title} description={description}>
        <p className="text-xs text-fg-muted">Not enough data.</p>
      </GlassSection>
    );
  }

  return (
    <GlassSection title={title} description={description}>
      <ol className="divide-y divide-glass-border">
        {rows.map((r, idx) => (
          <li key={r.id} className="flex items-center gap-3 py-2">
            <span className="w-6 text-right text-xs font-medium text-fg-muted">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              {linkBase ? (
                <Link
                  href={`${linkBase}/${r.id}` as never}
                  className="block truncate text-sm text-fg hover:text-accent"
                >
                  {r.name}
                </Link>
              ) : (
                <div className="truncate text-sm text-fg">{r.name}</div>
              )}
              {r.subtitle ? (
                <div className="truncate text-[11px] text-fg-muted">{r.subtitle}</div>
              ) : null}
            </div>
            <span className="num text-xs text-fg-muted">{formatNumber(r.responseCount)} resp</span>
            <span
              className={cn(
                "num w-16 text-right font-semibold",
                variant === "best" ? "text-positive" : "text-negative",
              )}
            >
              {formatPercent(r.pctTop2Box, 1)}
            </span>
          </li>
        ))}
      </ol>
    </GlassSection>
  );
}
