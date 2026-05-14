import Link from "next/link";

import { GlassCard } from "@/components/glass/glass-card";
import type { ResponseRow } from "@/lib/queries/entities";
import { cn } from "@/lib/ui/cn";
import { formatNumber } from "@/lib/ui/format";

const SENTIMENT_BADGE: Record<string, string> = {
  very_satisfied: "bg-positive-soft text-positive",
  satisfied: "bg-positive-soft/70 text-positive",
  neutral: "bg-accent-soft text-accent",
  dissatisfied: "bg-warning-soft text-warning",
  very_dissatisfied: "bg-negative-soft text-negative",
};

const SENTIMENT_LABEL: Record<string, string> = {
  very_satisfied: "★★★★★",
  satisfied: "★★★★",
  neutral: "★★★",
  dissatisfied: "★★",
  very_dissatisfied: "★",
};

function buildPageHref(basePath: string, sp: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v !== undefined && v !== "") params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function ResponsesTable({
  rows,
  total,
  pageSize,
  page,
  basePath,
  currentSearchParams,
}: {
  rows: ResponseRow[];
  total: number;
  pageSize: number;
  page: number;
  basePath: string;
  currentSearchParams: Record<string, string>;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(total, page * pageSize);

  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-glass-border px-4 py-3 text-xs text-fg-muted">
        <span>
          Showing {formatNumber(showingFrom)}–{formatNumber(showingTo)} of {formatNumber(total)} responses
        </span>
        <div className="flex items-center gap-1">
          <a
            aria-disabled={page <= 1}
            className={cn(
              "rounded-full border border-glass-border px-2.5 py-1 transition",
              page <= 1
                ? "pointer-events-none opacity-40"
                : "text-fg-secondary hover:bg-glass hover:text-fg",
            )}
            href={buildPageHref(basePath, { ...currentSearchParams, page: String(Math.max(1, page - 1)) })}
          >
            Prev
          </a>
          <span className="num px-2 text-fg-secondary">
            {page} / {pageCount}
          </span>
          <a
            aria-disabled={page >= pageCount}
            className={cn(
              "rounded-full border border-glass-border px-2.5 py-1 transition",
              page >= pageCount
                ? "pointer-events-none opacity-40"
                : "text-fg-secondary hover:bg-glass hover:text-fg",
            )}
            href={buildPageHref(basePath, { ...currentSearchParams, page: String(Math.min(pageCount, page + 1)) })}
          >
            Next
          </a>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-fg-muted">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Agent</th>
              <th className="px-4 py-2">Team</th>
              <th className="px-4 py-2">Question</th>
              <th className="px-4 py-2">Response</th>
              <th className="px-4 py-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-glass-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-xs text-fg-muted">
                  No responses match the current filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.instanceId} className="text-fg-secondary">
                  <td className="num px-4 py-2 text-xs text-fg-muted">
                    {r.createdAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-2 text-fg">
                    {r.agentId != null && r.agentName ? (
                      <Link
                        href={`/users/${r.agentId}` as never}
                        className="hover:text-accent"
                      >
                        {r.agentName}
                      </Link>
                    ) : (
                      (r.agentName ?? "—")
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-fg-muted">{r.teamName}</td>
                  <td className="px-4 py-2 text-xs text-fg-muted line-clamp-1 max-w-xs">{r.questionText}</td>
                  <td className="px-4 py-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        SENTIMENT_BADGE[r.sentiment] ?? "bg-glass text-fg-muted",
                      )}
                      dir={r.language === "ar" ? "rtl" : "ltr"}
                    >
                      {r.labelText ?? r.sentiment}
                    </span>
                  </td>
                  <td className="num px-4 py-2 text-right font-semibold text-fg">
                    {SENTIMENT_LABEL[r.sentiment] ?? r.scaled}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
