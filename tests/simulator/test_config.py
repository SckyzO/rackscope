"""
Unit tests for plugins.simulator.process.config module.

Tests cover: load_simulator_config.
"""

import yaml

from plugins.simulator.process.config import load_simulator_config


class TestLoadSimulatorConfig:
    def test_defaults_when_files_absent(self, tmp_path, monkeypatch):
        """Missing config files → empty dict (no crash)."""
        import plugins.simulator.process.config as cfg_mod

        monkeypatch.setattr(cfg_mod, "SIMULATOR_CONFIG_PATH", str(tmp_path / "missing.yaml"))
        monkeypatch.setattr(cfg_mod, "APP_CONFIG_PATH", str(tmp_path / "missing_app.yaml"))

        result = load_simulator_config()
        assert isinstance(result, dict)

    def test_reads_incident_mode_from_app_yaml_plugins_key(self, tmp_path, monkeypatch):
        """plugins.simulator.incident_mode in app.yaml is picked up."""
        import plugins.simulator.process.config as cfg_mod

        app_yaml = tmp_path / "app.yaml"
        app_yaml.write_text(
            yaml.dump({"plugins": {"simulator": {"incident_mode": "chaos"}}})
        )
        base_yaml = tmp_path / "plugin.yaml"
        base_yaml.write_text(yaml.dump({"incident_mode": "light"}))

        monkeypatch.setattr(cfg_mod, "SIMULATOR_CONFIG_PATH", str(base_yaml))
        monkeypatch.setattr(cfg_mod, "APP_CONFIG_PATH", str(app_yaml))

        result = load_simulator_config()
        # app.yaml overrides the base config
        assert result.get("incident_mode") == "chaos"

    def test_reads_from_base_config_when_app_yaml_absent(self, tmp_path, monkeypatch):
        """Base config values are returned when app.yaml has no simulator section."""
        import plugins.simulator.process.config as cfg_mod

        base_yaml = tmp_path / "plugin.yaml"
        base_yaml.write_text(yaml.dump({"incident_mode": "heavy", "changes_per_hour": 4}))
        app_yaml = tmp_path / "app.yaml"
        app_yaml.write_text(yaml.dump({}))

        monkeypatch.setattr(cfg_mod, "SIMULATOR_CONFIG_PATH", str(base_yaml))
        monkeypatch.setattr(cfg_mod, "APP_CONFIG_PATH", str(app_yaml))

        result = load_simulator_config()
        assert result.get("incident_mode") == "heavy"
        assert result.get("changes_per_hour") == 4

    def test_legacy_simulator_key_in_app_yaml(self, tmp_path, monkeypatch):
        """Legacy simulator.incident_mode key in app.yaml is picked up."""
        import plugins.simulator.process.config as cfg_mod

        app_yaml = tmp_path / "app.yaml"
        app_yaml.write_text(yaml.dump({"simulator": {"incident_mode": "medium"}}))
        base_yaml = tmp_path / "plugin.yaml"
        base_yaml.write_text(yaml.dump({}))

        monkeypatch.setattr(cfg_mod, "SIMULATOR_CONFIG_PATH", str(base_yaml))
        monkeypatch.setattr(cfg_mod, "APP_CONFIG_PATH", str(app_yaml))

        result = load_simulator_config()
        assert result.get("incident_mode") == "medium"
