import type { SearchParams } from "nuqs/server";

import { FilterBarLoader } from "@/components/filters/filter-bar-loader";
import { GlassSection } from "@/components/glass/glass-section";
import { Topbar } from "@/components/layout/topbar";
import { EntitiesTable } from "@/components/tables/entities-table";
import { filterCache, toSurveyFilters } from "@/lib/filters/parsers";
import { listEntitiesWithStats } from "@/lib/queries/entities";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EntitiesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const parsed = await filterCache.parse(searchParams);
  const filters = toSurveyFilters(parsed);
  const entities = await listEntitiesWithStats(filters);

  return (
    <>
      <Topbar
        title="Entities"
        subtitle={`${entities.length} entities · sort, search, and drill down`}
        filters={<FilterBarLoader />}
      />
      <div className="space-y-6 p-6">
        <GlassSection title="Entity directory" description="Top-2 box satisfaction, scoring and trend per entity.">
          <EntitiesTable entities={entities} />
        </GlassSection>
      </div>
    </>
  );
}
