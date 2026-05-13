"""Typer-based CLI: ``csat-etl {load|refresh|migrate}``."""

from __future__ import annotations

import logging
from pathlib import Path

import typer
from rich.console import Console

from csat_etl.config import Settings
from csat_etl.pipeline import load_workbook_into_db, migrate_only, refresh_only

app = typer.Typer(add_completion=False, help="ADGE CSAT ETL pipeline.")
console = Console(stderr=True)


@app.callback()
def _root(verbose: bool = typer.Option(False, "--verbose", "-v")) -> None:
    """Configure logging once per invocation."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(levelname)s %(name)s: %(message)s")


@app.command()
def load(
    xlsm: Path | None = typer.Option(
        None,
        "--xlsm",
        help="Path to the .xlsm workbook (defaults to CSAT_XLSM_PATH from .env).",
        exists=False,
    ),
) -> None:
    """Load the workbook into Supabase Postgres."""
    settings = Settings.load()
    target = (xlsm or settings.xlsm_default_path).resolve()
    summary = load_workbook_into_db(settings=settings, xlsm_path=target, console=console)
    console.log({"summary": summary})


@app.command()
def refresh() -> None:
    """Refresh materialized views without reloading data."""
    settings = Settings.load()
    refresh_only(settings)
    console.log("[green]Materialized views refreshed[/green]")


@app.command()
def migrate() -> None:
    """Apply SQL migrations in ``db/migrations`` in lexicographic order."""
    settings = Settings.load()
    applied = migrate_only(settings)
    console.log(f"[green]Applied {len(applied)} migration(s)[/green]")
    for path in applied:
        console.log(f"  - {path.name}")


if __name__ == "__main__":
    app()
