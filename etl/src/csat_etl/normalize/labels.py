"""Canonicalize the bilingual CSAT answer labels (Arabic + English)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ScaleEntry:
    """One row of the CSAT scale.

    Attributes:
        scaled: Integer score on the 1-5 scale.
        sentiment: Canonical machine-friendly sentiment key.
        label_en: English label as it appears in the workbook.
        label_ar: Arabic label as it appears in the workbook.
    """

    scaled: int
    sentiment: str
    label_en: str
    label_ar: str


SCALE: tuple[ScaleEntry, ...] = (
    ScaleEntry(5, "very_satisfied", "Very Satisfied", "غاية في الرضا"),
    ScaleEntry(4, "satisfied", "Satisfied", "راضٍ"),
    ScaleEntry(3, "neutral", "Neutral", "محايد"),
    ScaleEntry(2, "dissatisfied", "Dissatisfied", "غير راضٍ"),
    ScaleEntry(1, "very_dissatisfied", "Very Dissatisfied", "غاية في عدم الرضا"),
)


_BY_LABEL: dict[str, ScaleEntry] = {
    **{entry.label_en.casefold(): entry for entry in SCALE},
    **{entry.label_ar: entry for entry in SCALE},
}
_BY_SCALED: dict[int, ScaleEntry] = {entry.scaled: entry for entry in SCALE}


def detect_language(label: str | None) -> str | None:
    """Return ``'ar'`` if the label contains Arabic characters, else ``'en'``.

    Args:
        label: Raw label string.

    Returns:
        ``'ar'``, ``'en'`` or ``None`` when no language can be inferred.
    """
    if not label:
        return None
    for char in label:
        if "\u0600" <= char <= "\u06ff":
            return "ar"
    return "en"


def resolve_entry(label: str | None, scaled: int | None) -> ScaleEntry | None:
    """Resolve a workbook row to a canonical :class:`ScaleEntry`.

    Args:
        label: Free-text label (English or Arabic).
        scaled: Numeric 1-5 score (column R in the workbook).

    Returns:
        The matching scale entry or ``None`` if neither argument is usable.
    """
    if label:
        entry = _BY_LABEL.get(label.strip().casefold()) or _BY_LABEL.get(label.strip())
        if entry is not None:
            return entry
    if scaled is not None and scaled in _BY_SCALED:
        return _BY_SCALED[scaled]
    return None
