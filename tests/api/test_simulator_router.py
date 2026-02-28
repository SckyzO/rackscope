"""
Tests for Simulator Router

Tests for simulator control endpoints (demo mode).
"""

from pathlib import Path

import pytest
import yaml
from fastapi.testclient import TestClient

from rackscope.api.app import app
from rackscope.api.dependencies import get_app_config_optional
from rackscope.model.config import AppConfig, PathsConfig, SimulatorConfig
from rackscope.plugins.registry import registry
from rackscope.plugins.simulator import SimulatorPlugin

# Register simulator plugin for tests
if not registry.get_plugin("simulator"):
    simulator_plugin = SimulatorPlugin()
    registry.register(simulator_plugin)
    simulator_plugin.register_routes(app)

client = TestClient(app)


@pytest.fixture
def mock_app_config_with_simulator(tmp_path):
    """Create test app config with simulator settings."""
    overrides_path = tmp_path / "simulator_overrides.yaml"
    overrides_path.write_text(yaml.safe_dump({"overrides": []}))

    return AppConfig(
        paths=PathsConfig(
            topology="config/topology",
            templates="config/templates",
            checks="config/checks",
        ),
        simulator=SimulatorConfig(
            overrides_path=str(overrides_path),
            default_ttl_seconds=120,
        ),
    )


def override_app_config(config):
    """Override get_app_config_optional dependency."""

    async def _get_app_config_optional():
        return config

    return _get_app_config_optional


def test_get_simulator_scenarios_success(tmp_path):
    """Test getting simulator scenarios."""
    # Create YAML content
    yaml_content = yaml.safe_dump(
        {
            "scenarios": {
                "normal": {"description": "Normal operation"},
                "crisis": {"description": "Multiple failures"},
            }
        }
    )

    # Mock Path methods
    with pytest.MonkeyPatch.context() as m:
        m.setattr(Path, "exists", lambda self: True)
        m.setattr(Path, "read_text", lambda self: yaml_content)

        response = client.get("/api/simulator/scenarios")

    assert response.status_code == 200
    data = response.json()
    assert "scenarios" in data
    assert len(data["scenarios"]) == 2
    assert any(s["name"] == "normal" for s in data["scenarios"])
    assert any(s["name"] == "crisis" for s in data["scenarios"])


def test_get_simulator_scenarios_no_file():
    """Test getting scenarios when file doesn't exist."""
    with pytest.MonkeyPatch.context() as m:
        m.setattr(Path, "exists", lambda self: False)

        response = client.get("/api/simulator/scenarios")

    assert response.status_code == 200
    data = response.json()
    assert data["scenarios"] == []


def test_get_simulator_scenarios_invalid_yaml(tmp_path):
    """Test getting scenarios with invalid YAML."""
    with pytest.MonkeyPatch.context() as m:
        m.setattr(Path, "exists", lambda self: True)
        m.setattr(Path, "read_text", lambda self: "{ invalid yaml ][")

        response = client.get("/api/simulator/scenarios")

    assert response.status_code == 200
    data = response.json()
    assert data["scenarios"] == []


def test_get_simulator_overrides_success(mock_app_config_with_simulator):
    """Test getting simulator overrides."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    # Write some overrides
    overrides_path = Path(mock_app_config_with_simulator.simulator.overrides_path)
    overrides_path.write_text(
        yaml.safe_dump(
            {"overrides": [{"id": "override1", "instance": "node01", "metric": "up", "value": 0}]}
        )
    )

    response = client.get("/api/simulator/overrides")

    assert response.status_code == 200
    data = response.json()
    assert "overrides" in data
    assert len(data["overrides"]) == 1
    assert data["overrides"][0]["id"] == "override1"

    app.dependency_overrides.clear()


def test_get_simulator_overrides_no_file(mock_app_config_with_simulator):
    """Test getting overrides when file doesn't exist."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    # Delete the file
    overrides_path = Path(mock_app_config_with_simulator.simulator.overrides_path)
    overrides_path.unlink(missing_ok=True)

    response = client.get("/api/simulator/overrides")

    assert response.status_code == 200
    data = response.json()
    assert data["overrides"] == []

    app.dependency_overrides.clear()


def test_add_simulator_override_success(mock_app_config_with_simulator):
    """Test adding a simulator override."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post(
        "/api/simulator/overrides",
        json={
            "instance": "node01",
            "metric": "node_temperature_celsius",
            "value": 90.0,
            "ttl_seconds": 300,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "overrides" in data
    assert len(data["overrides"]) == 1
    override = data["overrides"][0]
    assert override["instance"] == "node01"
    assert override["metric"] == "node_temperature_celsius"
    assert override["value"] == 90.0
    assert "expires_at" in override

    app.dependency_overrides.clear()


def test_add_simulator_override_rack_down(mock_app_config_with_simulator):
    """Test adding rack_down override."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post(
        "/api/simulator/overrides",
        json={"rack_id": "rack01", "metric": "rack_down", "value": 1.0},
    )

    assert response.status_code == 200
    data = response.json()
    override = data["overrides"][0]
    assert override["rack_id"] == "rack01"
    assert override["metric"] == "rack_down"

    app.dependency_overrides.clear()


def test_add_simulator_override_missing_metric(mock_app_config_with_simulator):
    """Test error when metric is missing."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post(
        "/api/simulator/overrides",
        json={"instance": "node01", "value": 1.0},
    )

    assert response.status_code == 400
    assert "metric is required" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_add_simulator_override_invalid_metric(mock_app_config_with_simulator):
    """Test error with invalid metric."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post(
        "/api/simulator/overrides",
        json={"instance": "node01", "metric": "invalid_metric", "value": 1.0},
    )

    assert response.status_code == 400
    assert "Unsupported metric" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_add_simulator_override_missing_instance_and_rack(mock_app_config_with_simulator):
    """Test error when both instance and rack_id are missing."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post(
        "/api/simulator/overrides",
        json={"metric": "up", "value": 0.0},
    )

    assert response.status_code == 400
    assert "instance or rack_id is required" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_add_simulator_override_rack_down_requires_rack_id(mock_app_config_with_simulator):
    """Test error when rack_down used with instance."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post(
        "/api/simulator/overrides",
        json={"instance": "node01", "metric": "rack_down", "value": 1.0},
    )

    assert response.status_code == 400
    assert "rack_down requires rack_id" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_add_simulator_override_invalid_value_type(mock_app_config_with_simulator):
    """Test error with non-numeric value."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post(
        "/api/simulator/overrides",
        json={"instance": "node01", "metric": "up", "value": "not_a_number"},
    )

    assert response.status_code == 400
    assert "must be numeric" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_add_simulator_override_invalid_health_status(mock_app_config_with_simulator):
    """Test error with invalid node_health_status value."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post(
        "/api/simulator/overrides",
        json={"instance": "node01", "metric": "node_health_status", "value": 5.0},
    )

    assert response.status_code == 400
    assert "must be 0, 1, or 2" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_add_simulator_override_invalid_up_value(mock_app_config_with_simulator):
    """Test error with invalid up value."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post(
        "/api/simulator/overrides",
        json={"instance": "node01", "metric": "up", "value": 0.5},
    )

    assert response.status_code == 400
    assert "must be 0 or 1" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_add_simulator_override_with_default_ttl(tmp_path):
    """Test adding override with default TTL from config."""
    config = AppConfig(
        paths=PathsConfig(
            topology="config/topology",
            templates="config/templates",
            checks="config/checks",
        ),
        simulator=SimulatorConfig(
            overrides_path=str(tmp_path / "overrides.yaml"),
            default_ttl_seconds=60,
        ),
    )

    # Create empty overrides file
    (tmp_path / "overrides.yaml").write_text(yaml.safe_dump({"overrides": []}))

    app.dependency_overrides[get_app_config_optional] = override_app_config(config)

    response = client.post(
        "/api/simulator/overrides",
        json={"instance": "node01", "metric": "up", "value": 0.0},
    )

    assert response.status_code == 200
    override = response.json()["overrides"][0]
    assert "expires_at" in override

    app.dependency_overrides.clear()


def test_add_simulator_override_zero_ttl_no_expiry(mock_app_config_with_simulator):
    """Test that zero TTL means no expiration."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post(
        "/api/simulator/overrides",
        json={"instance": "node01", "metric": "up", "value": 0.0, "ttl_seconds": 0},
    )

    assert response.status_code == 200
    override = response.json()["overrides"][0]
    assert "expires_at" not in override

    app.dependency_overrides.clear()


def test_clear_simulator_overrides(mock_app_config_with_simulator):
    """Test clearing all overrides."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    # Add some overrides first
    overrides_path = Path(mock_app_config_with_simulator.simulator.overrides_path)
    overrides_path.write_text(
        yaml.safe_dump(
            {
                "overrides": [
                    {"id": "override1", "instance": "node01", "metric": "up", "value": 0},
                    {"id": "override2", "instance": "node02", "metric": "up", "value": 0},
                ]
            }
        )
    )

    response = client.delete("/api/simulator/overrides")

    assert response.status_code == 200
    data = response.json()
    assert data["overrides"] == []

    # Verify file was updated
    file_data = yaml.safe_load(overrides_path.read_text())
    assert file_data["overrides"] == []

    app.dependency_overrides.clear()


def test_delete_simulator_override_by_id(mock_app_config_with_simulator):
    """Test deleting a specific override."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    # Add some overrides
    overrides_path = Path(mock_app_config_with_simulator.simulator.overrides_path)
    overrides_path.write_text(
        yaml.safe_dump(
            {
                "overrides": [
                    {"id": "override1", "instance": "node01", "metric": "up", "value": 0},
                    {"id": "override2", "instance": "node02", "metric": "up", "value": 0},
                ]
            }
        )
    )

    response = client.delete("/api/simulator/overrides/override1")

    assert response.status_code == 200
    data = response.json()
    assert len(data["overrides"]) == 1
    assert data["overrides"][0]["id"] == "override2"

    app.dependency_overrides.clear()


def test_delete_simulator_override_not_found(mock_app_config_with_simulator):
    """Test deleting non-existent override."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    overrides_path = Path(mock_app_config_with_simulator.simulator.overrides_path)
    overrides_path.write_text(
        yaml.safe_dump(
            {"overrides": [{"id": "override1", "instance": "node01", "metric": "up", "value": 0}]}
        )
    )

    response = client.delete("/api/simulator/overrides/nonexistent")

    assert response.status_code == 200
    # Should still return remaining overrides
    data = response.json()
    assert len(data["overrides"]) == 1

    app.dependency_overrides.clear()


def test_get_simulator_status_not_running():
    """Test getting simulator status when simulator is unreachable."""
    from unittest.mock import AsyncMock, patch

    import httpx

    with patch(
        "httpx.AsyncClient.get",
        new=AsyncMock(side_effect=httpx.ConnectError("connection refused")),
    ):
        response = client.get("/api/simulator/status")

    assert response.status_code == 200
    data = response.json()
    assert "running" in data
    assert data["running"] is False
    assert "endpoint" in data
    assert "simulator:9000" in data["endpoint"]


def test_get_available_metrics_from_library(mock_app_config_with_simulator):
    """Test getting available metrics from metrics library."""
    from rackscope.api import app as app_module
    from rackscope.model.loader import load_metrics_library

    # Load actual metrics library
    app_module.METRICS_LIBRARY = load_metrics_library("config/metrics/library")

    response = client.get("/api/simulator/metrics")

    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert len(data["metrics"]) >= 5  # We created 5 metrics

    # Check structure
    if data["metrics"]:
        metric = data["metrics"][0]
        assert "id" in metric
        assert "name" in metric
        assert "unit" in metric
        assert "category" in metric


def test_get_available_metrics_fallback():
    """Test getting metrics when library not loaded."""
    from rackscope.api import app as app_module

    # Clear metrics library
    original = app_module.METRICS_LIBRARY
    app_module.METRICS_LIBRARY = None

    response = client.get("/api/simulator/metrics")

    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert len(data["metrics"]) >= 1  # Should have fallback metrics

    # Restore
    app_module.METRICS_LIBRARY = original


def test_trigger_incident_rack_down(mock_app_config_with_simulator):
    """Test triggering rack down incident."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post(
        "/api/simulator/incidents",
        json={"type": "rack_down", "target_id": "r01-01", "duration": 300},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "triggered"
    assert data["incident_type"] == "rack_down"
    assert data["target_id"] == "r01-01"
    assert data["duration"] == 300
    assert "expires_at" in data

    # Verify override was created
    overrides_path = Path(mock_app_config_with_simulator.simulator.overrides_path)
    overrides_data = yaml.safe_load(overrides_path.read_text())
    assert len(overrides_data["overrides"]) == 1
    override = overrides_data["overrides"][0]
    assert override["rack_id"] == "r01-01"
    assert override["metric"] == "rack_down"
    assert override["value"] == 1

    app.dependency_overrides.clear()


def test_trigger_incident_rack_down_permanent(mock_app_config_with_simulator):
    """Test triggering permanent rack down incident."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post(
        "/api/simulator/incidents",
        json={"type": "rack_down", "target_id": "r01-01", "duration": 0},
    )

    assert response.status_code == 200
    data = response.json()
    # When duration is 0, expires_at should be None (no expiration)
    assert data.get("expires_at") is None

    app.dependency_overrides.clear()


def test_trigger_incident_aisle_cooling(mock_app_config_with_simulator):
    """Test triggering aisle cooling failure."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post(
        "/api/simulator/incidents",
        json={"type": "aisle_cooling", "target_id": "aisle-a", "duration": 600},
    )

    # Currently not implemented
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "not_implemented"

    app.dependency_overrides.clear()


def test_trigger_incident_missing_type(mock_app_config_with_simulator):
    """Test error when type is missing."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post("/api/simulator/incidents", json={"target_id": "r01-01"})

    assert response.status_code == 400
    assert "type and target_id are required" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_trigger_incident_invalid_type(mock_app_config_with_simulator):
    """Test error with invalid incident type."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post(
        "/api/simulator/incidents",
        json={"type": "invalid_type", "target_id": "r01-01"},
    )

    assert response.status_code == 400
    assert "rack_down" in response.json()["detail"]
    assert "aisle_cooling" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_trigger_incident_negative_duration(mock_app_config_with_simulator):
    """Test error with negative duration."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(
        mock_app_config_with_simulator
    )

    response = client.post(
        "/api/simulator/incidents",
        json={"type": "rack_down", "target_id": "r01-01", "duration": -100},
    )

    assert response.status_code == 400
    assert "non-negative" in response.json()["detail"]

    app.dependency_overrides.clear()
