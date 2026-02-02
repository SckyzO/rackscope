# Phase 6.5: Metrics Library Implementation

**Status**: 🎯 Ready to Start
**Duration**: 2-3 days
**Priority**: HIGH (before Phase 7)
**Dependencies**: Phase 6 completed ✅

---

## 📋 Objectives

Implement a metrics library system before Phase 7 (Frontend Rebuild) to:
1. ✅ Standardize metric definitions (like checks library)
2. ✅ Enable UI debugging with real metric data
3. ✅ Make simulator generic (any metric override)
4. ✅ Provide foundation for Phase 7 charts

---

## 🎯 Why Before Phase 7?

**Problem**: Building charts in Phase 7 without working metrics = hard to debug
**Solution**: Have metrics library ready → test backend → then build UI

**Benefits**:
- Test metric collection independently
- Debug Prometheus queries before UI
- Validate metric definitions early
- Simulator testing more realistic

---

## 📊 Architecture Overview

```
config/metrics/library/          ← New directory
  ├── node_temperature.yaml
  ├── node_power.yaml
  ├── node_load.yaml
  ├── rack_power.yaml
  ├── pdu_current.yaml
  └── switch_uptime.yaml

src/rackscope/
  ├── model/
  │   ├── metrics.py             ← New: MetricDefinition models
  │   └── loader.py              ← Extend: load_metrics_library()
  │
  ├── api/routers/
  │   └── metrics.py             ← New: /api/metrics/* endpoints
  │
  └── plugins/simulator/
      └── plugin.py              ← Refactor: dynamic metrics
```

---

## 📅 Implementation Plan

### Day 1: Core Models & Loader (4-5 hours)

#### Task 1.1: Create Pydantic Models
**File**: `src/rackscope/model/metrics.py`

```python
from typing import Optional, List, Dict
from pydantic import BaseModel, Field


class MetricDisplay(BaseModel):
    """Display configuration for a metric."""
    unit: str = Field(..., description="Display unit (W, °C, %, bytes, etc.)")
    chart_type: str = Field(default="line", description="line, area, bar, gauge")
    color: Optional[str] = Field(None, description="Hex color for chart")

    time_ranges: List[str] = Field(
        default=["1h", "6h", "24h", "7d"],
        description="Available time range options"
    )
    default_range: str = Field(default="24h", description="Default time range")

    aggregation: str = Field(default="avg", description="avg, max, min, sum, p95, p99")

    thresholds: Optional[Dict[str, float]] = Field(
        None,
        description="Optional thresholds for visual indicators"
    )

    format: Optional[Dict[str, any]] = Field(
        None,
        description="Optional formatting (decimals, multiplier, prefix, suffix)"
    )


class MetricDefinition(BaseModel):
    """Definition of a metric from the library."""
    id: str = Field(..., description="Unique metric identifier")
    name: str = Field(..., description="Human-readable name")
    description: Optional[str] = Field(None, description="Detailed description")

    metric: str = Field(..., description="Prometheus metric or query")
    labels: Dict[str, str] = Field(
        default_factory=dict,
        description="Label substitutions (like checks)"
    )

    display: MetricDisplay = Field(..., description="Display configuration")

    category: Optional[str] = Field(None, description="power, temperature, network, storage")
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
```

#### Task 1.2: Extend Loader
**File**: `src/rackscope/model/loader.py`

```python
from rackscope.model.metrics import MetricsLibrary, MetricDefinition

def load_metrics_library(path: str) -> MetricsLibrary:
    """
    Load all metric definitions from a directory.

    Similar to load_checks_library(), recursively loads YAML files
    and validates them against MetricDefinition schema.
    """
    path_obj = Path(path)
    if not path_obj.exists():
        logger.warning(f"Metrics library path not found: {path}")
        return MetricsLibrary()

    all_metrics = []

    # Recursively load YAML files
    for yaml_file in path_obj.rglob("*.yaml"):
        try:
            with yaml_file.open() as f:
                data = yaml.safe_load(f)

            if not data:
                continue

            # Support single or multiple metrics per file
            if "metrics" in data:
                for metric_data in data["metrics"]:
                    metric = MetricDefinition(**metric_data)
                    all_metrics.append(metric)
            elif "id" in data:
                metric = MetricDefinition(**data)
                all_metrics.append(metric)

        except Exception as e:
            logger.error(f"Failed to load metric from {yaml_file}: {e}")

    logger.info(f"Loaded {len(all_metrics)} metrics from {path}")
    return MetricsLibrary(metrics=all_metrics)
```

#### Task 1.3: Update App State
**File**: `src/rackscope/api/app.py`

```python
# Add global state
METRICS_LIBRARY: Optional[MetricsLibrary] = None

# In lifespan startup
if os.path.exists(app_config_path):
    APP_CONFIG = load_app_config(app_config_path)
    # ... existing code ...
    METRICS_LIBRARY = load_metrics_library(APP_CONFIG.paths.metrics)
else:
    # ... existing code ...
    metrics_path = os.getenv("RACKSCOPE_METRICS", "config/metrics/library")
    METRICS_LIBRARY = load_metrics_library(metrics_path)

logger.info(f"Loaded {len(METRICS_LIBRARY.metrics)} metrics")
```

#### Task 1.4: Tests
**File**: `tests/model/test_metrics.py`

```python
def test_metric_definition_minimal():
    """Test minimal metric definition."""

def test_metric_definition_full():
    """Test full metric with all fields."""

def test_metrics_library_get_metric():
    """Test getting metric by ID."""

def test_load_metrics_library():
    """Test loading metrics from YAML files."""
```

---

### Day 2: API Endpoints & Data Collection (4-5 hours)

#### Task 2.1: Metrics Router
**File**: `src/rackscope/api/routers/metrics.py`

```python
from fastapi import APIRouter, HTTPException
from typing import Optional

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("/library")
async def list_metrics(
    category: Optional[str] = None,
    tag: Optional[str] = None
):
    """
    List all available metrics from the library.

    Query params:
    - category: Filter by category (power, temperature, etc.)
    - tag: Filter by tag
    """
    from rackscope.api import app as app_module

    METRICS_LIBRARY = app_module.METRICS_LIBRARY
    if not METRICS_LIBRARY:
        raise HTTPException(status_code=503, detail="Metrics library not loaded")

    metrics = METRICS_LIBRARY.metrics

    # Filter by category
    if category:
        metrics = [m for m in metrics if m.category == category]

    # Filter by tag
    if tag:
        metrics = [m for m in metrics if tag in m.tags]

    return {
        "count": len(metrics),
        "metrics": [m.model_dump() for m in metrics]
    }


@router.get("/library/{metric_id}")
async def get_metric_definition(metric_id: str):
    """Get specific metric definition."""
    from rackscope.api import app as app_module

    METRICS_LIBRARY = app_module.METRICS_LIBRARY
    if not METRICS_LIBRARY:
        raise HTTPException(status_code=503, detail="Metrics library not loaded")

    metric = METRICS_LIBRARY.get_metric(metric_id)
    if not metric:
        raise HTTPException(status_code=404, detail=f"Metric '{metric_id}' not found")

    return metric.model_dump()


@router.get("/data")
async def query_metric_data(
    metric_id: str,
    target_id: str,
    time_range: str = "24h",
    aggregation: Optional[str] = None
):
    """
    Query Prometheus for metric data.

    Params:
    - metric_id: Metric ID from library
    - target_id: Target (device instance, rack ID, etc.)
    - time_range: Time range (1h, 6h, 24h, 7d)
    - aggregation: Override default aggregation
    """
    from rackscope.api import app as app_module
    from rackscope.telemetry.prometheus import client as prom_client

    METRICS_LIBRARY = app_module.METRICS_LIBRARY
    if not METRICS_LIBRARY:
        raise HTTPException(status_code=503, detail="Metrics library not loaded")

    # Get metric definition
    metric = METRICS_LIBRARY.get_metric(metric_id)
    if not metric:
        raise HTTPException(status_code=404, detail=f"Metric '{metric_id}' not found")

    # Build Prometheus query with label substitution
    query = metric.metric
    for label, template in metric.labels.items():
        value = template.replace("{instance}", target_id).replace("{rack_id}", target_id)
        query = query.replace(f"{{{label}}}", value)

    # Use specified or default aggregation
    agg = aggregation or metric.display.aggregation

    # Query Prometheus range
    try:
        results = await prom_client.query_range(
            query=query,
            range=time_range,
            step="1m"  # TODO: Make configurable
        )

        return {
            "metric_id": metric_id,
            "target_id": target_id,
            "time_range": time_range,
            "unit": metric.display.unit,
            "data": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")
```

#### Task 2.2: Register Router
**File**: `src/rackscope/api/app.py`

```python
from rackscope.api.routers import (
    config,
    catalog,
    checks,
    topology,
    telemetry,
    plugins,
    metrics,  # ← Add
)

app.include_router(metrics.router)
```

#### Task 2.3: Tests
**File**: `tests/api/test_metrics_router.py`

```python
def test_list_metrics():
    """Test listing all metrics."""

def test_get_metric_definition():
    """Test getting specific metric."""

def test_query_metric_data():
    """Test querying Prometheus for metric data."""

def test_filter_metrics_by_category():
    """Test filtering metrics by category."""
```

---

### Day 3: Default Metrics + Simulator Refactor (4-5 hours)

#### Task 3.1: Create Default Metrics
**Directory**: `config/metrics/library/`

**`node_temperature.yaml`**:
```yaml
id: node_temperature
name: Node Temperature
description: "CPU/IPMI temperature sensor"
metric: node_temperature_celsius
labels:
  instance: "{instance}"
display:
  unit: "°C"
  chart_type: line
  color: "#ef4444"
  time_ranges: [1h, 6h, 24h, 7d]
  default_range: 24h
  aggregation: avg
  thresholds:
    warn: 70
    crit: 85
category: temperature
tags: [compute, hardware]
```

**`node_power.yaml`**:
```yaml
id: node_power
name: Node Power Consumption
description: "Real-time power draw"
metric: node_power_watts
labels:
  instance: "{instance}"
display:
  unit: "W"
  chart_type: area
  color: "#fbbf24"
  time_ranges: [1h, 6h, 24h, 7d]
  default_range: 24h
  aggregation: avg
category: power
tags: [compute, energy]
```

**`node_load.yaml`**:
```yaml
id: node_load
name: Node CPU Load
description: "CPU load percentage"
metric: node_load_percent
labels:
  instance: "{instance}"
display:
  unit: "%"
  chart_type: line
  color: "#3b82f6"
  time_ranges: [1h, 6h, 24h]
  default_range: 6h
  aggregation: avg
  thresholds:
    warn: 80
    crit: 95
category: performance
tags: [compute, cpu]
```

**`rack_power.yaml`**:
```yaml
id: rack_power
name: Rack Power Consumption
description: "Total rack power from PDUs"
metric: sum(pdu_power_watts{rack_id="{rack_id}"})
labels:
  rack_id: "{rack_id}"
display:
  unit: "W"
  chart_type: area
  color: "#f59e0b"
  time_ranges: [1h, 6h, 24h, 7d, 30d]
  default_range: 24h
  aggregation: avg
  thresholds:
    warn: 8000
    crit: 10000
category: power
tags: [infrastructure, energy]
```

**`pdu_current.yaml`**:
```yaml
id: pdu_current
name: PDU Current
description: "PDU current draw in amperes"
metric: pdu_current_amperes
labels:
  rack_id: "{rack_id}"
  pdu_id: "{pdu_id}"
display:
  unit: "A"
  chart_type: line
  color: "#8b5cf6"
  time_ranges: [1h, 6h, 24h]
  default_range: 6h
  aggregation: avg
  thresholds:
    warn: 28
    crit: 32
category: power
tags: [infrastructure, pdu]
```

#### Task 3.2: Refactor Simulator Plugin
**File**: `src/rackscope/plugins/simulator/plugin.py`

Remove hardcoded metrics, use library dynamically:

```python
@self._router.post("/overrides")
def add_simulator_override(
    payload: dict,
    app_config: Annotated[Optional[AppConfig], Depends(get_app_config_optional)],
):
    """Add a new simulator override."""
    from rackscope.api import app as app_module

    METRICS_LIBRARY = app_module.METRICS_LIBRARY

    # Get available metrics dynamically
    valid_metrics = set()
    if METRICS_LIBRARY:
        valid_metrics = {m.id for m in METRICS_LIBRARY.metrics}

    # Fallback to hardcoded for backwards compatibility
    if not valid_metrics:
        valid_metrics = {
            "up", "node_temperature_celsius", "node_power_watts",
            "node_load_percent", "node_health_status", "rack_down"
        }

    metric = payload.get("metric")
    if not metric:
        raise HTTPException(status_code=400, detail="metric is required")

    if metric not in valid_metrics:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported metric. Available: {sorted(valid_metrics)}"
        )

    # ... rest of validation and save logic ...
```

**New endpoint for metric discovery**:
```python
@self._router.get("/metrics")
def get_available_metrics():
    """Get list of metrics available for override."""
    from rackscope.api import app as app_module

    METRICS_LIBRARY = app_module.METRICS_LIBRARY
    if not METRICS_LIBRARY:
        return {"metrics": []}

    return {
        "metrics": [
            {
                "id": m.id,
                "name": m.name,
                "unit": m.display.unit,
                "category": m.category
            }
            for m in METRICS_LIBRARY.metrics
        ]
    }
```

#### Task 3.3: Add Metrics to Templates
Update existing device templates:

```yaml
# config/templates/devices/server/bs-1u-twin-cpu.yaml
id: bs-1u-twin-cpu
# ... existing fields ...
checks:
  - node_up
  - ipmi_temperature_state
metrics:
  - node_temperature   # ← Add
  - node_power
  - node_load
```

#### Task 3.4: Integration Tests
**File**: `tests/integration/test_metrics_flow.py`

```python
def test_end_to_end_metric_collection():
    """Test full flow: library → API → query → data."""

def test_simulator_uses_metrics_library():
    """Test simulator discovers metrics from library."""
```

---

## ✅ Success Criteria

After Phase 6.5, we should have:

1. ✅ **Metrics Library Loaded**
   ```bash
   curl http://localhost:8000/api/metrics/library
   → Returns list of metrics with display config
   ```

2. ✅ **Metric Definitions Work**
   ```bash
   curl http://localhost:8000/api/metrics/library/node_temperature
   → Returns full metric definition
   ```

3. ✅ **Data Collection Works**
   ```bash
   curl "http://localhost:8000/api/metrics/data?metric_id=node_temperature&target_id=node01&time_range=24h"
   → Returns Prometheus data points
   ```

4. ✅ **Simulator Uses Library**
   ```bash
   curl http://localhost:8000/api/simulator/metrics
   → Returns dynamically loaded metrics

   curl -X POST http://localhost:8000/api/simulator/overrides \
     -d '{"metric": "node_temperature", "instance": "node01", "value": 95}'
   → Works with any library metric
   ```

5. ✅ **Tests Pass**
   ```bash
   make test
   → All 311+ tests passing
   ```

---

## 📊 Metrics After Phase 6.5

| Metric | Before | After |
|--------|--------|-------|
| Tests | 311 | 320+ |
| Metrics Defined | 0 | 5-10 |
| API Endpoints | 38 | 41 (+3) |
| Simulator Flexibility | Hardcoded | Dynamic |

---

## 🚀 Ready for Phase 7

After Phase 6.5:
- ✅ Metrics library system operational
- ✅ Backend can provide metric data
- ✅ Metric definitions validated
- ✅ Simulator testing more realistic
- ✅ **Phase 7 can focus on UI** without backend blockers

---

## 📝 Checklist

### Day 1: Models & Loader
- [ ] Create `model/metrics.py` with Pydantic models
- [ ] Extend `loader.py` with `load_metrics_library()`
- [ ] Update `app.py` to load metrics on startup
- [ ] Write model tests
- [ ] Commit: "feat(metrics): add metrics library models and loader"

### Day 2: API
- [ ] Create `api/routers/metrics.py`
- [ ] Implement `/api/metrics/library` endpoint
- [ ] Implement `/api/metrics/library/{id}` endpoint
- [ ] Implement `/api/metrics/data` query endpoint
- [ ] Register router in `app.py`
- [ ] Write API tests
- [ ] Commit: "feat(metrics): add metrics API endpoints"

### Day 3: Content & Refactor
- [ ] Create `config/metrics/library/` directory
- [ ] Add default metrics (5-10 common ones)
- [ ] Refactor simulator to use metrics library
- [ ] Add `/api/simulator/metrics` discovery endpoint
- [ ] Update device templates with metric references
- [ ] Write integration tests
- [ ] Manual testing with curl
- [ ] Commit: "feat(metrics): add default metrics and refactor simulator"

### Final
- [ ] Update documentation
- [ ] All tests passing
- [ ] Manual smoke test
- [ ] Ready for Phase 7

---

**Estimated Time**: 2-3 days (12-15 hours)
**Risk**: LOW (additive changes, no breaking modifications)
**Blocker for**: Phase 7 (Frontend Rebuild)
