import "server-only";
import { cache } from "react";

import { sql } from "@/lib/db/client";

export interface EntityOption {
  id: number;
  name: string;
  slug: string;
}

export interface TeamOption {
  id: number;
  name: string;
  slug: string;
}

export interface QuestionOption {
  id: number;
  text: string;
  kind: "csat" | "ces" | "other";
}

export const listEntities = cache(async (): Promise<EntityOption[]> => {
  const rows = await sql<EntityOption[]>`
    SELECT id, name_en AS name, slug
    FROM csat.dim_entity
    ORDER BY name_en
  `;
  return rows.map((r) => ({ ...r }));
});

export const listTeams = cache(async (): Promise<TeamOption[]> => {
  const rows = await sql<TeamOption[]>`
    SELECT id, name, slug
    FROM csat.dim_team
    ORDER BY name
  `;
  return rows.map((r) => ({ ...r }));
});

export const listQuestions = cache(async (): Promise<QuestionOption[]> => {
  const rows = await sql<{ id: number; text: string; kind: QuestionOption["kind"] }[]>`
    SELECT id, text, kind::text AS kind
    FROM csat.dim_question
    ORDER BY id
  `;
  return rows.map((r) => ({ id: r.id, text: r.text, kind: r.kind }));
});
