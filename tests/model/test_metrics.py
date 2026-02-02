"""Tests for metrics library models and loader."""

import pytest
from pathlib import Path
import tempfile
import yaml

from rackscope.model.metrics import (
    MetricDisplay,
    MetricDefinition,
    MetricsLibrary,
)
from rackscope.model.loader import load_metrics_library


def test_metric_display_minimal():
    """Test minimal metric display config."""
    display = MetricDisplay(unit="W")
    assert display.unit == "W"
    assert display.chart_type == "line"
    assert display.default_range == "24h"
    assert display.aggregation == "avg"


def test_metric_display_full():
    """Test full metric display config."""
    display = MetricDisplay(
        unit="°C",
        chart_type="area",
        color="#ef4444",
        time_ranges=["1h", "6h", "24h"],
        default_range="6h",
        aggregation="max",
        thresholds={"warn": 70, "crit": 85},
        format={"decimals": 1},
    )
    assert display.unit == "°C"
    assert display.chart_type == "area"
    assert display.color == "#ef4444"
    assert display.time_ranges == ["1h", "6h", "24h"]
    assert display.default_range == "6h"
    assert display.aggregation == "max"
    assert display.thresholds == {"warn": 70, "crit": 85}
    assert display.format == {"decimals": 1}


def test_metric_definition_minimal():
    """Test minimal metric definition."""
    metric = MetricDefinition(
        id="test_metric",
        name="Test Metric",
        metric="test_metric_total",
        display=MetricDisplay(unit="count"),
    )
    assert metric.id == "test_metric"
    assert metric.name == "Test Metric"
    assert metric.metric == "test_metric_total"
    assert metric.display.unit == "count"
    assert metric.labels == {}
    assert metric.category is None
    assert metric.tags == []


def test_metric_definition_full():
    """Test full metric definition."""
    metric = MetricDefinition(
        id="node_temperature",
        name="Node Temperature",
        description="CPU/IPMI temperature sensor",
        metric="node_temperature_celsius",
        labels={"instance": "{instance}"},
        display=MetricDisplay(
            unit="°C",
            chart_type="line",
            color="#ef4444",
            aggregation="avg",
            thresholds={"warn": 70, "crit": 85},
        ),
        category="temperature",
        tags=["compute", "hardware"],
    )
    assert metric.id == "node_temperature"
    assert metric.name == "Node Temperature"
    assert metric.description == "CPU/IPMI temperature sensor"
    assert metric.metric == "node_temperature_celsius"
    assert metric.labels == {"instance": "{instance}"}
    assert metric.display.unit == "°C"
    assert metric.category == "temperature"
    assert metric.tags == ["compute", "hardware"]


def test_metrics_library_get_metric():
    """Test getting metric by ID."""
    library = MetricsLibrary(
        metrics=[
            MetricDefinition(
                id="metric1",
                name="Metric 1",
                metric="metric1_total",
                display=MetricDisplay(unit="count"),
            ),
            MetricDefinition(
                id="metric2",
                name="Metric 2",
                metric="metric2_total",
                display=MetricDisplay(unit="bytes"),
            ),
        ]
    )

    metric = library.get_metric("metric1")
    assert metric is not None
    assert metric.id == "metric1"
    assert metric.name == "Metric 1"

    metric = library.get_metric("nonexistent")
    assert metric is None


def test_metrics_library_get_by_category():
    """Test filtering metrics by category."""
    library = MetricsLibrary(
        metrics=[
            MetricDefinition(
                id="power1",
                name="Power 1",
                metric="power1",
                display=MetricDisplay(unit="W"),
                category="power",
            ),
            MetricDefinition(
                id="power2",
                name="Power 2",
                metric="power2",
                display=MetricDisplay(unit="W"),
                category="power",
            ),
            MetricDefinition(
                id="temp1",
                name="Temp 1",
                metric="temp1",
                display=MetricDisplay(unit="°C"),
                category="temperature",
            ),
        ]
    )

    power_metrics = library.get_metrics_by_category("power")
    assert len(power_metrics) == 2
    assert all(m.category == "power" for m in power_metrics)

    temp_metrics = library.get_metrics_by_category("temperature")
    assert len(temp_metrics) == 1
    assert temp_metrics[0].id == "temp1"


def test_metrics_library_get_by_tag():
    """Test filtering metrics by tag."""
    library = MetricsLibrary(
        metrics=[
            MetricDefinition(
                id="metric1",
                name="Metric 1",
                metric="metric1",
                display=MetricDisplay(unit="count"),
                tags=["compute", "hardware"],
            ),
            MetricDefinition(
                id="metric2",
                name="Metric 2",
                metric="metric2",
                display=MetricDisplay(unit="count"),
                tags=["compute", "software"],
            ),
            MetricDefinition(
                id="metric3",
                name="Metric 3",
                metric="metric3",
                display=MetricDisplay(unit="count"),
                tags=["network"],
            ),
        ]
    )

    compute_metrics = library.get_metrics_by_tag("compute")
    assert len(compute_metrics) == 2
    assert all("compute" in m.tags for m in compute_metrics)

    network_metrics = library.get_metrics_by_tag("network")
    assert len(network_metrics) == 1


def test_load_metrics_library_single_file():
    """Test loading metrics from a single YAML file."""
    with tempfile.TemporaryDirectory() as tmpdir:
        metrics_path = Path(tmpdir) / "metrics.yaml"
        metrics_path.write_text(
            yaml.safe_dump(
                {
                    "id": "test_metric",
                    "name": "Test Metric",
                    "metric": "test_metric_total",
                    "display": {
                        "unit": "count",
                        "chart_type": "line",
                    },
                }
            )
        )

        library = load_metrics_library(metrics_path)
        assert len(library.metrics) == 1
        assert library.metrics[0].id == "test_metric"


def test_load_metrics_library_multiple_metrics_in_file():
    """Test loading multiple metrics from one file."""
    with tempfile.TemporaryDirectory() as tmpdir:
        metrics_path = Path(tmpdir) / "metrics.yaml"
        metrics_path.write_text(
            yaml.safe_dump(
                {
                    "metrics": [
                        {
                            "id": "metric1",
                            "name": "Metric 1",
                            "metric": "metric1",
                            "display": {"unit": "count"},
                        },
                        {
                            "id": "metric2",
                            "name": "Metric 2",
                            "metric": "metric2",
                            "display": {"unit": "bytes"},
                        },
                    ]
                }
            )
        )

        library = load_metrics_library(metrics_path)
        assert len(library.metrics) == 2
        assert library.metrics[0].id == "metric1"
        assert library.metrics[1].id == "metric2"


def test_load_metrics_library_directory():
    """Test loading metrics from a directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmppath = Path(tmpdir)

        # Create multiple metric files
        (tmppath / "power.yaml").write_text(
            yaml.safe_dump(
                {
                    "id": "node_power",
                    "name": "Node Power",
                    "metric": "node_power_watts",
                    "display": {"unit": "W"},
                    "category": "power",
                }
            )
        )

        (tmppath / "temp.yaml").write_text(
            yaml.safe_dump(
                {
                    "id": "node_temperature",
                    "name": "Node Temperature",
                    "metric": "node_temperature_celsius",
                    "display": {"unit": "°C"},
                    "category": "temperature",
                }
            )
        )

        library = load_metrics_library(tmppath)
        assert len(library.metrics) == 2

        # Check we have both metrics
        ids = {m.id for m in library.metrics}
        assert "node_power" in ids
        assert "node_temperature" in ids


def test_load_metrics_library_nonexistent_path():
    """Test loading from nonexistent path returns empty library."""
    library = load_metrics_library("/nonexistent/path")
    assert len(library.metrics) == 0


def test_load_metrics_library_with_actual_config():
    """Test loading the actual metrics library from config."""
    library = load_metrics_library("config/metrics/library")
    # Should have the 5 metrics we created
    assert len(library.metrics) >= 5

    # Check some expected metrics exist
    node_temp = library.get_metric("node_temperature")
    assert node_temp is not None
    assert node_temp.display.unit == "°C"

    node_power = library.get_metric("node_power")
    assert node_power is not None
    assert node_power.display.unit == "W"

    rack_power = library.get_metric("rack_power")
    assert rack_power is not None
    assert rack_power.category == "power"
