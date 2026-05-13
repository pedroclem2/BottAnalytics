"""Dimension upserts: entity, team, agent, question."""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from psycopg import Connection

from csat_etl.normalize.rows import NormalizedRow
from csat_etl.normalize.slug import slugify


def upsert_entities(conn: Connection[Any], rows: Iterable[NormalizedRow]) -> dict[str, int]:
    """Insert every distinct entity and return ``{name: id}``.

    Args:
        conn: Open psycopg connection.
        rows: Iterable of normalized rows (consumed once).

    Returns:
        Mapping from entity name to its primary key.
    """
    distinct = {row.entity_name for row in rows}
    payload = [(name, slugify(name)) for name in sorted(distinct)]
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO csat.dim_entity (name_en, slug)
            VALUES (%s, %s)
            ON CONFLICT (slug) DO UPDATE SET name_en = EXCLUDED.name_en
            """,
            payload,
        )
        cur.execute("SELECT name_en, id FROM csat.dim_entity")
        return {str(row[0]): int(row[1]) for row in cur.fetchall()}


def upsert_teams(conn: Connection[Any], rows: Iterable[NormalizedRow]) -> dict[str, int]:
    """Insert every distinct team and return ``{name: id}``.

    Args:
        conn: Open psycopg connection.
        rows: Iterable of normalized rows (consumed once).

    Returns:
        Mapping from team name to its primary key.
    """
    distinct: dict[str, tuple[str | None, str | None]] = {}
    for row in rows:
        distinct[row.team_name] = (row.team_parent_l1, row.team_parent_l2)
    payload = [
        (name, slugify(name), parents[0], parents[1])
        for name, parents in sorted(distinct.items())
    ]
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO csat.dim_team (name, slug, parent_group_l1, parent_group_l2)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (slug) DO UPDATE
              SET name = EXCLUDED.name,
                  parent_group_l1 = EXCLUDED.parent_group_l1,
                  parent_group_l2 = EXCLUDED.parent_group_l2
            """,
            payload,
        )
        cur.execute("SELECT name, id FROM csat.dim_team")
        return {str(row[0]): int(row[1]) for row in cur.fetchall()}


def upsert_agents(conn: Connection[Any], rows: Iterable[NormalizedRow]) -> dict[str, int]:
    """Insert every distinct agent and return ``{email_or_name: id}``.

    Identity preference: email when present, otherwise lowercased name.
    """
    distinct: dict[str, tuple[str | None, str | None]] = {}
    for row in rows:
        key = (row.agent_email or row.agent_name or "").strip().lower()
        if not key:
            continue
        distinct[key] = (row.agent_name, row.agent_email)
    payload = [
        (key, info[0], info[1])
        for key, info in sorted(distinct.items())
    ]
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO csat.dim_agent (identity_key, name, email)
            VALUES (%s, %s, %s)
            ON CONFLICT (identity_key) DO UPDATE
              SET name = COALESCE(EXCLUDED.name, csat.dim_agent.name),
                  email = COALESCE(EXCLUDED.email, csat.dim_agent.email)
            """,
            payload,
        )
        cur.execute("SELECT identity_key, id FROM csat.dim_agent")
        return {str(row[0]): int(row[1]) for row in cur.fetchall()}


def upsert_questions(conn: Connection[Any], rows: Iterable[NormalizedRow]) -> dict[str, int]:
    """Insert every distinct question and return ``{text: id}``."""
    distinct: dict[str, str] = {}
    for row in rows:
        distinct[row.question_text] = row.question_kind
    payload = sorted(distinct.items())
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO csat.dim_question (text, kind)
            VALUES (%s, %s)
            ON CONFLICT (text) DO UPDATE SET kind = EXCLUDED.kind
            """,
            payload,
        )
        cur.execute("SELECT text, id FROM csat.dim_question")
        return {str(row[0]): int(row[1]) for row in cur.fetchall()}
