"""Unit tests for :mod:`csat_etl.normalize.slug`."""

from __future__ import annotations

from csat_etl.normalize.slug import slugify


def test_slugify_basic() -> None:
    assert slugify("Department of Government Enablement") == "department-of-government-enablement"


def test_slugify_handles_special_chars() -> None:
    assert slugify("Ruler's Representative Court - Al Ain") == "ruler-s-representative-court-al-ain"


def test_slugify_arabic_falls_back() -> None:
    assert slugify("غاية في الرضا") == "unknown"


def test_slugify_empty() -> None:
    assert slugify("") == "unknown"
