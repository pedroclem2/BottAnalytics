import "server-only";
import type { PendingQuery, Row } from "postgres";

import { sql } from "@/lib/db/client";
import type { SurveyFilters } from "@/lib/filters/types";

/**
 * Build a chainable WHERE clause fragment from the active filters.
 * Returns the `WHERE ...` portion (including the keyword) or empty string.
 *
 * Used by every aggregate query so the same filters affect the entire dashboard.
 */
export function whereClause(filters: SurveyFilters): PendingQuery<Row[]> {
  const conditions: PendingQuery<Row[]>[] = [sql`TRUE`];

  if (filters.from) {
    conditions.push(sql`f.created_at >= ${filters.from}`);
  }
  if (filters.to) {
    conditions.push(sql`f.created_at < ${filters.to}`);
  }
  if (filters.entitySlugs.length > 0) {
    conditions.push(sql`e.slug = ANY(${filters.entitySlugs})`);
  }
  if (filters.teamSlugs.length > 0) {
    conditions.push(sql`t.slug = ANY(${filters.teamSlugs})`);
  }
  if (filters.questionIds.length > 0) {
    conditions.push(sql`f.question_id = ANY(${filters.questionIds})`);
  }
  if (filters.minScore != null) {
    conditions.push(sql`f.scaled_value >= ${filters.minScore}`);
  }
  if (filters.maxScore != null) {
    conditions.push(sql`f.scaled_value <= ${filters.maxScore}`);
  }
  if (filters.language !== "all") {
    conditions.push(sql`f.language = ${filters.language}`);
  }

  let combined = conditions[0];
  for (let i = 1; i < conditions.length; i += 1) {
    combined = sql`${combined} AND ${conditions[i]}`;
  }
  return sql`WHERE ${combined}`;
}
