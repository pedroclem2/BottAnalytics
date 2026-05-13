"""URL-safe slug derivation for entity and team names."""

from __future__ import annotations

import re
import unicodedata

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    """Return a kebab-case slug suitable for use in URL paths.

    Args:
        value: Free-text input (name or label).

    Returns:
        Slug containing only ``[a-z0-9-]``. Empty input yields ``'unknown'``.
    """
    if not value:
        return "unknown"
    normalized = unicodedata.normalize("NFKD", value)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = _SLUG_RE.sub("-", ascii_only).strip("-")
    return slug or "unknown"
