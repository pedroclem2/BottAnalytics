"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "./chart-tooltip";
import { ACCENT, POSITIVE } from "./colors";

export interface TrendAreaDatum {
  label: string;
  responseCount: number;
  pctTop2Box: number;
}

export interface TrendAreaProps {
  data: TrendAreaDatum[];
  height?: number;
  yAxisDomain?: [number, number];
  showAxes?: boolean;
}

export function TrendArea({
  data,
  height = 280,
  yAxisDomain = [0, 100],
  showAxes = true,
}: TrendAreaProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="gradAccent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.6} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradPositive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={POSITIVE} stopOpacity={0.5} />
            <stop offset="100%" stopColor={POSITIVE} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        {showAxes ? (
          <>
            <XAxis
              dataKey="label"
              stroke="var(--fg-muted)"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              stroke="var(--fg-muted)"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              axisLine={false}
              tickLine={false}
              domain={yAxisDomain}
            />
            <YAxis
              yAxisId="count"
              orientation="left"
              hide
              tick={{ fontSize: 11 }}
            />
          </>
        ) : null}
        <Tooltip
          cursor={{ stroke: "var(--chart-grid)", strokeWidth: 1 }}
          content={
            <ChartTooltip
              format={(v, name) => (name === "Top-2 box %" ? `${v.toFixed(1)}%` : v.toLocaleString())}
            />
          }
        />
        <Area
          yAxisId="pct"
          type="monotone"
          dataKey="pctTop2Box"
          stroke={POSITIVE}
          strokeWidth={2}
          fill="url(#gradPositive)"
          name="Top-2 box %"
          isAnimationActive
          animationDuration={700}
        />
        <Area
          yAxisId="count"
          type="monotone"
          dataKey="responseCount"
          stroke={ACCENT}
          strokeWidth={2}
          fill="url(#gradAccent)"
          name="Responses"
          isAnimationActive
          animationDuration={700}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
