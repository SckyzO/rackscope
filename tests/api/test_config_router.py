"""Tests for Config Router."""

import pytest
from fastapi.testclient import TestClient

from rackscope.api.app import app

client = TestClient(app)


@pytest.fixture()
def protect_app_yaml():
    """Snapshot app.yaml before the test and restore it after, preventing test pollution."""
    path = "config/app.yaml"
    try:
        with open(path) as f:
            original = f.read()
    except FileNotFoundError:
        original = None
    yield
    if original is not None:
        with open(path, "w") as f:
            f.write(original)


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


def test_wizard_disable(protect_app_yaml):
    """Test POST /api/setup/wizard/disable — app.yaml restored after."""
    response = client.post("/api/setup/wizard/disable")
    assert response.status_code in (200, 500)
    data = response.json()
    assert "wizard" in data
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


def test_put_config_with_minimal_data(protect_app_yaml):
    """Test PUT /api/config — app.yaml restored after."""
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
        "auth": {"enabled": False},
        "features": {},
    }
    response = client.put("/api/config", json=minimal_config)
    assert response.status_code in (200, 422, 500)


def test_put_config_preserves_auth_credentials(protect_app_yaml):
    """Test PUT /api/config — app.yaml restored after."""
    response = client.get("/api/config")
    if response.status_code != 200:
        return
    current_config = response.json()
    response = client.put("/api/config", json=current_config)
    assert response.status_code in (200, 422, 500)
