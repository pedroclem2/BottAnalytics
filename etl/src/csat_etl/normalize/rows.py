"""Row-level normalization for CSAT survey responses."""

from __future__ import annotations

from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from datetime import datetime

from csat_etl.normalize.labels import ScaleEntry, detect_language, resolve_entry
from csat_etl.readers.xlsm import RawRow

_QUESTION_KIND_KEYWORDS = {
    "csat": ("rate the service",),
    "ces": ("effort",),
}

UNASSIGNED_TEAM = "Unassigned"
UNKNOWN_ENTITY = "Unknown Entity"


@dataclass(frozen=True)
class NormalizedRow:
    """A row that has been cleaned, validated and resolved against dimensions.

    Attributes:
        instance_id: Unique assessment instance identifier.
        created_at: Timestamp of the response.
        entity_name: ADGE entity name (column P in the workbook).
        team_name: Assignment group (column N).
        team_parent_l1: First-level parent group (column O).
        team_parent_l2: Second-level parent group (column Q).
        agent_name: Person who handled the ticket (column M).
        agent_email: Submitter email (column J).
        question_text: Verbatim question text (column E).
        question_kind: ``'csat'`` or ``'ces'`` derived from question text.
        scale: Canonical scale entry the row resolves to.
        label_text: Original label as written in the workbook.
        language: ``'ar'`` or ``'en'`` based on the label.
        is_valid: ``True`` for tabs 3.0 and 4.0, ``False`` for invalid tabs.
        year: Convenience column for partitioning / queries.
        month: Convenience column.
    """

    instance_id: str
    created_at: datetime
    entity_name: str
    team_name: str
    team_parent_l1: str | None
    team_parent_l2: str | None
    agent_name: str | None
    agent_email: str | None
    question_text: str
    question_kind: str
    scale: ScaleEntry
    label_text: str | None
    language: str | None
    is_valid: bool
    year: int
    month: int


@dataclass(frozen=True)
class RejectedRow:
    """A row that failed validation, with a machine-readable reason code."""

    instance_id: str | None
    reason: str
    raw: RawRow


def _classify_question(text: str) -> str:
    """Return the canonical question kind for a verbatim question string."""
    lowered = text.lower()
    for kind, keywords in _QUESTION_KIND_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return kind
    return "other"


def normalize_rows(
    rows: Iterable[RawRow],
    *,
    is_valid: bool,
) -> Iterator[NormalizedRow | RejectedRow]:
    """Normalize an iterable of :class:`RawRow` values.

    Args:
        rows: Iterable of raw workbook rows.
        is_valid: ``True`` when the rows come from a valid sheet (3.0 / 4.0).

    Yields:
        Either a :class:`NormalizedRow` or a :class:`RejectedRow`.
    """
    for raw in rows:
        if not raw.instance_id:
            yield RejectedRow(None, "missing_instance_id", raw)
            continue
        if not isinstance(raw.created_at, datetime):
            yield RejectedRow(raw.instance_id, "missing_created_at", raw)
            continue
        if not raw.question_text:
            yield RejectedRow(raw.instance_id, "missing_question", raw)
            continue

        entry = resolve_entry(raw.label_text, raw.scaled_value)
        if entry is None:
            yield RejectedRow(raw.instance_id, "unmappable_score", raw)
            continue

        entity_name = (raw.entity_name or "").strip() or UNKNOWN_ENTITY
        team_name = (raw.team_name or "").strip() or UNASSIGNED_TEAM

        yield NormalizedRow(
            instance_id=raw.instance_id.strip(),
            created_at=raw.created_at,
            entity_name=entity_name,
            team_name=team_name,
            team_parent_l1=(raw.team_parent_l1 or None),
            team_parent_l2=(raw.team_parent_l2 or None),
            agent_name=(raw.agent_name or None),
            agent_email=(raw.agent_email or None),
            question_text=raw.question_text.strip(),
            question_kind=_classify_question(raw.question_text),
            scale=entry,
            label_text=raw.label_text,
            language=detect_language(raw.label_text),
            is_valid=is_valid,
            year=raw.created_at.year,
            month=raw.created_at.month,
        )
