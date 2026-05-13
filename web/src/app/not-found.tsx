import { Compass } from "lucide-react";
import Link from "next/link";

import { GlassSection } from "@/components/glass/glass-section";

export default function NotFound() {
  return (
    <div className="p-6">
      <GlassSection
        title={
          <span className="inline-flex items-center gap-2 text-fg">
            <Compass className="h-4 w-4" />
            Page not found
          </span>
        }
        description="The page you tried to open does not exist or is not enabled in this build."
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-accent/30 transition hover:bg-accent/90"
        >
          Back to executive summary
        </Link>
      </GlassSection>
    </div>
  );
}
