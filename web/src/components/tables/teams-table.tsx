"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Sparkline } from "@/components/charts/sparkline";
import { StatusPill } from "@/components/glass/status-pill";
import type { TeamListRow } from "@/lib/queries/teams";
import { cn } from "@/lib/ui/cn";
import { formatNumber, formatPercent, formatScore } from "@/lib/ui/format";

type SortKey = "name" | "responseCount" | "avgScore" | "pctTop2Box" | "status";
type SortDir = "asc" | "desc";

const STATUS_ORDER = { red: 0, amber: 1, insufficient_data: 2, green: 3 } as const;

export function TeamsTable({ teams }: { teams: TeamListRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("responseCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    const filtered = query.trim()
      ? teams.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()))
      : teams;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "responseCount":
          return (a.responseCount - b.responseCount) * dir;
        case "avgScore":
          return (a.avgScore - b.avgScore) * dir;
        case "pctTop2Box":
          return (a.pctTop2Box - b.pctTop2Box) * dir;
        case "status":
          return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * dir;
      }
    });
  }, [teams, sortKey, sortDir, query]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const headers: { key: SortKey; label: string; align: "left" | "right" }[] = [
    { key: "name", label: "Team", align: "left" },
    { key: "responseCount", label: "Responses", align: "right" },
    { key: "avgScore", label: "Avg score", align: "right" },
    { key: "pctTop2Box", label: "Top-2 box", align: "right" },
    { key: "status", label: "Status", align: "left" },
  ];

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search teams…"
        className="w-full max-w-sm rounded-full border border-glass-border bg-glass px-3 py-1.5 text-xs text-fg outline-none backdrop-blur-xl placeholder:text-fg-muted/70"
      />
      <div className="overflow-x-auto rounded-2xl border border-glass-border bg-glass/40 backdrop-blur-xl">
        <table className="min-w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-fg-muted">
            <tr>
              {headers.map((h) => (
                <th
                  key={h.key}
                  scope="col"
                  className={cn("px-4 py-3", h.align === "right" && "text-right")}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(h.key)}
                    className={cn(
                      "inline-flex items-center gap-1 text-fg-muted transition hover:text-fg",
                      h.align === "right" && "flex-row-reverse",
                    )}
                  >
                    {h.label}
                    {sortKey === h.key ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                </th>
              ))}
              <th
                scope="col"
                className="px-4 py-3 text-right text-[11px] uppercase tracking-wider text-fg-muted"
              >
                Trend
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-glass-border">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-xs text-fg-muted">
                  No teams match the current filters.
                </td>
              </tr>
            ) : (
              sorted.map((t) => (
                <tr key={t.teamId} className="text-fg-secondary transition hover:bg-glass/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/teams/${t.slug}` as never}
                      className="font-medium text-fg hover:text-accent"
                    >
                      {t.name}
                    </Link>
                    {t.parentL1 ? (
                      <div className="text-[11px] text-fg-muted">{t.parentL1}</div>
                    ) : null}
                  </td>
                  <td className="num px-4 py-3 text-right">{formatNumber(t.responseCount)}</td>
                  <td className="num px-4 py-3 text-right">{formatScore(t.avgScore)}</td>
                  <td className="num px-4 py-3 text-right font-semibold text-fg">
                    {formatPercent(t.pctTop2Box, 1)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={t.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="ml-auto w-24">
                      <Sparkline data={t.sparkline} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
