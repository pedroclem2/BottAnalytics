"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartTooltip } from "./chart-tooltip";

export interface HorizontalBarDatum {
  label: string;
  value: number;
  color?: string;
}

export interface HorizontalBarProps {
  data: HorizontalBarDatum[];
  height?: number;
  valueType?: "percent" | "count";
}

export function HorizontalBar({ data, height = 220, valueType = "percent" }: HorizontalBarProps) {
  const format =
    valueType === "percent" ? (v: number) => `${v.toFixed(1)}%` : (v: number) => v.toLocaleString();
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 12 }}>
        <XAxis type="number" hide domain={[0, 100]} />
        <YAxis
          type="category"
          dataKey="label"
          stroke="var(--fg-muted)"
          tick={{ fontSize: 11 }}
          width={170}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-base)" }}
          content={<ChartTooltip format={(v) => format(Number(v))} />}
        />
        <Bar dataKey="value" radius={[6, 6, 6, 6]} animationDuration={700}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color ?? "#8b5cf6"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
