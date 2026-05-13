"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Building2, GitCompareArrows, LayoutDashboard, Menu, Settings, Users, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/ui/cn";

const NAV = [
  { href: "/", label: "Executive", icon: LayoutDashboard },
  { href: "/entities", label: "Entities", icon: Building2 },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/compare", label: "YoY Compare", icon: GitCompareArrows },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-glass-border bg-glass text-fg-secondary lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" />
        <Dialog.Content
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-64 flex-col gap-6 border-r border-glass-border",
            "bg-glass-strong/95 px-4 py-6 backdrop-blur-2xl lg:hidden",
          )}
        >
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-glass-border bg-white/90 p-1 shadow-sm">
                <Image
                  src="/dge-logo.png"
                  alt="Department of Government Enablement"
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-fg">DGE CSAT</div>
                <div className="text-[11px] text-fg-muted">Executive Dashboard</div>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full p-1 text-fg-muted hover:bg-glass hover:text-fg"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                    isActive
                      ? "bg-glass-strong text-fg"
                      : "text-fg-secondary hover:bg-glass hover:text-fg",
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-accent" : "text-fg-muted")} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
