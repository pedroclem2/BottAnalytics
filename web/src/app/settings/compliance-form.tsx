"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";

import { GlassSection } from "@/components/glass/glass-section";
import type { ComplianceConfig } from "@/lib/filters/types";
import { cn } from "@/lib/ui/cn";

import { type UpdateConfigResult, updateComplianceConfigAction } from "./actions";

const INITIAL: UpdateConfigResult | null = null;

export function ComplianceForm({ initial }: { initial: ComplianceConfig }) {
  const [state, action, pending] = useActionState(updateComplianceConfigAction, INITIAL);

  return (
    <GlassSection
      title="Compliance targets"
      description="Defines what counts as on-target satisfaction across every dashboard view."
    >
      <form action={action} className="space-y-4">
        <NumberField
          label="Top-2 box target (%)"
          name="targetTop2BoxPct"
          defaultValue={initial.targetTop2BoxPct}
          step={1}
          min={0}
          max={100}
          hint="An entity is Green when its top-2 box % is at or above this threshold."
        />
        <NumberField
          label="Amber band (pts)"
          name="amberBandPts"
          defaultValue={initial.amberBandPts}
          step={1}
          min={0}
          max={50}
          hint="An entity within this many points below target is Amber instead of Red."
        />
        <NumberField
          label="Minimum responses for grading"
          name="minResponsesForGrading"
          defaultValue={initial.minResponsesForGrading}
          step={1}
          min={0}
          max={1000}
          hint="Entities with fewer responses are flagged as low-volume rather than scored."
        />
        <div className="flex items-center justify-between gap-3 pt-2">
          {state ? (
            <p
              className={cn(
                "text-xs",
                state.ok ? "text-positive" : "text-negative",
              )}
            >
              {state.message}
            </p>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={pending}
            className={cn(
              "inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-accent/30 transition",
              pending ? "opacity-60" : "hover:bg-accent/90",
            )}
          >
            <Save className="h-3.5 w-3.5" />
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </GlassSection>
  );
}

function NumberField({
  label,
  name,
  defaultValue,
  step,
  min,
  max,
  hint,
}: {
  label: string;
  name: string;
  defaultValue: number;
  step: number;
  min: number;
  max: number;
  hint: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-fg-muted">{label}</span>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        step={step}
        min={min}
        max={max}
        required
        className="num mt-1 w-full rounded-xl border border-glass-border bg-glass px-3 py-2 text-sm text-fg outline-none backdrop-blur-xl focus:border-accent"
      />
      <span className="mt-1 block text-[11px] text-fg-muted">{hint}</span>
    </label>
  );
}
