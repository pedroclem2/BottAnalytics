"""Apply SQL migrations from ``supabase/migrations`` in lexicographic order."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from psycopg import Connection

LOGGER = logging.getLogger(__name__)


def apply_migrations(conn: Connection[Any], migrations_dir: Path) -> list[Path]:
    """Run every ``*.sql`` file under ``migrations_dir`` in sorted order.

    Args:
        conn: Open psycopg connection.
        migrations_dir: Directory containing ``NNNN_description.sql`` files.

    Returns:
        Paths of the migrations that were executed, in order.

    Raises:
        FileNotFoundError: If the directory does not exist.
    """
    if not migrations_dir.is_dir():
        raise FileNotFoundError(f"Migrations directory not found: {migrations_dir}")

    files = sorted(migrations_dir.glob("*.sql"))
    applied: list[Path] = []
    for migration in files:
        LOGGER.info("Applying migration %s", migration.name)
        sql = migration.read_text(encoding="utf-8")
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        applied.append(migration)
    return applied
