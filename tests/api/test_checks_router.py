"""
Tests for Checks Router

Tests for health checks library management endpoints.
"""

import pytest
import yaml
from fastapi.testclient import TestClient

from rackscope.api.app import app
from rackscope.api.dependencies import get_app_config, get_checks_library_optional
from rackscope.model.checks import CheckDefinition, CheckRule, ChecksLibrary
from rackscope.model.config import AppConfig, PathsConfig

client = TestClient(app)


# Fixtures


@pytest.fixture
def temp_checks_dir(tmp_path):
    """Create temporary checks directory."""
    checks_dir = tmp_path / "checks"
    checks_dir.mkdir()
    return checks_dir


@pytest.fixture
def mock_app_config(temp_checks_dir):
    """Create test app config."""
    return AppConfig(
        paths=PathsConfig(
            topology="config/topology",
            templates="config/templates",
            checks=str(temp_checks_dir),
        )
    )


@pytest.fixture
def mock_checks_library():
    """Create test checks library."""
    check = CheckDefinition(
        id="node_up",
        name="Node Up",
        scope="node",
        expr="up",
        rules=[CheckRule(op="==", value=1, severity="OK")],
    )
    return ChecksLibrary(checks=[check])


def override_app_config(config):
    """Override get_app_config dependency."""

    def _get_app_config():
        return config

    return _get_app_config


def override_checks_library(library):
    """Override get_checks_library_optional dependency."""

    def _get_checks_library_optional():
        return library

    return _get_checks_library_optional


# Test GET /api/checks


def test_get_checks_library_success(mock_checks_library):
    """Test getting checks library."""
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(
        mock_checks_library
    )

    response = client.get("/api/checks")

    assert response.status_code == 200
    data = response.json()
    assert "checks" in data
    assert len(data["checks"]) == 1
    assert data["checks"][0]["id"] == "node_up"

    app.dependency_overrides.clear()


def test_get_checks_library_empty():
    """Test getting checks library when none loaded."""
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(None)

    response = client.get("/api/checks")

    assert response.status_code == 200
    data = response.json()
    assert data["checks"] == []

    app.dependency_overrides.clear()


# Test GET /api/checks/files


def test_get_checks_files_success(mock_app_config, temp_checks_dir):
    """Test listing checks files."""
    # Create test files
    (temp_checks_dir / "nodes.yaml").write_text("checks: []")
    (temp_checks_dir / "racks.yml").write_text("checks: []")

    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.get("/api/checks/files")

    assert response.status_code == 200
    data = response.json()
    assert "files" in data
    assert len(data["files"]) == 2
    file_names = [f["name"] for f in data["files"]]
    assert "nodes.yaml" in file_names
    assert "racks.yml" in file_names

    app.dependency_overrides.clear()


def test_get_checks_files_empty_directory(mock_app_config):
    """Test listing files in empty directory."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.get("/api/checks/files")

    assert response.status_code == 200
    data = response.json()
    assert data["files"] == []

    app.dependency_overrides.clear()


def test_get_checks_files_directory_not_exists(tmp_path):
    """Test listing files when directory doesn't exist."""
    config = AppConfig(
        paths=PathsConfig(
            topology="config/topology",
            templates="config/templates",
            checks=str(tmp_path / "nonexistent"),
        )
    )
    app.dependency_overrides[get_app_config] = override_app_config(config)

    response = client.get("/api/checks/files")

    assert response.status_code == 200
    data = response.json()
    assert data["files"] == []

    app.dependency_overrides.clear()


def test_get_checks_files_single_file(tmp_path):
    """Test when checks path points to a single file."""
    checks_file = tmp_path / "checks.yaml"
    checks_file.write_text("checks: []")

    config = AppConfig(
        paths=PathsConfig(
            topology="config/topology",
            templates="config/templates",
            checks=str(checks_file),
        )
    )
    app.dependency_overrides[get_app_config] = override_app_config(config)

    response = client.get("/api/checks/files")

    assert response.status_code == 200
    data = response.json()
    assert len(data["files"]) == 1
    assert data["files"][0]["name"] == "checks.yaml"

    app.dependency_overrides.clear()


# Test GET /api/checks/files/{name}


def test_read_checks_file_success(mock_app_config, temp_checks_dir):
    """Test reading a checks file."""
    content = yaml.safe_dump({"checks": [{"id": "test", "name": "Test"}]})
    (temp_checks_dir / "test.yaml").write_text(content)

    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.get("/api/checks/files/test.yaml")

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "test.yaml"
    assert "content" in data
    assert "checks:" in data["content"]

    app.dependency_overrides.clear()


def test_read_checks_file_not_found(mock_app_config):
    """Test reading non-existent file."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.get("/api/checks/files/nonexistent.yaml")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_read_checks_file_single_file_mode(tmp_path):
    """Test reading when checks path is a single file."""
    checks_file = tmp_path / "checks.yaml"
    content = "checks: []"
    checks_file.write_text(content)

    config = AppConfig(
        paths=PathsConfig(
            topology="config/topology",
            templates="config/templates",
            checks=str(checks_file),
        )
    )
    app.dependency_overrides[get_app_config] = override_app_config(config)

    # In single file mode, any name should return the same file
    response = client.get("/api/checks/files/any-name.yaml")

    assert response.status_code == 200
    data = response.json()
    assert data["content"] == content

    app.dependency_overrides.clear()


# Test PUT /api/checks/files/{name}


def test_write_checks_file_success(mock_app_config, temp_checks_dir):
    """Test writing a checks file."""
    import rackscope.api.app as app_module

    app_module.CHECKS_LIBRARY = None

    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    content = yaml.safe_dump(
        {
            "checks": [
                {
                    "id": "node_up",
                    "name": "Node Up",
                    "scope": "node",
                    "expr": "up",
                    "rules": [{"op": "==", "value": 1, "severity": "OK"}],
                }
            ]
        }
    )

    response = client.put("/api/checks/files/nodes.yaml", json={"content": content})

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["name"] == "nodes.yaml"

    # Verify file was written
    written_file = temp_checks_dir / "nodes.yaml"
    assert written_file.exists()
    file_data = yaml.safe_load(written_file.read_text())
    assert "checks" in file_data
    assert file_data["checks"][0]["id"] == "node_up"

    app.dependency_overrides.clear()


def test_write_checks_file_with_kinds_format(mock_app_config, temp_checks_dir):
    """Test writing checks file with kinds format."""
    import rackscope.api.app as app_module

    app_module.CHECKS_LIBRARY = None

    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    content = yaml.safe_dump(
        {
            "kinds": {
                "node": [
                    {
                        "id": "node_up",
                        "name": "Node Up",
                        "scope": "node",
                        "expr": "up",
                        "rules": [{"op": "==", "value": 1, "severity": "OK"}],
                    }
                ]
            }
        }
    )

    response = client.put("/api/checks/files/nodes.yaml", json={"content": content})

    assert response.status_code == 200

    app.dependency_overrides.clear()


def test_write_checks_file_missing_content(mock_app_config):
    """Test error when content is missing."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.put("/api/checks/files/test.yaml", json={})

    assert response.status_code == 400
    assert "Content is required" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_write_checks_file_empty_content(mock_app_config):
    """Test error when content is empty."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.put("/api/checks/files/test.yaml", json={"content": "   "})

    assert response.status_code == 400
    assert "Content is required" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_write_checks_file_invalid_yaml(mock_app_config):
    """Test error with invalid YAML."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.put("/api/checks/files/test.yaml", json={"content": "{ invalid yaml ]"})

    assert response.status_code == 400
    assert "Invalid YAML" in response.json()["detail"]

    app.dependency_overrides.clear()


def test_write_checks_file_validation_error(mock_app_config):
    """Test error when check validation fails."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    # Missing required fields
    content = yaml.safe_dump({"checks": [{"id": "test"}]})

    response = client.put("/api/checks/files/test.yaml", json={"content": content})

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "message" in detail
    assert "errors" in detail

    app.dependency_overrides.clear()


def test_write_checks_file_empty_rules(mock_app_config):
    """Test error when check has empty rules."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    content = yaml.safe_dump(
        {
            "checks": [
                {
                    "id": "node_up",
                    "name": "Node Up",
                    "scope": "node",
                    "expr": "up",
                    "rules": [],  # Empty rules
                }
            ]
        }
    )

    response = client.put("/api/checks/files/test.yaml", json={"content": content})

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "errors" in detail
    assert any("rules must not be empty" in str(e) for e in detail["errors"])

    app.dependency_overrides.clear()


def test_write_checks_file_duplicate_id(mock_app_config):
    """Test error when checks have duplicate IDs."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    content = yaml.safe_dump(
        {
            "checks": [
                {
                    "id": "test_check",
                    "name": "Test 1",
                    "scope": "node",
                    "expr": "up",
                    "rules": [{"op": "==", "value": 1, "severity": "OK"}],
                },
                {
                    "id": "test_check",  # Duplicate ID
                    "name": "Test 2",
                    "scope": "node",
                    "expr": "up",
                    "rules": [{"op": "==", "value": 1, "severity": "OK"}],
                },
            ]
        }
    )

    response = client.put("/api/checks/files/test.yaml", json={"content": content})

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "errors" in detail
    assert any("duplicate id" in str(e) for e in detail["errors"])

    app.dependency_overrides.clear()


def test_write_checks_file_single_file_mode(tmp_path):
    """Test writing when checks path is a single file."""
    import rackscope.api.app as app_module

    checks_file = tmp_path / "checks.yaml"
    checks_file.write_text("checks: []")

    config = AppConfig(
        paths=PathsConfig(
            topology="config/topology",
            templates="config/templates",
            checks=str(checks_file),
        )
    )
    app.dependency_overrides[get_app_config] = override_app_config(config)
    app_module.CHECKS_LIBRARY = None

    content = yaml.safe_dump(
        {
            "checks": [
                {
                    "id": "test",
                    "name": "Test",
                    "scope": "node",
                    "expr": "up",
                    "rules": [{"op": "==", "value": 1, "severity": "OK"}],
                }
            ]
        }
    )

    response = client.put("/api/checks/files/any-name.yaml", json={"content": content})

    assert response.status_code == 200
    # Verify content written to the single file
    file_data = yaml.safe_load(checks_file.read_text())
    assert file_data["checks"][0]["id"] == "test"

    app.dependency_overrides.clear()
