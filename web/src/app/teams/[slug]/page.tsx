import { Activity, ArrowLeft, Building2, CheckCircle2, Gauge, MessageSquareHeart } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SearchParams } from "nuqs/server";

import { HorizontalBar } from "@/components/charts/horizontal-bar";
import { TrendArea } from "@/components/charts/trend-area";
import { FilterBarLoader } from "@/components/filters/filter-bar-loader";
import { GlassSection } from "@/components/glass/glass-section";
import { StatusPill } from "@/components/glass/status-pill";
import { KpiCard } from "@/components/kpi/kpi-card";
import { Topbar } from "@/components/layout/topbar";
import { Leaderboard } from "@/components/tables/leaderboard";
import { filterCache, toSurveyFilters } from "@/lib/filters/parsers";
import { getComplianceConfig } from "@/lib/queries/config";
import { getKpiSummary } from "@/lib/queries/executive";
import {
  getTeamAgentLeaderboard,
  getTeamBySlug,
  getTeamDailyTrend,
  getTeamEntityBreakdown,
} from "@/lib/queries/teams";
import { formatPercent } from "@/lib/ui/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ slug }, rawSearch] = await Promise.all([params, searchParams]);
  const team = await getTeamBySlug(slug);
  if (!team) notFound();

  const parsed = await filterCache.parse(rawSearch);
  const baseFilters = toSurveyFilters(parsed);
  const filters = { ...baseFilters, teamSlugs: [team.slug] };

  const [summary, daily, entities, bestAgents, worstAgents, config] = await Promise.all([
    getKpiSummary(filters),
    getTeamDailyTrend(team.teamId, baseFilters),
    getTeamEntityBreakdown(team.teamId, baseFilters),
    getTeamAgentLeaderboard(team.teamId, baseFilters, { limit: 5, order: "best" }),
    getTeamAgentLeaderboard(team.teamId, baseFilters, { limit: 5, order: "worst" }),
    getComplianceConfig(),
  ]);

  let status: "green" | "amber" | "red" | "insufficient_data" = "insufficient_data";
  if (summary.totalResponses >= config.minResponsesForGrading) {
    if (summary.pctTop2Box >= config.targetTop2BoxPct) status = "green";
    else if (summary.pctTop2Box >= config.targetTop2BoxPct - config.amberBandPts) status = "amber";
    else status = "red";
  }

  const trendData = daily.map((d) => ({
    label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    pctTop2Box: d.pctTop2Box,
    responseCount: d.responseCount,
  }));

  const entitiesBar = entities.slice(0, 12).map((e) => ({
    label: e.name.length > 28 ? e.name.slice(0, 28) + "…" : e.name,
    value: e.pctTop2Box,
    color: "#34d399",
  }));

  return (
    <>
      <Topbar
        title={team.name}
        subtitle={
          <span className="inline-flex items-center gap-2 text-sm text-fg-muted">
            <Link
              href="/teams"
              className="inline-flex items-center gap-1 text-fg-secondary hover:text-fg"
            >
              <ArrowLeft className="h-3 w-3" />
              All teams
            </Link>
            <span className="text-fg-muted">·</span>
            <StatusPill status={status} />
            <span className="text-fg-muted">Target {formatPercent(config.targetTop2BoxPct, 0)}</span>
          </span>
        }
        filters={<FilterBarLoader />}
      />

      <div className="space-y-6 p-6">
        {(team.parentL1 || team.parentL2) && (
          <p className="text-xs text-fg-muted">
            {team.parentL1 ? <span>L1: {team.parentL1}</span> : null}
            {team.parentL2 ? <span> · L2: {team.parentL2}</span> : null}
          </p>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Responses"
            value={summary.totalResponses}
            icon={Activity}
            accent="violet"
            hint={`${summary.uniqueEntities} entities served`}
          />
          <KpiCard
            label="Avg CSAT"
            value={summary.avgScore}
            fractionDigits={2}
            suffix="/ 5"
            icon={Gauge}
            accent="emerald"
          />
          <KpiCard
            label="Top-2 box %"
            value={summary.pctTop2Box}
            fractionDigits={1}
            suffix="%"
            icon={CheckCircle2}
            accent="emerald"
          />
          <KpiCard
            label="Detractor %"
            value={summary.pctDetractor}
            fractionDigits={1}
            suffix="%"
            icon={MessageSquareHeart}
            accent="rose"
          />
        </section>

        <GlassSection title="Daily trend" description="Top-2 box satisfaction & response volume per day">
          {trendData.length > 1 ? (
            <TrendArea data={trendData} />
          ) : (
            <p className="text-xs text-fg-muted">Not enough data points to draw a trend.</p>
          )}
        </GlassSection>

        <section className="grid gap-4 lg:grid-cols-3">
          <GlassSection
            className="lg:col-span-2"
            title="Entities served"
            description="Top-2 box % per entity (top 12)"
            actions={
              <span className="inline-flex items-center gap-1 rounded-full border border-glass-border bg-glass px-3 py-1 text-[11px] text-fg-muted">
                <Building2 className="h-3 w-3" />
                {entities.length} entities
              </span>
            }
          >
            {entitiesBar.length > 0 ? (
              <HorizontalBar data={entitiesBar} height={Math.max(220, entitiesBar.length * 26)} />
            ) : (
              <p className="text-xs text-fg-muted">No entity data available.</p>
            )}
          </GlassSection>
          <div className="space-y-4">
            <Leaderboard
              title="Happy end users"
              description="Highest top-2 box %"
              variant="best"
              rows={bestAgents.map((a) => ({
                id: a.agentId,
                name: a.name,
                subtitle: a.email,
                responseCount: a.responseCount,
                pctTop2Box: a.pctTop2Box,
                avgScore: a.avgScore,
              }))}
            />
            <Leaderboard
              title="Unhappy end users"
              description="Lowest top-2 box %"
              variant="worst"
              rows={worstAgents.map((a) => ({
                id: a.agentId,
                name: a.name,
                subtitle: a.email,
                responseCount: a.responseCount,
                pctTop2Box: a.pctTop2Box,
                avgScore: a.avgScore,
              }))}
            />
          </div>
        </section>
      </div>
    </>
  );
}
