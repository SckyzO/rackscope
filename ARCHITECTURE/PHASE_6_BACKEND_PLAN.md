# Phase 6: Backend Plugin Architecture - Action Plan

**Status**: 🟡 Ready to Start
**Duration**: 1 week (5-7 days)
**Branch**: `refactoring/plugin-architecture`

## Objectives

1. ✅ Fix hardcoded metrics (PDU/node) → use templates
2. ✅ Create plugin system foundation
3. ✅ Extract Simulator as plugin
4. ✅ Extract Slurm as plugin

---

## Setup: Create New Branch

```bash
# Ensure phase 5 is committed
git status

# Create new branch from current
git checkout -b refactoring/plugin-architecture

# Push new branch
git push -u origin refactoring/plugin-architecture
```

---

## Phase 6A: Fix Template System (2-3 days)

### Goal
Remove hardcoded PDU/node metrics. Use generic metric collection based on templates.

### Step 1: Create Generic Metrics Service (Day 1)

**File**: `src/rackscope/services/metrics_service.py`

```python
"""Generic metrics collection service"""
from typing import Dict, List, Optional
from rackscope.model.domain import Rack, Device
from rackscope.model.catalog import Catalog, RackComponentRef
from rackscope.telemetry.prometheus import PrometheusClient


async def collect_component_metrics(
    rack: Rack,
    component_ref: RackComponentRef,
    catalog: Catalog,
    prom_client: PrometheusClient
) -> Dict[str, float]:
    """
    Collect metrics for any rack component based on its template.

    Args:
        rack: The rack containing the component
        component_ref: Reference to component in rack
        catalog: Catalog with templates
        prom_client: Prometheus client

    Returns:
        Dict of metric_name → value
    """
    # Get template
    template = catalog.get_rack_component_template(component_ref.template_id)
    if not template:
        return {}

    # Execute each metric query defined in template
    metrics = {}
    for metric_name in template.metrics:
        # Build query from metric name and context
        query = build_metric_query(
            metric_name=metric_name,
            rack_id=rack.id,
            component_ref=component_ref,
            template=template
        )

        # Execute query
        result = await prom_client.query(query)

        # Parse result
        value = parse_prometheus_result(result)
        if value is not None:
            metrics[metric_name] = value

    return metrics


def build_metric_query(
    metric_name: str,
    rack_id: str,
    component_ref: RackComponentRef,
    template
) -> str:
    """
    Build PromQL query for a metric.

    Examples:
        raritan_pdu_activepower_watt{rack_id="rack01", side="left"}
        node_temperature_celsius{rack_id="rack01", u_position="10"}
    """
    labels = {
        "rack_id": rack_id,
    }

    # Add location context
    if component_ref.side:
        labels["side"] = component_ref.side
    if component_ref.u_position:
        labels["u_position"] = str(component_ref.u_position)

    # Build label string
    label_str = ", ".join([f'{k}="{v}"' for k, v in labels.items()])

    return f'{metric_name}{{{label_str}}}'


def parse_prometheus_result(result: Dict) -> Optional[float]:
    """Parse Prometheus query result to float value"""
    if result.get("status") != "success":
        return None

    data = result.get("data", {}).get("result", [])
    if not data:
        return None

    try:
        # Get first result value
        value = data[0].get("value", [None, None])[1]
        return float(value)
    except (IndexError, TypeError, ValueError):
        return None


async def collect_device_metrics(
    device: Device,
    rack: Rack,
    catalog: Catalog,
    prom_client: PrometheusClient
) -> Dict[str, float]:
    """Collect metrics for a device based on its template"""
    template = catalog.get_device_template(device.template_id)
    if not template:
        return {}

    metrics = {}
    for metric_name in template.checks:  # Use checks for now
        # Build query for device instance
        instances = device.instance if isinstance(device.instance, list) else [device.instance]

        # Query for each instance
        for instance_name in instances:
            query = f'{metric_name}{{instance="{instance_name}"}}'
            result = await prom_client.query(query)
            value = parse_prometheus_result(result)
            if value is not None:
                metrics[f"{instance_name}_{metric_name}"] = value

    return metrics
```

**Tests**: `tests/services/test_metrics_service.py`

```python
"""Tests for metrics service"""
import pytest
from unittest.mock import AsyncMock
from rackscope.services.metrics_service import (
    collect_component_metrics,
    build_metric_query,
    parse_prometheus_result,
)
from rackscope.model.catalog import RackComponentTemplate, RackComponentRef
from rackscope.model.domain import Rack


@pytest.fixture
def pdu_template():
    return RackComponentTemplate(
        id="raritan-pdu-px3",
        name="Raritan PDU",
        type="power",
        location="side",
        u_height=0,
        metrics=[
            "raritan_pdu_activepower_watt",
            "raritan_pdu_current_ampere",
        ]
    )


def test_build_metric_query():
    component_ref = RackComponentRef(template_id="pdu", side="left")
    template = RackComponentTemplate(id="pdu", name="PDU", type="power", u_height=0)

    query = build_metric_query("raritan_pdu_activepower_watt", "rack01", component_ref, template)

    assert 'rack_id="rack01"' in query
    assert 'side="left"' in query


def test_parse_prometheus_result_success():
    result = {
        "status": "success",
        "data": {
            "result": [
                {"value": [1234567890, "42.5"]}
            ]
        }
    }

    value = parse_prometheus_result(result)
    assert value == 42.5


def test_parse_prometheus_result_empty():
    result = {"status": "success", "data": {"result": []}}
    value = parse_prometheus_result(result)
    assert value is None
```

**Run tests**:
```bash
docker compose exec backend pytest tests/services/test_metrics_service.py -v
```

**Commit**:
```bash
git add src/rackscope/services/metrics_service.py tests/services/test_metrics_service.py
git commit -m "feat(metrics): add generic metrics collection service

Add metrics_service.py for template-based metric collection:
- collect_component_metrics() for rack components (PDU, switches)
- collect_device_metrics() for devices (servers)
- build_metric_query() to construct PromQL from context
- parse_prometheus_result() to extract values

Replaces hardcoded get_pdu_metrics() and get_node_metrics().

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Step 2: Update Telemetry Router (Day 1)

**File**: `src/rackscope/api/routers/telemetry.py`

**Change** the `/api/racks/{rack_id}/state` endpoint:

```python
# OLD (remove):
pdu_metrics = await prom_client.get_pdu_metrics(rack_id)
nodes_metrics = await prom_client.get_node_metrics(rack_id)

# NEW (add):
from rackscope.services import metrics_service

# Collect rack component metrics (PDU, switches, etc.)
component_metrics = {}
if rack.infrastructure and rack.infrastructure.rack_components:
    for comp_ref in rack.infrastructure.rack_components:
        metrics = await metrics_service.collect_component_metrics(
            rack, comp_ref, catalog, prom_client
        )
        # Use template_id + side as key
        key = f"{comp_ref.template_id}"
        if comp_ref.side:
            key += f"_{comp_ref.side}"
        component_metrics[key] = metrics

# Collect device metrics
device_metrics = {}
for device in rack.devices:
    metrics = await metrics_service.collect_device_metrics(
        device, rack, catalog, prom_client
    )
    device_metrics[device.id] = metrics

return {
    "rack_id": rack_id,
    "state": rack_state,
    "component_metrics": component_metrics,  # NEW: generic components
    "device_metrics": device_metrics,        # NEW: generic devices
    "nodes": processed_nodes,                # Keep for compatibility
}
```

**Commit**:
```bash
git add src/rackscope/api/routers/telemetry.py
git commit -m "refactor(telemetry): use generic metrics service

Replace hardcoded get_pdu_metrics() with generic
collect_component_metrics() based on templates.

Backward compatible: keeps 'nodes' field.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Step 3: Remove Deprecated Methods (Day 2)

**File**: `src/rackscope/telemetry/prometheus.py`

```python
# DELETE these methods:
# - async def get_pdu_metrics(self, rack_id: str)
# - async def get_node_metrics(self, rack_id: str)

# KEEP:
# - async def query(self, promql: str)  ← Generic query method
# - get_latency_stats()
# - get_telemetry_stats()
```

**Update tests**: Remove tests for deleted methods

**Commit**:
```bash
git add src/rackscope/telemetry/prometheus.py tests/
git commit -m "refactor(prometheus): remove hardcoded metric methods

Remove get_pdu_metrics() and get_node_metrics().
Use generic query() method with template-based queries.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Step 4: Add Example Templates (Day 2)

**File**: `config/templates/rack-components/apc-pdu.yaml`

```yaml
# Example: APC PDU template (validates extensibility)
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
      - apc_pdu_activepower_watt
      - apc_pdu_current_ampere
      - apc_pdu_voltage_volt
```

**File**: `config/checks/apc-pdu.yaml`

```yaml
checks:
  - id: pdu_current_usage
    name: PDU Current Usage
    scope: rack
    expr: apc_pdu_current_ampere{rack_id="$rack_id"}
    output: numeric
    rules:
      - op: ">"
        value: 20
        severity: WARN
      - op: ">"
        value: 24
        severity: CRIT
```

**Commit**:
```bash
git add config/templates/rack-components/apc-pdu.yaml config/checks/apc-pdu.yaml
git commit -m "feat(templates): add APC PDU template example

Demonstrate template extensibility: add APC PDU support
without any code changes. Only config files.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 6B: Plugin System Foundation (2 days)

### Step 1: Plugin Base Classes (Day 3)

**File**: `src/rackscope/plugins/__init__.py`

```python
"""Plugin system for Rackscope"""
from .base import RackscopePlugin, PluginMetadata, MenuSection, MenuRoute

__all__ = ["RackscopePlugin", "PluginMetadata", "MenuSection", "MenuRoute"]
```

**File**: `src/rackscope/plugins/base.py`

```python
"""Base classes for Rackscope plugins"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Literal
from pydantic import BaseModel
from fastapi import FastAPI


class PluginMetadata(BaseModel):
    """Plugin identification and info"""
    id: str                           # "workload-slurm"
    name: str                         # "Slurm Workload Manager"
    version: str                      # "1.0.0"
    category: Literal[
        "telemetry",
        "workload",
        "dev",
        "integration",
    ]
    author: str
    description: str
    required_config: List[str] = []   # Required config keys


class MenuRoute(BaseModel):
    """Menu route definition"""
    path: str                         # "/workload/overview"
    label: str                        # "Overview"
    icon: Optional[str] = None        # Icon name


class MenuSection(BaseModel):
    """Menu section added by plugin"""
    id: str                           # "workload"
    label: str                        # "Workload"
    icon: str                         # "briefcase"
    routes: List[MenuRoute]


class RackscopePlugin(ABC):
    """
    Base class for all Rackscope plugins.

    Plugins extend Rackscope with optional features like:
    - Workload managers (Slurm, Kubernetes)
    - Development tools (Simulator)
    - Integrations (CMDB, ticketing)
    """

    @property
    @abstractmethod
    def metadata(self) -> PluginMetadata:
        """Return plugin metadata"""
        pass

    async def initialize(self, config: Dict) -> None:
        """
        Called when plugin loads.

        Setup connections, validate config, initialize state.

        Args:
            config: Plugin configuration from plugins.yaml
        """
        pass

    async def shutdown(self) -> None:
        """
        Called on app shutdown.

        Cleanup resources, close connections.
        """
        pass

    def register_routes(self, app: FastAPI, prefix: str) -> None:
        """
        Register API endpoints.

        Args:
            app: FastAPI application
            prefix: URL prefix for plugin routes (e.g., "/plugins/slurm")
        """
        pass

    def register_menu_section(self) -> Optional[MenuSection]:
        """
        Register menu section in UI.

        Returns:
            MenuSection with routes, or None if no UI
        """
        return None

    def get_health_status(self) -> Dict:
        """
        Return plugin health status.

        Returns:
            {"status": "ok"|"error", "message": "..."}
        """
        return {"status": "ok", "message": "Plugin running"}
```

**Commit**:
```bash
git add src/rackscope/plugins/
git commit -m "feat(plugins): add plugin base classes

Add plugin system foundation:
- RackscopePlugin base class
- PluginMetadata for identification
- MenuSection for UI integration
- Lifecycle hooks (initialize, shutdown)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Step 2: Plugin Registry (Day 3)

**File**: `src/rackscope/plugins/registry.py`

```python
"""Plugin registry and loader"""
from typing import Dict, List, Optional
import logging
from .base import RackscopePlugin, PluginMetadata

logger = logging.getLogger(__name__)


class PluginRegistry:
    """Registry for managing plugins"""

    def __init__(self):
        self._plugins: Dict[str, RackscopePlugin] = {}
        self._enabled_ids: List[str] = []

    async def load_plugin(
        self,
        plugin_class: type,
        config: Dict,
        enabled: bool = True
    ) -> None:
        """
        Load and initialize a plugin.

        Args:
            plugin_class: Plugin class to instantiate
            config: Plugin configuration
            enabled: Whether plugin is enabled
        """
        plugin = plugin_class()
        plugin_id = plugin.metadata.id

        logger.info(f"Loading plugin: {plugin_id}")

        # Validate required config
        for key in plugin.metadata.required_config:
            if key not in config:
                raise ValueError(f"Plugin {plugin_id} missing required config: {key}")

        # Initialize plugin
        try:
            await plugin.initialize(config)
            self._plugins[plugin_id] = plugin

            if enabled:
                self._enabled_ids.append(plugin_id)
                logger.info(f"Plugin {plugin_id} loaded and enabled")
            else:
                logger.info(f"Plugin {plugin_id} loaded but disabled")
        except Exception as e:
            logger.error(f"Failed to initialize plugin {plugin_id}: {e}")
            raise

    def get_plugin(self, plugin_id: str) -> Optional[RackscopePlugin]:
        """Get plugin instance by ID"""
        return self._plugins.get(plugin_id)

    def get_enabled_plugins(self) -> List[RackscopePlugin]:
        """Get all enabled plugins"""
        return [self._plugins[pid] for pid in self._enabled_ids if pid in self._plugins]

    def list_plugins(self) -> List[PluginMetadata]:
        """List all loaded plugins"""
        return [p.metadata for p in self._plugins.values()]

    async def shutdown_all(self) -> None:
        """Shutdown all plugins"""
        for plugin in self._plugins.values():
            try:
                await plugin.shutdown()
            except Exception as e:
                logger.error(f"Error shutting down plugin {plugin.metadata.id}: {e}")


# Global registry instance
registry = PluginRegistry()
```

**Commit**:
```bash
git add src/rackscope/plugins/registry.py
git commit -m "feat(plugins): add plugin registry

Add PluginRegistry for managing plugin lifecycle:
- Load/unload plugins
- Enable/disable plugins
- Validate configuration
- Shutdown handling

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

### Step 3: Plugin API Endpoints (Day 4)

**File**: `src/rackscope/api/routers/plugins.py`

```python
"""Plugin management API"""
from typing import List
from fastapi import APIRouter, Depends
from rackscope.plugins.registry import registry
from rackscope.plugins.base import PluginMetadata, MenuSection

router = APIRouter(prefix="/api/plugins", tags=["plugins"])


@router.get("")
def list_plugins() -> List[PluginMetadata]:
    """List all installed plugins"""
    return registry.list_plugins()


@router.get("/enabled")
def list_enabled_plugins() -> List[PluginMetadata]:
    """List enabled plugins"""
    return [p.metadata for p in registry.get_enabled_plugins()]


@router.get("/menu")
def get_plugin_menu_sections() -> Dict[str, List[MenuSection]]:
    """
    Get menu sections from all enabled plugins.

    Frontend uses this to build dynamic menu.
    """
    sections = []

    for plugin in registry.get_enabled_plugins():
        menu_section = plugin.register_menu_section()
        if menu_section:
            sections.append({
                **menu_section.model_dump(),
                "plugin_id": plugin.metadata.id
            })

    return {"sections": sections}


@router.get("/{plugin_id}/health")
def get_plugin_health(plugin_id: str):
    """Get plugin health status"""
    plugin = registry.get_plugin(plugin_id)
    if not plugin:
        return {"status": "error", "message": "Plugin not found"}

    return plugin.get_health_status()
```

**Update**: `src/rackscope/api/app.py`

```python
# Add plugin router
from rackscope.api.routers import plugins

app.include_router(plugins.router)
```

**Commit**:
```bash
git add src/rackscope/api/routers/plugins.py src/rackscope/api/app.py
git commit -m "feat(api): add plugin management endpoints

Add /api/plugins endpoints:
- GET /api/plugins - list all plugins
- GET /api/plugins/enabled - list enabled plugins
- GET /api/plugins/menu - get menu sections for UI
- GET /api/plugins/{id}/health - plugin health check

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 6C: Extract Simulator Plugin (1 day)

### Goal
Move simulator from core to plugin (simplest plugin to validate architecture)

### Step 1: Create Plugin Structure (Day 5)

```bash
mkdir -p src/rackscope/plugins/dev/simulator
```

**File**: `src/rackscope/plugins/dev/__init__.py` (empty)

**File**: `src/rackscope/plugins/dev/simulator/__init__.py`

```python
"""Simulator plugin for development/demo mode"""
from .plugin import SimulatorPlugin

__all__ = ["SimulatorPlugin"]
```

### Step 2: Move Router Code (Day 5)

**Move**: `src/rackscope/api/routers/simulator.py`
**To**: `src/rackscope/plugins/dev/simulator/router.py`

(Keep the router code mostly as-is)

### Step 3: Create Plugin Class (Day 5)

**File**: `src/rackscope/plugins/dev/simulator/plugin.py`

```python
"""Simulator plugin implementation"""
from typing import Dict, Optional
from fastapi import FastAPI
from rackscope.plugins.base import (
    RackscopePlugin,
    PluginMetadata,
    MenuSection,
    MenuRoute,
)
from . import router


class SimulatorPlugin(RackscopePlugin):
    """Development simulator plugin"""

    @property
    def metadata(self) -> PluginMetadata:
        return PluginMetadata(
            id="dev-simulator",
            name="Development Simulator",
            version="1.0.0",
            category="dev",
            author="Rackscope",
            description="Simulate scenarios and override metrics for testing",
        )

    def register_routes(self, app: FastAPI, prefix: str) -> None:
        """Register simulator API routes"""
        # Mount router at /api/simulator
        app.include_router(router.router)

    def register_menu_section(self) -> Optional[MenuSection]:
        """Register Simulator menu section"""
        return MenuSection(
            id="simulator",
            label="Simulator",
            icon="flask",
            routes=[
                MenuRoute(path="/simulator/scenarios", label="Scenarios"),
                MenuRoute(path="/simulator/overrides", label="Overrides"),
            ]
        )
```

### Step 4: Update App Startup (Day 5)

**File**: `src/rackscope/api/app.py`

```python
# Remove old import:
# from rackscope.api.routers import simulator

# Add plugin loading:
from rackscope.plugins.registry import registry
from rackscope.plugins.dev.simulator import SimulatorPlugin

@app.on_event("startup")
async def load_plugins():
    """Load plugins on startup"""

    # Load simulator plugin (disabled by default in prod)
    simulator_enabled = os.getenv("RACKSCOPE_SIMULATOR_ENABLED", "false") == "true"
    await registry.load_plugin(
        SimulatorPlugin,
        config={},  # No config needed
        enabled=simulator_enabled
    )

    # Register plugin routes
    for plugin in registry.get_enabled_plugins():
        plugin.register_routes(app, f"/plugins/{plugin.metadata.id}")

@app.on_event("shutdown")
async def shutdown_plugins():
    """Shutdown plugins"""
    await registry.shutdown_all()
```

**Commit**:
```bash
git add src/rackscope/plugins/dev/simulator/ src/rackscope/api/app.py
git rm src/rackscope/api/routers/simulator.py
git commit -m "feat(plugins): extract simulator as plugin

Move simulator from core to dev plugin:
- Create SimulatorPlugin class
- Move router code to plugin directory
- Register via plugin system
- Disabled by default (enable via env var)

Usage: RACKSCOPE_SIMULATOR_ENABLED=true

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Phase 6D: Extract Slurm Plugin (2 days)

### Step 1: Create Plugin Structure (Day 6)

```bash
mkdir -p src/rackscope/plugins/workload/slurm
```

**Move files**:
- `src/rackscope/api/routers/slurm.py` → `src/rackscope/plugins/workload/slurm/router.py`
- `src/rackscope/services/slurm_service.py` → `src/rackscope/plugins/workload/slurm/service.py`

### Step 2: Create Plugin Class (Day 6)

**File**: `src/rackscope/plugins/workload/slurm/plugin.py`

```python
"""Slurm workload manager plugin"""
from typing import Dict, Optional
from fastapi import FastAPI
from rackscope.plugins.base import (
    RackscopePlugin,
    PluginMetadata,
    MenuSection,
    MenuRoute,
)
from . import router


class SlurmPlugin(RackscopePlugin):
    """Slurm workload manager integration"""

    @property
    def metadata(self) -> PluginMetadata:
        return PluginMetadata(
            id="workload-slurm",
            name="Slurm Workload Manager",
            version="1.0.0",
            category="workload",
            author="Rackscope",
            description="Monitor Slurm cluster nodes, partitions, and jobs",
            required_config=["api_url"],
        )

    async def initialize(self, config: Dict) -> None:
        """Initialize Slurm plugin"""
        self.api_url = config["api_url"]
        self.mapping_path = config.get("mapping_path")
        # TODO: Validate Slurm API connection

    def register_routes(self, app: FastAPI, prefix: str) -> None:
        """Register Slurm API routes"""
        app.include_router(router.router)

    def register_menu_section(self) -> Optional[MenuSection]:
        """Register Workload menu section"""
        return MenuSection(
            id="workload",
            label="Workload",
            icon="briefcase",
            routes=[
                MenuRoute(path="/workload/overview", label="Overview"),
                MenuRoute(path="/workload/partitions", label="Partitions"),
                MenuRoute(path="/workload/nodes", label="Nodes"),
                MenuRoute(path="/workload/jobs", label="Jobs"),
            ]
        )

    def get_health_status(self) -> Dict:
        """Check Slurm API connectivity"""
        # TODO: Ping Slurm API
        return {"status": "ok", "api_url": self.api_url}
```

### Step 3: Plugin Configuration (Day 7)

**File**: `config/plugins.yaml`

```yaml
# Plugin configuration
plugins:
  # Telemetry backend (required)
  - id: telemetry-prometheus
    enabled: true
    config:
      url: ${PROMETHEUS_URL:-http://prometheus:9090}
      timeout_seconds: 30

  # Workload manager (optional)
  - id: workload-slurm
    enabled: ${SLURM_ENABLED:-true}
    config:
      api_url: ${SLURM_API_URL:-http://slurm-rest:6820}
      version: "v0.0.39"
      mapping_path: config/slurm/mapping.yaml

  # Development tools (disable in prod)
  - id: dev-simulator
    enabled: ${SIMULATOR_ENABLED:-false}
    config: {}
```

**Update app startup** to load from config:

```python
import yaml
from pathlib import Path

@app.on_event("startup")
async def load_plugins():
    """Load plugins from config"""
    config_path = Path("config/plugins.yaml")
    if config_path.exists():
        plugins_config = yaml.safe_load(config_path.read_text())

        for plugin_def in plugins_config.get("plugins", []):
            plugin_id = plugin_def["id"]
            enabled = plugin_def.get("enabled", True)
            config = plugin_def.get("config", {})

            # Load plugin class (registry pattern or import)
            if plugin_id == "workload-slurm":
                from rackscope.plugins.workload.slurm import SlurmPlugin
                await registry.load_plugin(SlurmPlugin, config, enabled)
            elif plugin_id == "dev-simulator":
                from rackscope.plugins.dev.simulator import SimulatorPlugin
                await registry.load_plugin(SimulatorPlugin, config, enabled)
```

**Commit**:
```bash
git add src/rackscope/plugins/workload/slurm/ config/plugins.yaml
git rm src/rackscope/api/routers/slurm.py src/rackscope/services/slurm_service.py
git commit -m "feat(plugins): extract Slurm as plugin

Move Slurm from core to workload plugin:
- Create SlurmPlugin class
- Move router and service to plugin directory
- Configure via config/plugins.yaml
- Optional: disable via SLURM_ENABLED=false

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Testing Phase 6

### Run All Tests

```bash
# All tests should pass
docker compose exec backend pytest -v

# Check coverage
docker compose exec backend pytest --cov=rackscope --cov-report=term
```

### Manual Testing

1. **Test generic metrics**: Add APC PDU template, verify metrics collected
2. **Test simulator plugin**: Enable simulator, verify endpoints work
3. **Test Slurm plugin**: Disable Slurm, verify app still works
4. **Test plugin menu**: Call `/api/plugins/menu`, verify sections returned

---

## Success Criteria

- [ ] PDU metrics work with APC template (not just Raritan)
- [ ] All existing tests pass
- [ ] Simulator can be disabled via config
- [ ] Slurm can be disabled via config
- [ ] `/api/plugins/menu` returns correct sections
- [ ] No hardcoded infrastructure metrics remain
- [ ] Documentation updated

---

## Troubleshooting

### Tests Failing After Refactor

**Issue**: Tests expect old `get_pdu_metrics()` method

**Fix**: Update tests to use new `collect_component_metrics()`

### Plugin Not Loading

**Issue**: Plugin initialization fails

**Debug**:
```python
# Add logging in app.py
logger.info(f"Loading plugin {plugin_id} with config: {config}")
```

### Metrics Not Collected

**Issue**: No metrics returned for component

**Debug**:
1. Check template has `metrics` list
2. Verify PromQL query with `/api/prometheus/query?query=...`
3. Check Prometheus has the metrics

---

## Next Steps After Phase 6

Once Phase 6 is complete:

1. **Update REFACTORING_ROADMAP.md** - Mark Phase 6 complete
2. **Create Phase 7 branch** (optional, or continue same branch)
3. **Start Phase 7** - Frontend rebuild (see PHASE_7_FRONTEND_PLAN.md)

---

*Plan Version: 1.0*
*Created: 2026-02-01*
