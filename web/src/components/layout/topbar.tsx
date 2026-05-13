import type { ReactNode } from "react";

import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

export interface TopbarProps {
  title: string;
  subtitle?: ReactNode;
  filters?: ReactNode;
}

export function Topbar({ title, subtitle, filters }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-glass-border bg-glass/80 px-4 py-4 backdrop-blur-xl [transform:translateZ(0)] sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MobileNav />
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-fg sm:text-xl">{title}</h1>
            {subtitle ? <p className="text-xs text-fg-muted sm:text-sm">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
      {filters ? <div className="flex flex-wrap gap-2">{filters}</div> : null}
    </header>
  );
}
