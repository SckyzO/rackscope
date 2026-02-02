"""
Metrics Library Models

Defines metric definitions for visualization and data collection.
Metrics are separate from checks - they focus on data visualization
rather than health monitoring.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class MetricDisplay(BaseModel):
    """Display configuration for a metric."""

    unit: str = Field(..., description="Display unit (W, °C, %, bytes, etc.)")
    chart_type: str = Field(default="line", description="line, area, bar, gauge")
    color: Optional[str] = Field(None, description="Hex color for chart")

    time_ranges: List[str] = Field(
        default=["1h", "6h", "24h", "7d"],
        description="Available time range options",
    )
    default_range: str = Field(default="24h", description="Default time range")

    aggregation: str = Field(default="avg", description="avg, max, min, sum, p95, p99")

    thresholds: Optional[Dict[str, float]] = Field(
        None, description="Optional thresholds for visual indicators"
    )

    format: Optional[Dict[str, Any]] = Field(
        None, description="Optional formatting (decimals, multiplier, prefix, suffix)"
    )


class MetricDefinition(BaseModel):
    """Definition of a metric from the library."""

    id: str = Field(..., description="Unique metric identifier")
    name: str = Field(..., description="Human-readable name")
    description: Optional[str] = Field(None, description="Detailed description")

    metric: str = Field(..., description="Prometheus metric name or query")
    labels: Dict[str, str] = Field(
        default_factory=dict,
        description="Label substitutions ({instance}, {rack_id}, etc.)",
    )

    display: MetricDisplay = Field(..., description="Display configuration")

    category: Optional[str] = Field(
        None, description="power, temperature, network, storage, performance"
    )
    tags: List[str] = Field(default_factory=list, description="Tags for grouping")


class MetricsLibrary(BaseModel):
    """Collection of metric definitions."""

    metrics: List[MetricDefinition] = Field(default_factory=list)

    def get_metric(self, metric_id: str) -> Optional[MetricDefinition]:
        """Get metric by ID."""
        for metric in self.metrics:
            if metric.id == metric_id:
                return metric
        return None

    def get_metrics_by_category(self, category: str) -> List[MetricDefinition]:
        """Get all metrics in a category."""
        return [m for m in self.metrics if m.category == category]

    def get_metrics_by_tag(self, tag: str) -> List[MetricDefinition]:
        """Get all metrics with a specific tag."""
        return [m for m in self.metrics if tag in m.tags]
