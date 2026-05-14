"use client";

import { ResponsiveContainer, Tooltip, Treemap } from "recharts";

import type { ComplianceStatus } from "@/lib/filters/types";

export interface TreemapLeaf {
  name: string;
  size: number;
  avgScore: number;
  pctTop2Box: number;
  status: ComplianceStatus;
  parentName?: string;
}

export interface TreemapBranch {
  name: string;
  size: number;
  avgScore: number;
  pctTop2Box: number;
  status: ComplianceStatus;
  children: TreemapLeaf[];
}

const STATUS_FILL: Record<ComplianceStatus, string> = {
  green: "rgba(16, 185, 129, 0.75)",
  amber: "rgba(245, 158, 11, 0.7)",
  red: "rgba(239, 68, 68, 0.7)",
  insufficient_data: "rgba(148, 163, 184, 0.35)",
};

const STATUS_STROKE: Record<ComplianceStatus, string> = {
  green: "rgba(16, 185, 129, 1)",
  amber: "rgba(245, 158, 11, 1)",
  red: "rgba(239, 68, 68, 1)",
  insufficient_data: "rgba(148, 163, 184, 0.5)",
};

interface TreemapNodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  name?: string;
  size?: number;
  status?: ComplianceStatus;
  avgScore?: number;
  pctTop2Box?: number;
  index?: number;
}

function TreemapNode(props: TreemapNodeProps) {
  const { x = 0, y = 0, width = 0, height = 0, depth = 0, name, status, size, pctTop2Box } = props;
  if (width <= 0 || height <= 0) return null;
  const fill = status ? STATUS_FILL[status] : "rgba(148,163,184,0.2)";
  const stroke = status ? STATUS_STROKE[status] : "rgba(148,163,184,0.4)";

  // Skip drawing the synthetic root container.
  if (depth === 0) {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={14}
          fill="transparent"
          stroke="transparent"
        />
      </g>
    );
  }

  const isParent = depth === 1;
  const showLabel = width > 80 && height > 28;
  const showSubLabel = width > 110 && height > 46;

  return (
    <g>
      <rect
        x={x + 1}
        y={y + 1}
        width={Math.max(width - 2, 0)}
        height={Math.max(height - 2, 0)}
        rx={isParent ? 10 : 6}
        fill={fill}
        stroke={stroke}
        strokeOpacity={isParent ? 0.8 : 0.35}
        strokeWidth={isParent ? 1.5 : 1}
      />
      {showLabel && name ? (
        <text
          x={x + 10}
          y={y + 20}
          fontSize={isParent ? 13 : 11}
          fontWeight={isParent ? 600 : 500}
          fill="rgba(248,250,252,0.92)"
          style={{ pointerEvents: "none" }}
        >
          {name.length > Math.max(8, Math.floor(width / 7))
            ? name.slice(0, Math.max(8, Math.floor(width / 7)) - 1) + "…"
            : name}
        </text>
      ) : null}
      {showSubLabel && typeof size === "number" ? (
        <text
          x={x + 10}
          y={y + 36}
          fontSize={11}
          fill="rgba(226,232,240,0.85)"
          style={{ pointerEvents: "none" }}
        >
          {size.toLocaleString()} resp
          {typeof pctTop2Box === "number" ? ` · ${pctTop2Box.toFixed(0)}%` : ""}
        </text>
      ) : null}
    </g>
  );
}

interface TreemapTooltipPayload {
  payload?: {
    name?: string;
    size?: number;
    avgScore?: number;
    pctTop2Box?: number;
    status?: ComplianceStatus;
  };
}

interface SentimentTreemapTooltipProps {
  active?: boolean;
  payload?: TreemapTooltipPayload[];
}

function SentimentTreemapTooltip({ active, payload }: SentimentTreemapTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item || !item.name) return null;
  return (
    <div className="rounded-xl border border-glass-border bg-glass-strong/85 px-3 py-2 text-xs shadow-xl backdrop-blur-2xl">
      <div className="mb-1 font-medium text-fg">{item.name}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-fg-muted">
        <span>Responses</span>
        <span className="num text-right text-fg">{item.size?.toLocaleString() ?? "—"}</span>
        <span>Avg score</span>
        <span className="num text-right text-fg">
          {typeof item.avgScore === "number" ? item.avgScore.toFixed(2) : "—"}
        </span>
        <span>Top-2 box</span>
        <span className="num text-right text-fg">
          {typeof item.pctTop2Box === "number" ? `${item.pctTop2Box.toFixed(1)}%` : "—"}
        </span>
      </div>
    </div>
  );
}

export interface SentimentTreemapProps {
  data: TreemapBranch[];
  height?: number;
}

export function SentimentTreemap({ data, height = 360 }: SentimentTreemapProps) {
  if (data.length === 0) {
    return (
      <p className="text-xs text-fg-muted">Not enough data to render the service-area treemap.</p>
    );
  }
  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <Treemap
          data={data as unknown as Record<string, unknown>[]}
          dataKey="size"
          stroke="rgba(255,255,255,0.06)"
          aspectRatio={16 / 9}
          isAnimationActive={false}
          content={<TreemapNode />}
        >
          <Tooltip content={<SentimentTreemapTooltip />} />
        </Treemap>
      </ResponsiveContainer>
      <Legend />
    </>
  );
}

function Legend() {
  const items: { status: ComplianceStatus; label: string }[] = [
    { status: "green", label: "On target" },
    { status: "amber", label: "Watch" },
    { status: "red", label: "Below target" },
    { status: "insufficient_data", label: "Low volume" },
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-fg-muted">
      {items.map((it) => (
        <span key={it.status} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-sm"
            style={{ background: STATUS_FILL[it.status], border: `1px solid ${STATUS_STROKE[it.status]}` }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}
