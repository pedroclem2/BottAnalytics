-- =============================================================================
-- 0001_init.sql
-- Star schema for the ADGE CSAT survey data + dashboard materialized views.
-- Idempotent: safe to re-run during development.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS csat;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'csat_sentiment') THEN
        CREATE TYPE csat.csat_sentiment AS ENUM (
            'very_dissatisfied',
            'dissatisfied',
            'neutral',
            'satisfied',
            'very_satisfied'
        );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'csat_question_kind') THEN
        CREATE TYPE csat.csat_question_kind AS ENUM ('csat', 'ces', 'other');
    END IF;
END$$;

-- -----------------------------------------------------------------------------
-- Dimensions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS csat.dim_entity (
    id      SERIAL PRIMARY KEY,
    name_en TEXT NOT NULL,
    slug    TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS csat.dim_team (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    parent_group_l1 TEXT,
    parent_group_l2 TEXT
);

CREATE TABLE IF NOT EXISTS csat.dim_agent (
    id           SERIAL PRIMARY KEY,
    identity_key TEXT NOT NULL UNIQUE,
    name         TEXT,
    email        TEXT
);

CREATE TABLE IF NOT EXISTS csat.dim_question (
    id   SERIAL PRIMARY KEY,
    text TEXT NOT NULL UNIQUE,
    kind csat.csat_question_kind NOT NULL DEFAULT 'other'
);

-- Canonical bilingual score mapping. Seeded below.
CREATE TABLE IF NOT EXISTS csat.dim_score (
    scaled    SMALLINT PRIMARY KEY CHECK (scaled BETWEEN 1 AND 5),
    sentiment csat.csat_sentiment NOT NULL,
    label_en  TEXT NOT NULL,
    label_ar  TEXT NOT NULL
);

INSERT INTO csat.dim_score (scaled, sentiment, label_en, label_ar) VALUES
    (5, 'very_satisfied',    'Very Satisfied',    'غاية في الرضا'),
    (4, 'satisfied',         'Satisfied',         'راضٍ'),
    (3, 'neutral',           'Neutral',           'محايد'),
    (2, 'dissatisfied',      'Dissatisfied',      'غير راضٍ'),
    (1, 'very_dissatisfied', 'Very Dissatisfied', 'غاية في عدم الرضا')
ON CONFLICT (scaled) DO UPDATE
    SET sentiment = EXCLUDED.sentiment,
        label_en  = EXCLUDED.label_en,
        label_ar  = EXCLUDED.label_ar;

-- -----------------------------------------------------------------------------
-- Facts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS csat.fact_response (
    instance_id  TEXT PRIMARY KEY,
    created_at   TIMESTAMPTZ NOT NULL,
    entity_id    INTEGER NOT NULL REFERENCES csat.dim_entity(id),
    team_id      INTEGER NOT NULL REFERENCES csat.dim_team(id),
    agent_id     INTEGER REFERENCES csat.dim_agent(id),
    question_id  INTEGER NOT NULL REFERENCES csat.dim_question(id),
    scaled_value SMALLINT NOT NULL REFERENCES csat.dim_score(scaled),
    sentiment    csat.csat_sentiment NOT NULL,
    label_text   TEXT,
    language     TEXT,
    is_valid     BOOLEAN NOT NULL DEFAULT TRUE,
    year         SMALLINT NOT NULL,
    month        SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12)
);

CREATE INDEX IF NOT EXISTS ix_fact_response_created_at
    ON csat.fact_response (created_at);
CREATE INDEX IF NOT EXISTS ix_fact_response_entity_created
    ON csat.fact_response (entity_id, created_at);
CREATE INDEX IF NOT EXISTS ix_fact_response_team_created
    ON csat.fact_response (team_id, created_at);
CREATE INDEX IF NOT EXISTS ix_fact_response_year_month
    ON csat.fact_response (year, month);
CREATE INDEX IF NOT EXISTS ix_fact_response_question
    ON csat.fact_response (question_id);
CREATE INDEX IF NOT EXISTS ix_fact_response_agent
    ON csat.fact_response (agent_id);

CREATE TABLE IF NOT EXISTS csat.fact_response_invalid (
    LIKE csat.fact_response INCLUDING ALL
);

-- -----------------------------------------------------------------------------
-- Configuration (single-row settings table)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS csat.config (
    id                        SMALLINT PRIMARY KEY CHECK (id = 1),
    target_top2_box_pct       NUMERIC(5, 2) NOT NULL DEFAULT 90.00,
    min_responses_for_grading INTEGER NOT NULL DEFAULT 10,
    amber_band_pts            NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO csat.config (id) VALUES (1) ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Materialized views for fast dashboard queries
-- -----------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS csat.mv_entity_monthly CASCADE;
CREATE MATERIALIZED VIEW csat.mv_entity_monthly AS
SELECT
    f.entity_id,
    e.name_en           AS entity_name,
    e.slug              AS entity_slug,
    f.year,
    f.month,
    DATE_TRUNC('month', f.created_at)::DATE AS period,
    COUNT(*)            AS response_count,
    AVG(f.scaled_value)::NUMERIC(4, 3) AS avg_score,
    100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1 ELSE 0 END) AS pct_top2_box,
    100.0 * AVG(CASE WHEN f.scaled_value >= 3 THEN 1 ELSE 0 END) AS pct_satisfied,
    100.0 * AVG(CASE WHEN f.scaled_value <= 2 THEN 1 ELSE 0 END) AS pct_detractor
FROM csat.fact_response f
JOIN csat.dim_entity e ON e.id = f.entity_id
GROUP BY f.entity_id, e.name_en, e.slug, f.year, f.month, DATE_TRUNC('month', f.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_entity_monthly
    ON csat.mv_entity_monthly (entity_id, year, month);

DROP MATERIALIZED VIEW IF EXISTS csat.mv_team_monthly CASCADE;
CREATE MATERIALIZED VIEW csat.mv_team_monthly AS
SELECT
    f.team_id,
    t.name              AS team_name,
    t.slug              AS team_slug,
    f.year,
    f.month,
    DATE_TRUNC('month', f.created_at)::DATE AS period,
    COUNT(*)            AS response_count,
    AVG(f.scaled_value)::NUMERIC(4, 3) AS avg_score,
    100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1 ELSE 0 END) AS pct_top2_box,
    100.0 * AVG(CASE WHEN f.scaled_value >= 3 THEN 1 ELSE 0 END) AS pct_satisfied,
    100.0 * AVG(CASE WHEN f.scaled_value <= 2 THEN 1 ELSE 0 END) AS pct_detractor
FROM csat.fact_response f
JOIN csat.dim_team t ON t.id = f.team_id
GROUP BY f.team_id, t.name, t.slug, f.year, f.month, DATE_TRUNC('month', f.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_team_monthly
    ON csat.mv_team_monthly (team_id, year, month);

DROP MATERIALIZED VIEW IF EXISTS csat.mv_entity_overall CASCADE;
CREATE MATERIALIZED VIEW csat.mv_entity_overall AS
SELECT
    f.entity_id,
    e.name_en           AS entity_name,
    e.slug              AS entity_slug,
    f.year,
    COUNT(*)            AS response_count,
    AVG(f.scaled_value)::NUMERIC(4, 3) AS avg_score,
    100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1 ELSE 0 END) AS pct_top2_box,
    100.0 * AVG(CASE WHEN f.scaled_value >= 3 THEN 1 ELSE 0 END) AS pct_satisfied,
    100.0 * AVG(CASE WHEN f.scaled_value <= 2 THEN 1 ELSE 0 END) AS pct_detractor,
    MIN(f.created_at)   AS first_response_at,
    MAX(f.created_at)   AS last_response_at
FROM csat.fact_response f
JOIN csat.dim_entity e ON e.id = f.entity_id
GROUP BY f.entity_id, e.name_en, e.slug, f.year;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_entity_overall
    ON csat.mv_entity_overall (entity_id, year);

DROP MATERIALIZED VIEW IF EXISTS csat.mv_team_overall CASCADE;
CREATE MATERIALIZED VIEW csat.mv_team_overall AS
SELECT
    f.team_id,
    t.name              AS team_name,
    t.slug              AS team_slug,
    f.year,
    COUNT(*)            AS response_count,
    AVG(f.scaled_value)::NUMERIC(4, 3) AS avg_score,
    100.0 * AVG(CASE WHEN f.scaled_value >= 4 THEN 1 ELSE 0 END) AS pct_top2_box,
    100.0 * AVG(CASE WHEN f.scaled_value >= 3 THEN 1 ELSE 0 END) AS pct_satisfied,
    100.0 * AVG(CASE WHEN f.scaled_value <= 2 THEN 1 ELSE 0 END) AS pct_detractor
FROM csat.fact_response f
JOIN csat.dim_team t ON t.id = f.team_id
GROUP BY f.team_id, t.name, t.slug, f.year;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mv_team_overall
    ON csat.mv_team_overall (team_id, year);

-- -----------------------------------------------------------------------------
-- Helper view: compliance status per entity per year, joined to the config row.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW csat.v_entity_compliance AS
SELECT
    o.entity_id,
    o.entity_name,
    o.entity_slug,
    o.year,
    o.response_count,
    o.avg_score,
    o.pct_top2_box,
    o.pct_satisfied,
    c.target_top2_box_pct,
    c.amber_band_pts,
    c.min_responses_for_grading,
    CASE
        WHEN o.response_count < c.min_responses_for_grading THEN 'insufficient_data'
        WHEN o.pct_top2_box >= c.target_top2_box_pct THEN 'green'
        WHEN o.pct_top2_box >= (c.target_top2_box_pct - c.amber_band_pts) THEN 'amber'
        ELSE 'red'
    END AS compliance_status
FROM csat.mv_entity_overall o
CROSS JOIN csat.config c
WHERE c.id = 1;
