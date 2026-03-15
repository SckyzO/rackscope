"""
Validation Utils

Utility functions for input validation and sanitization.
"""

import re

from fastapi import HTTPException


def safe_segment(value: str, fallback: str) -> str:
    """Convert string to safe filename segment.

    Args:
        value: The input string to sanitize
        fallback: The fallback value if sanitization results in empty string

    Returns:
        Sanitized string safe for use as filename segment
    """
    value = (value or "").strip().lower()
    if not value:
        return fallback
    value = re.sub(r"[^a-z0-9._-]+", "-", value)
    value = value.strip("-")
    return value or fallback


# Pattern for valid topology IDs: lowercase letters, digits, dots, hyphens, underscores.
# Max 128 characters. Prevents path traversal (../, %2F, etc.).
# Must start with alphanumeric to prevent hidden files (.hidden) and .. traversal.
_SAFE_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{0,127}$")


def assert_safe_id(value: str, label: str) -> str:
    """Raise HTTP 400 if value is not a safe topology ID.

    Valid IDs contain only lowercase letters, digits, dots, hyphens and
    underscores (max 128 chars). This prevents path traversal attacks on
    topology mutation endpoints that construct filesystem paths from IDs.

    Args:
        value: The ID to validate (site_id, room_id, rack_id, etc.)
        label: Human-readable field name for the error message

    Returns:
        The validated value (unchanged)

    Raises:
        HTTPException: 400 if the value contains unsafe characters
    """
    if not _SAFE_ID_PATTERN.match(value or ""):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid {label}: {value!r}. "
                "IDs must contain only lowercase letters, digits, dots, hyphens "
                "and underscores (max 128 characters)."
            ),
        )
    return value
