# csat-etl

Loads `Copy of Survey_Data_Model.xlsm` into the `csat` schema of a local Postgres instance.

## Usage

```bash
uv sync
uv run csat-etl migrate                          # apply SQL migrations from ../db/migrations
uv run csat-etl load --xlsm ../"Copy of Survey_Data_Model.xlsm"
uv run csat-etl refresh                          # refresh materialized views
```

## Architecture

```
src/csat_etl/
  __init__.py
  cli.py               # typer entry point
  config.py            # env-based settings
  db.py                # psycopg connection + helpers
  migrations.py        # apply ../db/migrations/*.sql
  pipeline.py          # orchestration
  normalize/
    __init__.py
    labels.py          # bilingual label canonicalization
    rows.py            # row-level cleaning + validation
    slug.py            # entity slug derivation
  readers/
    __init__.py
    xlsm.py            # openpyxl reader per sheet
  writers/
    __init__.py
    facts.py           # COPY-based bulk insert
    dims.py            # dimension upserts
tests/
  test_labels.py
  test_rows.py
  test_slug.py
```
