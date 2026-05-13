# syntax=docker/dockerfile:1.7
# =============================================================================
# Image for the csat-etl pipeline.
# Built from the repo root so it can include both etl/ and the workbook + db/.
# Build context: project root.
#   docker build -t bott-etl -f etl/Dockerfile .
# =============================================================================

FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

WORKDIR /app/etl

# Resolve and install dependencies first (cache-friendly).
COPY etl/pyproject.toml etl/uv.toml ./
COPY etl/README.md ./
COPY etl/src ./src
RUN uv sync --no-dev

# Bring in the rest of the repo so migrate/ load can find db/ + the workbook.
WORKDIR /app
COPY db ./db
COPY etl/src ./etl/src
COPY etl/tests ./etl/tests
COPY etl/bootstrap.sh ./etl/bootstrap.sh
RUN chmod +x ./etl/bootstrap.sh
COPY ["Copy of Survey_Data_Model.xlsm", "./Copy of Survey_Data_Model.xlsm"]

WORKDIR /app/etl
# Run migrate + load by default. Override with `docker run ... uv run csat-etl ...`
# or by setting the Start Command on Railway / Fly when needed.
CMD ["./bootstrap.sh"]
