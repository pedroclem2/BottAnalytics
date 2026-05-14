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
import { ResponsesTable } from "@/components/tables/responses-table";
import { filterCache, toSurveyFilters } from "@/lib/filters/parsers";
import { getComplianceConfig } from "@/lib/queries/config";
import {
  getAgentLeaderboardForEntity,
  getEntityBySlug,
  getEntityDailyTrend,
  getEntityQuestionBreakdown,
  getEntityResponses,
  getEntityTeamBreakdown,
} from "@/lib/queries/entities";
import { getKpiSummary } from "@/lib/queries/executive";
import { formatPercent } from "@/lib/ui/format";

const PAGE_SIZE = 20;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EntityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ slug }, rawSearch] = await Promise.all([params, searchParams]);
  const entity = await getEntityBySlug(slug);
  if (!entity) notFound();

  const parsed = await filterCache.parse(rawSearch);
  const baseFilters = toSurveyFilters(parsed);
  const filters = { ...baseFilters, entitySlugs: [entity.slug] };

  const pageStr = typeof rawSearch.page === "string" ? rawSearch.page : Array.isArray(rawSearch.page) ? rawSearch.page[0] : undefined;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);

  const [summary, daily, teams, bestAgents, worstAgents, questions, responses, config] =
    await Promise.all([
      getKpiSummary(filters),
      getEntityDailyTrend(entity.entityId, baseFilters),
      getEntityTeamBreakdown(entity.entityId, baseFilters),
      getAgentLeaderboardForEntity(entity.entityId, baseFilters, { limit: 5, order: "best" }),
      getAgentLeaderboardForEntity(entity.entityId, baseFilters, { limit: 5, order: "worst" }),
      getEntityQuestionBreakdown(entity.entityId, baseFilters),
      getEntityResponses(entity.entityId, baseFilters, {
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
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

  const teamsBar = teams.slice(0, 10).map((t) => ({
    label: t.name.length > 24 ? t.name.slice(0, 24) + "…" : t.name,
    value: t.pctTop2Box,
    color: "#8b5cf6",
  }));

  const currentSearchEntries: [string, string][] = [];
  for (const [k, v] of Object.entries(rawSearch)) {
    if (k === "page") continue;
    if (typeof v === "string") currentSearchEntries.push([k, v]);
    else if (Array.isArray(v)) v.forEach((vv) => currentSearchEntries.push([k, vv]));
  }
  const currentSearchParams = Object.fromEntries(currentSearchEntries);

  return (
    <>
      <Topbar
        title={entity.name}
        subtitle={
          <span className="inline-flex items-center gap-2 text-sm text-fg-muted">
            <Link
              href="/entities"
              className="inline-flex items-center gap-1 text-fg-secondary hover:text-fg"
            >
              <ArrowLeft className="h-3 w-3" />
              All entities
            </Link>
            <span className="text-fg-muted">·</span>
            <StatusPill status={status} />
            <span className="text-fg-muted">
              Target {formatPercent(config.targetTop2BoxPct, 0)}
            </span>
          </span>
        }
        filters={<FilterBarLoader />}
      />

      <div className="space-y-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Responses"
            value={summary.totalResponses}
            icon={Activity}
            accent="violet"
            hint={`${summary.uniqueTeams} teams contributing`}
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

        <GlassSection
          title="Daily trend"
          description="Top-2 box satisfaction and response volume per day"
        >
          {trendData.length > 1 ? (
            <TrendArea data={trendData} />
          ) : (
            <p className="text-xs text-fg-muted">Not enough data points to draw a trend.</p>
          )}
        </GlassSection>

        <section className="grid gap-4 lg:grid-cols-3">
          <GlassSection
            className="lg:col-span-2"
            title="Team breakdown"
            description="Top-2 box satisfaction per resolving assignment group (top 10)"
            actions={
              <span className="inline-flex items-center gap-1 rounded-full border border-glass-border bg-glass px-3 py-1 text-[11px] text-fg-muted">
                <Building2 className="h-3 w-3" />
                {teams.length} teams
              </span>
            }
          >
            {teamsBar.length > 0 ? (
              <HorizontalBar data={teamsBar} height={Math.max(220, teamsBar.length * 28)} />
            ) : (
              <p className="text-xs text-fg-muted">No team data available.</p>
            )}
          </GlassSection>
          <GlassSection
            title="Question split"
            description="Score per question kind"
          >
            <ul className="divide-y divide-glass-border">
              {questions.map((q) => (
                <li key={q.questionId} className="space-y-1 py-2">
                  <p className="text-xs text-fg-muted">{q.text}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="num font-semibold text-fg">{q.avgScore.toFixed(2)}</span>
                    <span className="text-fg-muted">·</span>
                    <span className="num text-positive">{formatPercent(q.pctTop2Box, 1)}</span>
                    <span className="text-fg-muted">·</span>
                    <span className="num text-fg-muted">{q.responseCount.toLocaleString()} resp</span>
                  </div>
                </li>
              ))}
            </ul>
          </GlassSection>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Leaderboard
            title="Happy end users"
            description="Highest top-2 box % (min. 5 responses)"
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
            description="Lowest top-2 box % (min. 5 responses)"
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
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-fg">Raw responses</h2>
              <p className="text-sm text-fg-muted">Every response that matches the active filters</p>
            </div>
          </div>
          <ResponsesTable
            rows={responses.rows}
            total={responses.total}
            page={page}
            pageSize={PAGE_SIZE}
            basePath={`/entities/${entity.slug}`}
            currentSearchParams={currentSearchParams}
          />
        </section>
      </div>
    </>
  );
}
