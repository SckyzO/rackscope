# Plugin Architecture - Design Document

**Status**: 🟡 Proposal
**Date**: 2026-02-01
**Author**: Architecture Review

## Executive Summary

This document defines the plugin architecture for Rackscope, separating core infrastructure topology management from optional integrations. The current codebase has hardcoded integrations (Slurm, Simulator, PDU metrics) that should be plugins or properly templated.

**Key Objectives**:
1. Core = Generic topology + health monitoring
2. Plugins = Workload managers, dev tools, integrations
3. Templates = Infrastructure components (PDU, switches) - NOT plugins
4. Clean separation of concerns

---

## Current State Problems

### Problem 1: Hardcoded PDU/Node Metrics ❌

**Location**: `src/rackscope/telemetry/prometheus.py`

```python
# WRONG - Hardcoded Raritan PDU metrics
async def get_pdu_metrics(self, rack_id: str):
    queries = {
        "activepower_watt": f'raritan_pdu_activepower_watt{{rack_id="{rack_id}"}}',
        "current_amp": f'raritan_pdu_current_ampere{{rack_id="{rack_id}"}}',
    }
```

**Why it's wrong**:
- Only works with Raritan PDU (not APC, Eaton, etc.)
- Ignores existing template system (`RackComponentTemplate`)
- Duplicates logic (node metrics, PDU metrics separately)
- Not extensible

**Should be**: Generic metric fetching based on `RackComponentTemplate.metrics`

### Problem 2: Slurm in Core ❌

**Location**: `src/rackscope/api/routers/slurm.py`, `src/rackscope/services/slurm_service.py`

- Slurm is a workload manager (one of many: PBS, LSF, Kubernetes)
- Should be optional plugin
- Not all datacenters use Slurm

### Problem 3: Simulator in Core ❌

**Location**: `src/rackscope/api/routers/simulator.py`

- Development/demo tool
- Should not exist in production builds
- Should be dev plugin

---

## Architecture Vision

### Core Responsibilities

**What belongs in Core**:

```
rackscope-core/
├── Infrastructure Topology
│   ├── Sites, Rooms, Aisles, Racks, Devices
│   ├── U-position management
│   ├── Topology loader/persistence
│   └── CRUD operations
│
├── Template System (Already Good ✅)
│   ├── DeviceTemplate (servers, storage)
│   ├── RackTemplate (rack configurations)
│   └── RackComponentTemplate (PDU, switches, cooling)
│
├── Health Monitoring (Generic)
│   ├── Check definitions (PromQL queries in YAML)
│   ├── Check evaluation engine
│   ├── State aggregation (OK/WARN/CRIT)
│   └── Alert rules
│
├── Telemetry Backend Interface
│   ├── Query interface (PromQL, InfluxQL, etc.)
│   ├── Result parsing
│   ├── Cache layer
│   └── Pluggable backends (Prometheus, InfluxDB)
│
└── API Foundation
    ├── FastAPI app
    ├── Plugin registry
    ├── Dependency injection
    └── Middleware
```

**What does NOT belong in Core**:
- ❌ Specific workload managers (Slurm, PBS, Kubernetes)
- ❌ Development tools (Simulator)
- ❌ Hardcoded infrastructure metrics (PDU, switch)
- ❌ External integrations (CMDB, ticketing)

---

## Template System (Already Correct ✅)

The existing template system is **well-designed**. The problem is the code doesn't use it properly.

### Existing Models (Good)

```python
class RackComponentTemplate(BaseModel):
    """Template for rack-mounted infrastructure (PDU, switch, cooling)"""
    id: str                    # "raritan-pdu-px3"
    name: str                  # "Raritan PDU PX3"
    type: str                  # "power", "cooling", "network"
    location: Literal["side", "u-mount", "front", "rear"]
    u_height: int              # Space consumed
    checks: List[str]          # Health check IDs to run
    metrics: List[str]         # Metric names to collect

class RackComponentRef(BaseModel):
    """Instance of a component in a rack"""
    template_id: str           # Reference to template
    u_position: int            # Mounting position
    side: Optional[Literal["left", "right"]]  # For side-mounted

class RackInfrastructure(BaseModel):
    """Infrastructure components in a rack"""
    rack_components: List[RackComponentRef]
    side_components: List[InfrastructureComponent]
    front_components: List[InfrastructureComponent]
    rear_components: List[InfrastructureComponent]
```

### Template Usage Example

**PDU Template** (`config/templates/rack-components/raritan-pdu.yaml`):
```yaml
rack_component_templates:
  - id: raritan-pdu-px3
    name: Raritan PDU PX3
    type: power
    location: side
    u_height: 0  # side-mounted
    checks:
      - pdu_power_usage
      - pdu_inlet_capacity
    metrics:
      - raritan_activepower_watt
      - raritan_current_amp
      - raritan_inlet_rating_amp
```

**Rack Configuration** (`config/topology/racks/rack-a01.yaml`):
```yaml
racks:
  - id: rack-a01
    name: Rack A01
    infrastructure:
      rack_components:
        - template_id: raritan-pdu-px3
          side: left
        - template_id: raritan-pdu-px3
          side: right
```

**Health Checks** (`config/checks/pdu.yaml`):
```yaml
checks:
  - id: pdu_power_usage
    name: PDU Power Usage
    scope: rack
    expr: raritan_pdu_activepower_watt{rack_id="$rack_id"}
    output: numeric
    rules:
      - op: ">"
        value: 8000
        severity: WARN
      - op: ">"
        value: 9000
        severity: CRIT
```

### Why This is Good

✅ **Extensible**: Add new PDU vendor = add template, no code change
✅ **Generic**: Same system for PDU, switches, cooling
✅ **Declarative**: Configuration over code
✅ **Testable**: Templates are data, easy to validate

---

## Plugin System Design

### Plugin Categories

```
1. Telemetry Backends (Data Sources)
   - prometheus ← Current backend
   - influxdb
   - victoria-metrics
   - custom-api

2. Workload Managers (Compute Orchestration)
   - slurm ← Should be plugin
   - pbs-pro
   - lsf
   - kubernetes
   - nomad

3. Development Tools
   - simulator ← Should be plugin
   - demo-data-generator
   - load-tester

4. Integrations (External Systems)
   - cmdb-sync (ServiceNow, Netbox)
   - ticketing (Jira, ServiceNow)
   - documentation (Confluence)
   - audit-logger

5. Notifications (Alerting)
   - slack
   - email
   - pagerduty
   - webhook
```

### Plugin Interface

```python
# src/rackscope/plugins/base.py

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Literal
from fastapi import FastAPI
from pydantic import BaseModel

class PluginMetadata(BaseModel):
    """Plugin identification"""
    id: str                    # "workload-slurm"
    name: str                  # "Slurm Workload Manager"
    version: str               # "1.0.0"
    category: Literal[
        "telemetry",
        "workload",
        "dev",
        "integration",
        "notification"
    ]
    author: str
    description: str
    required_config: List[str] = []  # Required config keys

class RackscopePlugin(ABC):
    """Base class for all Rackscope plugins"""

    @property
    @abstractmethod
    def metadata(self) -> PluginMetadata:
        """Return plugin metadata"""
        pass

    async def initialize(self, config: Dict) -> None:
        """Called when plugin loads. Setup connections, validate config."""
        pass

    async def shutdown(self) -> None:
        """Called on app shutdown. Cleanup resources."""
        pass

    def register_routes(self, app: FastAPI, prefix: str) -> None:
        """Register API endpoints under /plugins/{id}/*"""
        pass

    def register_checks(self) -> List[CheckDefinition]:
        """Provide additional health checks"""
        return []

    def register_ui_routes(self) -> Dict[str, str]:
        """Register frontend routes
        Returns: {"/slurm/dashboard": "slurm-dashboard-component"}
        """
        return {}
```

### Plugin Configuration

**Main Config** (`config/plugins.yaml`):
```yaml
plugins:
  # Telemetry backend (required, choose one)
  - id: telemetry-prometheus
    enabled: true
    config:
      url: http://prometheus:9090
      timeout_seconds: 30

  # Workload manager (optional)
  - id: workload-slurm
    enabled: true
    config:
      api_url: http://slurm-rest:6820
      version: "v0.0.39"
      mapping_path: config/slurm/mapping.yaml

  # Development tools (disable in prod)
  - id: dev-simulator
    enabled: false  # ← Disabled in production
```

**Environment Override**:
```bash
# Disable plugins via env var
RACKSCOPE_PLUGINS_DISABLED="dev-simulator,workload-slurm"
```

### Plugin Discovery

**Entry Points** (setuptools):
```python
# setup.py or pyproject.toml
[project.entry-points."rackscope.plugins"]
prometheus = "rackscope.plugins.telemetry.prometheus:PrometheusPlugin"
slurm = "rackscope.plugins.workload.slurm:SlurmPlugin"
simulator = "rackscope.plugins.dev.simulator:SimulatorPlugin"
```

**Plugin Registry**:
```python
# src/rackscope/plugins/registry.py

class PluginRegistry:
    def __init__(self):
        self.plugins: Dict[str, RackscopePlugin] = {}

    def discover_plugins(self) -> List[PluginMetadata]:
        """Find all installed plugins via entry points"""
        entry_points = metadata.entry_points(group="rackscope.plugins")
        return [ep.load().metadata for ep in entry_points]

    async def load_plugin(self, plugin_id: str, config: Dict) -> None:
        """Load and initialize a plugin"""
        plugin = self._get_plugin_class(plugin_id)()
        await plugin.initialize(config)
        self.plugins[plugin_id] = plugin

    def get_plugin(self, plugin_id: str) -> Optional[RackscopePlugin]:
        """Get loaded plugin instance"""
        return self.plugins.get(plugin_id)
```

---

## Refactoring Plan

### Phase 6A: Fix Template System (3 days)

**Goal**: Remove hardcoded metrics, use templates properly

#### Step 1: Generic Metrics Service (1 day)

**Remove**:
```python
# prometheus.py
- async def get_pdu_metrics(self, rack_id: str)
- async def get_node_metrics(self, rack_id: str)
```

**Add**:
```python
# src/rackscope/services/metrics_service.py

async def collect_component_metrics(
    rack: Rack,
    component_ref: RackComponentRef,
    catalog: Catalog,
    prom_client: PrometheusClient
) -> Dict[str, float]:
    """Collect metrics for any rack component based on its template"""

    # Get template
    template = catalog.get_rack_component_template(component_ref.template_id)
    if not template:
        return {}

    # Execute metric queries defined in template
    metrics = {}
    for metric_name in template.metrics:
        # Build query from metric name and rack context
        query = build_metric_query(metric_name, rack.id, component_ref)
        result = await prom_client.query(query)
        metrics[metric_name] = parse_prometheus_result(result)

    return metrics
```

#### Step 2: Update Telemetry Router (1 day)

```python
# api/routers/telemetry.py

@router.get("/api/racks/{rack_id}/state")
async def get_rack_state(rack_id: str, ...):
    rack = topology.find_rack(rack_id)

    # Collect metrics for ALL rack components (PDU, switches, cooling)
    component_metrics = {}
    for comp_ref in rack.infrastructure.rack_components:
        metrics = await collect_component_metrics(rack, comp_ref, catalog, prom_client)
        component_metrics[comp_ref.template_id] = metrics

    # Collect device metrics (servers)
    device_metrics = {}
    for device in rack.devices:
        metrics = await collect_device_metrics(device, catalog, prom_client)
        device_metrics[device.id] = metrics

    return {
        "rack_id": rack_id,
        "state": rack_state,
        "component_metrics": component_metrics,  # PDU, switches, etc.
        "device_metrics": device_metrics,        # Servers
    }
```

#### Step 3: Tests (1 day)

- Unit tests for `collect_component_metrics()`
- Integration tests with mock templates
- Validate with Raritan PDU template
- Add APC PDU template as proof of extensibility

### Phase 6B: Plugin System Foundation (2 days)

#### Step 1: Plugin Base Classes (half day)

Create:
- `src/rackscope/plugins/base.py` (interface)
- `src/rackscope/plugins/registry.py` (discovery/loading)
- `src/rackscope/plugins/__init__.py`

#### Step 2: Plugin Configuration (half day)

- `config/plugins.yaml` schema
- Environment variable overrides
- Validation

#### Step 3: Plugin Lifecycle (1 day)

- App startup: discover + load enabled plugins
- Register routes: `/plugins/{plugin_id}/*`
- App shutdown: cleanup plugins
- Health check: plugin status endpoint

### Phase 6C: Extract Simulator Plugin (1 day)

**Goal**: First plugin extraction (simplest)

**Move**:
```
src/rackscope/api/routers/simulator.py
  → src/rackscope/plugins/dev/simulator/
```

**Structure**:
```
src/rackscope/plugins/dev/simulator/
├── __init__.py
├── plugin.py          # SimulatorPlugin class
├── router.py          # API endpoints
└── README.md          # Plugin documentation
```

**Result**: Simulator can be disabled in production via config

### Phase 6D: Extract Slurm Plugin (2 days)

**Goal**: Validate plugin architecture with complex plugin

**Move**:
```
src/rackscope/api/routers/slurm.py
src/rackscope/services/slurm_service.py
  → src/rackscope/plugins/workload/slurm/
```

**Structure**:
```
src/rackscope/plugins/workload/slurm/
├── __init__.py
├── plugin.py          # SlurmPlugin class
├── router.py          # API endpoints
├── service.py         # Business logic
├── models.py          # Pydantic models
├── checks.yaml        # Slurm-specific checks
└── README.md
```

**Features**:
- Disabled by default (optional plugin)
- Config: `plugins.yaml` with Slurm API URL
- UI routes: `/plugins/slurm/dashboard`

---

## Migration Strategy

### Backward Compatibility

**During Migration**:
- Keep old endpoints with deprecation warnings
- Add new generic endpoints alongside
- Frontend uses feature detection

**Deprecation Timeline**:
- v1.0: Old + new endpoints (6 months)
- v1.5: Deprecation warnings
- v2.0: Remove old endpoints

### Breaking Changes

**API Changes**:
```diff
# Old (deprecated)
GET /api/racks/{rack_id}/state
{
  "infra_metrics": {"pdu": {...}}  # Hardcoded key
}

# New (generic)
GET /api/racks/{rack_id}/state
{
  "component_metrics": {
    "raritan-pdu-px3-left": {...},   # Dynamic, based on template
    "raritan-pdu-px3-right": {...}
  }
}
```

**Configuration Changes**:
```yaml
# Old (implicit)
telemetry:
  prometheus_url: http://prometheus:9090

# New (explicit plugin)
plugins:
  - id: telemetry-prometheus
    enabled: true
    config:
      url: http://prometheus:9090
```

---

## Plugin Examples

### Example 1: APC PDU Support (Zero Code Change)

**Add Template**:
```yaml
# config/templates/rack-components/apc-pdu.yaml
rack_component_templates:
  - id: apc-pdu-ap8959
    name: APC Metered Rack PDU AP8959
    type: power
    location: side
    u_height: 0
    checks:
      - pdu_power_usage
      - pdu_current_usage
    metrics:
      - apc_activepower_watt
      - apc_current_amp
      - apc_voltage_volt
```

**Add Checks** (if needed):
```yaml
# config/checks/apc-pdu.yaml
checks:
  - id: pdu_current_usage
    name: PDU Current Usage
    scope: rack
    expr: apc_current_amp{rack_id="$rack_id"}
    output: numeric
    rules:
      - op: ">"
        value: 20
        severity: WARN
```

**Use in Topology**:
```yaml
racks:
  - id: rack-b01
    infrastructure:
      rack_components:
        - template_id: apc-pdu-ap8959
          side: left
```

**Result**: APC PDU works without any code changes ✅

### Example 2: Kubernetes Plugin (Future)

```python
# src/rackscope/plugins/workload/kubernetes/plugin.py

class KubernetesPlugin(RackscopePlugin):
    @property
    def metadata(self):
        return PluginMetadata(
            id="workload-kubernetes",
            name="Kubernetes Integration",
            version="1.0.0",
            category="workload",
            author="Rackscope",
            description="Monitor Kubernetes pods and nodes",
            required_config=["kubeconfig_path"]
        )

    def register_routes(self, app: FastAPI, prefix: str):
        @app.get(f"{prefix}/pods")
        async def get_pods():
            # Return pod status mapped to topology nodes
            pass
```

---

## Benefits

### For Users

✅ **Lightweight deployments**: Install only what you need
✅ **Flexibility**: Choose workload manager (Slurm vs K8s)
✅ **Production-ready**: No dev tools in prod builds

### For Developers

✅ **Clean architecture**: Core vs plugins separation
✅ **Easy testing**: Mock plugins in tests
✅ **Extensibility**: Add features without core changes

### For Operations

✅ **Simple config**: Enable/disable features via YAML
✅ **Isolation**: Plugin failures don't crash core
✅ **Monitoring**: Per-plugin health checks

---

## Success Criteria

### Phase 6 Complete When:

- [ ] PDU/switch metrics use template system (not hardcoded)
- [ ] Plugin interface defined and documented
- [ ] Simulator extracted as dev plugin
- [ ] Slurm extracted as workload plugin
- [ ] All existing tests pass
- [ ] New tests cover plugin system
- [ ] Documentation updated
- [ ] Migration guide written

### Validation Tests:

1. **Template Extensibility**: Add APC PDU template, verify it works
2. **Plugin Disable**: Disable Slurm, verify core still works
3. **Plugin Isolation**: Slurm plugin crash doesn't affect core
4. **Configuration**: Plugin config via YAML and env vars

---

## Next Steps

1. **Review this document** - Get alignment on architecture
2. **Create Phase 6 tasks** - Break down into implementable chunks
3. **Start with templates** - Fix PDU/metrics hardcoding first
4. **Build plugin foundation** - Registry, lifecycle, config
5. **Extract plugins** - Simulator first, then Slurm

---

## Questions to Resolve

1. **Plugin Distribution**:
   - Bundled with core? (`rackscope[slurm]`)
   - Separate packages? (`rackscope-plugin-slurm`)
   - Both?

2. **UI Plugin Integration**:
   - How do plugins add frontend routes?
   - Component lazy loading?
   - Build-time vs runtime?

3. **Plugin Dependencies**:
   - Can plugins depend on other plugins?
   - Load order management?

4. **Backwards Compatibility**:
   - Support old API during transition?
   - Migration timeline?

---

*Document Version: 1.0*
*Last Updated: 2026-02-01*
*Status: Awaiting Review*
