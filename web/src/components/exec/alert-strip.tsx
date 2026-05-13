import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { GlassSection } from "@/components/glass/glass-section";
import { StatusPill } from "@/components/glass/status-pill";
import type { EntityScore } from "@/lib/queries/executive";
import { formatNumber, formatPercent } from "@/lib/ui/format";

export function AlertStrip({ entities }: { entities: EntityScore[] }) {
  if (entities.length === 0) {
    return (
      <GlassSection
        title="Compliance alerts"
        description="No entities below the target. Nice."
      >
        <div className="rounded-xl border border-positive/30 bg-positive-soft/40 p-4 text-sm text-positive">
          All graded entities are meeting target satisfaction.
        </div>
      </GlassSection>
    );
  }
  return (
    <GlassSection
      title="Compliance alerts"
      description={`Top ${entities.length} entities not meeting target satisfaction.`}
      actions={
        <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning-soft px-3 py-1 text-xs text-warning">
          <AlertTriangle className="h-3.5 w-3.5" />
          Action required
        </span>
      }
    >
      <ul className="divide-y divide-glass-border">
        {entities.map((e) => (
          <li key={e.entityId} className="flex items-center gap-3 py-2 text-sm">
            <StatusPill status={e.status} />
            <Link
              href={`/entities/${e.slug}`}
              className="flex-1 truncate text-fg hover:text-accent"
            >
              {e.name}
            </Link>
            <span className="num text-fg-muted">{formatNumber(e.responseCount)} resp</span>
            <span className="num w-16 text-right font-semibold text-fg">
              {formatPercent(e.pctTop2Box, 1)}
            </span>
          </li>
        ))}
      </ul>
    </GlassSection>
  );
}
