# web — ADGE CSAT dashboard

Next.js 16 (App Router) frontend for the ADGE Customer Satisfaction Survey.

Run from the repo root with `just dev`. See the top-level
[`README.md`](../README.md) for the full setup flow.

## Local commands

```bash
yarn dev          # dev server (port 3000, fallback 3001)
yarn build        # production build
yarn typecheck    # tsc --noEmit
yarn lint         # eslint
yarn format       # prettier
```

## Where things live

| Path | Responsibility |
| --- | --- |
| `src/app/` | Routes (Server Components by default) |
| `src/components/glass/` | Glass-card, status pill, skeleton, empty-state |
| `src/components/charts/` | Recharts wrappers (trend, donut, bars, sparkline) |
| `src/components/filters/` | URL-persisted filter bar (`nuqs`) |
| `src/components/kpi/` | KPI card with animated count-up |
| `src/components/tables/` | Sortable tables, leaderboards, responses |
| `src/lib/db/client.ts` | Singleton `postgres.js` client |
| `src/lib/queries/` | Typed query helpers per view |
| `src/lib/filters/` | Filter types + nuqs parsers |
| `src/lib/ui/` | `cn`, formatting helpers |
