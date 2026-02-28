"""
Tests for Aggregation Utils

Tests for state and severity aggregation functions.
"""

from rackscope.utils.aggregation import aggregate_states, severity_rank


def test_aggregate_states_all_ok():
    """Test aggregating all OK states."""
    result = aggregate_states(["OK", "OK", "OK"])
    assert result == "OK"


def test_aggregate_states_with_warn():
    """Test aggregating states with WARN."""
    result = aggregate_states(["OK", "WARN", "OK"])
    assert result == "WARN"


def test_aggregate_states_with_crit():
    """Test aggregating states with CRIT."""
    result = aggregate_states(["OK", "WARN", "CRIT"])
    assert result == "CRIT"


def test_aggregate_states_crit_takes_precedence():
    """Test that CRIT takes precedence over all other states."""
    result = aggregate_states(["WARN", "UNKNOWN", "CRIT", "OK"])
    assert result == "CRIT"


def test_aggregate_states_warn_takes_precedence_over_unknown():
    """Test that WARN takes precedence over UNKNOWN."""
    result = aggregate_states(["OK", "UNKNOWN", "WARN"])
    assert result == "WARN"


def test_aggregate_states_unknown_takes_precedence_over_ok():
    """Test that UNKNOWN takes precedence over OK."""
    result = aggregate_states(["OK", "UNKNOWN", "OK"])
    assert result == "UNKNOWN"


def test_aggregate_states_empty_list():
    """Test aggregating empty state list."""
    result = aggregate_states([])
    assert result == "UNKNOWN"


def test_aggregate_states_single_state():
    """Test aggregating a single state."""
    assert aggregate_states(["OK"]) == "OK"
    assert aggregate_states(["WARN"]) == "WARN"
    assert aggregate_states(["CRIT"]) == "CRIT"
    assert aggregate_states(["UNKNOWN"]) == "UNKNOWN"


def test_aggregate_states_multiple_crit():
    """Test aggregating multiple CRIT states."""
    result = aggregate_states(["CRIT", "CRIT", "CRIT"])
    assert result == "CRIT"


def test_aggregate_states_multiple_warn():
    """Test aggregating multiple WARN states."""
    result = aggregate_states(["WARN", "WARN", "OK"])
    assert result == "WARN"


def test_aggregate_states_order_does_not_matter():
    """Test that order of states doesn't matter."""
    result1 = aggregate_states(["OK", "WARN", "CRIT"])
    result2 = aggregate_states(["CRIT", "WARN", "OK"])
    result3 = aggregate_states(["WARN", "OK", "CRIT"])
    assert result1 == result2 == result3 == "CRIT"


def test_severity_rank_unknown():
    """Test severity rank for UNKNOWN."""
    assert severity_rank("UNKNOWN") == 0


def test_severity_rank_ok():
    """Test severity rank for OK."""
    assert severity_rank("OK") == 1


def test_severity_rank_warn():
    """Test severity rank for WARN."""
    assert severity_rank("WARN") == 2


def test_severity_rank_crit():
    """Test severity rank for CRIT."""
    assert severity_rank("CRIT") == 3


def test_severity_rank_ordering():
    """Test that severity ranks are ordered correctly."""
    assert severity_rank("UNKNOWN") < severity_rank("OK")
    assert severity_rank("OK") < severity_rank("WARN")
    assert severity_rank("WARN") < severity_rank("CRIT")


def test_severity_rank_invalid():
    """Test severity rank for invalid/unknown severity."""
    # Invalid severities default to 0 (same as UNKNOWN)
    assert severity_rank("INVALID") == 0
    assert severity_rank("") == 0
    assert severity_rank("random") == 0


def test_severity_rank_use_case_sorting():
    """Test severity rank can be used for sorting."""
    severities = ["CRIT", "OK", "UNKNOWN", "WARN"]
    sorted_severities = sorted(severities, key=severity_rank)
    assert sorted_severities == ["UNKNOWN", "OK", "WARN", "CRIT"]


def test_severity_rank_max_severity():
    """Test finding max severity using rank."""
    severities = ["OK", "WARN", "UNKNOWN", "CRIT", "OK"]
    max_severity = max(severities, key=severity_rank)
    assert max_severity == "CRIT"
