"""
Unit tests for plugins.simulator.process.topology module.

Tests cover: parse_nodeset, _expand_patterns, load_device_templates.
"""

import yaml

from plugins.simulator.process.topology import (
    _expand_patterns,
    _matches,
    load_device_templates,
    parse_nodeset,
)


class TestParseNodeset:
    def test_range_zero_padded(self):
        result = parse_nodeset("compute[001-004]")
        assert result == {1: "compute001", 2: "compute002", 3: "compute003", 4: "compute004"}

    def test_range_no_padding(self):
        result = parse_nodeset("node[1-3]")
        assert result == {1: "node1", 2: "node2", 3: "node3"}

    def test_single_node(self):
        result = parse_nodeset("node1")
        assert result == {1: "node1"}

    def test_non_string_passthrough(self):
        existing = {1: "a", 2: "b"}
        assert parse_nodeset(existing) == existing

    def test_none_returns_empty(self):
        assert parse_nodeset(None) == {}

    def test_range_count(self):
        result = parse_nodeset("gpu[01-10]")
        assert len(result) == 10
        assert result[1] == "gpu01"
        assert result[10] == "gpu10"


class TestExpandPatterns:
    def test_single_exact(self):
        exact, wild = _expand_patterns(["compute001"])
        assert "compute001" in exact
        assert wild == []

    def test_wildcard(self):
        exact, wild = _expand_patterns(["compute*"])
        assert exact == set()
        assert "compute*" in wild

    def test_empty(self):
        exact, wild = _expand_patterns([])
        assert exact == set()
        assert wild == []

    def test_mixed(self):
        exact, wild = _expand_patterns(["compute001", "gpu*"])
        assert "compute001" in exact
        assert "gpu*" in wild


class TestMatches:
    def test_exact_match(self):
        assert _matches("compute001", {"compute001"}, []) is True

    def test_exact_no_match(self):
        assert _matches("compute002", {"compute001"}, []) is False

    def test_wildcard_match(self):
        assert _matches("compute001", set(), ["compute*"]) is True

    def test_wildcard_no_match(self):
        assert _matches("gpu001", set(), ["compute*"]) is False

    def test_empty_sets_no_match(self):
        assert _matches("compute001", set(), []) is False


class TestLoadDeviceTemplates:
    def test_nonexistent_dir_returns_empty(self):
        result = load_device_templates("/nonexistent/path")
        assert result == {}

    def test_empty_devices_dir_returns_empty(self, tmp_path):
        (tmp_path / "devices").mkdir()
        result = load_device_templates(str(tmp_path))
        assert result == {}

    def test_loads_templates_from_yaml(self, tmp_path):
        devices_dir = tmp_path / "devices"
        devices_dir.mkdir()
        data = {"templates": [{"id": "server-1u", "type": "server", "u_height": 1}]}
        (devices_dir / "servers.yaml").write_text(yaml.dump(data))

        result = load_device_templates(str(tmp_path))
        assert "server-1u" in result
        assert result["server-1u"]["type"] == "server"

    def test_loads_multiple_templates(self, tmp_path):
        devices_dir = tmp_path / "devices"
        devices_dir.mkdir()
        data = {
            "templates": [
                {"id": "server-a", "type": "server"},
                {"id": "switch-b", "type": "switch"},
            ]
        }
        (devices_dir / "mixed.yaml").write_text(yaml.dump(data))

        result = load_device_templates(str(tmp_path))
        assert len(result) == 2
