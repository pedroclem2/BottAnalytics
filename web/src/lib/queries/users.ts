import "server-only";

import { sql } from "@/lib/db/client";
import type { ComplianceStatus } from "@/lib/filters/types";

import { getComplianceConfig } from "./config";

export interface UserHeader {
  userId: number;
  name: string;
  email: string | null;
  responseCount: number;
  firstResponseAt: Date | null;
  lastResponseAt: Date | null;
  entityId: number | null;
  entityName: string | null;
  entitySlug: string | null;
  teamCount: number;
}

export async function getUserById(userId: number): Promise<UserHeader | null> {
  const rows = await sql<
    {
      id: number;
      name: string | null;
      email: string | null;
      response_count: string;
      first_response_at: Date | null;
      last_response_at: Date | null;
      entity_id: number | null;
      entity_name: string | null;
      entity_slug: string | null;
      team_count: string;
    }[]
  >`
    WITH agg AS (
      SELECT
        f.agent_id,
        COUNT(*)                            AS response_count,
        MIN(f.created_at)                   AS first_response_at,
        MAX(f.created_at)                   AS last_response_at,
        MODE() WITHIN GROUP (ORDER BY f.entity_id) AS entity_id,
        COUNT(DISTINCT f.team_id)           AS team_count
      FROM csat.fact_response f
      WHERE f.agent_id = ${userId}
      GROUP BY f.agent_id
    )
    SELECT
      a.id,
      a.name,
      a.email,
      COALESCE(agg.response_count, 0)     AS response_count,
      agg.first_response_at,
      agg.last_response_at,
      agg.entity_id,
      e.name_en                            AS entity_name,
      e.slug                               AS entity_slug,
      COALESCE(agg.team_count, 0)          AS team_count
    FROM csat.dim_agent a
    LEFT JOIN agg ON agg.agent_id = a.id
    LEFT JOIN csat.dim_entity e ON e.id = agg.entity_id
    WHERE a.id = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    userId: r.id,
    name: r.name ?? "Unknown end user",
    email: r.email,
    responseCount: Number(r.response_count),
    firstResponseAt: r.first_response_at,
    lastResponseAt: r.last_response_at,
    entityId: r.entity_id,
    entityName: r.entity_name,
    entitySlug: r.entity_slug,
    teamCount: Number(r.team_count),
  };
}

export interface UserKpi {
  responseCount: number;
  avgScore: number;
  pctTop2Box: number;
  pctSatisfied: number;
  pctDetractor: number;
  // Comparison vs the user's home entity baseline (excluding their own responses).
  entityAvgScore: number | null;
  entityPctTop2Box: number | null;
  deltaAvgScore: number | null;
  deltaPctTop2Box: number | null;
  status: ComplianceStatus;
}

export async function getUserKpi(userId: number, entityId: number | null): Promise<UserKpi> {
  const config = await getComplianceConfig();

  const userRows = await sql<
    {
      response_count: string;
      avg_score: string | null;
      pct_top2_box: string | null;
      pct_satisfied: string | null;
      pct_detractor: string | null;
    }[]
  >`
    SELECT
      COUNT(*)                                                              AS response_count,
      AVG(scaled_value)                                                     AS avg_score,
      100.0 * AVG(CASE WHEN scaled_value >= 4 THEN 1.0 ELSE 0.0 END)        AS pct_top2_box,
      100.0 * AVG(CASE WHEN scaled_value >= 3 THEN 1.0 ELSE 0.0 END)        AS pct_satisfied,
      100.0 * AVG(CASE WHEN scaled_value <= 2 THEN 1.0 ELSE 0.0 END)        AS pct_detractor
    FROM csat.fact_response
    WHERE agent_id = ${userId}
  `;
  const u = userRows[0];

  let entityAvgScore: number | null = null;
  let entityPctTop2Box: number | null = null;
  if (entityId != null) {
    const entityRows = await sql<{ avg_score: string | null; pct_top2_box: string | null }[]>`
      SELECT
        AVG(scaled_value)                                              AS avg_score,
        100.0 * AVG(CASE WHEN scaled_value >= 4 THEN 1.0 ELSE 0.0 END) AS pct_top2_box
      FROM csat.fact_response
      WHERE entity_id = ${entityId}
        AND agent_id IS DISTINCT FROM ${userId}
    `;
    entityAvgScore = entityRows[0].avg_score != null ? Number(entityRows[0].avg_score) : null;
    entityPctTop2Box =
      entityRows[0].pct_top2_box != null ? Number(entityRows[0].pct_top2_box) : null;
  }

  const responseCount = Number(u.response_count);
  const pctTop2Box = Number(u.pct_top2_box ?? 0);
  const avgScore = Number(u.avg_score ?? 0);

  let status: ComplianceStatus;
  if (responseCount < config.minResponsesForGrading) status = "insufficient_data";
  else if (pctTop2Box >= config.targetTop2BoxPct) status = "green";
  else if (pctTop2Box >= config.targetTop2BoxPct - config.amberBandPts) status = "amber";
  else status = "red";

  return {
    responseCount,
    avgScore,
    pctTop2Box,
    pctSatisfied: Number(u.pct_satisfied ?? 0),
    pctDetractor: Number(u.pct_detractor ?? 0),
    entityAvgScore,
    entityPctTop2Box,
    deltaAvgScore: entityAvgScore != null ? avgScore - entityAvgScore : null,
    deltaPctTop2Box: entityPctTop2Box != null ? pctTop2Box - entityPctTop2Box : null,
    status,
  };
}

export interface TreemapChild {
  name: string;
  rawName: string;
  size: number;
  avgScore: number;
  pctTop2Box: number;
  status: ComplianceStatus;
}

export interface TreemapParent {
  name: string;
  rawName: string;
  children: TreemapChild[];
  size: number;
  avgScore: number;
  pctTop2Box: number;
  status: ComplianceStatus;
}

/**
 * Tidy up the legacy DGE parent-group slugs for human display, e.g.
 * "DGE_GovDigital_DigitalCare_ParentGroup" → "Digital Care".
 */
function prettifyParent(raw: string | null): string {
  if (!raw) return "Other";
  let s = raw.replace(/^DGE_/, "").replace(/_ParentGroup$/i, "");
  s = s.replace(/^GovDigital_?/i, "");
  s = s.replace(/([A-Z])/g, " $1").replace(/\s+/g, " ").trim();
  s = s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return s || "Other";
}

function prettifyTeam(raw: string): string {
  return raw
    .replace(/^DGE[_\s]?/i, "")
    .replace(/_Support$/i, "")
    .replace(/_/g, " ")
    .trim();
}

function statusFor(
  count: number,
  pctTop2Box: number,
  config: { targetTop2BoxPct: number; amberBandPts: number; minResponsesForGrading: number },
  minResponsesOverride?: number,
): ComplianceStatus {
  const min = minResponsesOverride ?? config.minResponsesForGrading;
  if (count < min) return "insufficient_data";
  if (pctTop2Box >= config.targetTop2BoxPct) return "green";
  if (pctTop2Box >= config.targetTop2BoxPct - config.amberBandPts) return "amber";
  return "red";
}

/**
 * Service-area + team rollup of a user's responses, shaped for Recharts Treemap.
 * Cells below 3 responses are tagged 'insufficient_data' so the UI can colour
 * them grey rather than mis-flagging single-response teams as red.
 */
export async function getServiceAreaTreemap(
  scope: { kind: "user"; userId: number } | { kind: "entity"; entityId: number },
): Promise<TreemapParent[]> {
  const config = await getComplianceConfig();
  const scopeClause =
    scope.kind === "user"
      ? sql`f.agent_id = ${scope.userId}`
      : sql`f.entity_id = ${scope.entityId}`;

  const rows = await sql<
    {
      parent: string | null;
      team_id: number;
      team_name: string;
      response_count: string;
      avg_score: string;
      pct_top2_box: string;
    }[]
  >`
    SELECT
      t.parent_group_l1                                                AS parent,
      t.id                                                              AS team_id,
      t.name                                                            AS team_name,
      COUNT(*)                                                          AS response_count,
      AVG(f.scaled_value)                                               AS avg_score,
      100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1.0 ELSE 0.0 END)  AS pct_top2_box
    FROM csat.fact_response f
    JOIN csat.dim_team t ON t.id = f.team_id
    WHERE ${scopeClause}
    GROUP BY t.parent_group_l1, t.id, t.name
    HAVING COUNT(*) > 0
    ORDER BY response_count DESC
  `;

  const grouped = new Map<string, TreemapChild[]>();
  for (const r of rows) {
    const parentKey = r.parent ?? "__unknown__";
    const count = Number(r.response_count);
    const pctTop2Box = Number(r.pct_top2_box);
    const child: TreemapChild = {
      name: prettifyTeam(r.team_name),
      rawName: r.team_name,
      size: count,
      avgScore: Number(r.avg_score),
      pctTop2Box,
      status: statusFor(count, pctTop2Box, config, 3),
    };
    const arr = grouped.get(parentKey) ?? [];
    arr.push(child);
    grouped.set(parentKey, arr);
  }

  return Array.from(grouped.entries())
    .map(([rawName, children]) => {
      const totalCount = children.reduce((acc, c) => acc + c.size, 0);
      const weightedScore =
        children.reduce((acc, c) => acc + c.avgScore * c.size, 0) / Math.max(totalCount, 1);
      const weightedTop2Box =
        children.reduce((acc, c) => acc + c.pctTop2Box * c.size, 0) / Math.max(totalCount, 1);
      return {
        name: prettifyParent(rawName === "__unknown__" ? null : rawName),
        rawName,
        children,
        size: totalCount,
        avgScore: weightedScore,
        pctTop2Box: weightedTop2Box,
        status: statusFor(totalCount, weightedTop2Box, config, 5),
      } satisfies TreemapParent;
    })
    .sort((a, b) => b.size - a.size);
}

export interface TeamSentimentMixRow {
  teamId: number;
  name: string;
  rawName: string;
  responseCount: number;
  avgScore: number;
  veryDissatisfied: number;
  dissatisfied: number;
  neutral: number;
  satisfied: number;
  verySatisfied: number;
}

export async function getUserTeamSentimentMix(userId: number): Promise<TeamSentimentMixRow[]> {
  const rows = await sql<
    {
      team_id: number;
      team_name: string;
      response_count: string;
      avg_score: string;
      vd: string;
      d: string;
      n: string;
      s: string;
      vs: string;
    }[]
  >`
    SELECT
      f.team_id,
      t.name AS team_name,
      COUNT(*) AS response_count,
      AVG(f.scaled_value) AS avg_score,
      SUM(CASE WHEN f.scaled_value = 1 THEN 1 ELSE 0 END) AS vd,
      SUM(CASE WHEN f.scaled_value = 2 THEN 1 ELSE 0 END) AS d,
      SUM(CASE WHEN f.scaled_value = 3 THEN 1 ELSE 0 END) AS n,
      SUM(CASE WHEN f.scaled_value = 4 THEN 1 ELSE 0 END) AS s,
      SUM(CASE WHEN f.scaled_value = 5 THEN 1 ELSE 0 END) AS vs
    FROM csat.fact_response f
    JOIN csat.dim_team t ON t.id = f.team_id
    WHERE f.agent_id = ${userId}
    GROUP BY f.team_id, t.name
    ORDER BY response_count DESC
    LIMIT 15
  `;

  return rows.map((r) => ({
    teamId: r.team_id,
    name: prettifyTeam(r.team_name),
    rawName: r.team_name,
    responseCount: Number(r.response_count),
    avgScore: Number(r.avg_score),
    veryDissatisfied: Number(r.vd),
    dissatisfied: Number(r.d),
    neutral: Number(r.n),
    satisfied: Number(r.s),
    verySatisfied: Number(r.vs),
  }));
}

export interface UserDeltaRow {
  teamId: number;
  name: string;
  rawName: string;
  responseCount: number;
  userAvg: number;
  teamAvg: number;
  delta: number;
}

/**
 * For every team the user touched, return the user's avg score next to the
 * team's avg from *other* users — so we can rank "where is this person worse
 * (or better) than typical?".
 */
export async function getUserDeltaPerTeam(userId: number): Promise<UserDeltaRow[]> {
  const rows = await sql<
    {
      team_id: number;
      team_name: string;
      user_count: string;
      user_avg: string;
      team_avg: string | null;
    }[]
  >`
    WITH user_teams AS (
      SELECT
        f.team_id,
        COUNT(*) AS user_count,
        AVG(f.scaled_value) AS user_avg
      FROM csat.fact_response f
      WHERE f.agent_id = ${userId}
      GROUP BY f.team_id
    )
    SELECT
      ut.team_id,
      t.name AS team_name,
      ut.user_count,
      ut.user_avg,
      (
        SELECT AVG(f2.scaled_value)
        FROM csat.fact_response f2
        WHERE f2.team_id = ut.team_id
          AND (f2.agent_id IS DISTINCT FROM ${userId})
      ) AS team_avg
    FROM user_teams ut
    JOIN csat.dim_team t ON t.id = ut.team_id
    WHERE ut.user_count >= 2
    ORDER BY ut.user_count DESC
  `;

  return rows
    .map((r) => {
      const userAvg = Number(r.user_avg);
      const teamAvg = r.team_avg != null ? Number(r.team_avg) : userAvg;
      return {
        teamId: r.team_id,
        name: prettifyTeam(r.team_name),
        rawName: r.team_name,
        responseCount: Number(r.user_count),
        userAvg,
        teamAvg,
        delta: userAvg - teamAvg,
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export interface UserDailyPoint {
  date: string;
  responseCount: number;
  avgScore: number;
  pctTop2Box: number;
}

export async function getUserDailyResponses(userId: number): Promise<UserDailyPoint[]> {
  const rows = await sql<
    { date: Date; response_count: string; avg_score: string; pct_top2_box: string }[]
  >`
    SELECT
      DATE_TRUNC('day', created_at)::DATE AS date,
      COUNT(*)                            AS response_count,
      AVG(scaled_value)                   AS avg_score,
      100.0 * AVG(CASE WHEN scaled_value >= 4 THEN 1.0 ELSE 0.0 END) AS pct_top2_box
    FROM csat.fact_response
    WHERE agent_id = ${userId}
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY date
  `;
  return rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    responseCount: Number(r.response_count),
    avgScore: Number(r.avg_score),
    pctTop2Box: Number(r.pct_top2_box),
  }));
}

export interface UserResponseRow {
  instanceId: string;
  createdAt: Date;
  teamName: string;
  questionText: string;
  scaled: number;
  labelText: string | null;
  language: string | null;
  sentiment: string;
}

export async function getUserResponses(
  userId: number,
  options: { limit: number; offset: number },
): Promise<{ rows: UserResponseRow[]; total: number }> {
  const totalRows = await sql<{ total: string }[]>`
    SELECT COUNT(*) AS total
    FROM csat.fact_response
    WHERE agent_id = ${userId}
  `;
  const rows = await sql<
    {
      instance_id: string;
      created_at: Date;
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
      t.name              AS team_name,
      q.text              AS question_text,
      f.scaled_value      AS scaled,
      f.label_text,
      f.language,
      f.sentiment::text   AS sentiment
    FROM csat.fact_response f
    JOIN csat.dim_team     t ON t.id = f.team_id
    JOIN csat.dim_question q ON q.id = f.question_id
    WHERE f.agent_id = ${userId}
    ORDER BY f.created_at DESC
    LIMIT ${options.limit} OFFSET ${options.offset}
  `;
  return {
    total: Number(totalRows[0].total),
    rows: rows.map((r) => ({
      instanceId: r.instance_id,
      createdAt: r.created_at,
      teamName: r.team_name,
      questionText: r.question_text,
      scaled: r.scaled,
      labelText: r.label_text,
      language: r.language,
      sentiment: r.sentiment,
    })),
  };
}
