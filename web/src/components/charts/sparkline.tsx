"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { POSITIVE } from "./colors";

export interface SparklineProps {
  data: { period: string; pctTop2Box: number }[];
  height?: number;
  color?: string;
}

export function Sparkline({ data, height = 36, color = POSITIVE }: SparklineProps) {
  if (data.length < 2) {
    return <div className="h-9 w-full text-xs text-fg-muted/60">—</div>;
  }
  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="pctTop2Box"
          stroke={color}
          strokeWidth={1.8}
          fill={`url(#${gradId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
