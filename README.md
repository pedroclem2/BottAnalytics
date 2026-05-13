# bott_analytics — ADGE CSAT Executive Dashboard

A production-grade analytics dashboard for the Abu Dhabi Department of
Government Enablement (ADGE) Customer Satisfaction Survey data, sourced from
`Copy of Survey_Data_Model.xlsm`. The workbook is loaded into a local Postgres
instance via a Python ETL and visualised with a Next.js App-Router frontend
using glassmorphism, drill-downs, and live URL-persisted filters.

## At a glance

- **Coverage**: 20,506 cleaned survey responses · 83 entities · 122 teams ·
  5,033 agents · Jan 2025 → Apr 2026
- **Compliance** is computed from a single editable row in `csat.config`
  (target top-2 box %, amber band, minimum responses for grading) — no
  thresholds are hardcoded in code
- **Stack**: Postgres 17 (Docker) · Python 3.11 + `uv` + `psycopg` ETL ·
  Next.js 16 (App Router, Server Components, Turbopack) · TypeScript ·
  Tailwind v4 · Recharts · `nuqs` for URL state · Framer Motion · `postgres.js`

## Layout

```
.
├── Copy of Survey_Data_Model.xlsm   # source workbook (input)
├── db/migrations/                   # versioned SQL (star schema + MVs)
├── docker/docker-compose.yml        # local Postgres container
├── etl/                             # Python ingest pipeline (uv project)
│   ├── pyproject.toml
│   ├── src/csat_etl/                # cli, normalize, readers, writers
│   └── tests/                       # 19 unit tests, type-strict
├── web/                             # Next.js app
│   ├── src/app/                     # /, /entities, /teams, /compare, /settings
│   ├── src/components/              # glass primitives, charts, tables, layout
│   └── src/lib/                     # db client, queries, filters, ui helpers
├── docs/                            # architecture notes
├── justfile                         # one-command workflows
└── .env.example
```

## One-time setup

```bash
# 0. clone, then:
cp .env.example .env                # tweak DATABASE_URL if you change ports
just bootstrap                      # install python + js deps
just db-up                          # start Postgres in Docker
just migrate                        # apply db/migrations/0001_init.sql
just etl                            # load the xlsm into Postgres (~3s)
```

Then:

```bash
just dev                            # http://localhost:3000 (or 3001 if 3000 busy)
```

## Day-to-day commands

| Recipe | What it does |
| --- | --- |
| `just db-up` / `just db-down` / `just db-nuke` | Bring the Postgres container up, down, or destroy data |
| `just migrate` | Apply pending SQL migrations |
| `just etl` | Reload the workbook into Postgres (truncates fact tables, then COPY-loads) |
| `just etl-refresh` | Refresh materialized views only |
| `just dev` | Run the Next.js dev server |
| `just build` | Production build |
| `just check` | Run ruff, mypy --strict, eslint, tsc --noEmit |
| `just test` | Run the ETL unit tests |
| `just fmt` | Format everything |

## Dashboard tour

- **`/`** — Executive summary. Hero KPIs (responses, avg CSAT, top-2 box %,
  detractor %, compliant entities), compliance breakdown, monthly trend,
  sentiment donut, top/bottom-5 entities and a compliance alert strip.
- **`/entities`** — Sortable, searchable list of every entity with sparklines
  and compliance badges.
- **`/entities/[slug]`** — KPI cards, daily trend, team breakdown, top &
  bottom agents, per-question split, paginated raw responses.
- **`/teams`** & **`/teams/[slug]`** — Same drill-down structure for resolving
  assignment groups.
- **`/compare`** — 2025 vs 2026 year-over-year by month and by entity.
- **`/settings`** — Editable compliance targets (writes to `csat.config`).

Every page respects the global filter bar (date range, entity & team
multi-select, question, score band, language) and the filter state is encoded
in the URL via `nuqs` so links are shareable.

## Why these choices?

- **Postgres + COPY**: the workbook is ~20k rows but in production grows
  monthly. Bulk-loading via `COPY` keeps `just etl` ~3 seconds and lets us add
  more data without rewriting the dashboard.
- **Star schema + 4 materialized views**: the UI only ever runs simple
  `JOIN + GROUP BY` queries; the heavy aggregation happens once at load time.
- **Server Components for everything readable, a single Server Action for
  writes**: no client-side API layer, no client-side data fetching state.
- **`csat.config` row for thresholds**: matches the "don't hardcode anything"
  brief — every compliance verdict, badge and headline reads from the DB.

See [`docs/architecture.md`](docs/architecture.md) for the full schema
diagram and data-flow walkthrough.

## Deploying

Three working options, all using the `Dockerfile` at the repo root:

- **Railway** (easiest, gets you `*.up.railway.app` in ~5 minutes) — see
  [`docs/deploy.md`](docs/deploy.md#option-1--railway-easiest-random-url)
- **Fly.io** (`*.fly.dev` in ~10 minutes) — see
  [`docs/deploy.md`](docs/deploy.md#option-2--flyio-random-flydev-url-similar-effort)
- **Self-host** with `docker compose -f docker/docker-compose.prod.yml up`
  on any Docker host — see
  [`docs/deploy.md`](docs/deploy.md#option-3--self-host-with-docker-compose-single-command)
