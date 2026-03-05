"""
Unit tests for plugins.simulator.process.overrides module.

Tests cover: load_overrides.
"""

import time

import yaml

from plugins.simulator.process.overrides import load_overrides


class TestLoadOverrides:
    def test_absent_file_returns_empty(self, tmp_path):
        result = load_overrides(str(tmp_path / "nonexistent.yaml"))
        assert result == []

    def test_empty_file_returns_empty(self, tmp_path):
        f = tmp_path / "overrides.yaml"
        f.write_text("{}")
        assert load_overrides(str(f)) == []

    def test_valid_overrides_loaded(self, tmp_path):
        f = tmp_path / "overrides.yaml"
        data = {
            "overrides": [
                {"instance": "compute001", "metric": "up", "value": 0}
            ]
        }
        f.write_text(yaml.dump(data))
        result = load_overrides(str(f))
        assert len(result) == 1
        assert result[0]["instance"] == "compute001"

    def test_expired_overrides_filtered(self, tmp_path):
        f = tmp_path / "overrides.yaml"
        past = int(time.time()) - 100
        data = {
            "overrides": [
                {"instance": "compute001", "metric": "up", "value": 0, "expires_at": past}
            ]
        }
        f.write_text(yaml.dump(data))
        result = load_overrides(str(f))
        assert result == []

    def test_active_and_expired_mixed(self, tmp_path):
        f = tmp_path / "overrides.yaml"
        future = int(time.time()) + 3600
        past = int(time.time()) - 100
        data = {
            "overrides": [
                {"instance": "node1", "metric": "up", "value": 0, "expires_at": future},
                {"instance": "node2", "metric": "up", "value": 0, "expires_at": past},
            ]
        }
        f.write_text(yaml.dump(data))
        result = load_overrides(str(f))
        assert len(result) == 1
        assert result[0]["instance"] == "node1"

    def test_no_expiry_always_active(self, tmp_path):
        f = tmp_path / "overrides.yaml"
        data = {"overrides": [{"instance": "n1", "metric": "temp", "value": 99}]}
        f.write_text(yaml.dump(data))
        result = load_overrides(str(f))
        assert len(result) == 1
