import Link from "next/link";

import { StatusPill } from "@/components/glass/status-pill";
import type { EntityScore } from "@/lib/queries/executive";
import { formatNumber, formatPercent } from "@/lib/ui/format";

export function RankingList({
  entities,
  emptyLabel,
}: {
  entities: EntityScore[];
  emptyLabel: string;
}) {
  if (entities.length === 0) {
    return <div className="text-xs text-fg-muted">{emptyLabel}</div>;
  }
  return (
    <ul className="divide-y divide-glass-border">
      {entities.map((e, idx) => (
        <li key={e.entityId} className="flex items-center gap-3 py-2 text-sm">
          <span className="w-6 text-right text-xs font-medium text-fg-muted">
            {String(idx + 1).padStart(2, "0")}
          </span>
          <Link
            href={`/entities/${e.slug}`}
            className="flex-1 truncate text-fg hover:text-accent"
          >
            {e.name}
          </Link>
          <span className="num text-xs text-fg-muted">{formatNumber(e.responseCount)} resp</span>
          <StatusPill status={e.status} />
          <span className="num w-16 text-right font-semibold text-fg">
            {formatPercent(e.pctTop2Box, 1)}
          </span>
        </li>
      ))}
    </ul>
  );
}
