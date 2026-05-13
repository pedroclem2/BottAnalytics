import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsIsoDate,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";

import type { SurveyFilters } from "./types";

export const filterSearchParams = {
  from: parseAsIsoDate,
  to: parseAsIsoDate,
  entity: parseAsArrayOf(parseAsString).withDefault([]),
  team: parseAsArrayOf(parseAsString).withDefault([]),
  question: parseAsArrayOf(parseAsInteger).withDefault([]),
  minScore: parseAsInteger,
  maxScore: parseAsInteger,
  language: parseAsStringEnum(["all", "en", "ar"] as const).withDefault("all"),
};

export const filterCache = createSearchParamsCache(filterSearchParams);

export type FilterSearchParams = typeof filterSearchParams;

export function toSurveyFilters(params: {
  from: Date | null;
  to: Date | null;
  entity: string[];
  team: string[];
  question: number[];
  minScore: number | null;
  maxScore: number | null;
  language: "all" | "en" | "ar";
}): SurveyFilters {
  return {
    from: params.from,
    to: params.to,
    entitySlugs: params.entity,
    teamSlugs: params.team,
    questionIds: params.question,
    minScore: params.minScore,
    maxScore: params.maxScore,
    language: params.language,
  };
}
