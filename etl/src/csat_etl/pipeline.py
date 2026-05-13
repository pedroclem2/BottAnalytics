"""Top-level ETL orchestration."""

from __future__ import annotations

import json
import logging
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

from rich.console import Console
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeElapsedColumn,
)

from csat_etl.config import Settings
from csat_etl.db import connect
from csat_etl.migrations import apply_migrations
from csat_etl.normalize.rows import NormalizedRow, RejectedRow, normalize_rows
from csat_etl.readers.xlsm import INVALID_SHEETS, VALID_SHEETS, read_sheet
from csat_etl.writers.dims import (
    upsert_agents,
    upsert_entities,
    upsert_questions,
    upsert_teams,
)
from csat_etl.writers.facts import copy_facts, refresh_matviews, truncate_facts

LOGGER = logging.getLogger(__name__)
_console = Console(stderr=True)


def load_workbook_into_db(
    *, settings: Settings, xlsm_path: Path, console: Console | None = None
) -> dict[str, int]:
    """Run the full ETL: read workbook, normalize, write to Postgres, refresh views.

    Args:
        settings: Loaded :class:`Settings`.
        xlsm_path: Path to the workbook to ingest.
        console: Optional Rich console for progress reporting.

    Returns:
        Summary dictionary with row counts.
    """
    out = console or _console

    if not xlsm_path.exists():
        raise FileNotFoundError(f"Workbook not found: {xlsm_path}")

    out.log(f"[bold]Reading[/bold] {xlsm_path.name}")
    normalized, rejections = _read_and_normalize(xlsm_path, console=out)

    out.log(
        f"[green]Normalized {len(normalized):,} rows[/green] "
        f"([yellow]{sum(rejections.values())} rejected[/yellow])"
    )

    with connect(settings.database_url) as conn:
        out.log("Truncating fact tables")
        truncate_facts(conn)
        out.log("Upserting dimensions")
        entities = upsert_entities(conn, normalized)
        teams = upsert_teams(conn, normalized)
        agents = upsert_agents(conn, normalized)
        questions = upsert_questions(conn, normalized)
        out.log(
            f"[cyan]dims:[/cyan] entities={len(entities)} teams={len(teams)} "
            f"agents={len(agents)} questions={len(questions)}"
        )

        out.log("Copying facts via COPY")
        valid, invalid = copy_facts(
            conn,
            normalized,
            entities=entities,
            teams=teams,
            agents=agents,
            questions=questions,
        )
        conn.commit()
        out.log(f"[green]Inserted[/green] valid={valid:,} invalid={invalid:,}")

        out.log("Refreshing materialized views")
        refresh_matviews(conn)
        conn.commit()

    summary = {
        "valid_inserted": valid,
        "invalid_inserted": invalid,
        "entities": len(entities),
        "teams": len(teams),
        "agents": len(agents),
        "questions": len(questions),
        "rejected": sum(rejections.values()),
    }
    _write_report(settings.repo_root, summary, rejections)
    return summary


def refresh_only(settings: Settings) -> None:
    """Refresh materialized views without reloading data."""
    with connect(settings.database_url) as conn:
        refresh_matviews(conn)
        conn.commit()


def migrate_only(settings: Settings) -> list[Path]:
    """Apply pending SQL migrations from ``db/migrations``."""
    migrations_dir = settings.repo_root / "db" / "migrations"
    with connect(settings.database_url) as conn:
        return apply_migrations(conn, migrations_dir)


def _read_and_normalize(
    path: Path, *, console: Console
) -> tuple[list[NormalizedRow], Counter[str]]:
    """Read every relevant sheet and bucket rows into normalized vs rejected.

    Deduplicates by ``instance_id`` across all sheets. When the same instance
    appears in both a valid and an invalid sheet, the valid row wins. Within the
    same validity bucket, the most recently observed row wins.
    """
    by_instance: dict[str, NormalizedRow] = {}
    rejections: Counter[str] = Counter()

    targets = [(name, True) for name in VALID_SHEETS] + [
        (name, False) for name in INVALID_SHEETS
    ]
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TimeElapsedColumn(),
        console=console,
        transient=True,
    ) as progress:
        for sheet_name, is_valid in targets:
            task_id = progress.add_task(f"Reading {sheet_name}", total=None)
            for result in normalize_rows(read_sheet(path, sheet_name), is_valid=is_valid):
                if isinstance(result, NormalizedRow):
                    existing = by_instance.get(result.instance_id)
                    # Valid rows always trump invalid ones; otherwise last wins.
                    if existing is None or (result.is_valid and not existing.is_valid):
                        by_instance[result.instance_id] = result
                    elif existing.is_valid == result.is_valid:
                        rejections["duplicate_instance"] += 1
                        by_instance[result.instance_id] = result
                    else:
                        rejections["duplicate_instance"] += 1
                else:
                    assert isinstance(result, RejectedRow)
                    rejections[result.reason] += 1
                progress.advance(task_id)
            progress.update(task_id, completed=progress.tasks[task_id].completed)
    return list(by_instance.values()), rejections


def _write_report(
    repo_root: Path, summary: dict[str, int], rejections: Counter[str]
) -> None:
    """Persist a JSON report under ``etl/reports/``."""
    reports_dir = repo_root / "etl" / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    payload = {
        "timestamp_utc": stamp,
        "summary": summary,
        "rejections_by_reason": dict(rejections),
    }
    (reports_dir / f"load_{stamp}.json").write_text(json.dumps(payload, indent=2))
