"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartTooltip } from "./chart-tooltip";
import { ACCENT, POSITIVE } from "./colors";

export interface GroupedBarDatum {
  label: string;
  previous: number;
  current: number;
}

export interface GroupedBarProps {
  data: GroupedBarDatum[];
  previousLabel: string;
  currentLabel: string;
  height?: number;
  valueType?: "percent" | "count";
  domain?: [number, number];
}

const percentFormat = (v: number) => `${v.toFixed(0)}%`;
const countFormat = (v: number) => v.toLocaleString();

export function GroupedBar({
  data,
  previousLabel,
  currentLabel,
  height = 300,
  valueType = "count",
  domain,
}: GroupedBarProps) {
  const yFormat = valueType === "percent" ? percentFormat : countFormat;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }} barGap={4}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="label" stroke="var(--fg-muted)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          stroke="var(--fg-muted)"
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={yFormat}
          domain={domain}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-base)" }}
          content={<ChartTooltip format={(v) => yFormat(Number(v))} />}
        />
        <Legend
          iconType="circle"
          formatter={(value) => <span className="text-xs text-fg-secondary">{value}</span>}
        />
        <Bar dataKey="previous" fill={ACCENT} radius={[4, 4, 0, 0]} name={previousLabel} animationDuration={600} />
        <Bar dataKey="current" fill={POSITIVE} radius={[4, 4, 0, 0]} name={currentLabel} animationDuration={600} />
      </BarChart>
    </ResponsiveContainer>
  );
}
