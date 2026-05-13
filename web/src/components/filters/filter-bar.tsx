"use client";

import { CalendarDays, Languages, RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsIsoDate,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";

import { cn } from "@/lib/ui/cn";

import { MultiSelect, type MultiSelectOption } from "./multi-select";

export interface FilterBarProps {
  entityOptions: MultiSelectOption[];
  teamOptions: MultiSelectOption[];
  questionOptions: MultiSelectOption[];
}

export function FilterBar({ entityOptions, teamOptions, questionOptions }: FilterBarProps) {
  const [state, setState] = useQueryStates(
    {
      from: parseAsIsoDate,
      to: parseAsIsoDate,
      entity: parseAsArrayOf(parseAsString).withDefault([]),
      team: parseAsArrayOf(parseAsString).withDefault([]),
      question: parseAsArrayOf(parseAsInteger).withDefault([]),
      minScore: parseAsInteger,
      maxScore: parseAsInteger,
      language: parseAsStringEnum(["all", "en", "ar"] as const).withDefault("all"),
    },
    { history: "replace", shallow: false },
  );

  const reset = () =>
    setState({
      from: null,
      to: null,
      entity: null,
      team: null,
      question: null,
      minScore: null,
      maxScore: null,
      language: null,
    });

  const hasFilters =
    !!state.from ||
    !!state.to ||
    state.entity.length > 0 ||
    state.team.length > 0 ||
    state.question.length > 0 ||
    state.minScore != null ||
    state.maxScore != null ||
    state.language !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 rounded-full border border-glass-border bg-glass px-3 py-1 text-xs text-fg-secondary backdrop-blur-xl">
        <CalendarDays className="h-3.5 w-3.5 text-fg-muted" />
        <input
          type="date"
          value={state.from ? state.from.toISOString().slice(0, 10) : ""}
          onChange={(e) =>
            setState({ from: e.target.value ? new Date(e.target.value) : null })
          }
          className="bg-transparent text-xs text-fg outline-none"
        />
        <span className="text-fg-muted">→</span>
        <input
          type="date"
          value={state.to ? state.to.toISOString().slice(0, 10) : ""}
          onChange={(e) => setState({ to: e.target.value ? new Date(e.target.value) : null })}
          className="bg-transparent text-xs text-fg outline-none"
        />
      </div>

      <MultiSelect
        label="Entities"
        placeholder="All entities"
        options={entityOptions}
        values={state.entity}
        onChange={(v) => setState({ entity: v.length ? v : null })}
      />
      <MultiSelect
        label="Teams"
        placeholder="All teams"
        options={teamOptions}
        values={state.team}
        onChange={(v) => setState({ team: v.length ? v : null })}
      />
      {questionOptions.length > 1 ? (
        <MultiSelect
          label="Questions"
          placeholder="All questions"
          options={questionOptions}
          values={state.question.map(String)}
          onChange={(v) =>
            setState({ question: v.length ? v.map((s) => Number.parseInt(s, 10)) : null })
          }
        />
      ) : null}

      <ScoreFilter
        min={state.minScore}
        max={state.maxScore}
        onChange={(min, max) =>
          setState({
            minScore: min ?? null,
            maxScore: max ?? null,
          })
        }
      />

      <LanguageToggle
        value={state.language}
        onChange={(language) => setState({ language: language === "all" ? null : language })}
      />

      {hasFilters ? (
        <button
          type="button"
          onClick={reset}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full border border-glass-border bg-glass px-3",
            "text-xs text-fg-secondary backdrop-blur-xl transition hover:text-fg",
          )}
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      ) : null}
    </div>
  );
}

function ScoreFilter({
  min,
  max,
  onChange,
}: {
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const presets: { label: string; min: number | null; max: number | null }[] = [
    { label: "All", min: null, max: null },
    { label: "4+ (Top-2)", min: 4, max: null },
    { label: "≤ 2 (Detractors)", min: null, max: 2 },
    { label: "3 (Neutral)", min: 3, max: 3 },
  ];

  const isActive = (preset: (typeof presets)[number]) =>
    preset.min === min && preset.max === max;

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-glass-border bg-glass p-1 text-xs backdrop-blur-xl">
      <SlidersHorizontal className="ml-2 h-3.5 w-3.5 text-fg-muted" />
      <span className="px-1 text-fg-muted">Score</span>
      {presets.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onChange(p.min, p.max)}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] transition",
            isActive(p)
              ? "bg-accent text-white shadow-sm"
              : "text-fg-secondary hover:bg-glass-strong hover:text-fg",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function LanguageToggle({
  value,
  onChange,
}: {
  value: "all" | "en" | "ar";
  onChange: (next: "all" | "en" | "ar") => void;
}) {
  const opts: ("all" | "en" | "ar")[] = ["all", "en", "ar"];
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-glass-border bg-glass p-1 text-xs backdrop-blur-xl">
      <Languages className="ml-2 h-3.5 w-3.5 text-fg-muted" />
      {opts.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] uppercase transition",
            value === o
              ? "bg-accent text-white shadow-sm"
              : "text-fg-secondary hover:bg-glass-strong hover:text-fg",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
