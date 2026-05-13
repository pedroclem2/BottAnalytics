import { listEntities, listQuestions, listTeams } from "@/lib/queries/dimensions";

import { FilterBar } from "./filter-bar";

export async function FilterBarLoader() {
  const [entities, teams, questions] = await Promise.all([
    listEntities(),
    listTeams(),
    listQuestions(),
  ]);

  return (
    <FilterBar
      entityOptions={entities.map((e) => ({
        value: e.slug,
        label: e.name,
      }))}
      teamOptions={teams.map((t) => ({
        value: t.slug,
        label: t.name,
      }))}
      questionOptions={questions.map((q) => ({
        value: String(q.id),
        label: q.text.length > 60 ? q.text.slice(0, 60) + "…" : q.text,
        hint: q.kind.toUpperCase(),
      }))}
    />
  );
}
