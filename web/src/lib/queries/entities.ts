import "server-only";

import { sql } from "@/lib/db/client";
import type { ComplianceStatus, SurveyFilters } from "@/lib/filters/types";

import { getComplianceConfig } from "./config";
import { whereClause } from "./where";

export interface EntityListRow {
  entityId: number;
  name: string;
  slug: string;
  responseCount: number;
  avgScore: number;
  pctTop2Box: number;
  status: ComplianceStatus;
  sparkline: { period: string; pctTop2Box: number }[];
}

export async function listEntitiesWithStats(filters: SurveyFilters): Promise<EntityListRow[]> {
  const where = whereClause(filters);
  const config = await getComplianceConfig();

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
    ORDER BY response_count DESC
  `;

  const sparkRows = await sql<
    { entity_id: number; period: Date; pct_top2_box: string }[]
  >`
    SELECT
      f.entity_id,
      DATE_TRUNC('month', f.created_at)::DATE AS period,
      100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1.0 ELSE 0.0 END) AS pct_top2_box
    FROM csat.fact_response f
    JOIN csat.dim_entity e ON e.id = f.entity_id
    JOIN csat.dim_team   t ON t.id = f.team_id
    ${where}
    GROUP BY f.entity_id, DATE_TRUNC('month', f.created_at)
    ORDER BY f.entity_id, period
  `;

  const sparksByEntity = new Map<number, { period: string; pctTop2Box: number }[]>();
  for (const r of sparkRows) {
    const arr = sparksByEntity.get(r.entity_id) ?? [];
    arr.push({ period: r.period.toISOString().slice(0, 10), pctTop2Box: Number(r.pct_top2_box) });
    sparksByEntity.set(r.entity_id, arr);
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
      entityId: r.entity_id,
      name: r.name,
      slug: r.slug,
      responseCount,
      avgScore: Number(r.avg_score),
      pctTop2Box,
      status,
      sparkline: sparksByEntity.get(r.entity_id) ?? [],
    };
  });
}

export interface EntityHeader {
  entityId: number;
  name: string;
  slug: string;
}

export async function getEntityBySlug(slug: string): Promise<EntityHeader | null> {
  const rows = await sql<{ id: number; name: string; slug: string }[]>`
    SELECT id, name_en AS name, slug
    FROM csat.dim_entity
    WHERE slug = ${slug}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return { entityId: rows[0].id, name: rows[0].name, slug: rows[0].slug };
}

export interface EntityDailyPoint {
  date: string;
  responseCount: number;
  avgScore: number;
  pctTop2Box: number;
}

export async function getEntityDailyTrend(
  entityId: number,
  filters: SurveyFilters,
): Promise<EntityDailyPoint[]> {
  const where = whereClause({ ...filters, entitySlugs: [] });
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
    AND f.entity_id = ${entityId}
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

export interface EntityTeamBreakdownRow {
  teamId: number;
  name: string;
  slug: string;
  responseCount: number;
  avgScore: number;
  pctTop2Box: number;
}

export async function getEntityTeamBreakdown(
  entityId: number,
  filters: SurveyFilters,
): Promise<EntityTeamBreakdownRow[]> {
  const where = whereClause({ ...filters, entitySlugs: [] });
  const rows = await sql<
    {
      team_id: number;
      name: string;
      slug: string;
      response_count: string;
      avg_score: string;
      pct_top2_box: string;
    }[]
  >`
    SELECT
      f.team_id,
      t.name,
      t.slug,
      COUNT(*) AS response_count,
      AVG(f.scaled_value) AS avg_score,
      100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1.0 ELSE 0.0 END) AS pct_top2_box
    FROM csat.fact_response f
    JOIN csat.dim_entity e ON e.id = f.entity_id
    JOIN csat.dim_team   t ON t.id = f.team_id
    ${where}
    AND f.entity_id = ${entityId}
    GROUP BY f.team_id, t.name, t.slug
    ORDER BY response_count DESC
    LIMIT 25
  `;
  return rows.map((r) => ({
    teamId: r.team_id,
    name: r.name,
    slug: r.slug,
    responseCount: Number(r.response_count),
    avgScore: Number(r.avg_score),
    pctTop2Box: Number(r.pct_top2_box),
  }));
}

export interface AgentLeaderboardRow {
  agentId: number;
  name: string;
  email: string | null;
  responseCount: number;
  avgScore: number;
  pctTop2Box: number;
}

export async function getAgentLeaderboardForEntity(
  entityId: number,
  filters: SurveyFilters,
  options: { limit: number; order: "best" | "worst" },
): Promise<AgentLeaderboardRow[]> {
  const where = whereClause({ ...filters, entitySlugs: [] });
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
    AND f.entity_id = ${entityId}
    GROUP BY a.id, a.name, a.email
    HAVING COUNT(*) >= 5
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

export interface QuestionBreakdown {
  questionId: number;
  text: string;
  kind: string;
  responseCount: number;
  avgScore: number;
  pctTop2Box: number;
}

export async function getEntityQuestionBreakdown(
  entityId: number,
  filters: SurveyFilters,
): Promise<QuestionBreakdown[]> {
  const where = whereClause({ ...filters, entitySlugs: [] });
  const rows = await sql<
    {
      question_id: number;
      text: string;
      kind: string;
      response_count: string;
      avg_score: string;
      pct_top2_box: string;
    }[]
  >`
    SELECT
      f.question_id,
      q.text,
      q.kind::text AS kind,
      COUNT(*) AS response_count,
      AVG(f.scaled_value) AS avg_score,
      100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1.0 ELSE 0.0 END) AS pct_top2_box
    FROM csat.fact_response f
    JOIN csat.dim_entity   e ON e.id = f.entity_id
    JOIN csat.dim_team     t ON t.id = f.team_id
    JOIN csat.dim_question q ON q.id = f.question_id
    ${where}
    AND f.entity_id = ${entityId}
    GROUP BY f.question_id, q.text, q.kind
    ORDER BY response_count DESC
  `;
  return rows.map((r) => ({
    questionId: r.question_id,
    text: r.text,
    kind: r.kind,
    responseCount: Number(r.response_count),
    avgScore: Number(r.avg_score),
    pctTop2Box: Number(r.pct_top2_box),
  }));
}

export interface ResponseRow {
  instanceId: string;
  createdAt: Date;
  agentName: string | null;
  teamName: string;
  questionText: string;
  scaled: number;
  labelText: string | null;
  language: string | null;
  sentiment: string;
}

export async function getEntityResponses(
  entityId: number,
  filters: SurveyFilters,
  options: { limit: number; offset: number },
): Promise<{ rows: ResponseRow[]; total: number }> {
  const where = whereClause({ ...filters, entitySlugs: [] });

  const totalRows = await sql<{ total: string }[]>`
    SELECT COUNT(*) AS total
    FROM csat.fact_response f
    JOIN csat.dim_entity e ON e.id = f.entity_id
    JOIN csat.dim_team   t ON t.id = f.team_id
    ${where}
    AND f.entity_id = ${entityId}
  `;

  const rows = await sql<
    {
      instance_id: string;
      created_at: Date;
      agent_name: string | null;
      team_name: string;
      question_text: string;
      scaled: number;
      label_text: string | null;
      language: string | null;
      sentiment: string;
    }[]
  >`
    SELECT
      f.instance_id,
      f.created_at,
      a.name              AS agent_name,
      t.name              AS team_name,
      q.text              AS question_text,
      f.scaled_value      AS scaled,
      f.label_text,
      f.language,
      f.sentiment::text   AS sentiment
    FROM csat.fact_response f
    JOIN csat.dim_entity   e ON e.id = f.entity_id
    JOIN csat.dim_team     t ON t.id = f.team_id
    LEFT JOIN csat.dim_agent a ON a.id = f.agent_id
    JOIN csat.dim_question q ON q.id = f.question_id
    ${where}
    AND f.entity_id = ${entityId}
    ORDER BY f.created_at DESC
    LIMIT ${options.limit} OFFSET ${options.offset}
  `;

  return {
    total: Number(totalRows[0].total),
    rows: rows.map((r) => ({
      instanceId: r.instance_id,
      createdAt: r.created_at,
      agentName: r.agent_name,
      teamName: r.team_name,
      questionText: r.question_text,
      scaled: r.scaled,
      labelText: r.label_text,
      language: r.language,
      sentiment: r.sentiment,
    })),
  };
}
