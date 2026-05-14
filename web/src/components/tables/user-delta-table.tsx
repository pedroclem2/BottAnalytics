import Link from "next/link";

import { GlassCard } from "@/components/glass/glass-card";
import type { UserDeltaRow } from "@/lib/queries/users";
import { cn } from "@/lib/ui/cn";
import { formatNumber, formatScore } from "@/lib/ui/format";

export function UserDeltaTable({
  rows,
  teamSlugs,
}: {
  rows: UserDeltaRow[];
  teamSlugs: Map<number, string>;
}) {
  if (rows.length === 0) {
    return (
      <p className="text-xs text-fg-muted">
        Need at least two interactions with the same team before deltas become meaningful.
      </p>
    );
  }
  return (
    <GlassCard className="overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="text-left text-[11px] uppercase tracking-wider text-fg-muted">
          <tr>
            <th className="px-4 py-2">Team</th>
            <th className="px-4 py-2 text-right">Interactions</th>
            <th className="px-4 py-2 text-right">User avg</th>
            <th className="px-4 py-2 text-right">Team baseline</th>
            <th className="px-4 py-2 text-right">Δ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-glass-border">
          {rows.map((r) => {
            const teamSlug = teamSlugs.get(r.teamId);
            const positive = r.delta > 0.001;
            const negative = r.delta < -0.001;
            return (
              <tr key={r.teamId} className="text-fg-secondary">
                <td className="px-4 py-2 text-fg">
                  {teamSlug ? (
                    <Link href={`/teams/${teamSlug}` as never} className="hover:text-accent">
                      {r.name}
                    </Link>
                  ) : (
                    r.name
                  )}
                </td>
                <td className="num px-4 py-2 text-right text-fg-muted">
                  {formatNumber(r.responseCount)}
                </td>
                <td className="num px-4 py-2 text-right">{formatScore(r.userAvg)}</td>
                <td className="num px-4 py-2 text-right text-fg-muted">
                  {formatScore(r.teamAvg)}
                </td>
                <td
                  className={cn(
                    "num px-4 py-2 text-right font-semibold",
                    positive && "text-positive",
                    negative && "text-negative",
                    !positive && !negative && "text-fg-muted",
                  )}
                >
                  {r.delta > 0 ? "+" : ""}
                  {r.delta.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </GlassCard>
  );
}
