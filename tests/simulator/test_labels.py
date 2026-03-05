"""
Unit tests for plugins.simulator.process.labels module.

Tests cover: _resolve_token, resolve_labels.
"""

from plugins.simulator.process.labels import _resolve_token, resolve_labels


class TestResolveToken:
    def test_non_string_passthrough(self):
        assert _resolve_token(42, {}, {}) == 42

    def test_no_dollar_passthrough(self):
        assert _resolve_token("literal", {}, {}) == "literal"

    def test_context_lookup(self):
        assert _resolve_token("$instance", {}, {"instance": "compute001"}) == "compute001"

    def test_base_labels_fallback(self):
        assert _resolve_token("$rack_id", {"rack_id": "rack-01"}, {}) == "rack-01"

    def test_context_takes_priority_over_base_labels(self):
        val = _resolve_token("$instance", {"instance": "from_base"}, {"instance": "from_ctx"})
        assert val == "from_ctx"

    def test_unknown_token_returns_empty(self):
        assert _resolve_token("$unknown", {}, {}) == ""


class TestResolveLabels:
    def test_base_labels_included_by_default(self):
        definition = {}
        result = resolve_labels(definition, {"instance": "n1", "rack_id": "r1"}, {})
        assert result["instance"] == "n1"
        assert result["rack_id"] == "r1"

    def test_labels_only_strips_base(self):
        definition = {"labels_only": True, "labels": {"job": "test"}}
        result = resolve_labels(definition, {"instance": "n1"}, {})
        assert "instance" not in result
        assert result["job"] == "test"

    def test_include_base_labels_false(self):
        definition = {"include_base_labels": False}
        result = resolve_labels(definition, {"instance": "n1"}, {})
        assert "instance" not in result

    def test_template_label_resolved(self):
        definition = {"labels": {"node": "$instance"}}
        result = resolve_labels(definition, {}, {"instance": "compute042"})
        assert result["node"] == "compute042"

    def test_no_labels_key(self):
        definition = {}
        result = resolve_labels(definition, {"instance": "n1"}, {})
        assert result == {"instance": "n1"}
