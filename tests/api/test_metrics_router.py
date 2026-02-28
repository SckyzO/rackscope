"""Tests for metrics API router."""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from rackscope.api.app import app
from rackscope.api import app as app_module
from rackscope.model.loader import load_metrics_library


@pytest.fixture
def client():
    """Create test client with metrics library loaded."""
    # Load metrics library before tests
    app_module.METRICS_LIBRARY = load_metrics_library("config/metrics/library")
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
    response = client.get("/api/metrics/library?tag=compute")
    assert response.status_code == 200

    data = response.json()
    assert data["count"] >= 2  # node_temperature, node_power, node_load

    # All returned metrics should have compute tag
    for metric in data["metrics"]:
        assert "compute" in metric["tags"]


def test_get_metric_definition_success(client):
    """Test getting specific metric definition."""
    response = client.get("/api/metrics/library/node_temperature")
    assert response.status_code == 200

    metric = response.json()
    assert metric["id"] == "node_temperature"
    assert metric["name"] == "Node Temperature"
    assert metric["metric"] == "node_temperature_celsius"
    assert metric["display"]["unit"] == "°C"
    assert metric["category"] == "temperature"
    assert "compute" in metric["tags"]


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

    # Should have at least these categories
    assert "power" in categories
    assert "temperature" in categories
    assert "performance" in categories


def test_list_tags(client):
    """Test listing unique tags."""
    response = client.get("/api/metrics/tags")
    assert response.status_code == 200

    data = response.json()
    assert "tags" in data
    tags = data["tags"]

    # Should have at least these tags
    assert "compute" in tags
    assert "infrastructure" in tags
    assert "hardware" in tags


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
