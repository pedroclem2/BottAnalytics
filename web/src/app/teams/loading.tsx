import { GlassSkeleton } from "@/components/glass/glass-skeleton";
import { Topbar } from "@/components/layout/topbar";

export default function TeamsLoading() {
  return (
    <>
      <Topbar title="Teams" subtitle="Loading…" />
      <div className="space-y-4 p-6">
        <GlassSkeleton className="h-9 w-64" />
        <GlassSkeleton className="h-96" />
      </div>
    </>
  );
}
