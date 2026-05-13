import "server-only";
import { cache } from "react";

import { sql } from "@/lib/db/client";
import type { ComplianceConfig } from "@/lib/filters/types";

interface ConfigRow {
  target_top2_box_pct: string;
  min_responses_for_grading: number;
  amber_band_pts: string;
}

/** Read the single-row compliance configuration. */
export const getComplianceConfig = cache(async (): Promise<ComplianceConfig> => {
  const rows = await sql<ConfigRow[]>`
    SELECT target_top2_box_pct, min_responses_for_grading, amber_band_pts
    FROM csat.config
    WHERE id = 1
  `;
  const row = rows[0];
  return {
    targetTop2BoxPct: Number(row.target_top2_box_pct),
    minResponsesForGrading: row.min_responses_for_grading,
    amberBandPts: Number(row.amber_band_pts),
  };
});

/** Update the compliance configuration. */
export async function setComplianceConfig(config: ComplianceConfig): Promise<void> {
  await sql`
    UPDATE csat.config
    SET target_top2_box_pct       = ${config.targetTop2BoxPct},
        min_responses_for_grading = ${config.minResponsesForGrading},
        amber_band_pts            = ${config.amberBandPts},
        updated_at                = NOW()
    WHERE id = 1
  `;
}
