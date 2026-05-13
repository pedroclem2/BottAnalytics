"""Unit tests for :mod:`csat_etl.normalize.labels`."""

from __future__ import annotations

from csat_etl.normalize.labels import detect_language, resolve_entry


def test_resolve_entry_english_label() -> None:
    entry = resolve_entry("Very Satisfied", None)
    assert entry is not None
    assert entry.scaled == 5
    assert entry.sentiment == "very_satisfied"


def test_resolve_entry_arabic_label() -> None:
    entry = resolve_entry("غاية في الرضا", None)
    assert entry is not None
    assert entry.scaled == 5


def test_resolve_entry_case_insensitive() -> None:
    entry = resolve_entry("very dissatisfied", 1)
    assert entry is not None
    assert entry.scaled == 1
    assert entry.sentiment == "very_dissatisfied"


def test_resolve_entry_falls_back_to_scaled() -> None:
    entry = resolve_entry("garbage", 3)
    assert entry is not None
    assert entry.scaled == 3


def test_resolve_entry_unmappable() -> None:
    assert resolve_entry("nope", None) is None


def test_detect_language_arabic() -> None:
    assert detect_language("راضٍ") == "ar"


def test_detect_language_english() -> None:
    assert detect_language("Satisfied") == "en"


def test_detect_language_none() -> None:
    assert detect_language(None) is None
    assert detect_language("") is None
