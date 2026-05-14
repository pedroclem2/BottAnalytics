"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { SENTIMENT_COLORS } from "./colors";

export interface SentimentStackRow {
  label: string;
  veryDissatisfied: number;
  dissatisfied: number;
  neutral: number;
  satisfied: number;
  verySatisfied: number;
}

interface StackTooltipPayload {
  dataKey: string;
  value: number;
  color: string;
  name: string;
  payload?: SentimentStackRow & { total?: number };
}

interface StackTooltipProps {
  active?: boolean;
  payload?: StackTooltipPayload[];
  label?: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  veryDissatisfied: "Very Dissatisfied",
  dissatisfied: "Dissatisfied",
  neutral: "Neutral",
  satisfied: "Satisfied",
  verySatisfied: "Very Satisfied",
};

function StackTooltip({ active, payload, label }: StackTooltipProps) {
  if (!active || !payload?.length) return null;
  const total = payload[0]?.payload?.total ?? 0;
  return (
    <div className="rounded-xl border border-glass-border bg-glass-strong/85 px-3 py-2 text-xs shadow-xl backdrop-blur-2xl">
      <div className="mb-1 font-medium text-fg">{label}</div>
      <div className="flex flex-col gap-1">
        {payload
          .filter((p) => p.value > 0)
          .map((p) => (
            <div key={p.dataKey} className="flex items-center gap-2">
              <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              <span className="text-fg-muted">{SEGMENT_LABELS[p.dataKey] ?? p.dataKey}</span>
              <span className="num ml-auto font-semibold text-fg">{p.value}</span>
              <span className="num text-fg-muted">
                ({total > 0 ? ((p.value / total) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

export interface SentimentStackBarProps {
  data: SentimentStackRow[];
  height?: number;
}

export function SentimentStackBar({ data, height }: SentimentStackBarProps) {
  if (data.length === 0) {
    return <p className="text-xs text-fg-muted">No interactions to break down yet.</p>;
  }
  const computedHeight = height ?? Math.max(160, 28 * data.length + 24);
  const enriched = data.map((d) => ({
    ...d,
    total:
      d.veryDissatisfied + d.dissatisfied + d.neutral + d.satisfied + d.verySatisfied,
  }));

  return (
    <ResponsiveContainer width="100%" height={computedHeight}>
      <BarChart
        data={enriched}
        layout="vertical"
        margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
        barCategoryGap={6}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          stroke="var(--fg-muted)"
          tick={{ fontSize: 11 }}
          width={180}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip cursor={{ fill: "var(--surface-base)" }} content={<StackTooltip />} />
        <Bar
          dataKey="veryDissatisfied"
          stackId="s"
          fill={SENTIMENT_COLORS.very_dissatisfied}
          name="Very Dissatisfied"
          isAnimationActive={false}
        />
        <Bar
          dataKey="dissatisfied"
          stackId="s"
          fill={SENTIMENT_COLORS.dissatisfied}
          name="Dissatisfied"
          isAnimationActive={false}
        />
        <Bar
          dataKey="neutral"
          stackId="s"
          fill={SENTIMENT_COLORS.neutral}
          name="Neutral"
          isAnimationActive={false}
        />
        <Bar
          dataKey="satisfied"
          stackId="s"
          fill={SENTIMENT_COLORS.satisfied}
          name="Satisfied"
          isAnimationActive={false}
        />
        <Bar
          dataKey="verySatisfied"
          stackId="s"
          fill={SENTIMENT_COLORS.very_satisfied}
          name="Very Satisfied"
          isAnimationActive={false}
          radius={[0, 6, 6, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
