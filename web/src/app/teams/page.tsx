import type { SearchParams } from "nuqs/server";

import { FilterBarLoader } from "@/components/filters/filter-bar-loader";
import { GlassSection } from "@/components/glass/glass-section";
import { Topbar } from "@/components/layout/topbar";
import { TeamsTable } from "@/components/tables/teams-table";
import { filterCache, toSurveyFilters } from "@/lib/filters/parsers";
import { listTeamsWithStats } from "@/lib/queries/teams";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parsed = await filterCache.parse(searchParams);
  const filters = toSurveyFilters(parsed);
  const teams = await listTeamsWithStats(filters);

  return (
    <>
      <Topbar
        title="Teams"
        subtitle={`${teams.length} assignment groups · drill into agent performance`}
        filters={<FilterBarLoader />}
      />
      <div className="space-y-6 p-6">
        <GlassSection
          title="Team directory"
          description="Top-2 box satisfaction per resolving assignment group."
        >
          <TeamsTable teams={teams} />
        </GlassSection>
      </div>
    </>
  );
}
