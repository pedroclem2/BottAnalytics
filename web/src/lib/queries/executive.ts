import "server-only";

import { sql } from "@/lib/db/client";
import type { ComplianceStatus, SurveyFilters } from "@/lib/filters/types";

import { getComplianceConfig } from "./config";
import { whereClause } from "./where";

export interface KpiSummary {
  totalResponses: number;
  avgScore: number;
  pctTop2Box: number;
  pctSatisfied: number;
  pctDetractor: number;
  uniqueEntities: number;
  uniqueTeams: number;
  firstResponse: Date | null;
  lastResponse: Date | null;
}

interface SummaryRow {
  total_responses: string;
  avg_score: string | null;
  pct_top2_box: string | null;
  pct_satisfied: string | null;
  pct_detractor: string | null;
  unique_entities: string;
  unique_teams: string;
  first_response: Date | null;
  last_response: Date | null;
}

export async function getKpiSummary(filters: SurveyFilters): Promise<KpiSummary> {
  const where = whereClause(filters);
  const rows = await sql<SummaryRow[]>`
    SELECT
      COUNT(*)                                                                AS total_responses,
      AVG(f.scaled_value)                                                     AS avg_score,
      100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1.0 ELSE 0.0 END)        AS pct_top2_box,
      100.0 * AVG(CASE WHEN f.scaled_value >= 3 THEN 1.0 ELSE 0.0 END)        AS pct_satisfied,
      100.0 * AVG(CASE WHEN f.scaled_value <= 2 THEN 1.0 ELSE 0.0 END)        AS pct_detractor,
      COUNT(DISTINCT f.entity_id)                                             AS unique_entities,
      COUNT(DISTINCT f.team_id)                                               AS unique_teams,
      MIN(f.created_at)                                                       AS first_response,
      MAX(f.created_at)                                                       AS last_response
    FROM csat.fact_response f
    JOIN csat.dim_entity e ON e.id = f.entity_id
    JOIN csat.dim_team   t ON t.id = f.team_id
    ${where}
  `;
  const row = rows[0];
  return {
    totalResponses: Number(row.total_responses),
    avgScore: Number(row.avg_score ?? 0),
    pctTop2Box: Number(row.pct_top2_box ?? 0),
    pctSatisfied: Number(row.pct_satisfied ?? 0),
    pctDetractor: Number(row.pct_detractor ?? 0),
    uniqueEntities: Number(row.unique_entities),
    uniqueTeams: Number(row.unique_teams),
    firstResponse: row.first_response,
    lastResponse: row.last_response,
  };
}

export interface MonthlyTrendPoint {
  period: string;
  year: number;
  month: number;
  responseCount: number;
  avgScore: number;
  pctTop2Box: number;
}

export async function getMonthlyTrend(filters: SurveyFilters): Promise<MonthlyTrendPoint[]> {
  const where = whereClause(filters);
  const rows = await sql<
    {
      period: Date;
      year: number;
      month: number;
      response_count: string;
      avg_score: string;
      pct_top2_box: string;
    }[]
  >`
    SELECT
      DATE_TRUNC('month', f.created_at)::DATE       AS period,
      f.year,
      f.month,
      COUNT(*)                                       AS response_count,
      AVG(f.scaled_value)                            AS avg_score,
      100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1.0 ELSE 0.0 END) AS pct_top2_box
    FROM csat.fact_response f
    JOIN csat.dim_entity e ON e.id = f.entity_id
    JOIN csat.dim_team   t ON t.id = f.team_id
    ${where}
    GROUP BY DATE_TRUNC('month', f.created_at), f.year, f.month
    ORDER BY period
  `;
  return rows.map((r) => ({
    period: r.period.toISOString().slice(0, 10),
    year: r.year,
    month: r.month,
    responseCount: Number(r.response_count),
    avgScore: Number(r.avg_score),
    pctTop2Box: Number(r.pct_top2_box),
  }));
}

export interface SentimentSlice {
  sentiment: string;
  scaled: number;
  labelEn: string;
  labelAr: string;
  count: number;
  pct: number;
}

export async function getSentimentBreakdown(filters: SurveyFilters): Promise<SentimentSlice[]> {
  const where = whereClause(filters);
  const rows = await sql<
    {
      sentiment: string;
      scaled: number;
      label_en: string;
      label_ar: string;
      count: string;
      pct: string;
    }[]
  >`
    WITH base AS (
      SELECT f.scaled_value, f.sentiment
      FROM csat.fact_response f
      JOIN csat.dim_entity e ON e.id = f.entity_id
      JOIN csat.dim_team   t ON t.id = f.team_id
      ${where}
    ),
    totals AS (SELECT COUNT(*)::numeric AS total FROM base)
    SELECT
      b.sentiment::text,
      s.scaled,
      s.label_en,
      s.label_ar,
      COUNT(*)                                AS count,
      100.0 * COUNT(*) / NULLIF(t.total, 0)   AS pct
    FROM base b
    JOIN csat.dim_score s ON s.scaled = b.scaled_value
    CROSS JOIN totals t
    GROUP BY b.sentiment, s.scaled, s.label_en, s.label_ar, t.total
    ORDER BY s.scaled DESC
  `;
  return rows.map((r) => ({
    sentiment: r.sentiment,
    scaled: r.scaled,
    labelEn: r.label_en,
    labelAr: r.label_ar,
    count: Number(r.count),
    pct: Number(r.pct ?? 0),
  }));
}

export interface EntityScore {
  entityId: number;
  name: string;
  slug: string;
  responseCount: number;
  avgScore: number;
  pctTop2Box: number;
  status: ComplianceStatus;
}

export async function getEntityRanking(
  filters: SurveyFilters,
  options: { limit: number; order: "best" | "worst" },
): Promise<EntityScore[]> {
  const config = await getComplianceConfig();
  const where = whereClause(filters);

  const rows = await sql<
    {
      entity_id: number;
      name: string;
      slug: string;
      response_count: string;
      avg_score: string;
      pct_top2_box: string;
    }[]
  >`
    SELECT
      f.entity_id,
      e.name_en  AS name,
      e.slug     AS slug,
      COUNT(*)   AS response_count,
      AVG(f.scaled_value) AS avg_score,
      100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1.0 ELSE 0.0 END) AS pct_top2_box
    FROM csat.fact_response f
    JOIN csat.dim_entity e ON e.id = f.entity_id
    JOIN csat.dim_team   t ON t.id = f.team_id
    ${where}
    GROUP BY f.entity_id, e.name_en, e.slug
    HAVING COUNT(*) >= ${config.minResponsesForGrading}
    ORDER BY ${options.order === "best" ? sql`pct_top2_box DESC` : sql`pct_top2_box ASC`},
             response_count DESC
    LIMIT ${options.limit}
  `;
  return rows.map((r) => ({
    entityId: r.entity_id,
    name: r.name,
    slug: r.slug,
    responseCount: Number(r.response_count),
    avgScore: Number(r.avg_score),
    pctTop2Box: Number(r.pct_top2_box),
    status: complianceFromPct(Number(r.pct_top2_box), Number(r.response_count), config),
  }));
}

export interface ComplianceStats {
  green: number;
  amber: number;
  red: number;
  insufficient: number;
  total: number;
  alertEntities: EntityScore[];
}

export async function getComplianceStats(filters: SurveyFilters): Promise<ComplianceStats> {
  const config = await getComplianceConfig();
  const where = whereClause(filters);

  const rows = await sql<
    {
      entity_id: number;
      name: string;
      slug: string;
      response_count: string;
      avg_score: string;
      pct_top2_box: string;
    }[]
  >`
    SELECT
      f.entity_id,
      e.name_en  AS name,
      e.slug     AS slug,
      COUNT(*)   AS response_count,
      AVG(f.scaled_value) AS avg_score,
      100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1.0 ELSE 0.0 END) AS pct_top2_box
    FROM csat.fact_response f
    JOIN csat.dim_entity e ON e.id = f.entity_id
    JOIN csat.dim_team   t ON t.id = f.team_id
    ${where}
    GROUP BY f.entity_id, e.name_en, e.slug
  `;

  const stats: ComplianceStats = {
    green: 0,
    amber: 0,
    red: 0,
    insufficient: 0,
    total: rows.length,
    alertEntities: [],
  };

  const alerts: EntityScore[] = [];

  for (const r of rows) {
    const pct = Number(r.pct_top2_box);
    const count = Number(r.response_count);
    const status = complianceFromPct(pct, count, config);
    const score: EntityScore = {
      entityId: r.entity_id,
      name: r.name,
      slug: r.slug,
      responseCount: count,
      avgScore: Number(r.avg_score),
      pctTop2Box: pct,
      status,
    };
    if (status === "green") stats.green += 1;
    else if (status === "amber") stats.amber += 1;
    else if (status === "red") stats.red += 1;
    else stats.insufficient += 1;
    if (status === "red" || status === "amber") {
      alerts.push(score);
    }
  }

  stats.alertEntities = alerts
    .sort((a, b) => a.pctTop2Box - b.pctTop2Box)
    .slice(0, 8);

  return stats;
}

export interface YoyDelta {
  current: KpiSummary;
  previous: KpiSummary;
}

export async function getYoyDelta(filters: SurveyFilters): Promise<YoyDelta> {
  const buildSubset = (year: number): SurveyFilters => ({
    ...filters,
    from: new Date(Date.UTC(year, 0, 1)),
    to: new Date(Date.UTC(year + 1, 0, 1)),
  });

  const current = await getKpiSummary(buildSubset(2026));
  const previous = await getKpiSummary(buildSubset(2025));
  return { current, previous };
}

function complianceFromPct(
  pct: number,
  responseCount: number,
  config: { targetTop2BoxPct: number; amberBandPts: number; minResponsesForGrading: number },
): ComplianceStatus {
  if (responseCount < config.minResponsesForGrading) return "insufficient_data";
  if (pct >= config.targetTop2BoxPct) return "green";
  if (pct >= config.targetTop2BoxPct - config.amberBandPts) return "amber";
  return "red";
}
