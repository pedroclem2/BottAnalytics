import { GlassSkeleton } from "@/components/glass/glass-skeleton";
import { Topbar } from "@/components/layout/topbar";

export default function UserLoading() {
  return (
    <>
      <Topbar title="End user" subtitle="Loading drill-down…" />
      <div className="space-y-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <GlassSkeleton key={i} className="h-32" />
          ))}
        </section>
        <GlassSkeleton className="h-96" />
        <section className="grid gap-4 lg:grid-cols-2">
          <GlassSkeleton className="h-64" />
          <GlassSkeleton className="h-64" />
        </section>
        <GlassSkeleton className="h-72" />
      </div>
    </>
  );
}
