import "server-only";

import { sql } from "@/lib/db/client";

export interface YearAggregate {
  responseCount: number;
  avgScore: number;
  pctTop2Box: number;
  pctSatisfied: number;
  pctDetractor: number;
}

export interface EntityYoyRow {
  entityId: number;
  name: string;
  slug: string;
  prev: YearAggregate;
  curr: YearAggregate;
  deltaPctTop2Box: number;
  deltaResponseCount: number;
}

export async function getEntityYoy(
  previousYear: number,
  currentYear: number,
): Promise<EntityYoyRow[]> {
  const rows = await sql<
    {
      entity_id: number;
      name: string;
      slug: string;
      prev_count: string | null;
      prev_avg: string | null;
      prev_top2: string | null;
      prev_sat: string | null;
      prev_det: string | null;
      curr_count: string | null;
      curr_avg: string | null;
      curr_top2: string | null;
      curr_sat: string | null;
      curr_det: string | null;
    }[]
  >`
    WITH prev AS (
      SELECT entity_id, response_count, avg_score, pct_top2_box, pct_satisfied, pct_detractor
      FROM csat.mv_entity_overall WHERE year = ${previousYear}
    ),
    curr AS (
      SELECT entity_id, response_count, avg_score, pct_top2_box, pct_satisfied, pct_detractor
      FROM csat.mv_entity_overall WHERE year = ${currentYear}
    )
    SELECT
      e.id              AS entity_id,
      e.name_en         AS name,
      e.slug            AS slug,
      prev.response_count   AS prev_count,
      prev.avg_score        AS prev_avg,
      prev.pct_top2_box     AS prev_top2,
      prev.pct_satisfied    AS prev_sat,
      prev.pct_detractor    AS prev_det,
      curr.response_count   AS curr_count,
      curr.avg_score        AS curr_avg,
      curr.pct_top2_box     AS curr_top2,
      curr.pct_satisfied    AS curr_sat,
      curr.pct_detractor    AS curr_det
    FROM csat.dim_entity e
    LEFT JOIN prev ON prev.entity_id = e.id
    LEFT JOIN curr ON curr.entity_id = e.id
    WHERE prev.response_count IS NOT NULL OR curr.response_count IS NOT NULL
    ORDER BY COALESCE(curr.response_count, 0) DESC,
             COALESCE(prev.response_count, 0) DESC
  `;

  return rows.map((r) => {
    const prev: YearAggregate = {
      responseCount: Number(r.prev_count ?? 0),
      avgScore: Number(r.prev_avg ?? 0),
      pctTop2Box: Number(r.prev_top2 ?? 0),
      pctSatisfied: Number(r.prev_sat ?? 0),
      pctDetractor: Number(r.prev_det ?? 0),
    };
    const curr: YearAggregate = {
      responseCount: Number(r.curr_count ?? 0),
      avgScore: Number(r.curr_avg ?? 0),
      pctTop2Box: Number(r.curr_top2 ?? 0),
      pctSatisfied: Number(r.curr_sat ?? 0),
      pctDetractor: Number(r.curr_det ?? 0),
    };
    return {
      entityId: r.entity_id,
      name: r.name,
      slug: r.slug,
      prev,
      curr,
      deltaPctTop2Box: curr.pctTop2Box - prev.pctTop2Box,
      deltaResponseCount: curr.responseCount - prev.responseCount,
    };
  });
}

export interface MonthlyComparePoint {
  month: number;
  monthLabel: string;
  previousYear: number;
  currentYear: number;
  prevCount: number;
  prevPctTop2Box: number;
  currCount: number;
  currPctTop2Box: number;
}

export async function getMonthlyCompare(
  previousYear: number,
  currentYear: number,
): Promise<MonthlyComparePoint[]> {
  const rows = await sql<
    {
      month: number;
      prev_count: string | null;
      prev_top2: string | null;
      curr_count: string | null;
      curr_top2: string | null;
    }[]
  >`
    WITH all_months AS (SELECT generate_series(1, 12) AS month),
    prev AS (
      SELECT month,
             SUM(response_count) AS response_count,
             SUM(response_count * pct_top2_box) / NULLIF(SUM(response_count), 0) AS pct_top2_box
      FROM csat.mv_entity_monthly
      WHERE year = ${previousYear}
      GROUP BY month
    ),
    curr AS (
      SELECT month,
             SUM(response_count) AS response_count,
             SUM(response_count * pct_top2_box) / NULLIF(SUM(response_count), 0) AS pct_top2_box
      FROM csat.mv_entity_monthly
      WHERE year = ${currentYear}
      GROUP BY month
    )
    SELECT
      m.month,
      prev.response_count AS prev_count,
      prev.pct_top2_box   AS prev_top2,
      curr.response_count AS curr_count,
      curr.pct_top2_box   AS curr_top2
    FROM all_months m
    LEFT JOIN prev ON prev.month = m.month
    LEFT JOIN curr ON curr.month = m.month
    ORDER BY m.month
  `;

  const monthLabels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return rows.map((r) => ({
    month: r.month,
    monthLabel: monthLabels[r.month - 1],
    previousYear,
    currentYear,
    prevCount: Number(r.prev_count ?? 0),
    prevPctTop2Box: Number(r.prev_top2 ?? 0),
    currCount: Number(r.curr_count ?? 0),
    currPctTop2Box: Number(r.curr_top2 ?? 0),
  }));
}
