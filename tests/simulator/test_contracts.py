"""
Contract tests for the Simulator plugin.

These tests enforce that:
  1. The public API response shape matches the documented schema.
  2. Migrated / removed fields do NOT reappear in models or API responses.
  3. New fields introduced by a migration ARE present and accessible.

If a future refactoring accidentally reintroduces an old field or removes a
required one, these tests will fail immediately at `make test` time — before
the bug ever reaches a running container.

HOW TO ADD A MIGRATION CONTRACT
--------------------------------
After any model or API change, add one positive assertion (new field exists)
and one negative assertion (old field gone) to the relevant class below.

Example:
  def test_new_field_present(self):
      cfg = SimulatorPluginConfig()
      assert hasattr(cfg, 'my_new_field')

  def test_old_field_gone(self):
      cfg = SimulatorPluginConfig()
      assert not hasattr(cfg, 'my_removed_field')
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from plugins.simulator.backend import SimulatorPlugin
from plugins.simulator.backend.config import (
    CustomIncidents,
    IncidentMode,
    SimulatorPluginConfig,
)
from rackscope.api.app import app
from rackscope.model.config import SimulatorConfig
from rackscope.plugins.registry import registry

# Register simulator routes once per test session (idempotent)
if not registry.get_plugin("simulator"):
    _plugin = SimulatorPlugin()
    registry.register(_plugin)
    _plugin.register_routes(app)

client = TestClient(app)


# ── SimulatorPluginConfig model ────────────────────────────────────────────────


class TestSimulatorPluginConfigContract:
    """Verify the plugin config model has the right fields after the
    incident-mode migration (replacing probabilistic incident_rates)."""

    # ── New fields must exist ──────────────────────────────────────────────

    def test_incident_mode_field_present(self):
        cfg = SimulatorPluginConfig()
        assert hasattr(cfg, "incident_mode")

    def test_incident_mode_defaults_to_light(self):
        cfg = SimulatorPluginConfig()
        assert cfg.incident_mode == IncidentMode.LIGHT

    def test_changes_per_hour_field_present(self):
        cfg = SimulatorPluginConfig()
        assert hasattr(cfg, "changes_per_hour")

    def test_changes_per_hour_defaults_to_two(self):
        cfg = SimulatorPluginConfig()
        assert cfg.changes_per_hour == 2

    def test_custom_incidents_field_present(self):
        cfg = SimulatorPluginConfig()
        assert hasattr(cfg, "custom_incidents")
        assert isinstance(cfg.custom_incidents, CustomIncidents)

    def test_all_incident_modes_valid(self):
        for mode in ("full_ok", "light", "medium", "heavy", "chaos", "custom"):
            cfg = SimulatorPluginConfig(incident_mode=mode)
            assert cfg.incident_mode == mode

    # ── Removed fields must NOT exist ─────────────────────────────────────

    def test_scenario_field_gone(self):
        """Migration: scenario system removed in favour of incident_mode."""
        cfg = SimulatorPluginConfig()
        assert not hasattr(cfg, "scenario")

    def test_scale_factor_field_gone(self):
        """Migration: scale_factor removed — incident_mode replaces it."""
        cfg = SimulatorPluginConfig()
        assert not hasattr(cfg, "scale_factor")

    def test_incident_rates_field_gone(self):
        """Migration: probabilistic incident_rates removed."""
        cfg = SimulatorPluginConfig()
        assert not hasattr(cfg, "incident_rates")

    def test_incident_durations_field_gone(self):
        """Migration: duration-based incidents removed."""
        cfg = SimulatorPluginConfig()
        assert not hasattr(cfg, "incident_durations")

    def test_extra_fields_silently_ignored(self):
        """Old YAML files with scenario/scale_factor must not crash on load."""
        cfg = SimulatorPluginConfig(
            **{
                "incident_mode": "light",
                "scenario": "full-ok",  # old field — must be ignored
                "scale_factor": 0.5,  # old field — must be ignored
                "incident_rates": {"node_micro_failure": 0.001},  # old field
            }
        )
        assert cfg.incident_mode == "light"


# ── SimulatorConfig legacy model ───────────────────────────────────────────────


class TestSimulatorConfigLegacyContract:
    """Verify the legacy app.yaml SimulatorConfig model is also clean."""

    def test_scenario_field_gone_from_legacy_model(self):
        cfg = SimulatorConfig()
        assert not hasattr(cfg, "scenario")

    def test_scale_factor_field_gone_from_legacy_model(self):
        cfg = SimulatorConfig()
        assert not hasattr(cfg, "scale_factor")

    def test_incident_rates_field_gone_from_legacy_model(self):
        cfg = SimulatorConfig()
        assert not hasattr(cfg, "incident_rates")

    def test_incident_durations_field_gone_from_legacy_model(self):
        cfg = SimulatorConfig()
        assert not hasattr(cfg, "incident_durations")


# ── GET /api/simulator/status response shape ───────────────────────────────────


class TestSimulatorStatusContract:
    """Verify the status endpoint response contains the right fields.

    These tests will catch any AttributeError on the config object
    (e.g. accessing cfg.scenario after the field was removed) before
    it ever reaches a running container.
    """

    @pytest.fixture(autouse=True)
    def _mock_http(self):
        """Mock the httpx call so the test does not need a running simulator."""

        class _Resp:
            status_code = 200

        with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=_Resp())):
            yield

    def test_incident_mode_in_response(self):
        response = client.get("/api/simulator/status")
        assert response.status_code == 200
        data = response.json()
        assert "incident_mode" in data, "incident_mode must be in status response"

    def test_changes_per_hour_in_response(self):
        response = client.get("/api/simulator/status")
        data = response.json()
        assert "changes_per_hour" in data, "changes_per_hour must be in status response"

    def test_running_field_in_response(self):
        response = client.get("/api/simulator/status")
        data = response.json()
        assert "running" in data
        assert "endpoint" in data
        assert "update_interval" in data
        assert "overrides_count" in data

    # ── Removed fields must NOT appear in the response ────────────────────

    def test_scenario_not_in_response(self):
        """Migration: scenario was removed from the status response."""
        response = client.get("/api/simulator/status")
        data = response.json()
        assert "scenario" not in data, (
            "scenario must NOT be in status response — it was removed in the "
            "incident-mode migration. Re-adding it here means cfg.scenario is "
            "accessed somewhere and will AttributeError on production."
        )

    def test_scale_factor_not_in_response(self):
        response = client.get("/api/simulator/status")
        data = response.json()
        assert "scale_factor" not in data


# ── IncidentMode enum completeness ────────────────────────────────────────────


class TestIncidentModeEnum:
    """Verify all documented modes are present in the enum."""

    def test_all_presets_in_enum(self):
        modes = {m.value for m in IncidentMode}
        assert modes == {"full_ok", "light", "medium", "heavy", "chaos", "custom"}

    def test_enum_values_match_loop_presets(self):
        """INCIDENT_PRESETS in loop.py must cover every non-custom mode."""
        from plugins.simulator.process.loop import INCIDENT_PRESETS

        non_custom_modes = {m.value for m in IncidentMode if m != IncidentMode.CUSTOM}
        missing = non_custom_modes - set(INCIDENT_PRESETS.keys())
        assert not missing, (
            f"These IncidentMode values have no entry in INCIDENT_PRESETS: {missing}"
        )
