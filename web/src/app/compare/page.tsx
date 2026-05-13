import { Activity, CheckCircle2, Gauge, MessageSquareHeart } from "lucide-react";

import { GroupedBar } from "@/components/charts/grouped-bar";
import { GlassSection } from "@/components/glass/glass-section";
import { KpiCard } from "@/components/kpi/kpi-card";
import { Topbar } from "@/components/layout/topbar";
import { YoyTable } from "@/components/tables/yoy-table";
import { getEntityYoy, getMonthlyCompare } from "@/lib/queries/compare";
import { getKpiSummary } from "@/lib/queries/executive";
import { EMPTY_FILTERS } from "@/lib/filters/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PREV_YEAR = 2025;
const CURR_YEAR = 2026;

function yearFilters(year: number) {
  return {
    ...EMPTY_FILTERS,
    from: new Date(Date.UTC(year, 0, 1)),
    to: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

export default async function ComparePage() {
  const [prevSummary, currSummary, yoy, monthly] = await Promise.all([
    getKpiSummary(yearFilters(PREV_YEAR)),
    getKpiSummary(yearFilters(CURR_YEAR)),
    getEntityYoy(PREV_YEAR, CURR_YEAR),
    getMonthlyCompare(PREV_YEAR, CURR_YEAR),
  ]);

  const top2Series = monthly.map((m) => ({
    label: m.monthLabel,
    previous: Number(m.prevPctTop2Box.toFixed(2)),
    current: Number(m.currPctTop2Box.toFixed(2)),
  }));
  const volumeSeries = monthly.map((m) => ({
    label: m.monthLabel,
    previous: m.prevCount,
    current: m.currCount,
  }));

  return (
    <>
      <Topbar
        title="Year-over-Year"
        subtitle={`Comparing ${PREV_YEAR} vs ${CURR_YEAR} across every Abu Dhabi entity`}
      />

      <div className="space-y-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Responses"
            value={currSummary.totalResponses}
            icon={Activity}
            accent="violet"
            delta={{
              value: currSummary.totalResponses - prevSummary.totalResponses,
              label: `${PREV_YEAR}`,
              fractionDigits: 0,
            }}
          />
          <KpiCard
            label="Avg CSAT"
            value={currSummary.avgScore}
            fractionDigits={2}
            suffix="/ 5"
            icon={Gauge}
            accent="emerald"
            delta={{
              value: currSummary.avgScore - prevSummary.avgScore,
              fractionDigits: 2,
              label: `${PREV_YEAR}`,
            }}
          />
          <KpiCard
            label="Top-2 box %"
            value={currSummary.pctTop2Box}
            fractionDigits={1}
            suffix="%"
            icon={CheckCircle2}
            accent="emerald"
            delta={{
              value: currSummary.pctTop2Box - prevSummary.pctTop2Box,
              fractionDigits: 1,
              suffix: "pts",
              label: `${PREV_YEAR}`,
            }}
          />
          <KpiCard
            label="Detractor %"
            value={currSummary.pctDetractor}
            fractionDigits={1}
            suffix="%"
            icon={MessageSquareHeart}
            accent="rose"
            delta={{
              value: currSummary.pctDetractor - prevSummary.pctDetractor,
              fractionDigits: 1,
              suffix: "pts",
              label: `${PREV_YEAR}`,
              invert: true,
            }}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <GlassSection
            title="Top-2 box % by month"
            description={`${PREV_YEAR} vs ${CURR_YEAR}`}
          >
            <GroupedBar
              data={top2Series}
              previousLabel={`${PREV_YEAR}`}
              currentLabel={`${CURR_YEAR}`}
              valueType="percent"
              domain={[0, 100]}
            />
          </GlassSection>
          <GlassSection
            title="Response volume by month"
            description="How surveys per month compare year-on-year"
          >
            <GroupedBar
              data={volumeSeries}
              previousLabel={`${PREV_YEAR}`}
              currentLabel={`${CURR_YEAR}`}
              valueType="count"
            />
          </GlassSection>
        </section>

        <GlassSection
          title="Per-entity YoY"
          description={`Δ top-2 box ${CURR_YEAR} − ${PREV_YEAR} for every entity present in either year`}
        >
          <YoyTable rows={yoy} previousYear={PREV_YEAR} currentYear={CURR_YEAR} />
        </GlassSection>
      </div>
    </>
  );
}
