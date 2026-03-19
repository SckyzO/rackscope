"""Tests for metrics API router."""

import os
import tempfile
from pathlib import Path

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from rackscope.api.app import app
from rackscope.api import app as app_module
from rackscope.api.dependencies import get_app_config_optional
from rackscope.model.config import AppConfig, PathsConfig, TelemetryConfig
from rackscope.model.loader import load_metrics_library


@pytest.fixture
def client():
    """Create test client with metrics library loaded."""
    # Load metrics library before tests
    app_module.METRICS_LIBRARY = load_metrics_library("config/examples/hpc-cluster/metrics/library")
    return TestClient(app)


def test_list_metrics(client):
    """Test listing all metrics."""
    response = client.get("/api/metrics/library")
    assert response.status_code == 200

    data = response.json()
    assert "count" in data
    assert "metrics" in data
    assert data["count"] >= 5  # We created 5 default metrics

    # Check structure of first metric
    if data["metrics"]:
        metric = data["metrics"][0]
        assert "id" in metric
        assert "name" in metric
        assert "metric" in metric
        assert "display" in metric
        assert "unit" in metric["display"]


def test_list_metrics_filter_by_category(client):
    """Test filtering metrics by category."""
    response = client.get("/api/metrics/library?category=power")
    assert response.status_code == 200

    data = response.json()
    assert data["count"] >= 2  # node_power, rack_power, pdu_current

    # All returned metrics should be in power category
    for metric in data["metrics"]:
        assert metric["category"] == "power"


def test_list_metrics_filter_by_tag(client):
    """Test filtering metrics by tag."""
    # Use a tag that exists in hpc-cluster example
    response = client.get("/api/metrics/library?tag=power")
    assert response.status_code == 200

    data = response.json()
    assert data["count"] >= 1

    # All returned metrics should have the power tag
    for metric in data["metrics"]:
        assert "power" in metric["tags"]


def test_get_metric_definition_success(client):
    """Test getting specific metric definition."""
    response = client.get("/api/metrics/library/node_temperature")
    assert response.status_code == 200

    metric = response.json()
    assert metric["id"] == "node_temperature"
    assert metric["display"]["unit"] == "°C"
    # category and tags depend on the active example
    assert metric["category"] in ("temperature", "hardware")
    assert any(t in metric["tags"] for t in ["compute", "ipmi", "temperature"])


def test_get_metric_definition_not_found(client):
    """Test getting nonexistent metric."""
    response = client.get("/api/metrics/library/nonexistent_metric")
    assert response.status_code == 404

    data = response.json()
    assert "detail" in data
    assert "nonexistent_metric" in data["detail"]


def test_list_categories(client):
    """Test listing unique categories."""
    response = client.get("/api/metrics/categories")
    assert response.status_code == 200

    data = response.json()
    assert "categories" in data
    categories = data["categories"]

    # Categories depend on the active example
    assert "power" in categories
    # hpc-cluster uses hardware/cooling instead of temperature
    assert any(c in categories for c in ["temperature", "hardware", "cooling"])


def test_list_tags(client):
    """Test listing unique tags."""
    response = client.get("/api/metrics/tags")
    assert response.status_code == 200

    data = response.json()
    assert "tags" in data
    tags = data["tags"]

    # Should have at least some tags (exact values depend on the active example)
    assert len(tags) > 0
    # hpc-cluster example uses ipmi/pdu/hardware tags
    assert any(t in tags for t in ["compute", "hardware", "ipmi", "pdu"])


def test_query_metric_data_basic(client):
    """Test basic metric data query returns range query structure."""
    response = client.get(
        "/api/metrics/data",
        params={
            "metric_id": "node_temperature",
            "target_id": "compute001",
            "time_range": "1h",
        },
    )

    # Should succeed or fail gracefully depending on Prometheus availability
    # In test environment, Prometheus might not be available
    assert response.status_code in [200, 404, 500, 503]

    if response.status_code == 200:
        data = response.json()
        assert data["metric_id"] == "node_temperature"
        assert data["target_id"] == "compute001"
        assert data["unit"] == "°C"
        assert data["time_range"] == "1h"
        assert "step" in data
        assert "series" in data
        assert isinstance(data["series"], list)


def test_query_metric_data_nonexistent_metric(client):
    """Test querying data for nonexistent metric."""
    response = client.get(
        "/api/metrics/data",
        params={
            "metric_id": "nonexistent_metric",
            "target_id": "compute001",
            "time_range": "1h",
        },
    )

    assert response.status_code == 404
    data = response.json()
    assert "nonexistent_metric" in data["detail"]


def test_query_metric_data_with_aggregation_override(client):
    """Test metric data query with custom aggregation."""
    response = client.get(
        "/api/metrics/data",
        params={
            "metric_id": "node_power",
            "target_id": "compute001",
            "time_range": "6h",
            "aggregation": "max",
        },
    )

    # Should succeed or fail gracefully
    assert response.status_code in [200, 404, 500, 503]

    if response.status_code == 200:
        data = response.json()
        assert data["aggregation"] == "max"


def test_query_metric_data_invalid_time_range(client):
    """Test metric data query with invalid time range."""
    response = client.get(
        "/api/metrics/data",
        params={
            "metric_id": "node_temperature",
            "target_id": "compute001",
            "time_range": "invalid",
        },
    )

    assert response.status_code == 400
    data = response.json()
    assert "time_range" in data["detail"]


def test_query_metric_data_different_time_ranges(client):
    """Test metric data query with various time ranges."""
    time_ranges = ["1h", "6h", "24h", "7d"]

    for time_range in time_ranges:
        response = client.get(
            "/api/metrics/data",
            params={
                "metric_id": "node_load",
                "target_id": "compute001",
                "time_range": time_range,
            },
        )

        # Should at least not crash
        assert response.status_code in [200, 404, 500, 503]


def test_rack_power_metric_query(client):
    """Test querying rack power metric with PromQL."""
    response = client.get(
        "/api/metrics/data",
        params={
            "metric_id": "rack_power",
            "target_id": "r01-01",
            "time_range": "24h",
        },
    )

    # Should at least validate the metric exists
    assert response.status_code in [200, 404, 500, 503]

    if response.status_code == 200:
        data = response.json()
        assert data["metric_id"] == "rack_power"
        assert data["target_id"] == "r01-01"
        # Check that PromQL sum() is in the query
        assert "sum(" in data["query"]


# ── Range query and step selection tests ────────────────────────────────────────

_RANGE_MOCK_RESULT = {
    "status": "success",
    "data": {
        "resultType": "matrix",
        "result": [
            {
                "metric": {"instance": "compute001"},
                "values": [[1700000000, "42.5"], [1700000060, "43.1"]],
            }
        ],
    },
}


@pytest.mark.parametrize(
    "time_range,expected_step",
    [
        ("1h", "1m"),
        ("6h", "5m"),
        ("24h", "15m"),
        ("7d", "1h"),
        ("30d", "6h"),
    ],
)
def test_query_metric_data_step_auto_selection(client, time_range, expected_step):
    """Test that step is auto-selected based on time_range when not specified."""
    with patch(
        "rackscope.telemetry.prometheus.client.query_range",
        new=AsyncMock(return_value=_RANGE_MOCK_RESULT),
    ):
        response = client.get(
            "/api/metrics/data",
            params={
                "metric_id": "node_temperature",
                "target_id": "compute001",
                "time_range": time_range,
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["step"] == expected_step
    assert data["time_range"] == time_range


def test_query_metric_data_returns_series(client):
    """Test that /api/metrics/data returns series (range query), not a single value."""
    with patch(
        "rackscope.telemetry.prometheus.client.query_range",
        new=AsyncMock(return_value=_RANGE_MOCK_RESULT),
    ):
        response = client.get(
            "/api/metrics/data",
            params={
                "metric_id": "node_temperature",
                "target_id": "compute001",
                "time_range": "1h",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert "series" in data
    assert len(data["series"]) == 1
    assert data["series"][0]["metric"]["instance"] == "compute001"
    assert len(data["series"][0]["values"]) == 2


def test_query_metric_data_step_explicit_override(client):
    """Test that an explicit step parameter is respected."""
    with patch(
        "rackscope.telemetry.prometheus.client.query_range",
        new=AsyncMock(return_value=_RANGE_MOCK_RESULT),
    ):
        response = client.get(
            "/api/metrics/data",
            params={
                "metric_id": "node_temperature",
                "target_id": "compute001",
                "time_range": "24h",
                "step": "30m",
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["step"] == "30m"


def test_query_metric_data_prometheus_error_returns_500(client):
    """Test that a Prometheus error surfaces as HTTP 500."""
    with patch(
        "rackscope.telemetry.prometheus.client.query_range",
        new=AsyncMock(side_effect=RuntimeError("connection refused")),
    ):
        response = client.get(
            "/api/metrics/data",
            params={
                "metric_id": "node_temperature",
                "target_id": "compute001",
                "time_range": "1h",
            },
        )

    assert response.status_code == 500


def test_list_metrics_library_not_loaded():
    """Test /api/metrics/library when library not loaded."""
    from rackscope.api import app as app_module

    # Temporarily unload library
    original = app_module.METRICS_LIBRARY
    app_module.METRICS_LIBRARY = None

    try:
        client = TestClient(app)
        response = client.get("/api/metrics/library")
        assert response.status_code == 503
        assert "not loaded" in response.json()["detail"]
    finally:
        app_module.METRICS_LIBRARY = original


def test_get_metric_definition_library_not_loaded():
    """Test /api/metrics/library/{id} when library not loaded."""
    from rackscope.api import app as app_module

    original = app_module.METRICS_LIBRARY
    app_module.METRICS_LIBRARY = None

    try:
        client = TestClient(app)
        response = client.get("/api/metrics/library/node_temperature")
        assert response.status_code == 503
        assert "not loaded" in response.json()["detail"]
    finally:
        app_module.METRICS_LIBRARY = original


def test_query_metric_data_library_not_loaded():
    """Test /api/metrics/data when library not loaded."""
    from rackscope.api import app as app_module

    original = app_module.METRICS_LIBRARY
    app_module.METRICS_LIBRARY = None

    try:
        client = TestClient(app)
        response = client.get(
            "/api/metrics/data",
            params={
                "metric_id": "node_temperature",
                "target_id": "compute001",
                "time_range": "1h",
            },
        )
        assert response.status_code == 503
        assert "not loaded" in response.json()["detail"]
    finally:
        app_module.METRICS_LIBRARY = original


def test_list_categories_library_not_loaded():
    """Test /api/metrics/categories when library not loaded."""
    from rackscope.api import app as app_module

    original = app_module.METRICS_LIBRARY
    app_module.METRICS_LIBRARY = None

    try:
        client = TestClient(app)
        response = client.get("/api/metrics/categories")
        assert response.status_code == 503
        assert "not loaded" in response.json()["detail"]
    finally:
        app_module.METRICS_LIBRARY = original


def test_list_tags_library_not_loaded():
    """Test /api/metrics/tags when library not loaded."""
    from rackscope.api import app as app_module

    original = app_module.METRICS_LIBRARY
    app_module.METRICS_LIBRARY = None

    try:
        client = TestClient(app)
        response = client.get("/api/metrics/tags")
        assert response.status_code == 503
        assert "not loaded" in response.json()["detail"]
    finally:
        app_module.METRICS_LIBRARY = original


def test_list_library_files_no_config():
    """Test /api/metrics/library/files with no app config."""
    client = TestClient(app)
    response = client.get("/api/metrics/library/files")
    assert response.status_code == 200
    # Without config, should return empty list
    data = response.json()
    assert "files" in data


def test_list_metrics_files_no_config():
    """Test /api/metrics/files with no app config."""
    client = TestClient(app)
    response = client.get("/api/metrics/files")
    assert response.status_code == 200
    # Without config, should return empty list
    data = response.json()
    assert "files" in data


def test_get_library_metric_file_no_config():
    """Test /api/metrics/library/files/{name} with no app config."""
    from unittest.mock import patch

    with patch("rackscope.api.app.APP_CONFIG", None):
        client = TestClient(app)
        response = client.get("/api/metrics/library/files/test.yaml")
    assert response.status_code == 503
    assert "not loaded" in response.json()["detail"]


def test_put_library_metric_file_no_config():
    """Test /api/metrics/library/files/{name} PUT with no app config."""
    from unittest.mock import patch

    with patch("rackscope.api.app.APP_CONFIG", None):
        client = TestClient(app)
        response = client.put(
            "/api/metrics/library/files/test.yaml", json={"content": "metrics: []"}
        )
    assert response.status_code == 503
    assert "not loaded" in response.json()["detail"]


def test_put_library_metric_file_invalid_yaml():
    """Test /api/metrics/library/files/{name} PUT with invalid YAML."""
    from rackscope.api import app as app_module
    from rackscope.model.loader import load_app_config

    # Need app_config for this endpoint
    config_path = os.getenv("RACKSCOPE_APP_CONFIG", "config/app.yaml")
    app_module.APP_CONFIG = load_app_config(config_path)
    client = TestClient(app)

    response = client.put(
        "/api/metrics/library/files/test.yaml", json={"content": "invalid: yaml: content: ["}
    )
    assert response.status_code == 400
    assert "Invalid YAML" in response.json()["detail"]


def test_delete_library_metric_file_no_config():
    """Test /api/metrics/library/files/{name} DELETE with no app config."""
    from rackscope.api import app as app_module

    # Temporarily clear app config
    original = app_module.APP_CONFIG
    app_module.APP_CONFIG = None

    try:
        client = TestClient(app)
        response = client.delete("/api/metrics/library/files/test.yaml")
        assert response.status_code == 503
        assert "not loaded" in response.json()["detail"]
    finally:
        app_module.APP_CONFIG = original


def test_delete_library_metric_file_not_found():
    """Test /api/metrics/library/files/{name} DELETE when file doesn't exist."""
    from rackscope.api import app as app_module
    from rackscope.model.loader import load_app_config

    # Need app_config for this endpoint
    config_path = os.getenv("RACKSCOPE_APP_CONFIG", "config/app.yaml")
    app_module.APP_CONFIG = load_app_config(config_path)
    client = TestClient(app)

    response = client.delete("/api/metrics/library/files/nonexistent.yaml")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_query_metric_data_integer_time_range(client):
    """Test /api/metrics/data with integer time_range (seconds)."""
    with patch(
        "rackscope.telemetry.prometheus.client.query_range",
        new=AsyncMock(return_value=_RANGE_MOCK_RESULT),
    ):
        response = client.get(
            "/api/metrics/data",
            params={
                "metric_id": "node_temperature",
                "target_id": "compute001",
                "time_range": "3600",  # Raw seconds
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert data["time_range"] == "3600"


def test_list_library_files_no_config_override():
    """Test /api/metrics/library/files when no config available."""
    from rackscope.api.dependencies import get_app_config_optional

    original_overrides = app.dependency_overrides.copy()

    def override_app_config_to_none():
        return None

    app.dependency_overrides[get_app_config_optional] = override_app_config_to_none

    try:
        from fastapi.testclient import TestClient

        test_client = TestClient(app)
        response = test_client.get("/api/metrics/library/files")
        assert response.status_code == 200
        assert response.json()["files"] == []
    finally:
        app.dependency_overrides = original_overrides


def test_list_library_files_nonexistent_directory_override():
    """Test /api/metrics/library/files when directory doesn't exist."""
    from rackscope.api.dependencies import get_app_config_optional
    from rackscope.model.config import AppConfig, PathsConfig

    original_overrides = app.dependency_overrides.copy()

    def override_app_config_nonexistent():
        return AppConfig(
            paths=PathsConfig(
                topology="config/topology",
                templates="config/templates",
                checks="config/checks",
                metrics="/nonexistent/metrics/path",
            )
        )

    app.dependency_overrides[get_app_config_optional] = override_app_config_nonexistent

    try:
        from fastapi.testclient import TestClient

        test_client = TestClient(app)
        response = test_client.get("/api/metrics/library/files")
        assert response.status_code == 200
        assert response.json()["files"] == []
    finally:
        app.dependency_overrides = original_overrides


def test_list_metrics_files_no_config_override():
    """Test /api/metrics/files when no config available."""
    from rackscope.api.dependencies import get_app_config_optional

    original_overrides = app.dependency_overrides.copy()

    def override_app_config_to_none():
        return None

    app.dependency_overrides[get_app_config_optional] = override_app_config_to_none

    try:
        from fastapi.testclient import TestClient

        test_client = TestClient(app)
        response = test_client.get("/api/metrics/files")
        assert response.status_code == 200
        assert response.json()["files"] == []
    finally:
        app.dependency_overrides = original_overrides


# ── Metrics catalog CRUD endpoints ────────────────────────────────────────────

# Module-level client for catalog tests (independent of the fixture above)
_catalog_client = TestClient(app)


def _override_config(metrics_dir: str):
    cfg = AppConfig(
        paths=PathsConfig(
            topology="config/topology",
            templates="config/templates",
            checks="config/checks",
            metrics=metrics_dir,
        ),
        telemetry=TelemetryConfig(prometheus_heartbeat_seconds=30),
    )

    def _override():
        return cfg

    return _override


def test_validate_safe_path_invalid_filename():
    """_validate_safe_path raises 400 for paths with .. traversal."""
    with tempfile.TemporaryDirectory() as tmpdir:
        app.dependency_overrides[get_app_config_optional] = _override_config(tmpdir)
        response = _catalog_client.get("/api/metrics/library/files/../../../etc/passwd")
        assert response.status_code in (400, 404, 422)
        app.dependency_overrides.clear()


def test_validate_safe_path_traversal_denied():
    """Path traversal via encoded sequences is rejected."""
    with tempfile.TemporaryDirectory() as tmpdir:
        app.dependency_overrides[get_app_config_optional] = _override_config(tmpdir)
        # Double-dot embedded
        response = _catalog_client.get("/api/metrics/library/files/..%2Fsecret.yaml")
        assert response.status_code in (400, 404, 422)
        app.dependency_overrides.clear()


def test_list_metrics_catalog_files_returns_yaml_list():
    """GET /api/metrics/catalog/files returns list of yaml files in directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        Path(tmpdir, "metrics_node.yaml").write_text("metrics: []")
        Path(tmpdir, "metrics_pdu.yaml").write_text("metrics: []")
        app.dependency_overrides[get_app_config_optional] = _override_config(tmpdir)
        response = _catalog_client.get("/api/metrics/files")
        assert response.status_code == 200
        data = response.json()
        assert "files" in data
        names = [f["name"] for f in data["files"]]
        assert "metrics_node.yaml" in names
        app.dependency_overrides.clear()


def test_get_metrics_catalog_file_not_found():
    """GET /api/metrics/catalog/file/{name} returns 404 when file missing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        app.dependency_overrides[get_app_config_optional] = _override_config(tmpdir)
        response = _catalog_client.get("/api/metrics/library/files/nonexistent.yaml")
        assert response.status_code == 404
        app.dependency_overrides.clear()


def test_get_metrics_catalog_file_success():
    """GET /api/metrics/catalog/file/{name} returns file content."""
    with tempfile.TemporaryDirectory() as tmpdir:
        content = "metrics:\n  - id: test\n"
        Path(tmpdir, "metrics_test.yaml").write_text(content)
        app.dependency_overrides[get_app_config_optional] = _override_config(tmpdir)
        response = _catalog_client.get("/api/metrics/library/files/metrics_test.yaml")
        assert response.status_code == 200
        assert response.json()["content"] == content
        app.dependency_overrides.clear()


def test_update_metrics_catalog_file():
    """PUT /api/metrics/catalog/file/{name} writes file and reloads library."""
    with tempfile.TemporaryDirectory() as tmpdir:
        Path(tmpdir, "metrics_test.yaml").write_text("metrics: []")
        app.dependency_overrides[get_app_config_optional] = _override_config(tmpdir)
        response = _catalog_client.put(
            "/api/metrics/library/files/metrics_test.yaml",
            json={"content": "metrics:\n  - id: new\n"},
        )
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        app.dependency_overrides.clear()


def test_delete_metrics_catalog_file():
    """DELETE /api/metrics/catalog/file/{name} removes file and reloads library."""
    with tempfile.TemporaryDirectory() as tmpdir:
        Path(tmpdir, "metrics_test.yaml").write_text("metrics: []")
        app.dependency_overrides[get_app_config_optional] = _override_config(tmpdir)
        response = _catalog_client.delete("/api/metrics/library/files/metrics_test.yaml")
        assert response.status_code == 200
        assert response.json()["status"] == "deleted"
        assert not Path(tmpdir, "metrics_test.yaml").exists()
        app.dependency_overrides.clear()
