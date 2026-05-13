# Architecture

## Data flow

```mermaid
flowchart LR
    Excel["Copy of Survey_Data_Model.xlsm<br/>(4 sheets, ~20k rows)"]
    ETL["etl/<br/>uv + psycopg + openpyxl"]
    Postgres[(Postgres 17<br/>schema: csat)]
    MV[("Materialized views<br/>mv_entity_monthly<br/>mv_entity_overall<br/>mv_team_monthly<br/>mv_team_overall")]
    Next["Next.js 16 App Router<br/>Server Components"]
    UI["Glassmorphism UI<br/>Recharts + Framer Motion"]

    Excel --> ETL
    ETL -->|"COPY ... FROM STDIN"| Postgres
    ETL -->|REFRESH MATERIALIZED VIEW| MV
    Postgres --> Next
    MV --> Next
    Next -->|RSC payload| UI
```

## Schema

All objects live in the `csat` schema.

```mermaid
erDiagram
    dim_entity ||--o{ fact_response : "1..*"
    dim_team ||--o{ fact_response : "1..*"
    dim_agent ||--o{ fact_response : "0..*"
    dim_question ||--o{ fact_response : "1..*"
    dim_score ||--o{ fact_response : "1..*"
    config ||--|| v_entity_compliance : "1..1"

    dim_entity {
      serial id PK
      text name_en
      text slug UK
    }
    dim_team {
      serial id PK
      text name
      text slug UK
      text parent_group_l1
      text parent_group_l2
    }
    dim_agent {
      serial id PK
      text identity_key UK
      text name
      text email
    }
    dim_question {
      serial id PK
      text text UK
      csat_question_kind kind
    }
    dim_score {
      smallint scaled PK
      csat_sentiment sentiment
      text label_en
      text label_ar
    }
    fact_response {
      text instance_id PK
      timestamptz created_at
      int entity_id FK
      int team_id FK
      int agent_id FK
      int question_id FK
      smallint scaled_value FK
      csat_sentiment sentiment
      text label_text
      text language
      boolean is_valid
      smallint year
      smallint month
    }
    config {
      smallint id PK
      numeric target_top2_box_pct
      int min_responses_for_grading
      numeric amber_band_pts
    }
```

`fact_response_invalid` mirrors `fact_response` (`LIKE ... INCLUDING ALL`)
and stores rows from the workbook's "Invalid" sheets so the data is preserved
without polluting compliance metrics.

## ETL pipeline

```mermaid
flowchart TB
    A["readers/xlsm.read_sheet()"] --> B["normalize/rows.normalize_rows()"]
    B --> C{valid?}
    C -- yes --> D["NormalizedRow"]
    C -- no --> E["RejectedRow (counted)"]
    D --> F["Dedupe by instance_id<br/>(valid trumps invalid)"]
    F --> G["writers.dims.upsert_*"]
    G --> H["writers.facts.copy_facts"]
    H --> I["writers.facts.refresh_matviews"]
    I --> J["etl/reports/load_<ts>.json"]
```

Each `instance_id` ends up in exactly one fact table — if it appears in both a
valid and an invalid sheet, the valid row wins.

## Frontend

- **Routes**: `/`, `/entities`, `/entities/[slug]`, `/teams`, `/teams/[slug]`,
  `/compare`, `/settings`.
- **State**: filter bar state is encoded in the URL via `nuqs` so links share
  context. Server components decode the URL with `filterCache.parse` and pass
  the resulting `SurveyFilters` into query helpers.
- **Database access**: a single `postgres.js` client lives in
  `src/lib/db/client.ts`. Query helpers in `src/lib/queries/*` return typed
  shapes (no leaking `Row[]` into pages).
- **Charts**: thin Recharts wrappers in `src/components/charts/` with shared
  tooltip styling and theme-aware colors. All chart props are
  serialisable (no function props passed from Server → Client Components).

## Compliance model

```mermaid
flowchart LR
    Resp["fact_response (per entity)"] --> Agg["AVG(scaled >= 4) * 100"]
    Cfg["csat.config (id = 1)"] --> Status
    Agg --> Status{compliance_status}
    Status -->|"< min_responses"| Insuff[Insufficient]
    Status -->|">= target"| Green
    Status -->|">= target - amber_band"| Amber
    Status -->|else| Red
```

Updating `csat.config` from the `/settings` page revalidates every cached
server-component query and re-paints the whole UI on next navigation.
