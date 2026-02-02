"""
Metrics Router

Endpoints for metrics library management and data querying.
"""

from typing import Optional, Annotated

from fastapi import APIRouter, HTTPException, Depends, Query

from rackscope.api.dependencies import get_app_config_optional
from rackscope.model.config import AppConfig

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("/library")
async def list_metrics(
    category: Optional[str] = Query(None, description="Filter by category"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
):
    """
    List all available metrics from the library.

    Query params:
    - category: Filter by category (power, temperature, performance, etc.)
    - tag: Filter by tag (compute, infrastructure, etc.)
    """
    from rackscope.api import app as app_module

    metrics_library = app_module.METRICS_LIBRARY
    if not metrics_library:
        raise HTTPException(status_code=503, detail="Metrics library not loaded")

    metrics = metrics_library.metrics

    # Filter by category
    if category:
        metrics = [m for m in metrics if m.category == category]

    # Filter by tag
    if tag:
        metrics = [m for m in metrics if tag in m.tags]

    return {
        "count": len(metrics),
        "metrics": [m.model_dump() for m in metrics],
    }


@router.get("/library/{metric_id}")
async def get_metric_definition(metric_id: str):
    """Get specific metric definition by ID."""
    from rackscope.api import app as app_module

    metrics_library = app_module.METRICS_LIBRARY
    if not metrics_library:
        raise HTTPException(status_code=503, detail="Metrics library not loaded")

    metric = metrics_library.get_metric(metric_id)
    if not metric:
        raise HTTPException(status_code=404, detail=f"Metric '{metric_id}' not found")

    return metric.model_dump()


@router.get("/data")
async def query_metric_data(
    metric_id: str = Query(..., description="Metric ID from library"),
    target_id: str = Query(..., description="Target instance/rack/chassis ID"),
    time_range: str = Query("24h", description="Time range (1h, 6h, 24h, 7d, 30d)"),
    aggregation: Optional[str] = Query(None, description="Override default aggregation"),
    step: str = Query("1m", description="Query step/resolution"),
    app_config: Annotated[Optional[AppConfig], Depends(get_app_config_optional)] = None,
):
    """
    Query Prometheus for metric data.

    Params:
    - metric_id: Metric ID from library
    - target_id: Target identifier (node instance, rack ID, etc.)
    - time_range: Time range (1h, 6h, 24h, 7d, 30d)
    - aggregation: Override default aggregation (avg, max, min, sum, p95, p99)
    - step: Query resolution (default 1m)

    Returns time series data from Prometheus.
    """
    from rackscope.api import app as app_module
    from rackscope.telemetry.prometheus import client as prom_client

    metrics_library = app_module.METRICS_LIBRARY
    if not metrics_library:
        raise HTTPException(status_code=503, detail="Metrics library not loaded")

    # Get metric definition
    metric = metrics_library.get_metric(metric_id)
    if not metric:
        raise HTTPException(status_code=404, detail=f"Metric '{metric_id}' not found")

    # Build Prometheus query with label substitution
    query = metric.metric

    # Create substitution map with all possible placeholders
    substitutions = {
        "{instance}": target_id,
        "{rack_id}": target_id,
        "{chassis_id}": target_id,
        "{pduid}": target_id,
        "{inletid}": "I1",  # Default values for optional labels
    }

    # Apply all substitutions
    for placeholder, value in substitutions.items():
        query = query.replace(placeholder, value)

    # Use specified or default aggregation
    agg = aggregation or metric.display.aggregation

    # Parse time range to seconds for Prometheus
    time_multipliers = {
        "m": 60,
        "h": 3600,
        "d": 86400,
        "w": 604800,
    }
    # Validate time range format
    try:
        if time_range[-1] in time_multipliers:
            _ = int(time_range[:-1]) * time_multipliers[time_range[-1]]
        else:
            _ = int(time_range)
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail=f"Invalid time_range: {time_range}")

    # Query Prometheus range
    try:
        # Note: This is a simplified implementation using instant query
        # TODO: Implement query_range with proper time range support
        # duration_seconds would be used here: query_range(query, duration_seconds, step)
        results = await prom_client.query(query)

        return {
            "metric_id": metric_id,
            "target_id": target_id,
            "time_range": time_range,
            "unit": metric.display.unit,
            "aggregation": agg,
            "query": query,
            "data": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")


@router.get("/categories")
async def list_categories():
    """List all unique metric categories."""
    from rackscope.api import app as app_module

    metrics_library = app_module.METRICS_LIBRARY
    if not metrics_library:
        raise HTTPException(status_code=503, detail="Metrics library not loaded")

    categories = sorted(set(m.category for m in metrics_library.metrics if m.category is not None))

    return {"categories": categories}


@router.get("/tags")
async def list_tags():
    """List all unique metric tags."""
    from rackscope.api import app as app_module

    metrics_library = app_module.METRICS_LIBRARY
    if not metrics_library:
        raise HTTPException(status_code=503, detail="Metrics library not loaded")

    tags = set()
    for metric in metrics_library.metrics:
        tags.update(metric.tags)

    return {"tags": sorted(tags)}
