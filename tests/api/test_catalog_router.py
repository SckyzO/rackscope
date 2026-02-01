"""
Tests for Catalog Router

Tests for hardware template management endpoints.
"""

import tempfile
from pathlib import Path
from unittest.mock import Mock

import pytest
import yaml
from fastapi.testclient import TestClient

from rackscope.api.app import app
from rackscope.api.dependencies import get_app_config, get_catalog_optional
from rackscope.model.catalog import Catalog, DeviceTemplate, LayoutConfig, RackTemplate
from rackscope.model.config import AppConfig, PathsConfig

client = TestClient(app)


# Fixtures


@pytest.fixture
def temp_templates_dir(tmp_path):
    """Create temporary templates directory."""
    templates_dir = tmp_path / "templates"
    templates_dir.mkdir()
    (templates_dir / "devices").mkdir()
    (templates_dir / "racks").mkdir()
    return templates_dir


@pytest.fixture
def mock_app_config(temp_templates_dir):
    """Create test app config."""
    return AppConfig(
        paths=PathsConfig(
            topology="config/topology",
            templates=str(temp_templates_dir),
            checks="config/checks",
        )
    )


@pytest.fixture
def mock_catalog():
    """Create test catalog with templates."""
    device_template = DeviceTemplate(
        id="compute_node",
        name="Compute Node",
        type="server",
        u_height=2,
        layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
    )
    rack_template = RackTemplate(
        id="standard_rack",
        name="Standard 42U Rack",
        u_height=42,
    )
    return Catalog(device_templates=[device_template], rack_templates=[rack_template])


def override_app_config(config):
    """Override get_app_config dependency."""

    def _get_app_config():
        return config

    return _get_app_config


def override_catalog(catalog):
    """Override get_catalog_optional dependency."""

    def _get_catalog_optional():
        return catalog

    return _get_catalog_optional


# Test GET /api/catalog


def test_get_catalog_success(mock_catalog):
    """Test getting catalog."""
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)

    response = client.get("/api/catalog")

    assert response.status_code == 200
    data = response.json()
    assert "device_templates" in data
    assert "rack_templates" in data
    assert len(data["device_templates"]) == 1
    assert len(data["rack_templates"]) == 1
    assert data["device_templates"][0]["id"] == "compute_node"
    assert data["rack_templates"][0]["id"] == "standard_rack"

    app.dependency_overrides.clear()


def test_get_catalog_empty():
    """Test getting catalog when none loaded."""
    app.dependency_overrides[get_catalog_optional] = override_catalog(None)

    response = client.get("/api/catalog")

    assert response.status_code == 200
    data = response.json()
    assert data["device_templates"] == []
    assert data["rack_templates"] == []

    app.dependency_overrides.clear()


# Test POST /api/catalog/templates (create)


def test_create_device_template_success(mock_app_config, temp_templates_dir):
    """Test creating a new device template."""
    import rackscope.api.app as app_module

    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)
    app.dependency_overrides[get_catalog_optional] = override_catalog(None)
    app_module.CATALOG = None

    response = client.post(
        "/api/catalog/templates",
        json={
            "kind": "device",
            "template": {
                "id": "test_server",
                "name": "Test Server",
                "type": "server",
                "u_height": 1,
                "layout": {"type": "grid", "rows": 1, "cols": 1, "matrix": [[1]]},
            },
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "test_server"
    assert data["name"] == "Test Server"

    # Verify file was created
    device_file = temp_templates_dir / "devices" / "server" / "test_server.yaml"
    assert device_file.exists()
    file_data = yaml.safe_load(device_file.read_text())
    assert file_data["templates"][0]["id"] == "test_server"

    app.dependency_overrides.clear()


def test_create_rack_template_success(mock_app_config, temp_templates_dir):
    """Test creating a new rack template."""
    import rackscope.api.app as app_module

    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)
    app.dependency_overrides[get_catalog_optional] = override_catalog(None)
    app_module.CATALOG = None

    response = client.post(
        "/api/catalog/templates",
        json={
            "kind": "rack",
            "template": {
                "id": "test_rack",
                "name": "Test Rack",
                "u_height": 42,
            },
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "test_rack"
    assert data["name"] == "Test Rack"

    # Verify file was created
    rack_file = temp_templates_dir / "racks" / "test_rack.yaml"
    assert rack_file.exists()
    file_data = yaml.safe_load(rack_file.read_text())
    assert file_data["rack_templates"][0]["id"] == "test_rack"

    app.dependency_overrides.clear()


def test_create_device_template_already_exists(mock_app_config, mock_catalog):
    """Test error when creating duplicate device template."""
    import rackscope.api.app as app_module

    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)
    app_module.CATALOG = mock_catalog

    response = client.post(
        "/api/catalog/templates",
        json={
            "kind": "device",
            "template": {
                "id": "compute_node",  # Already exists
                "name": "Another Node",
                "type": "server",
                "u_height": 1,
                "layout": {"type": "grid", "rows": 1, "cols": 1, "matrix": [[1]]},
            },
        },
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_create_rack_template_already_exists(mock_app_config, mock_catalog):
    """Test error when creating duplicate rack template."""
    import rackscope.api.app as app_module

    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)
    app_module.CATALOG = mock_catalog

    response = client.post(
        "/api/catalog/templates",
        json={
            "kind": "rack",
            "template": {
                "id": "standard_rack",  # Already exists
                "name": "Another Rack",
                "u_height": 42,
            },
        },
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_create_template_file_already_exists(mock_app_config, temp_templates_dir):
    """Test error when template file already exists."""
    import rackscope.api.app as app_module

    # Create existing file
    device_dir = temp_templates_dir / "devices" / "server"
    device_dir.mkdir(parents=True)
    existing_file = device_dir / "test_server.yaml"
    existing_file.write_text("templates: []")

    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)
    app.dependency_overrides[get_catalog_optional] = override_catalog(None)
    app_module.CATALOG = None

    response = client.post(
        "/api/catalog/templates",
        json={
            "kind": "device",
            "template": {
                "id": "test_server",
                "name": "Test Server",
                "type": "server",
                "u_height": 1,
                "layout": {"type": "grid", "rows": 1, "cols": 1, "matrix": [[1]]},
            },
        },
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_create_device_template_sanitizes_type(mock_app_config, temp_templates_dir):
    """Test that device type is sanitized for directory name."""
    import rackscope.api.app as app_module

    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)
    app.dependency_overrides[get_catalog_optional] = override_catalog(None)
    app_module.CATALOG = None

    response = client.post(
        "/api/catalog/templates",
        json={
            "kind": "device",
            "template": {
                "id": "test_device",
                "name": "Test Device",
                "type": "Special Server!!!",  # Should be sanitized
                "u_height": 1,
                "layout": {"type": "grid", "rows": 1, "cols": 1, "matrix": [[1]]},
            },
        },
    )

    assert response.status_code == 200

    # Verify file created in sanitized directory
    device_file = temp_templates_dir / "devices" / "special-server" / "test_device.yaml"
    assert device_file.exists()

    app.dependency_overrides.clear()


# Test PUT /api/catalog/templates (update)


def test_update_device_template_success(mock_app_config, temp_templates_dir):
    """Test updating an existing device template."""
    import rackscope.api.app as app_module

    # Create existing template file
    device_dir = temp_templates_dir / "devices" / "server"
    device_dir.mkdir(parents=True)
    device_file = device_dir / "test_server.yaml"
    device_file.write_text(
        yaml.safe_dump({
            "templates": [
                {
                    "id": "test_server",
                    "name": "Old Name",
                    "type": "server",
                    "u_height": 1,
                    "layout": {"type": "grid", "rows": 1, "cols": 1, "matrix": [[1]]},
                }
            ]
        })
    )

    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)
    app_module.CATALOG = None

    response = client.put(
        "/api/catalog/templates",
        json={
            "kind": "device",
            "template": {
                "id": "test_server",
                "name": "Updated Name",
                "type": "server",
                "u_height": 2,
                "layout": {"type": "grid", "rows": 1, "cols": 2, "matrix": [[1, 2]]},
            },
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["u_height"] == 2

    # Verify file was updated
    file_data = yaml.safe_load(device_file.read_text())
    assert file_data["templates"][0]["name"] == "Updated Name"
    assert file_data["templates"][0]["u_height"] == 2

    app.dependency_overrides.clear()


def test_update_rack_template_success(mock_app_config, temp_templates_dir):
    """Test updating an existing rack template."""
    import rackscope.api.app as app_module

    # Create existing template file
    racks_dir = temp_templates_dir / "racks"
    rack_file = racks_dir / "test_rack.yaml"
    rack_file.write_text(
        yaml.safe_dump({"rack_templates": [{"id": "test_rack", "name": "Old Name", "u_height": 42}]})
    )

    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)
    app_module.CATALOG = None

    response = client.put(
        "/api/catalog/templates",
        json={
            "kind": "rack",
            "template": {
                "id": "test_rack",
                "name": "Updated Rack Name",
                "u_height": 48,
            },
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Rack Name"
    assert data["u_height"] == 48

    # Verify file was updated
    file_data = yaml.safe_load(rack_file.read_text())
    assert file_data["rack_templates"][0]["name"] == "Updated Rack Name"

    app.dependency_overrides.clear()


def test_update_device_template_moves_file(mock_app_config, temp_templates_dir):
    """Test updating device template with different type moves file."""
    import rackscope.api.app as app_module

    # Create existing template in old type directory
    old_dir = temp_templates_dir / "devices" / "server"
    old_dir.mkdir(parents=True)
    old_file = old_dir / "test_device.yaml"
    old_file.write_text(
        yaml.safe_dump({
            "templates": [
                {
                    "id": "test_device",
                    "name": "Test Device",
                    "type": "server",
                    "u_height": 1,
                    "layout": {"type": "grid", "rows": 1, "cols": 1, "matrix": [[1]]},
                }
            ]
        })
    )

    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)
    app_module.CATALOG = None

    # Update with different type
    response = client.put(
        "/api/catalog/templates",
        json={
            "kind": "device",
            "template": {
                "id": "test_device",
                "name": "Test Device",
                "type": "storage",  # Different type
                "u_height": 1,
                "layout": {"type": "grid", "rows": 1, "cols": 1, "matrix": [[1]]},
            },
        },
    )

    assert response.status_code == 200

    # Verify old file deleted
    assert not old_file.exists()

    # Verify new file created in new location
    new_file = temp_templates_dir / "devices" / "storage" / "test_device.yaml"
    assert new_file.exists()

    app.dependency_overrides.clear()


# Test POST /api/catalog/templates/validate


def test_validate_device_template_success():
    """Test validating a valid device template."""
    response = client.post(
        "/api/catalog/templates/validate",
        json={
            "kind": "device",
            "template": {
                "id": "valid_device",
                "name": "Valid Device",
                "type": "server",
                "u_height": 1,
                "layout": {"type": "grid", "rows": 1, "cols": 1, "matrix": [[1]]},
            },
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_validate_rack_template_success():
    """Test validating a valid rack template."""
    response = client.post(
        "/api/catalog/templates/validate",
        json={
            "kind": "rack",
            "template": {
                "id": "valid_rack",
                "name": "Valid Rack",
                "u_height": 42,
            },
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_validate_device_template_invalid():
    """Test validating an invalid device template."""
    response = client.post(
        "/api/catalog/templates/validate",
        json={
            "kind": "device",
            "template": {
                "id": "invalid_device",
                "name": "Invalid Device",
                "type": "server",
                # Missing u_height and layout
            },
        },
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "message" in detail
    assert "errors" in detail


def test_validate_rack_template_invalid():
    """Test validating an invalid rack template."""
    response = client.post(
        "/api/catalog/templates/validate",
        json={
            "kind": "rack",
            "template": {
                "id": "invalid_rack",
                # Missing required name field
                "u_height": 42,
            },
        },
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "message" in detail
    assert "errors" in detail


def test_validate_device_template_invalid_layout():
    """Test validating device template with invalid layout."""
    response = client.post(
        "/api/catalog/templates/validate",
        json={
            "kind": "device",
            "template": {
                "id": "test_device",
                "name": "Test Device",
                "type": "server",
                "u_height": 1,
                "layout": {
                    "type": "invalid_type",  # Invalid layout type
                    "rows": 1,
                    "cols": 1,
                    "matrix": [[1]],
                },
            },
        },
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "errors" in detail
