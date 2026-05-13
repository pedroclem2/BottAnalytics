#!/bin/sh
# Apply migrations and load the workbook into the configured DATABASE_URL.
# Idempotent: rerunning will truncate the fact tables and reload.
set -eu

cd /app/etl
echo "[bootstrap] csat-etl migrate"
uv run csat-etl migrate

echo "[bootstrap] csat-etl load"
uv run csat-etl load --xlsm "../Copy of Survey_Data_Model.xlsm"

echo "[bootstrap] done. exit code 0"
