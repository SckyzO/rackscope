"""
Unit tests for plugins.simulator.process.metrics module.

Tests cover: extract_base_metric_name, normalize_metric_defs,
get_fallback_supported_metrics.
"""

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
        node_metrics = [k for k, v in result.items() if v == "node"]
        assert len(node_metrics) > 0

    def test_has_rack_scope_entries(self):
        result = get_fallback_supported_metrics()
        rack_metrics = [k for k, v in result.items() if v == "rack"]
        assert len(rack_metrics) > 0

    def test_each_entry_has_valid_scope(self):
        result = get_fallback_supported_metrics()
        for name, scope in result.items():
            assert scope in ("node", "rack"), f"Invalid scope '{scope}' for metric: {name}"


class TestNormalizeMetricDefs:
    def test_basic_normalization(self):
        # normalize_metric_defs takes a LIST of metric catalog items
        defs = [{"name": "up", "scope": "node", "labels": {}, "help": "Node up"}]
        result = normalize_metric_defs(defs)
        assert "up" in result
        assert result["up"]["scope"] == "node"

    def test_empty_list(self):
        assert normalize_metric_defs([]) == {}

    def test_none_returns_empty(self):
        assert normalize_metric_defs(None) == {}

    def test_item_without_name_skipped(self):
        defs = [{"scope": "node", "help": "No name"}]
        result = normalize_metric_defs(defs)
        assert result == {}

    def test_item_without_scope_skipped(self):
        # scope must come from item or SUPPORTED_METRICS; if neither, skip
        defs = [{"name": "unknown_metric_xyz", "help": "no scope"}]
        result = normalize_metric_defs(defs)
        assert "unknown_metric_xyz" not in result
