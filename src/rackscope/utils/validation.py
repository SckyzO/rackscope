"""
Validation Utils

Utility functions for input validation and sanitization.
"""

import re


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
