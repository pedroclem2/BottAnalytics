"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { EntityYoyRow } from "@/lib/queries/compare";
import { cn } from "@/lib/ui/cn";
import { formatNumber, formatPercent } from "@/lib/ui/format";

type SortKey = "name" | "currCount" | "currTop2" | "delta" | "prevCount";
type SortDir = "asc" | "desc";

export function YoyTable({
  rows,
  previousYear,
  currentYear,
}: {
  rows: EntityYoyRow[];
  previousYear: number;
  currentYear: number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("delta");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    const filtered = query.trim()
      ? rows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
      : rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "currCount":
          return (a.curr.responseCount - b.curr.responseCount) * dir;
        case "currTop2":
          return (a.curr.pctTop2Box - b.curr.pctTop2Box) * dir;
        case "delta":
          return (a.deltaPctTop2Box - b.deltaPctTop2Box) * dir;
        case "prevCount":
          return (a.prev.responseCount - b.prev.responseCount) * dir;
      }
    });
  }, [rows, sortKey, sortDir, query]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const headers: { key: SortKey; label: string; align: "left" | "right" }[] = [
    { key: "name", label: "Entity", align: "left" },
    { key: "prevCount", label: `${previousYear} resp.`, align: "right" },
    { key: "currCount", label: `${currentYear} resp.`, align: "right" },
    { key: "currTop2", label: `${currentYear} top-2`, align: "right" },
    { key: "delta", label: "Δ top-2 box", align: "right" },
  ];

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search entities…"
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
            </tr>
          </thead>
          <tbody className="divide-y divide-glass-border">
            {sorted.map((r) => {
              const delta = r.deltaPctTop2Box;
              const deltaColor =
                Math.abs(delta) < 0.05
                  ? "text-fg-muted"
                  : delta > 0
                    ? "text-positive"
                    : "text-negative";
              return (
                <tr key={r.entityId} className="text-fg-secondary transition hover:bg-glass/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/entities/${r.slug}`}
                      className="font-medium text-fg hover:text-accent"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="num px-4 py-3 text-right text-fg-muted">
                    {formatNumber(r.prev.responseCount)}
                  </td>
                  <td className="num px-4 py-3 text-right">{formatNumber(r.curr.responseCount)}</td>
                  <td className="num px-4 py-3 text-right font-semibold text-fg">
                    {r.curr.responseCount > 0 ? formatPercent(r.curr.pctTop2Box, 1) : "—"}
                  </td>
                  <td className={cn("num px-4 py-3 text-right font-semibold", deltaColor)}>
                    {r.curr.responseCount > 0 && r.prev.responseCount > 0
                      ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)} pts`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
