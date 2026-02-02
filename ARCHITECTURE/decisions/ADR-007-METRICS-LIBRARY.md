# ADR-007: Metrics Library System

**Status**: ✅ Accepted
**Date**: 2026-02-02
**Context**: Phase 6 completed, preparing Phase 7

---

## Context

After implementing the plugin architecture and generic metrics collection, we need a standardized way to define and display metrics for visualization (charts, graphs) in the UI.

**Key Insight**: Metrics (visualization) and Checks (health/alerting) are **two distinct systems** that serve different purposes:

- **Checks** → Health monitoring, alerting (OK/WARN/CRIT states)
- **Metrics** → Data visualization, charts, trends, analytics

---

## Problem

### Current Situation (Phase 6)

✅ **Backend**: Generic metrics collection service ready
```python
collect_device_metrics(device, template)  # ✅ Works
collect_component_metrics(component, template)  # ✅ Works
```

❌ **Configuration**: No standardized way to define metrics
```yaml
# Device template
metrics: []  # Empty - not yet defined
```

❌ **Display**: No configuration for how to visualize metrics
- What unit? (W, °C, %, bytes)
- What chart type? (line, area, bar)
- What time ranges? (1h, 24h, 7d)
- What aggregation? (avg, max, min, p95)

### Use Cases

**Use Case 1**: Rack Power Dashboard
- Display total rack power consumption over 24h
- Show trend line with thresholds (warn: 8kW, crit: 10kW)
- Allow user to switch between 1h/6h/24h/7d views

**Use Case 2**: Node Temperature Monitoring
- Display CPU/IPMI temperature for compute nodes
- Multiple time ranges for operators
- Color-coded based on thresholds

**Use Case 3**: Simulator Override
- Operator wants to override any metric for testing
- Simulator needs to know all available metrics dynamically
- Currently hardcoded list (bad)

---

## Decision

Implement a **Metrics Library** system following the same pattern as the Checks Library:

### Architecture

```
┌─────────────────────────────────────────────┐
│          Metrics Library                    │
│  config/metrics/library/*.yaml              │
│  ├─ node_temperature.yaml                   │
│  ├─ node_power.yaml                         │
│  ├─ rack_power_24h.yaml                     │
│  └─ pdu_current.yaml                        │
└─────────────────────────────────────────────┘
              ↓ Referenced by
┌─────────────────────────────────────────────┐
│        Device/Rack Templates                │
│  config/templates/devices/*.yaml            │
│  metrics:                                   │
│    - node_temperature    # ← metric_id      │
│    - node_power                             │
└─────────────────────────────────────────────┘
              ↓ Collected by
┌─────────────────────────────────────────────┐
│        Metrics Service                      │
│  services/metrics_service.py                │
│  - collect_device_metrics()                 │
│  - collect_component_metrics()              │
└─────────────────────────────────────────────┘
              ↓ Displayed in
┌─────────────────────────────────────────────┐
│        Frontend Charts                      │
│  <MetricChart metricId="node_temperature"/> │
└─────────────────────────────────────────────┘
```

### Key Principles

1. **Separation of Concerns**
   - Checks → Health/Alerting
   - Metrics → Visualization/Analytics

2. **Reusability**
   - Define once, use everywhere
   - Templates reference metric IDs

3. **Configuration over Code**
   - Display settings in YAML
   - No hardcoded metrics lists

4. **Flexibility**
   - User-configurable time ranges
   - Multiple aggregation methods
   - Customizable colors/units

---

## Metric Definition Format

### Minimal Example
```yaml
id: node_temperature
name: Node Temperature
metric: node_temperature_celsius
display:
  unit: "°C"
  chart_type: line
```

### Full Example
```yaml
id: rack_power_24h
name: Rack Power Consumption (24h)
description: "Total power draw for the rack over 24 hours"

# Prometheus query
metric: sum(pdu_power_watts{rack_id="{rack_id}"})

# Label substitutions (like checks)
labels:
  rack_id: "{rack_id}"
  site: "{site_id}"

# Display configuration
display:
  unit: "W"
  chart_type: area          # line, area, bar, gauge
  color: "#fbbf24"          # hex color for chart

  # Time range options
  time_ranges: [1h, 6h, 24h, 7d, 30d]
  default_range: 24h

  # Aggregation
  aggregation: avg          # avg, max, min, sum, p95, p99

  # Optional thresholds (visual indicators)
  thresholds:
    warn: 8000
    crit: 10000

  # Optional formatting
  format:
    decimals: 2
    multiplier: 1
    prefix: ""
    suffix: ""

# Optional metadata
category: power              # power, temperature, network, storage
tags: [infrastructure, monitoring]
```

---

## Implementation

### Phase 6.5: Metrics Library (2-3 days)

**Goal**: Implement metrics library system before Phase 7 UI to enable better debugging.

#### Day 1: Core Models & Loader
```python
# src/rackscope/model/metrics.py
class MetricDisplay(BaseModel):
    unit: str
    chart_type: str = "line"
    color: Optional[str] = None
    time_ranges: List[str] = ["1h", "6h", "24h", "7d"]
    default_range: str = "24h"
    aggregation: str = "avg"
    thresholds: Optional[Dict[str, float]] = None

class MetricDefinition(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    metric: str
    labels: Dict[str, str] = {}
    display: MetricDisplay
    category: Optional[str] = None
    tags: List[str] = []

class MetricsLibrary(BaseModel):
    metrics: List[MetricDefinition]

# src/rackscope/model/loader.py
def load_metrics_library(path: str) -> MetricsLibrary:
    """Load all metric definitions from directory."""
    # Similar to load_checks_library()
```

#### Day 2: API & Service
```python
# src/rackscope/api/routers/metrics.py
@router.get("/api/metrics/library")
async def list_metrics():
    """Get all available metrics."""

@router.get("/api/metrics/library/{metric_id}")
async def get_metric(metric_id: str):
    """Get specific metric definition."""

@router.get("/api/metrics/data")
async def get_metric_data(
    metric_id: str,
    target_id: str,
    time_range: str = "24h"
):
    """Query Prometheus for metric data."""
```

#### Day 3: Default Metrics + Simulator Refactor
- Create default metrics in `config/metrics/library/`
- Update simulator to use metrics library dynamically
- Add metrics to existing templates
- Test with UI

---

## Benefits

✅ **Consistency**: Same pattern as checks library
✅ **Flexibility**: User-configurable display options
✅ **Extensibility**: Add metrics without code changes
✅ **Documentation**: Metrics library serves as reference
✅ **Debugging**: Metrics defined before UI implementation
✅ **Simulator**: Generic override system for any metric
✅ **Type Safety**: Pydantic validation

---

## Comparison: Checks vs Metrics

| Aspect | Checks | Metrics |
|--------|--------|---------|
| **Purpose** | Health/Alerting | Visualization/Analytics |
| **Output** | OK/WARN/CRIT state | Time-series data |
| **Config** | `config/checks/library/` | `config/metrics/library/` |
| **Model** | `CheckDefinition` | `MetricDefinition` |
| **Rules** | Severity rules | Display config |
| **UI** | Status badges, alerts | Charts, graphs |
| **Applied To** | Devices (health) | Devices + Racks (viz) |

**Both systems**:
- Use Prometheus as data source
- Reference by ID in templates
- Support label substitution
- YAML-based configuration

---

## Example: Complete Flow

### 1. Define Metric
```yaml
# config/metrics/library/node_temperature.yaml
id: node_temperature
name: Node Temperature
metric: node_temperature_celsius
labels:
  instance: "{instance}"
display:
  unit: "°C"
  chart_type: line
  color: "#ef4444"
  time_ranges: [1h, 6h, 24h]
  default_range: 24h
  thresholds:
    warn: 70
    crit: 85
```

### 2. Reference in Template
```yaml
# config/templates/devices/server/compute.yaml
id: bs-1u-twin-cpu
checks:
  - node_up
  - ipmi_temperature_state
metrics:
  - node_temperature        # ← References metric_id
  - node_power
  - node_load
```

### 3. Backend Collection
```python
# Metrics service automatically handles it
metrics = await collect_device_metrics(
    device=device,
    rack_id=rack_id,
    template=template,
    prom_client=prom_client
)
# Returns: {"node_temperature": 45.2, "node_power": 250, ...}
```

### 4. Frontend Display (Phase 7)
```tsx
<MetricChart
  metricId="node_temperature"
  targetId="node01"
  timeRange="24h"
/>
```

### 5. Simulator Override
```bash
# List available metrics
GET /api/metrics/library
→ [{id: "node_temperature", ...}, {id: "node_power", ...}]

# Override any metric
POST /api/simulator/overrides
{
  "metric": "node_temperature",
  "instance": "node01",
  "value": 95,  # Simulate overheat
  "ttl_seconds": 300
}
```

---

## Migration Strategy

### Existing Code
- ✅ Metrics collection service already generic (Phase 6)
- ✅ Templates already have `metrics: []` field
- ❌ No metric definitions yet
- ❌ No display configuration

### Migration Path
1. **Phase 6.5** (2-3 days):
   - Implement metrics library system
   - Create default metrics (temp, power, load)
   - Update simulator to be generic
   - Test with existing UI

2. **Phase 7** (3 weeks):
   - Use metrics library in new UI
   - Build chart components
   - Implement metric selector UI
   - Add more metrics as needed

---

## Alternatives Considered

### Alternative 1: Hardcode in Templates
```yaml
# Each template defines everything
metrics:
  - name: Temperature
    query: node_temperature_celsius
    unit: "°C"
    chart_type: line
```
❌ **Rejected**: Too much duplication, no reusability

### Alternative 2: No Library (Inline Only)
Just use raw Prometheus queries in UI
❌ **Rejected**: No standardization, hard to maintain

### Alternative 3: UI-Only Configuration
Store metric display config in frontend
❌ **Rejected**: Backend can't validate, simulator can't use it

---

## Future Enhancements

### Phase 8+
- **Composite Metrics**: Calculated from multiple sources
- **Custom Metrics**: User-defined metrics via UI
- **Metric Dashboards**: Save custom metric layouts
- **Alerts from Metrics**: Convert metric threshold → alert
- **Export**: Export metric definitions as monitoring templates

---

## References

- **Related ADRs**:
  - ADR-003: Template System
  - ADR-006: Plugin Architecture

- **Implementation Files**:
  - `model/metrics.py` (to create)
  - `model/loader.py` (extend)
  - `api/routers/metrics.py` (to create)
  - `config/metrics/library/` (to create)

---

**Decision Made By**: Development Team
**Stakeholders**: Frontend, Backend, Operations
**Status**: ✅ Accepted, Implementation Pending (Phase 6.5)
