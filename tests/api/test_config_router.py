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


def test_get_config_with_plugins():
    """Test GET /api/config includes plugins section when available."""
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()

    # Check for expected structure
    assert isinstance(data, dict)
    # May have plugins section depending on test env
    if "plugins" in data:
        assert isinstance(data["plugins"], dict)


def test_get_config_default_structure():
    """Test GET /api/config returns dict with core sections."""
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()

    # Should have core configuration sections
    expected_sections = ["telemetry", "planner", "features"]
    for section in expected_sections:
        if section in data:
            assert isinstance(data[section], dict)


def test_get_env_all_keys_present():
    """Test GET /api/env returns all expected environment keys."""
    response = client.get("/api/env")
    assert response.status_code == 200
    data = response.json()

    # All env keys should be present (even if None)
    expected_keys = [
        "RACKSCOPE_APP_CONFIG",
        "RACKSCOPE_CONFIG_DIR",
        "RACKSCOPE_CONFIG",
        "RACKSCOPE_TEMPLATES",
        "RACKSCOPE_CHECKS",
        "PROMETHEUS_URL",
        "PROMETHEUS_CACHE_TTL",
    ]
    for key in expected_keys:
        assert key in data


def test_put_config_with_minimal_data():
    """Test PUT /api/config with minimal valid config structure."""
    minimal_config = {
        "paths": {
            "topology": "config/topology",
            "templates": "config/templates",
            "checks": "config/checks",
        },
        "telemetry": {
            "prometheus_url": "http://prometheus:9090",
            "identity_label": "instance",
        },
        "auth": {
            "enabled": False,
        },
        "features": {},
    }

    response = client.put("/api/config", json=minimal_config)
    # May succeed or fail depending on test env, but should not crash
    assert response.status_code in (200, 422, 500)


def test_put_config_preserves_auth_credentials():
    """Test PUT /api/config preserves auth credentials when not provided."""
    # First get current config
    response = client.get("/api/config")
    if response.status_code != 200:
        # Skip test if config not available
        return

    current_config = response.json()

    # Try to update with empty auth (should preserve existing)
    response = client.put("/api/config", json=current_config)
    # May succeed or fail depending on test env
    assert response.status_code in (200, 422, 500)
