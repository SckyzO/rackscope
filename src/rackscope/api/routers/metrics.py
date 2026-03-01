"""
Metrics Router

Endpoints for metrics library management and data querying.
"""

import time
from pathlib import Path
from typing import Optional, Annotated

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

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


@router.get("/library/files")
async def list_library_metric_files_v2(
    app_config: Annotated[Optional[AppConfig], Depends(get_app_config_optional)],
):
    """List all metric YAML files in the library directory.

    Must be defined before /library/{metric_id} to avoid FastAPI matching 'files' as a metric_id.
    """
    if not app_config:
        return {"files": []}
    library_path = Path(app_config.paths.metrics)
    if not library_path.exists() or not library_path.is_dir():
        return {"files": []}
    files = []
    for f in sorted(library_path.glob("*.yaml")) + sorted(library_path.glob("*.yml")):
        files.append({"name": f.name, "path": str(f)})
    return {"files": files}


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

    # Parse time range to duration in seconds
    _time_multipliers = {"m": 60, "h": 3600, "d": 86400, "w": 604800}
    try:
        if time_range[-1] in _time_multipliers:
            duration_seconds = int(time_range[:-1]) * _time_multipliers[time_range[-1]]
        else:
            duration_seconds = int(time_range)
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail=f"Invalid time_range: {time_range}")

    # Choose a sensible default step when the caller hasn't specified one
    if step == "1m":
        if duration_seconds <= 3600:  # ≤ 1h → 1m  (60 points)
            step = "1m"
        elif duration_seconds <= 21600:  # ≤ 6h → 5m  (72 points)
            step = "5m"
        elif duration_seconds <= 86400:  # ≤ 24h → 15m (96 points)
            step = "15m"
        elif duration_seconds <= 604800:  # ≤ 7d → 1h  (168 points)
            step = "1h"
        else:  # > 7d → 6h  (~120 points)
            step = "6h"

    now = time.time()
    start_ts = now - duration_seconds
    end_ts = now

    try:
        result = await prom_client.query_range(
            query=query,
            start=start_ts,
            end=end_ts,
            step=step,
        )

        # Extract matrix series from Prometheus response
        series: list = []
        if result.get("status") == "success":
            series = result.get("data", {}).get("result", [])

        return {
            "metric_id": metric_id,
            "target_id": target_id,
            "time_range": time_range,
            "step": step,
            "unit": metric.display.unit,
            "aggregation": agg,
            "query": query,
            "series": series,
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


@router.get("/files")
async def list_metrics_files(
    app_config: Annotated[Optional[AppConfig], Depends(get_app_config_optional)],
):
    """List YAML files in the metrics directory that start with 'metrics_'.
    Used by the Simulator plugin settings to populate the catalog path dropdown.
    """
    if not app_config:
        return {"files": []}

    metrics_path = Path(app_config.paths.metrics)
    # Search in: library path, its parent (config/metrics/), and the simulator
    # plugin directory where the actual catalog files live (metrics_full.yaml, etc.)
    # New layout: simulator catalogs are in config/plugins/simulator/metrics/
    sim_catalogs_dir = Path("config/plugins/simulator/metrics")
    search_dirs = [metrics_path, metrics_path.parent, sim_catalogs_dir]

    files = []
    seen = set()
    for search_dir in search_dirs:
        if not search_dir.exists() or not search_dir.is_dir():
            continue
        for f in sorted(search_dir.glob("metrics_*.yaml")) + sorted(
            search_dir.glob("metrics_*.yml")
        ):
            if f.name not in seen:
                seen.add(f.name)
                files.append({"name": f.name, "path": str(f)})

    return {"files": files}


class MetricFileWriteRequest(BaseModel):
    content: str


@router.get("/library/files")
async def list_library_metric_files(
    app_config: Annotated[Optional[AppConfig], Depends(get_app_config_optional)],
):
    """List all metric YAML files in the library directory."""
    if not app_config:
        return {"files": []}
    library_path = Path(app_config.paths.metrics)
    if not library_path.exists() or not library_path.is_dir():
        return {"files": []}
    files = []
    for f in sorted(library_path.glob("*.yaml")) + sorted(library_path.glob("*.yml")):
        files.append({"name": f.name, "path": str(f)})
    return {"files": files}


@router.get("/library/files/{name}")
async def get_library_metric_file(
    name: str,
    app_config: Annotated[Optional[AppConfig], Depends(get_app_config_optional)],
):
    """Read a metric YAML file from the library."""
    if not app_config:
        raise HTTPException(status_code=503, detail="Config not loaded")
    library_path = Path(app_config.paths.metrics) / name
    if not library_path.exists():
        raise HTTPException(status_code=404, detail=f"Metric file '{name}' not found")
    content = library_path.read_text(encoding="utf-8")
    return {"name": name, "content": content}


@router.put("/library/files/{name}")
async def put_library_metric_file(
    name: str,
    body: MetricFileWriteRequest,
    app_config: Annotated[Optional[AppConfig], Depends(get_app_config_optional)],
):
    """Write a metric YAML file to the library and reload the metrics library."""
    import yaml as _yaml

    if not app_config:
        raise HTTPException(status_code=503, detail="Config not loaded")
    try:
        _yaml.safe_load(body.content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {e}")
    library_path = Path(app_config.paths.metrics) / name
    library_path.write_text(body.content, encoding="utf-8")
    from rackscope.api import app as app_module
    from rackscope.model.loader import load_metrics_library as _load_metrics_library

    app_module.METRICS_LIBRARY = _load_metrics_library(str(library_path.parent))
    return {"status": "ok", "name": name}


@router.delete("/library/files/{name}")
async def delete_library_metric_file(
    name: str,
    app_config: Annotated[Optional[AppConfig], Depends(get_app_config_optional)],
):
    """Delete a metric YAML file from the library and reload."""
    if not app_config:
        raise HTTPException(status_code=503, detail="Config not loaded")
    library_path = Path(app_config.paths.metrics) / name
    if not library_path.exists():
        raise HTTPException(status_code=404, detail=f"Metric file '{name}' not found")
    library_path.unlink()
    from rackscope.api import app as app_module
    from rackscope.model.loader import load_metrics_library as _load_metrics_library

    app_module.METRICS_LIBRARY = _load_metrics_library(str(library_path.parent))
    return {"status": "deleted", "name": name}
