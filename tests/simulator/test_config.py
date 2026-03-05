"""
Unit tests for plugins.simulator.process.config module.

Tests cover: load_simulator_config, apply_scenario.
"""

import tempfile
from pathlib import Path

import pytest
import yaml

from plugins.simulator.process.config import apply_scenario, load_simulator_config


class TestLoadSimulatorConfig:
    def test_defaults_when_files_absent(self, tmp_path, monkeypatch):
        """Missing YAML files → empty dict (no crash)."""
        import plugins.simulator.process.config as cfg_mod

        monkeypatch.setattr(cfg_mod, "SIMULATOR_CONFIG_PATH", str(tmp_path / "missing.yaml"))
        monkeypatch.setattr(cfg_mod, "APP_CONFIG_PATH", str(tmp_path / "missing_app.yaml"))

        result = load_simulator_config()
        assert isinstance(result, dict)

    def test_reads_scenario_from_app_yaml_plugins_key(self, tmp_path, monkeypatch):
        """plugins.simulator.scenario in app.yaml is picked up."""
        import plugins.simulator.process.config as cfg_mod

        app_yaml = tmp_path / "app.yaml"
        app_yaml.write_text(yaml.dump({"plugins": {"simulator": {"scenario": "full-ok"}}}))
        scenarios_yaml = tmp_path / "scenarios.yaml"
        scenarios_yaml.write_text(yaml.dump({}))

        monkeypatch.setattr(cfg_mod, "SIMULATOR_CONFIG_PATH", str(scenarios_yaml))
        monkeypatch.setattr(cfg_mod, "APP_CONFIG_PATH", str(app_yaml))

        result = load_simulator_config()
        assert result.get("scenario") == "full-ok"

    def test_reads_scenario_from_app_yaml_legacy_key(self, tmp_path, monkeypatch):
        """Legacy simulator.scenario key in app.yaml is picked up."""
        import plugins.simulator.process.config as cfg_mod

        app_yaml = tmp_path / "app.yaml"
        app_yaml.write_text(yaml.dump({"simulator": {"scenario": "demo-small"}}))
        scenarios_yaml = tmp_path / "scenarios.yaml"
        scenarios_yaml.write_text(yaml.dump({}))

        monkeypatch.setattr(cfg_mod, "SIMULATOR_CONFIG_PATH", str(scenarios_yaml))
        monkeypatch.setattr(cfg_mod, "APP_CONFIG_PATH", str(app_yaml))

        result = load_simulator_config()
        assert result.get("scenario") == "demo-small"


class TestApplyScenario:
    def test_no_scenario_returns_original(self):
        cfg = {"update_interval_seconds": 30}
        result = apply_scenario(cfg)
        assert result == cfg

    def test_unknown_scenario_returns_original(self):
        cfg = {"scenario": "nonexistent", "scenarios": {}}
        result = apply_scenario(cfg)
        assert result == cfg

    def test_scenario_overrides_update_interval(self):
        cfg = {
            "scenario": "fast",
            "update_interval_seconds": 30,
            "scenarios": {
                "fast": {"update_interval_seconds": 5}
            },
        }
        result = apply_scenario(cfg)
        assert result["update_interval_seconds"] == 5

    def test_scenario_sets_incident_rates(self):
        cfg = {
            "scenario": "failures",
            "scenarios": {
                "failures": {
                    "incident_rates": {"node_micro_failure": 0.5}
                }
            },
        }
        result = apply_scenario(cfg)
        assert result["incident_rates"]["node_micro_failure"] == 0.5

    def test_scenario_without_incident_rates_clears_parent_rates(self):
        """When scenario has no incident_rates, parent rates are cleared."""
        cfg = {
            "scenario": "clean",
            "incident_rates": {"node_micro_failure": 0.9},
            "scenarios": {"clean": {"update_interval_seconds": 10}},
        }
        result = apply_scenario(cfg)
        assert result["incident_rates"] == {}
