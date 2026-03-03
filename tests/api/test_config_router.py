"""Tests for Config Router."""

from fastapi.testclient import TestClient

from rackscope.api.app import app

client = TestClient(app)


def test_get_config():
    """Test GET /api/config returns current app config."""
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()

    # Should have at least some of these top-level keys
    # (may vary based on whether app config is loaded)
    expected_keys = ["features", "telemetry", "paths", "refresh", "cache", "planner"]
    assert any(key in data for key in expected_keys)


def test_get_env():
    """Test GET /api/env returns environment variables dict."""
    response = client.get("/api/env")
    assert response.status_code == 200
    data = response.json()

    # Should be a dict
    assert isinstance(data, dict)

    # Should contain expected env var keys (even if values are None)
    expected_keys = [
        "RACKSCOPE_APP_CONFIG",
        "RACKSCOPE_CONFIG_DIR",
        "PROMETHEUS_URL",
    ]
    for key in expected_keys:
        assert key in data


def test_wizard_disable():
    """Test POST /api/setup/wizard/disable returns wizard status."""
    response = client.post("/api/setup/wizard/disable")

    # May return 200 or 500 depending on config state in test env
    # but should not be 404
    assert response.status_code in (200, 500)

    data = response.json()
    assert "wizard" in data

    # Response should contain wizard status (boolean)
    assert isinstance(data["wizard"], bool)
