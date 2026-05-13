"""Thin psycopg helpers used across the ETL."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

import psycopg
from psycopg import Connection


@contextmanager
def connect(database_url: str) -> Iterator[Connection[Any]]:
    """Open a psycopg connection with autocommit disabled.

    Args:
        database_url: Postgres connection string.

    Yields:
        An open psycopg connection. The connection is closed on exit.
    """
    with psycopg.connect(database_url, autocommit=False) as conn:
        yield conn


def server_version(conn: Connection[Any]) -> str:
    """Return the server's Postgres version string for diagnostics."""
    with conn.cursor() as cur:
        cur.execute("SELECT version()")
        row = cur.fetchone()
    return str(row[0]) if row else "unknown"
