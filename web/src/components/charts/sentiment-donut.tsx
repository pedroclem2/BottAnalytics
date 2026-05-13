"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartTooltip } from "./chart-tooltip";
import { SENTIMENT_COLORS } from "./colors";

export interface SentimentSegment {
  sentiment: string;
  label: string;
  count: number;
  pct: number;
}

export interface SentimentDonutProps {
  data: SentimentSegment[];
  height?: number;
}

export function SentimentDonut({ data, height = 260 }: SentimentDonutProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          innerRadius="62%"
          outerRadius="92%"
          paddingAngle={2}
          stroke="rgba(255,255,255,0.06)"
          isAnimationActive
          animationDuration={700}
        >
          {data.map((entry) => (
            <Cell
              key={entry.sentiment}
              fill={SENTIMENT_COLORS[entry.sentiment] ?? "#8b5cf6"}
            />
          ))}
        </Pie>
        <Tooltip
          content={
            <ChartTooltip
              format={(v, name) =>
                typeof v === "number"
                  ? `${v.toLocaleString()}  (${name})`
                  : v
              }
            />
          }
        />
        <Legend
          verticalAlign="bottom"
          align="center"
          iconType="circle"
          formatter={(value) => <span className="text-xs text-fg-secondary">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
