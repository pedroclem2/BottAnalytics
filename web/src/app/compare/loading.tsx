import { GlassSkeleton } from "@/components/glass/glass-skeleton";
import { Topbar } from "@/components/layout/topbar";

export default function CompareLoading() {
  return (
    <>
      <Topbar title="Year-over-Year" subtitle="Loading…" />
      <div className="space-y-4 p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <GlassSkeleton key={i} className="h-32" />
          ))}
        </section>
        <section className="grid gap-4 lg:grid-cols-2">
          <GlassSkeleton className="h-72" />
          <GlassSkeleton className="h-72" />
        </section>
        <GlassSkeleton className="h-96" />
      </div>
    </>
  );
}
