#!/bin/sh
# Container entrypoint: run the ETL bootstrap (migrate + load) then exec the
# Next.js standalone server. Bootstrap is idempotent — it truncates and reloads
# the fact tables, which keeps dashboard data in sync with the workbook baked
# into the image.
#
# Skip the bootstrap by setting SKIP_ETL_BOOTSTRAP=1 (useful for hot restarts
# against an already-populated DB or when Postgres is on a slow link).
set -eu

if [ "${SKIP_ETL_BOOTSTRAP:-0}" = "1" ]; then
  echo "[entrypoint] SKIP_ETL_BOOTSTRAP=1 — skipping migrate/load"
else
  echo "[entrypoint] running ETL bootstrap"
  cd /app/etl
  uv run csat-etl migrate
  uv run csat-etl load --xlsm "/app/Copy of Survey_Data_Model.xlsm"
fi

echo "[entrypoint] starting Next.js server"
cd /app
exec node server.js
