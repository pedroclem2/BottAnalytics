import {
  Activity,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Gauge,
  MessageSquareHeart,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SearchParams } from "nuqs/server";

import { SentimentStackBar } from "@/components/charts/sentiment-stack-bar";
import {
  SentimentTreemap,
  type TreemapBranch,
  type TreemapLeaf,
} from "@/components/charts/sentiment-treemap";
import { TrendArea } from "@/components/charts/trend-area";
import { GlassSection } from "@/components/glass/glass-section";
import { StatusPill } from "@/components/glass/status-pill";
import { KpiCard } from "@/components/kpi/kpi-card";
import { Topbar } from "@/components/layout/topbar";
import { ResponsesTable } from "@/components/tables/responses-table";
import { UserDeltaTable } from "@/components/tables/user-delta-table";
import { getComplianceConfig } from "@/lib/queries/config";
import {
  getServiceAreaTreemap,
  getUserById,
  getUserDailyResponses,
  getUserDeltaPerTeam,
  getUserKpi,
  getUserResponses,
  getUserTeamSentimentMix,
} from "@/lib/queries/users";
import { listTeams } from "@/lib/queries/dimensions";
import { formatNumber, formatPercent } from "@/lib/ui/format";

const PAGE_SIZE = 20;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EndUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId)) notFound();

  const rawSearch = await searchParams;
  const pageStr =
    typeof rawSearch.page === "string"
      ? rawSearch.page
      : Array.isArray(rawSearch.page)
        ? rawSearch.page[0]
        : undefined;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);

  const user = await getUserById(numericId);
  if (!user || user.responseCount === 0) notFound();

  const [kpi, treemap, sentimentMix, deltas, daily, responses, config, teams] =
    await Promise.all([
      getUserKpi(user.userId, user.entityId),
      getServiceAreaTreemap({ kind: "user", userId: user.userId }),
      getUserTeamSentimentMix(user.userId),
      getUserDeltaPerTeam(user.userId),
      getUserDailyResponses(user.userId),
      getUserResponses(user.userId, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
      getComplianceConfig(),
      listTeams(),
    ]);

  const teamSlugById = new Map(teams.map((t) => [t.id, t.slug] as const));

  const treemapData: TreemapBranch[] = treemap.map((branch) => ({
    name: branch.name,
    size: branch.size,
    avgScore: branch.avgScore,
    pctTop2Box: branch.pctTop2Box,
    status: branch.status,
    children: branch.children.map<TreemapLeaf>((c) => ({
      name: c.name,
      size: c.size,
      avgScore: c.avgScore,
      pctTop2Box: c.pctTop2Box,
      status: c.status,
      parentName: branch.name,
    })),
  }));

  const stackData = sentimentMix.map((m) => ({
    label: m.name,
    veryDissatisfied: m.veryDissatisfied,
    dissatisfied: m.dissatisfied,
    neutral: m.neutral,
    satisfied: m.satisfied,
    verySatisfied: m.verySatisfied,
  }));

  const trendData = daily.map((d) => ({
    label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    pctTop2Box: d.pctTop2Box,
    responseCount: d.responseCount,
  }));

  const compatResponses = responses.rows.map((r) => ({
    instanceId: r.instanceId,
    createdAt: r.createdAt,
    agentId: null,
    agentName: null,
    teamName: r.teamName,
    questionText: r.questionText,
    scaled: r.scaled,
    labelText: r.labelText,
    language: r.language,
    sentiment: r.sentiment,
  }));

  const backHref = (user.entitySlug ? `/entities/${user.entitySlug}` : "/entities") as never;
  const headlineMetric = kpi.deltaPctTop2Box;
  const headline =
    headlineMetric == null
      ? "No entity baseline to compare against."
      : headlineMetric >= 5
        ? `${headlineMetric.toFixed(1)} pts above the rest of ${user.entityName}.`
        : headlineMetric <= -5
          ? `${headlineMetric.toFixed(1)} pts below the rest of ${user.entityName}.`
          : `Within ${Math.abs(headlineMetric).toFixed(1)} pts of the rest of ${user.entityName}.`;

  return (
    <>
      <Topbar
        title={`End user · ${user.name}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-fg-secondary hover:text-fg"
            >
              <ArrowLeft className="h-3 w-3" />
              {user.entityName ?? "All entities"}
            </Link>
            {user.email ? (
              <>
                <span className="text-fg-muted">·</span>
                <span className="text-fg-muted">{user.email}</span>
              </>
            ) : null}
            <span className="text-fg-muted">·</span>
            <span className="text-fg-muted">(survey respondent)</span>
            <span className="text-fg-muted">·</span>
            <StatusPill status={kpi.status} />
            <span className="text-fg-muted">
              Target {formatPercent(config.targetTop2BoxPct, 0)}
            </span>
          </span>
        }
      />

      <div className="space-y-6 p-6">
        <p className="text-sm text-fg-secondary">{headline}</p>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Responses"
            value={kpi.responseCount}
            icon={Activity}
            accent="violet"
            hint={`${user.teamCount} teams · ${formatDateSpan(user.firstResponseAt, user.lastResponseAt)}`}
          />
          <KpiCard
            label="Avg CSAT"
            value={kpi.avgScore}
            fractionDigits={2}
            suffix="/ 5"
            icon={Gauge}
            accent="emerald"
            delta={
              kpi.deltaAvgScore == null
                ? undefined
                : {
                    value: kpi.deltaAvgScore,
                    fractionDigits: 2,
                    label: `${user.entityName ?? "entity"} avg`,
                  }
            }
          />
          <KpiCard
            label="Top-2 box %"
            value={kpi.pctTop2Box}
            fractionDigits={1}
            suffix="%"
            icon={CheckCircle2}
            accent="emerald"
            delta={
              kpi.deltaPctTop2Box == null
                ? undefined
                : {
                    value: kpi.deltaPctTop2Box,
                    fractionDigits: 1,
                    suffix: "pts",
                    label: `${user.entityName ?? "entity"} avg`,
                  }
            }
          />
          <KpiCard
            label="Detractor %"
            value={kpi.pctDetractor}
            fractionDigits={1}
            suffix="%"
            icon={MessageSquareHeart}
            accent="rose"
          />
        </section>

        <GlassSection
          title="Service-area sentiment"
          description="Which services this user touched, sized by interaction volume and coloured by their satisfaction with each."
          actions={
            <span className="inline-flex items-center gap-1 rounded-full border border-glass-border bg-glass px-3 py-1 text-[11px] text-fg-muted">
              <Building2 className="h-3 w-3" />
              {treemapData.length} service areas
            </span>
          }
        >
          <SentimentTreemap data={treemapData} />
        </GlassSection>

        <section className="grid gap-4 lg:grid-cols-2">
          <GlassSection
            title="Team interaction mix"
            description="How this user's scores break down per team. Long red segments = consistent dissatisfaction."
          >
            <SentimentStackBar data={stackData} />
          </GlassSection>

          <GlassSection
            title="Per-team delta vs baseline"
            description="User's avg compared to that team's avg from everyone else. Big negative deltas = real signal that this team underserved them."
            actions={
              <span className="inline-flex items-center gap-1 rounded-full border border-glass-border bg-glass px-3 py-1 text-[11px] text-fg-muted">
                <Users className="h-3 w-3" />
                {deltas.length} teams
              </span>
            }
            className="p-0"
          >
            <div className="px-6 pb-6">
              <UserDeltaTable rows={deltas} teamSlugs={teamSlugById} />
            </div>
          </GlassSection>
        </section>

        <GlassSection
          title="Score timeline"
          description="When this user submitted responses and how they trended."
        >
          {trendData.length > 1 ? (
            <TrendArea data={trendData} />
          ) : (
            <p className="text-xs text-fg-muted">
              Only {trendData.length} response logged — not enough to draw a trend.
            </p>
          )}
        </GlassSection>

        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-fg">Response log</h2>
              <p className="text-sm text-fg-muted">
                Every survey this end user filed — newest first.
              </p>
            </div>
          </div>
          <ResponsesTable
            rows={compatResponses}
            total={responses.total}
            page={page}
            pageSize={PAGE_SIZE}
            basePath={`/users/${user.userId}`}
            currentSearchParams={{}}
          />
        </section>
      </div>
    </>
  );
}

function formatDateSpan(start: Date | null, end: Date | null): string {
  if (!start || !end) return "—";
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  if (formatNumber(start.getTime()) === formatNumber(end.getTime())) return fmt(start);
  return `${fmt(start)} → ${fmt(end)}`;
}
