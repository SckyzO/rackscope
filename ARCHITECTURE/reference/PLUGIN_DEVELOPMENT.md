# Plugin Development Guide

**Version**: 1.0
**Last Updated**: 2026-02-02
**Audience**: Plugin developers

---

## Overview

Rackscope uses a **plugin architecture** to separate core functionality from optional features. This guide explains how to develop a new plugin.

### What is a Plugin?

A plugin is a self-contained module that:
- Extends Rackscope with additional features
- Can be enabled/disabled without affecting core functionality
- Registers API routes, menu sections, and lifecycle hooks
- Integrates seamlessly with the core application

### Core vs. Plugin

| Core (Always Active) | Plugins (Optional) |
|---------------------|-------------------|
| Physical topology visualization | Slurm workload integration |
| Prometheus telemetry | Simulator/demo mode |
| Health checks & alerting | Future: PBS, Kubernetes, NetBox sync |
| YAML editors | Future: Custom dashboards |

---

## Plugin Architecture

```
┌─────────────────────────────────────┐
│         FastAPI Application         │
├─────────────────────────────────────┤
│         Plugin Registry             │
│  ┌─────────────────────────────┐   │
│  │  Plugin A (Slurm)           │   │
│  │  - Routes: /api/slurm/*     │   │
│  │  - Menu: "Workload"         │   │
│  │  - Lifecycle: startup/down  │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  Plugin B (Simulator)       │   │
│  │  - Routes: /api/simulator/* │   │
│  │  - Menu: "Simulator"        │   │
│  │  - Lifecycle: startup/down  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## Creating a Plugin

### Step 1: Plugin Structure

Create your plugin directory:

```
src/rackscope/plugins/
└── myplugin/
    ├── __init__.py      # Package exports
    └── plugin.py        # Plugin implementation
```

**`__init__.py`**:
```python
"""MyPlugin - Short description."""

from rackscope.plugins.myplugin.plugin import MyPlugin

__all__ = ["MyPlugin"]
```

### Step 2: Implement Plugin Class

**`plugin.py`**:
```python
"""MyPlugin - Detailed description."""

from fastapi import APIRouter, FastAPI

from rackscope.plugins.base import RackscopePlugin, MenuSection, MenuItem


class MyPlugin(RackscopePlugin):
    """
    MyPlugin

    Provides [describe what your plugin does].
    """

    def __init__(self):
        self._router = APIRouter(prefix="/api/myplugin", tags=["myplugin"])
        self._setup_routes()

    # === Required Properties ===

    @property
    def plugin_id(self) -> str:
        """Unique plugin identifier (lowercase, no spaces)."""
        return "myplugin"

    @property
    def plugin_name(self) -> str:
        """Human-readable plugin name."""
        return "My Plugin"

    @property
    def version(self) -> str:
        """Plugin version (semver)."""
        return "1.0.0"

    # === Optional Properties ===

    @property
    def description(self) -> str:
        """Short description of plugin functionality."""
        return "Does something useful"

    @property
    def author(self) -> str:
        """Plugin author/maintainer."""
        return "Your Name"

    # === Setup Methods ===

    def _setup_routes(self) -> None:
        """Setup all plugin routes."""

        @self._router.get("/hello")
        async def hello():
            """Example endpoint."""
            return {"message": "Hello from MyPlugin!"}

        @self._router.get("/data")
        async def get_data():
            """Example data endpoint."""
            return {"items": [1, 2, 3]}

    # === Plugin Integration ===

    def register_routes(self, app: FastAPI) -> None:
        """Register plugin routes with FastAPI app."""
        app.include_router(self._router)

    def register_menu_sections(self):
        """Register menu sections for frontend navigation."""
        return [
            MenuSection(
                id="myplugin-section",
                label="My Plugin",
                icon="Package",  # Lucide icon name
                order=100,  # Lower = appears first (Slurm=50, Simulator=200)
                items=[
                    MenuItem(
                        id="myplugin-dashboard",
                        label="Dashboard",
                        path="/myplugin/dashboard",
                        icon="LayoutDashboard",
                    ),
                    MenuItem(
                        id="myplugin-settings",
                        label="Settings",
                        path="/myplugin/settings",
                        icon="Settings",
                    ),
                ],
            )
        ]

    # === Lifecycle Hooks (Optional) ===

    async def on_startup(self) -> None:
        """Called when plugin is loaded during app startup."""
        # Initialize resources, connections, background tasks, etc.
        pass

    async def on_shutdown(self) -> None:
        """Called when plugin is unloaded during app shutdown."""
        # Cleanup resources, close connections, cancel tasks, etc.
        pass
```

### Step 3: Register Plugin

**`src/rackscope/api/app.py`** (in lifespan function):
```python
from rackscope.plugins.myplugin import MyPlugin

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ... existing startup code ...

    # Register plugins
    try:
        myplugin = MyPlugin()
        plugin_registry.register(myplugin)
        logger.info("Registered MyPlugin")
    except Exception as e:
        logger.error(f"Failed to register MyPlugin: {e}", exc_info=True)

    # Initialize plugin system
    await plugin_registry.initialize(app)

    yield

    # Shutdown
    await plugin_registry.shutdown()
```

### Step 4: Test Your Plugin

Create tests in `tests/plugins/test_myplugin.py`:

```python
"""Tests for MyPlugin."""

import pytest
from fastapi.testclient import TestClient

from rackscope.api.app import app
from rackscope.plugins.registry import registry
from rackscope.plugins.myplugin import MyPlugin

# Register plugin for tests
if not registry.get_plugin("myplugin"):
    myplugin = MyPlugin()
    registry.register(myplugin)
    myplugin.register_routes(app)

client = TestClient(app)


def test_hello_endpoint():
    """Test basic endpoint."""
    response = client.get("/api/myplugin/hello")

    assert response.status_code == 200
    assert response.json() == {"message": "Hello from MyPlugin!"}


def test_plugin_registration():
    """Test plugin is registered."""
    plugin = registry.get_plugin("myplugin")

    assert plugin is not None
    assert plugin.plugin_name == "My Plugin"
    assert plugin.version == "1.0.0"


def test_menu_sections():
    """Test menu sections are provided."""
    plugin = registry.get_plugin("myplugin")
    sections = plugin.register_menu_sections()

    assert len(sections) == 1
    assert sections[0].label == "My Plugin"
    assert len(sections[0].items) == 2
```

Run tests:
```bash
make test
```

---

## Advanced Topics

### Accessing Global State

Plugins often need access to topology, catalog, or app config:

```python
from rackscope.api import app as app_module

@self._router.get("/topology-aware")
async def topology_aware_endpoint():
    """Endpoint that needs topology data."""
    TOPOLOGY = app_module.TOPOLOGY
    APP_CONFIG = app_module.APP_CONFIG

    if not TOPOLOGY:
        raise HTTPException(status_code=503, detail="Topology not loaded")

    # Use TOPOLOGY, APP_CONFIG, etc.
    return {"sites": len(TOPOLOGY.sites)}
```

**Global State Available**:
- `app_module.TOPOLOGY`: Physical topology
- `app_module.CATALOG`: Device/rack templates
- `app_module.CHECKS_LIBRARY`: Health checks
- `app_module.APP_CONFIG`: Application configuration
- `app_module.PLANNER`: Telemetry query planner

### Using Services

Leverage existing services for common operations:

```python
from rackscope.services import topology_service, slurm_service
from rackscope.telemetry.prometheus import client as prom_client

@self._router.get("/room/{room_id}/stats")
async def get_room_stats(room_id: str):
    """Get room statistics."""
    TOPOLOGY = app_module.TOPOLOGY

    room = topology_service.find_room_by_id(TOPOLOGY, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Query Prometheus
    query = 'up{job="node"}'
    results = await prom_client.query(query)

    return {"room_id": room_id, "metrics": results}
```

### Configuration

If your plugin needs configuration, add it to `model/config.py`:

```python
# In AppConfig
class MyPluginConfig(BaseModel):
    enabled: bool = True
    api_url: str = "http://localhost:9090"
    timeout_seconds: int = 30

class AppConfig(BaseModel):
    # ... existing fields ...
    myplugin: Optional[MyPluginConfig] = None
```

Then access in plugin:
```python
APP_CONFIG = app_module.APP_CONFIG
if APP_CONFIG and APP_CONFIG.myplugin:
    api_url = APP_CONFIG.myplugin.api_url
```

### Prometheus Metrics Collection

Use the generic metrics service:

```python
from rackscope.services import metrics_service

# Collect rack component metrics
metrics = await metrics_service.collect_rack_component_metrics(
    rack=rack,
    catalog=CATALOG,
    prom_client=prom_client,
)

# Collect device metrics
device_metrics = await metrics_service.collect_rack_devices_metrics(
    rack=rack,
    catalog=CATALOG,
    prom_client=prom_client,
)
```

### Background Tasks

Use startup hook for background tasks:

```python
import asyncio

class MyPlugin(RackscopePlugin):
    def __init__(self):
        super().__init__()
        self._task: Optional[asyncio.Task] = None

    async def on_startup(self) -> None:
        """Start background task."""
        self._task = asyncio.create_task(self._background_worker())
        logger.info("Started background worker")

    async def on_shutdown(self) -> None:
        """Stop background task."""
        if self._task:
            self._task.cancel()
            with suppress(asyncio.CancelledError):
                await self._task
            logger.info("Stopped background worker")

    async def _background_worker(self) -> None:
        """Background task loop."""
        while True:
            # Do work
            await asyncio.sleep(60)
```

---

## Frontend Integration (Phase 7)

**Current Status**: Plugins only provide backend APIs. Frontend components are still in core.

**Future (Phase 7)**: Plugins will provide frontend components dynamically:

```python
# Future API (not implemented yet)
class MyPlugin(RackscopePlugin):
    def register_frontend_routes(self):
        """Register frontend routes (React components)."""
        return [
            FrontendRoute(
                path="/myplugin/dashboard",
                component="@/plugins/myplugin/Dashboard.tsx",
            ),
        ]
```

**Phase 7 Goals**:
- Plugins can register React components
- Dashboard widgets from plugins
- Settings UI for plugin configuration
- Enable/disable plugins via Settings > Plugins UI

---

## Best Practices

### ✅ DO
- Use descriptive plugin IDs (lowercase, hyphens)
- Follow semver for version numbering
- Write comprehensive tests for all endpoints
- Document your API endpoints with docstrings
- Use type hints for all parameters and return values
- Handle errors gracefully (return proper HTTP status codes)
- Log important events (startup, errors, warnings)
- Clean up resources in `on_shutdown()`

### ❌ DON'T
- Don't modify core code (keep plugins self-contained)
- Don't use blocking operations in async endpoints
- Don't hardcode configuration (use AppConfig)
- Don't use global state directly (use lazy imports)
- Don't forget to register your plugin in `app.py`
- Don't skip tests

---

## Examples

### Real-World Plugins

#### SimulatorPlugin
- **Purpose**: Demo mode with metric overrides
- **Routes**: `/api/simulator/overrides`, `/api/simulator/scenarios`
- **Menu**: "Simulator" (order=200)
- **Code**: `src/rackscope/plugins/simulator/plugin.py`

#### SlurmPlugin
- **Purpose**: Workload manager integration
- **Routes**: `/api/slurm/nodes`, `/api/slurm/summary`, `/api/slurm/partitions`
- **Menu**: "Workload" (order=50)
- **Code**: `src/rackscope/plugins/slurm/plugin.py`

Study these implementations for reference!

---

## Plugin Ideas

Potential plugins to develop:

- **PBS/Torque Plugin**: Similar to Slurm, for PBS workload manager
- **Kubernetes Plugin**: Show pod/node mapping on racks
- **NetBox Sync Plugin**: Import topology from NetBox CMDB
- **Custom Dashboards**: User-defined widget dashboards
- **Alertmanager Plugin**: Show active alerts on physical view
- **IPMI Plugin**: Direct hardware monitoring
- **Power Metrics Plugin**: PDU-level power analytics
- **Maintenance Mode Plugin**: Schedule/track maintenance windows

---

## Getting Help

- **Architecture docs**: `ARCHITECTURE/`
- **Codebase guide**: `CLAUDE.md`
- **Plugin base class**: `src/rackscope/plugins/base.py`
- **Plugin registry**: `src/rackscope/plugins/registry.py`
- **Example plugins**: `src/rackscope/plugins/simulator/`, `src/rackscope/plugins/slurm/`
- **Tests**: `tests/plugins/`

---

## Version History

- **1.0** (2026-02-02): Initial plugin development guide
