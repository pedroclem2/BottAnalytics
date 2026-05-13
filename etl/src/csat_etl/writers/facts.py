"""Fact-table bulk loader using psycopg's COPY protocol."""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from psycopg import Connection

from csat_etl.normalize.rows import NormalizedRow

_FACT_COLUMNS = (
    "instance_id",
    "created_at",
    "entity_id",
    "team_id",
    "agent_id",
    "question_id",
    "scaled_value",
    "sentiment",
    "label_text",
    "language",
    "is_valid",
    "year",
    "month",
)


def truncate_facts(conn: Connection[Any]) -> None:
    """Wipe both fact tables ahead of a fresh load."""
    with conn.cursor() as cur:
        cur.execute("TRUNCATE csat.fact_response, csat.fact_response_invalid")


def copy_facts(
    conn: Connection[Any],
    rows: Iterable[NormalizedRow],
    *,
    entities: dict[str, int],
    teams: dict[str, int],
    agents: dict[str, int],
    questions: dict[str, int],
) -> tuple[int, int]:
    """Bulk-load normalized rows into the appropriate fact table.

    Args:
        conn: Open psycopg connection.
        rows: Iterable of normalized rows.
        entities: ``{entity_name: id}`` map.
        teams: ``{team_name: id}`` map.
        agents: ``{agent_key: id}`` map.
        questions: ``{question_text: id}`` map.

    Returns:
        Tuple of ``(valid_inserted, invalid_inserted)``.
    """
    valid_count = 0
    invalid_count = 0
    columns = ", ".join(_FACT_COLUMNS)

    with conn.cursor() as cur:
        for table, want_valid in (
            ("csat.fact_response", True),
            ("csat.fact_response_invalid", False),
        ):
            copy_sql = f"COPY {table} ({columns}) FROM STDIN"
            with cur.copy(copy_sql) as copy:
                for row in rows:
                    if row.is_valid != want_valid:
                        continue
                    agent_key = (row.agent_email or row.agent_name or "").strip().lower()
                    copy.write_row(
                        (
                            row.instance_id,
                            row.created_at,
                            entities[row.entity_name],
                            teams[row.team_name],
                            agents.get(agent_key),
                            questions[row.question_text],
                            row.scale.scaled,
                            row.scale.sentiment,
                            row.label_text,
                            row.language,
                            row.is_valid,
                            row.year,
                            row.month,
                        )
                    )
                    if row.is_valid:
                        valid_count += 1
                    else:
                        invalid_count += 1
    return valid_count, invalid_count


def refresh_matviews(conn: Connection[Any]) -> None:
    """Refresh the dashboard materialized views."""
    with conn.cursor() as cur:
        cur.execute("REFRESH MATERIALIZED VIEW csat.mv_entity_monthly")
        cur.execute("REFRESH MATERIALIZED VIEW csat.mv_team_monthly")
        cur.execute("REFRESH MATERIALIZED VIEW csat.mv_entity_overall")
        cur.execute("REFRESH MATERIALIZED VIEW csat.mv_team_overall")
