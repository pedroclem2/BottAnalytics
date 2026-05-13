import "server-only";

import { sql } from "@/lib/db/client";
import type { ComplianceStatus, SurveyFilters } from "@/lib/filters/types";

import { getComplianceConfig } from "./config";
import { whereClause } from "./where";

export interface TeamListRow {
  teamId: number;
  name: string;
  slug: string;
  parentL1: string | null;
  parentL2: string | null;
  responseCount: number;
  avgScore: number;
  pctTop2Box: number;
  status: ComplianceStatus;
  sparkline: { period: string; pctTop2Box: number }[];
}

export async function listTeamsWithStats(filters: SurveyFilters): Promise<TeamListRow[]> {
  const where = whereClause(filters);
  const config = await getComplianceConfig();

  const rows = await sql<
    {
      team_id: number;
      name: string;
      slug: string;
      parent_l1: string | null;
      parent_l2: string | null;
      response_count: string;
      avg_score: string;
      pct_top2_box: string;
    }[]
  >`
    SELECT
      f.team_id,
      t.name,
      t.slug,
      t.parent_group_l1 AS parent_l1,
      t.parent_group_l2 AS parent_l2,
      COUNT(*)          AS response_count,
      AVG(f.scaled_value) AS avg_score,
      100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1.0 ELSE 0.0 END) AS pct_top2_box
    FROM csat.fact_response f
    JOIN csat.dim_entity e ON e.id = f.entity_id
    JOIN csat.dim_team   t ON t.id = f.team_id
    ${where}
    GROUP BY f.team_id, t.name, t.slug, t.parent_group_l1, t.parent_group_l2
    ORDER BY response_count DESC
  `;

  const sparkRows = await sql<
    { team_id: number; period: Date; pct_top2_box: string }[]
  >`
    SELECT
      f.team_id,
      DATE_TRUNC('month', f.created_at)::DATE AS period,
      100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1.0 ELSE 0.0 END) AS pct_top2_box
    FROM csat.fact_response f
    JOIN csat.dim_entity e ON e.id = f.entity_id
    JOIN csat.dim_team   t ON t.id = f.team_id
    ${where}
    GROUP BY f.team_id, DATE_TRUNC('month', f.created_at)
    ORDER BY f.team_id, period
  `;

  const sparksByTeam = new Map<number, { period: string; pctTop2Box: number }[]>();
  for (const r of sparkRows) {
    const arr = sparksByTeam.get(r.team_id) ?? [];
    arr.push({ period: r.period.toISOString().slice(0, 10), pctTop2Box: Number(r.pct_top2_box) });
    sparksByTeam.set(r.team_id, arr);
  }

  return rows.map((r) => {
    const responseCount = Number(r.response_count);
    const pctTop2Box = Number(r.pct_top2_box);
    let status: ComplianceStatus;
    if (responseCount < config.minResponsesForGrading) status = "insufficient_data";
    else if (pctTop2Box >= config.targetTop2BoxPct) status = "green";
    else if (pctTop2Box >= config.targetTop2BoxPct - config.amberBandPts) status = "amber";
    else status = "red";

    return {
      teamId: r.team_id,
      name: r.name,
      slug: r.slug,
      parentL1: r.parent_l1,
      parentL2: r.parent_l2,
      responseCount,
      avgScore: Number(r.avg_score),
      pctTop2Box,
      status,
      sparkline: sparksByTeam.get(r.team_id) ?? [],
    };
  });
}

export interface TeamHeader {
  teamId: number;
  name: string;
  slug: string;
  parentL1: string | null;
  parentL2: string | null;
}

export async function getTeamBySlug(slug: string): Promise<TeamHeader | null> {
  const rows = await sql<
    {
      id: number;
      name: string;
      slug: string;
      parent_group_l1: string | null;
      parent_group_l2: string | null;
    }[]
  >`
    SELECT id, name, slug, parent_group_l1, parent_group_l2
    FROM csat.dim_team
    WHERE slug = ${slug}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    teamId: r.id,
    name: r.name,
    slug: r.slug,
    parentL1: r.parent_group_l1,
    parentL2: r.parent_group_l2,
  };
}

export interface TeamAgentRow {
  agentId: number;
  name: string;
  email: string | null;
  responseCount: number;
  avgScore: number;
  pctTop2Box: number;
}

export async function getTeamAgentLeaderboard(
  teamId: number,
  filters: SurveyFilters,
  options: { limit: number; order: "best" | "worst" },
): Promise<TeamAgentRow[]> {
  const where = whereClause({ ...filters, teamSlugs: [] });
  const rows = await sql<
    {
      agent_id: number;
      name: string | null;
      email: string | null;
      response_count: string;
      avg_score: string;
      pct_top2_box: string;
    }[]
  >`
    SELECT
      a.id AS agent_id,
      a.name,
      a.email,
      COUNT(*) AS response_count,
      AVG(f.scaled_value) AS avg_score,
      100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1.0 ELSE 0.0 END) AS pct_top2_box
    FROM csat.fact_response f
    JOIN csat.dim_entity e ON e.id = f.entity_id
    JOIN csat.dim_team   t ON t.id = f.team_id
    JOIN csat.dim_agent  a ON a.id = f.agent_id
    ${where}
    AND f.team_id = ${teamId}
    GROUP BY a.id, a.name, a.email
    HAVING COUNT(*) >= 3
    ORDER BY ${options.order === "best" ? sql`pct_top2_box DESC` : sql`pct_top2_box ASC`},
             response_count DESC
    LIMIT ${options.limit}
  `;
  return rows.map((r) => ({
    agentId: r.agent_id,
    name: r.name ?? "Unknown",
    email: r.email,
    responseCount: Number(r.response_count),
    avgScore: Number(r.avg_score),
    pctTop2Box: Number(r.pct_top2_box),
  }));
}

export interface TeamEntityBreakdownRow {
  entityId: number;
  name: string;
  slug: string;
  responseCount: number;
  avgScore: number;
  pctTop2Box: number;
}

export async function getTeamEntityBreakdown(
  teamId: number,
  filters: SurveyFilters,
): Promise<TeamEntityBreakdownRow[]> {
  const where = whereClause({ ...filters, teamSlugs: [] });
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
      e.name_en AS name,
      e.slug,
      COUNT(*) AS response_count,
      AVG(f.scaled_value) AS avg_score,
      100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1.0 ELSE 0.0 END) AS pct_top2_box
    FROM csat.fact_response f
    JOIN csat.dim_entity e ON e.id = f.entity_id
    JOIN csat.dim_team   t ON t.id = f.team_id
    ${where}
    AND f.team_id = ${teamId}
    GROUP BY f.entity_id, e.name_en, e.slug
    ORDER BY response_count DESC
    LIMIT 20
  `;
  return rows.map((r) => ({
    entityId: r.entity_id,
    name: r.name,
    slug: r.slug,
    responseCount: Number(r.response_count),
    avgScore: Number(r.avg_score),
    pctTop2Box: Number(r.pct_top2_box),
  }));
}

export interface TeamDailyPoint {
  date: string;
  responseCount: number;
  avgScore: number;
  pctTop2Box: number;
}

export async function getTeamDailyTrend(
  teamId: number,
  filters: SurveyFilters,
): Promise<TeamDailyPoint[]> {
  const where = whereClause({ ...filters, teamSlugs: [] });
  const rows = await sql<
    { date: Date; response_count: string; avg_score: string; pct_top2_box: string }[]
  >`
    SELECT
      DATE_TRUNC('day', f.created_at)::DATE AS date,
      COUNT(*)                              AS response_count,
      AVG(f.scaled_value)                   AS avg_score,
      100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1.0 ELSE 0.0 END) AS pct_top2_box
    FROM csat.fact_response f
    JOIN csat.dim_entity e ON e.id = f.entity_id
    JOIN csat.dim_team   t ON t.id = f.team_id
    ${where}
    AND f.team_id = ${teamId}
    GROUP BY DATE_TRUNC('day', f.created_at)
    ORDER BY date
  `;
  return rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    responseCount: Number(r.response_count),
    avgScore: Number(r.avg_score),
    pctTop2Box: Number(r.pct_top2_box),
  }));
}
