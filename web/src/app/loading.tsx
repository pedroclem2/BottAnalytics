import { GlassSkeleton } from "@/components/glass/glass-skeleton";
import { Topbar } from "@/components/layout/topbar";

export default function ExecutiveLoading() {
  return (
    <>
      <Topbar title="Executive Summary" subtitle="Loading the latest figures…" />
      <div className="space-y-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <GlassSkeleton key={i} className="h-32" />
          ))}
        </section>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <GlassSkeleton key={i} className="h-20" />
          ))}
        </section>
        <section className="grid gap-4 lg:grid-cols-3">
          <GlassSkeleton className="h-80 lg:col-span-2" />
          <GlassSkeleton className="h-80" />
        </section>
      </div>
    </>
  );
}
