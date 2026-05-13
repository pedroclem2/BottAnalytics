"use client";

import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/ui/cn";

export interface MultiSelectOption {
  value: string;
  label: string;
  hint?: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  label: string;
  maxBadges?: number;
}

export function MultiSelect({
  options,
  values,
  onChange,
  placeholder,
  label,
  maxBadges = 2,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const lower = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(lower));
  }, [options, query]);

  const valueSet = new Set(values);
  const selectedOptions = options.filter((o) => valueSet.has(o.value));

  const toggle = (val: string) => {
    if (valueSet.has(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 items-center gap-2 rounded-full border border-glass-border bg-glass px-3",
            "text-xs text-fg-secondary backdrop-blur-xl transition hover:text-fg",
          )}
        >
          <span className="font-medium text-fg-muted">{label}</span>
          <span className="flex items-center gap-1">
            {selectedOptions.length === 0 ? (
              <span className="text-fg-muted/70">{placeholder}</span>
            ) : (
              selectedOptions.slice(0, maxBadges).map((opt) => (
                <span
                  key={opt.value}
                  className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent"
                >
                  {opt.label}
                </span>
              ))
            )}
            {selectedOptions.length > maxBadges ? (
              <span className="text-[11px] text-fg-muted">+{selectedOptions.length - maxBadges}</span>
            ) : null}
          </span>
          <ChevronsUpDown className="ml-auto h-3 w-3 text-fg-muted" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className={cn(
            "z-50 w-72 rounded-2xl border border-glass-border bg-glass-strong/90 p-2 shadow-2xl backdrop-blur-2xl",
          )}
        >
          <div className="flex items-center gap-2 border-b border-glass-border pb-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="w-full bg-transparent px-1 py-1 text-sm text-fg outline-none placeholder:text-fg-muted/70"
            />
            {values.length ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="rounded-full p-1 text-fg-muted hover:bg-glass hover:text-fg"
                aria-label="Clear selection"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <ul className="mt-1 max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-fg-muted">No matches</li>
            ) : (
              filtered.map((opt) => {
                const selected = valueSet.has(opt.value);
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => toggle(opt.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs",
                        "text-fg-secondary transition hover:bg-glass hover:text-fg",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-4 w-4 place-items-center rounded border",
                          selected
                            ? "border-accent bg-accent text-white"
                            : "border-glass-border bg-glass",
                        )}
                      >
                        {selected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="flex-1 truncate">{opt.label}</span>
                      {opt.hint ? <span className="text-fg-muted/70">{opt.hint}</span> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
