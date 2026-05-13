"""Unit tests for :mod:`csat_etl.normalize.rows`."""

from __future__ import annotations

from datetime import datetime

from csat_etl.normalize.rows import (
    UNASSIGNED_TEAM,
    UNKNOWN_ENTITY,
    NormalizedRow,
    RejectedRow,
    normalize_rows,
)
from csat_etl.readers.xlsm import RawRow


def _raw(**overrides: object) -> RawRow:
    base = {
        "instance_id": "AINST1",
        "created_at": datetime(2026, 3, 1, 12, 0, 0),
        "entity_name": "Department of Government Enablement",
        "team_name": "DGE HQ ESM Support",
        "team_parent_l1": "Parent A",
        "team_parent_l2": "Parent B",
        "agent_name": "Jane Doe",
        "agent_email": "jane@dge.gov.ae",
        "question_text": "How do you rate the service provided?",
        "label_text": "Very Satisfied",
        "scaled_value": 5,
        "actual_value": 5,
        "source_sheet": "4.0 Survey_2026_Data",
    }
    base.update(overrides)
    return RawRow(**base)  # type: ignore[arg-type]


def test_normalize_happy_path() -> None:
    results = list(normalize_rows([_raw()], is_valid=True))
    assert len(results) == 1
    row = results[0]
    assert isinstance(row, NormalizedRow)
    assert row.question_kind == "csat"
    assert row.scale.scaled == 5
    assert row.year == 2026
    assert row.month == 3
    assert row.is_valid is True


def test_normalize_ces_question_kind() -> None:
    raw = _raw(question_text="How much effort did you personally have to put forth?")
    results = list(normalize_rows([raw], is_valid=True))
    assert isinstance(results[0], NormalizedRow)
    assert results[0].question_kind == "ces"


def test_normalize_arabic_label() -> None:
    raw = _raw(label_text="راضٍ", scaled_value=4)
    results = list(normalize_rows([raw], is_valid=True))
    assert isinstance(results[0], NormalizedRow)
    assert results[0].language == "ar"
    assert results[0].scale.scaled == 4


def test_normalize_rejects_missing_instance() -> None:
    raw = _raw(instance_id=None)
    rejected = list(normalize_rows([raw], is_valid=True))
    assert isinstance(rejected[0], RejectedRow)
    assert rejected[0].reason == "missing_instance_id"


def test_normalize_rejects_unmappable_score() -> None:
    raw = _raw(label_text="???", scaled_value=None)
    rejected = list(normalize_rows([raw], is_valid=True))
    assert isinstance(rejected[0], RejectedRow)
    assert rejected[0].reason == "unmappable_score"


def test_normalize_uses_placeholder_when_entity_missing() -> None:
    raw = _raw(entity_name=None)
    results = list(normalize_rows([raw], is_valid=False))
    assert isinstance(results[0], NormalizedRow)
    assert results[0].entity_name == UNKNOWN_ENTITY


def test_normalize_uses_placeholder_when_team_missing() -> None:
    raw = _raw(team_name=None)
    results = list(normalize_rows([raw], is_valid=True))
    assert isinstance(results[0], NormalizedRow)
    assert results[0].team_name == UNASSIGNED_TEAM
