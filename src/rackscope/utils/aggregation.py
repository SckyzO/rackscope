"""
Aggregation Utils

Utility functions for state and severity aggregation.
"""

from typing import List


def aggregate_states(states: List[str]) -> str:
    """Aggregate multiple state values into a single state.

    Args:
        states: List of state values (OK, WARN, CRIT, UNKNOWN)

    Returns:
        Aggregated state (CRIT > WARN > UNKNOWN > OK)
    """
    if not states:
        return "UNKNOWN"
    if "CRIT" in states:
        return "CRIT"
    if "WARN" in states:
        return "WARN"
    if "UNKNOWN" in states:
        return "UNKNOWN"
    return "OK"


def severity_rank(severity: str) -> int:
    """Get numeric rank for severity level.

    Args:
        severity: The severity level (UNKNOWN, OK, WARN, CRIT)

    Returns:
        Numeric rank (0-3)
    """
    return {"UNKNOWN": 0, "OK": 1, "WARN": 2, "CRIT": 3}.get(severity, 0)
