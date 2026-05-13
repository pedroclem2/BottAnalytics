# syntax=docker/dockerfile:1.7
# =============================================================================
# Single-image deploy: Next.js standalone server + Python ETL.
# On container start, the entrypoint runs the ETL bootstrap (migrate +
# load), then execs `node server.js`. One Railway/Fly service, one DB,
# one deploy. The workbook lives inside the image.
# =============================================================================

# ---------- web deps ----------
FROM node:22-alpine AS web-deps
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app
COPY web/package.json web/yarn.lock ./
RUN yarn install --frozen-lockfile --network-timeout 600000

# ---------- web builder ----------
FROM node:22-alpine AS web-builder
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app
COPY --from=web-deps /app/node_modules ./node_modules
COPY web/ ./
# DATABASE_URL is only required at request time, so a build-time stub is fine.
ENV DATABASE_URL="postgresql://placeholder:placeholder@build/placeholder"
RUN yarn build

# ---------- etl deps (Python venv with uv) ----------
FROM python:3.11-slim AS etl-builder
ENV UV_LINK_MODE=copy \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"
WORKDIR /app/etl
COPY etl/pyproject.toml etl/uv.toml etl/uv.lock ./
COPY etl/README.md ./
COPY etl/src ./src
RUN uv sync --no-dev --frozen

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PATH="/root/.local/bin:${PATH}"

# Install Python (matches etl-builder) and uv, so the ETL venv is usable.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 python3-venv ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && curl -fsSL https://astral.sh/uv/install.sh | sh

WORKDIR /app

# Web standalone server + assets
COPY --from=web-builder /app/.next/standalone ./
COPY --from=web-builder /app/.next/static ./.next/static
COPY --from=web-builder /app/public ./public

# ETL: source + pre-built venv (so `uv run` won't redownload anything)
COPY --from=etl-builder /app/etl /app/etl

# Migrations, workbook, entrypoint
COPY db /app/db
COPY ["Copy of Survey_Data_Model.xlsm", "/app/Copy of Survey_Data_Model.xlsm"]
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null || exit 1

CMD ["/usr/local/bin/entrypoint.sh"]
