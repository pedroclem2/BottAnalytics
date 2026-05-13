"use client";

import { Building2, GitCompareArrows, LayoutDashboard, Settings, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/ui/cn";

const NAV = [
  { href: "/", label: "Executive", icon: LayoutDashboard },
  { href: "/entities", label: "Entities", icon: Building2 },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/compare", label: "YoY Compare", icon: GitCompareArrows },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 flex-shrink-0 flex-col gap-6 self-start overflow-y-auto border-r border-glass-border bg-glass-strong/60 px-4 py-6 backdrop-blur-xl [transform:translateZ(0)] lg:flex">
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-glass-border bg-white/90 p-1 shadow-sm">
          <Image
            src="/dge-logo.png"
            alt="Department of Government Enablement"
            width={32}
            height={32}
            priority
            className="h-8 w-8 object-contain"
          />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-fg">DGE CSAT</div>
          <div className="text-[11px] text-fg-muted">Executive Dashboard</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                isActive
                  ? "bg-glass-strong text-fg shadow-inner shadow-white/5"
                  : "text-fg-secondary hover:bg-glass hover:text-fg",
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-accent" : "text-fg-muted")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-xl border border-glass-border bg-glass p-3 text-[11px] text-fg-muted">
        Data refreshed via local ETL.
        <br />
        <span className="text-fg-secondary">Run <code className="text-accent">just etl</code> to reload.</span>
      </div>
    </aside>
  );
}
