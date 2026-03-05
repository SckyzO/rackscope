"""
Unit tests for plugins.simulator.process.metrics module.

Tests cover: extract_base_metric_name, normalize_metric_defs,
get_fallback_supported_metrics.
"""

import pytest

from plugins.simulator.process.metrics import (
    extract_base_metric_name,
    get_fallback_supported_metrics,
    normalize_metric_defs,
)


class TestExtractBaseMetricName:
    def test_plain_name(self):
        assert extract_base_metric_name("node_temperature_celsius") == "node_temperature_celsius"

    def test_with_labels(self):
        assert extract_base_metric_name('up{instance="x"}') == "up"

    def test_rate_expression(self):
        result = extract_base_metric_name("rate(node_cpu_seconds_total[5m])")
        assert result == "node_cpu_seconds_total"

    def test_sum_with_labels(self):
        result = extract_base_metric_name('sum(raritan_pdu_activepower_watt{job="pdu"})')
        assert result == "raritan_pdu_activepower_watt"

    def test_none_returns_none(self):
        assert extract_base_metric_name(None) is None

    def test_empty_string_returns_none(self):
        assert extract_base_metric_name("") is None

    def test_range_vector(self):
        result = extract_base_metric_name("avg_over_time(node_temp[5m])")
        assert result == "node_temp"


class TestGetFallbackSupportedMetrics:
    def test_returns_dict(self):
        result = get_fallback_supported_metrics()
        assert isinstance(result, dict)

    def test_not_empty(self):
        result = get_fallback_supported_metrics()
        assert len(result) > 0

    def test_has_node_scope_entries(self):
        result = get_fallback_supported_metrics()
        node_metrics = [k for k, v in result.items() if v.get("scope") == "node"]
        assert len(node_metrics) > 0

    def test_has_rack_scope_entries(self):
        result = get_fallback_supported_metrics()
        rack_metrics = [k for k, v in result.items() if v.get("scope") == "rack"]
        assert len(rack_metrics) > 0

    def test_each_entry_has_scope(self):
        result = get_fallback_supported_metrics()
        for name, meta in result.items():
            assert "scope" in meta, f"Missing scope for metric: {name}"


class TestNormalizeMetricDefs:
    def test_already_normalized_passthrough(self):
        defs = {
            "up": {
                "scope": "node",
                "labels": {"instance": "$instance"},
                "help": "Node up",
                "inst_exact": set(),
                "inst_wild": [],
                "rack_exact": set(),
                "rack_wild": [],
                "labels_only": False,
                "include_base_labels": True,
            }
        }
        result = normalize_metric_defs(defs)
        assert "up" in result
        assert result["up"]["scope"] == "node"

    def test_empty_defs(self):
        assert normalize_metric_defs({}) == {}

    def test_none_defs(self):
        assert normalize_metric_defs(None) == {}
