import {
  Activity,
  Building2,
  CheckCircle2,
  Gauge,
  MessageSquareHeart,
  Users,
} from "lucide-react";
import type { SearchParams } from "nuqs/server";

import { TrendArea } from "@/components/charts/trend-area";
import { SentimentDonut } from "@/components/charts/sentiment-donut";
import { ComplianceStatCard } from "@/components/exec/compliance-stat";
import { AlertStrip } from "@/components/exec/alert-strip";
import { RankingList } from "@/components/exec/ranking-list";
import { FilterBarLoader } from "@/components/filters/filter-bar-loader";
import { GlassSection } from "@/components/glass/glass-section";
import { KpiCard } from "@/components/kpi/kpi-card";
import { Topbar } from "@/components/layout/topbar";
import { filterCache, toSurveyFilters } from "@/lib/filters/parsers";
import {
  getComplianceStats,
  getEntityRanking,
  getKpiSummary,
  getMonthlyTrend,
  getSentimentBreakdown,
  getYoyDelta,
} from "@/lib/queries/executive";
import { formatNumber, formatRange } from "@/lib/ui/format";
import { shortMonthLabel } from "@/lib/ui/month-label";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ExecutivePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parsed = await filterCache.parse(searchParams);
  const filters = toSurveyFilters(parsed);

  const [summary, monthly, sentiment, compliance, topEntities, bottomEntities, yoy] =
    await Promise.all([
      getKpiSummary(filters),
      getMonthlyTrend(filters),
      getSentimentBreakdown(filters),
      getComplianceStats(filters),
      getEntityRanking(filters, { limit: 5, order: "best" }),
      getEntityRanking(filters, { limit: 5, order: "worst" }),
      getYoyDelta(filters),
    ]);

  const trendData = monthly.map((m) => ({
    label: shortMonthLabel(m.period),
    pctTop2Box: m.pctTop2Box,
    responseCount: m.responseCount,
  }));

  const donutData = sentiment.map((s) => ({
    sentiment: s.sentiment,
    label: s.labelEn,
    count: s.count,
    pct: s.pct,
  }));

  return (
    <>
      <Topbar
        title="Executive Summary"
        subtitle={`Customer satisfaction across ${summary.uniqueEntities} entities · ${formatRange(
          summary.firstResponse,
          summary.lastResponse,
        )}`}
        filters={<FilterBarLoader />}
      />
      <div className="space-y-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Total responses"
            value={summary.totalResponses}
            icon={Activity}
            hint={`${summary.uniqueEntities} entities · ${summary.uniqueTeams} teams`}
            accent="violet"
          />
          <KpiCard
            label="Average CSAT"
            value={summary.avgScore}
            fractionDigits={2}
            suffix="/ 5"
            icon={Gauge}
            accent="emerald"
            delta={{
              value: summary.avgScore - yoy.previous.avgScore,
              fractionDigits: 2,
              label: "2025",
            }}
          />
          <KpiCard
            label="Top-2 box %"
            value={summary.pctTop2Box}
            fractionDigits={1}
            suffix="%"
            icon={CheckCircle2}
            accent="emerald"
            delta={{
              value: summary.pctTop2Box - yoy.previous.pctTop2Box,
              fractionDigits: 1,
              suffix: "pts",
              label: "2025",
            }}
          />
          <KpiCard
            label="Detractor %"
            value={summary.pctDetractor}
            fractionDigits={1}
            suffix="%"
            icon={MessageSquareHeart}
            accent="rose"
            delta={{
              value: summary.pctDetractor - yoy.previous.pctDetractor,
              fractionDigits: 1,
              suffix: "pts",
              label: "2025",
              invert: true,
            }}
          />
          <KpiCard
            label="Compliant entities"
            value={compliance.green}
            suffix={`/ ${compliance.total}`}
            icon={Building2}
            accent="amber"
            hint={`${compliance.amber} watch · ${compliance.red} below`}
          />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ComplianceStatCard status="green" count={compliance.green} total={compliance.total} />
          <ComplianceStatCard status="amber" count={compliance.amber} total={compliance.total} />
          <ComplianceStatCard status="red" count={compliance.red} total={compliance.total} />
          <ComplianceStatCard
            status="insufficient_data"
            count={compliance.insufficient}
            total={compliance.total}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <GlassSection
            className="lg:col-span-2"
            title="Monthly trend"
            description="Top-2 box satisfaction & response volume by month"
          >
            <TrendArea data={trendData} />
          </GlassSection>
          <GlassSection
            title="Sentiment breakdown"
            description={`${formatNumber(summary.totalResponses)} responses`}
            actions={
              <span className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-3 py-1 text-[11px] text-fg-muted">
                <Users className="h-3 w-3" />
                EN + AR
              </span>
            }
          >
            <SentimentDonut data={donutData} />
          </GlassSection>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <GlassSection
            title="Top performers"
            description={`Best top-2 box % among entities with ≥${compliance.total > 0 ? 10 : 0} responses`}
          >
            <RankingList
              entities={topEntities}
              emptyLabel="No graded entities for the selected filters."
            />
          </GlassSection>
          <GlassSection
            title="Underperformers"
            description="Lowest top-2 box % among graded entities"
          >
            <RankingList
              entities={bottomEntities}
              emptyLabel="No graded entities for the selected filters."
            />
          </GlassSection>
        </section>

        <section>
          <AlertStrip entities={compliance.alertEntities} />
        </section>
      </div>
    </>
  );
}
