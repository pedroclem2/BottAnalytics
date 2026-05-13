set dotenv-load := true

# Default: show available recipes
default:
    @just --list

# Bring up the local Postgres container
db-up:
    docker compose --env-file .env -f docker/docker-compose.yml up -d
    @echo "Waiting for Postgres to accept connections..."
    @until docker compose -f docker/docker-compose.yml exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; do sleep 1; done
    @echo "Postgres is ready."

# Stop the local Postgres container
db-down:
    docker compose -f docker/docker-compose.yml down

# Wipe local Postgres data
db-nuke:
    docker compose -f docker/docker-compose.yml down -v

# Install all dependencies (uv + yarn)
bootstrap:
    cd etl && uv sync
    cd web && yarn install

# Apply SQL migrations
migrate:
    cd etl && uv run csat-etl migrate

# End-to-end local setup: container up + migrations + ETL
setup: db-up migrate etl

# Run ETL: load the xlsm into Postgres
etl xlsm="./Copy of Survey_Data_Model.xlsm":
    cd etl && uv run csat-etl load --xlsm "../{{xlsm}}"

# Refresh materialized views without reloading
etl-refresh:
    cd etl && uv run csat-etl refresh

# Kill any orphaned Next dev server tied to this project (uses Next's own lockfile)
dev-kill:
    #!/usr/bin/env bash
    set -u
    LOCK="web/.next/dev/lock"
    if [ -f "$LOCK" ]; then
        PID=$(/usr/bin/python3 -c "import json,sys; print(json.load(open(sys.argv[1])).get('pid',''))" "$LOCK" 2>/dev/null || true)
        if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
            echo "Killing orphan Next dev server (PID $PID)…"
            kill "$PID" 2>/dev/null || true
            for _ in 1 2 3 4 5; do
                kill -0 "$PID" 2>/dev/null || break
                sleep 0.2
            done
            kill -9 "$PID" 2>/dev/null || true
        fi
        rm -f "$LOCK"
    fi
    echo "Dev server slot is clear."

# Frontend dev server (kills any orphans first)
dev: dev-kill
    cd web && yarn dev

# Frontend production build
build:
    cd web && yarn build

# Linters & type checks (everything)
check:
    cd etl && uv run ruff check . && uv run mypy src
    cd web && yarn lint && yarn typecheck

# Run all tests
test:
    cd etl && uv run pytest

# Format code
fmt:
    cd etl && uv run ruff format . && uv run ruff check --fix .
    cd web && yarn format

# --- Production / deploy --------------------------------------------------

# Spin up the full production stack locally (postgres + etl + web)
prod-up:
    docker compose -f docker/docker-compose.prod.yml --env-file .env up --build -d

# Tear it down
prod-down:
    docker compose -f docker/docker-compose.prod.yml down

# Tail logs
prod-logs:
    docker compose -f docker/docker-compose.prod.yml logs -f --tail=120

# Build the web image only (useful for pushing to a registry)
docker-build:
    docker build -t bott-analytics-web:latest .

# Build the ETL image only
docker-build-etl:
    docker build -t bott-analytics-etl:latest -f etl/Dockerfile .
