export type ComplianceStatus = "green" | "amber" | "red" | "insufficient_data";

export type LanguageFilter = "all" | "en" | "ar";

export interface SurveyFilters {
  from: Date | null;
  to: Date | null;
  entitySlugs: string[];
  teamSlugs: string[];
  questionIds: number[];
  minScore: number | null;
  maxScore: number | null;
  language: LanguageFilter;
}

export const EMPTY_FILTERS: SurveyFilters = {
  from: null,
  to: null,
  entitySlugs: [],
  teamSlugs: [],
  questionIds: [],
  minScore: null,
  maxScore: null,
  language: "all",
};

export interface ComplianceConfig {
  targetTop2BoxPct: number;
  minResponsesForGrading: number;
  amberBandPts: number;
}
