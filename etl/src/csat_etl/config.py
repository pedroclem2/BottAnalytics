"""Environment-driven settings for the ETL pipeline."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    """Runtime configuration sourced from environment variables.

    Attributes:
        database_url: Postgres connection string (Supabase pooler or direct).
        xlsm_default_path: Default workbook path used when ``--xlsm`` is omitted.
        repo_root: Resolved path to the repository root.
    """

    database_url: str
    xlsm_default_path: Path
    repo_root: Path

    @classmethod
    def load(cls, repo_root: Path | None = None) -> Settings:
        """Load settings from the nearest ``.env`` file and process environment.

        Args:
            repo_root: Optional override; defaults to the repository root inferred
                from the location of this module.

        Returns:
            A frozen :class:`Settings` instance.

        Raises:
            RuntimeError: If ``DATABASE_URL`` is not configured.
        """
        root = repo_root or _infer_repo_root()
        load_dotenv(root / ".env", override=False)

        database_url = os.environ.get("DATABASE_URL", "").strip()
        if not database_url:
            raise RuntimeError(
                "DATABASE_URL is not set. Copy .env.example to .env and populate it."
            )

        xlsm_path_value = os.environ.get(
            "CSAT_XLSM_PATH", "./Copy of Survey_Data_Model.xlsm"
        ).strip()
        xlsm_path = (root / xlsm_path_value).resolve()

        return cls(database_url=database_url, xlsm_default_path=xlsm_path, repo_root=root)


def _infer_repo_root() -> Path:
    """Walk up from this file until we hit the repo root (folder containing ``etl`` and ``db``)."""
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "etl").is_dir() and (parent / "db").is_dir():
            return parent
    return here.parents[3]
