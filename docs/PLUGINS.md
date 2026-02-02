# Plugin System

Rackscope uses a plugin architecture to separate core functionality from optional features. This allows you to extend Rackscope without modifying core code.

## Overview

**Core Features** (always active):
- Physical topology visualization
- Prometheus telemetry integration
- Health checks and alerting
- Configuration editors

**Plugin Features** (optional):
- Slurm workload management integration
- Metrics simulator for demos
- Future integrations (IPMI, Redfish, custom dashboards, etc.)

## Architecture

```
src/rackscope/plugins/
├── base.py          # RackscopePlugin base class
├── registry.py      # PluginRegistry for lifecycle management
├── simulator/       # SimulatorPlugin (demo mode)
│   ├── plugin.py
│   ├── router.py
│   └── service.py
└── slurm/          # SlurmPlugin (workload manager)
    ├── plugin.py
    ├── router.py
    └── service.py
```

### Plugin Lifecycle

1. **Registration**: Plugins are registered with the `PluginRegistry` during app startup
2. **Initialization**: `initialize(app)` registers routes and calls `on_startup()` for each plugin
3. **Runtime**: Plugins serve API endpoints and contribute menu sections
4. **Shutdown**: `shutdown()` calls `on_shutdown()` for cleanup (reverse order)

## Creating a Plugin

### 1. Implement the RackscopePlugin Base Class

Create a new directory under `src/rackscope/plugins/your-plugin/`:

```python
# src/rackscope/plugins/monitoring/ipmi/plugin.py
from typing import List
from fastapi import FastAPI
from rackscope.plugins.base import RackscopePlugin, MenuSection, MenuItem

class IpmiPlugin(RackscopePlugin):
    """IPMI monitoring integration plugin."""

    @property
    def plugin_id(self) -> str:
        """Unique plugin identifier (category-name format)."""
        return "monitoring-ipmi"

    @property
    def plugin_name(self) -> str:
        """Human-readable plugin name."""
        return "IPMI Monitoring"

    @property
    def version(self) -> str:
        """Plugin version (semantic versioning)."""
        return "1.0.0"

    @property
    def description(self) -> str:
        """Plugin description."""
        return "Direct IPMI sensor monitoring for server hardware"

    @property
    def author(self) -> str:
        """Plugin author."""
        return "Your Name"

    def register_routes(self, app: FastAPI) -> None:
        """Register API routes with FastAPI."""
        from .router import router
        app.include_router(router)

    def register_menu_sections(self) -> List[MenuSection]:
        """Register navigation menu sections."""
        return [
            MenuSection(
                id="monitoring",
                label="Monitoring",
                icon="Activity",  # Lucide icon name
                order=75,  # Display order (lower = higher in menu)
                items=[
                    MenuItem(
                        id="ipmi-sensors",
                        label="IPMI Sensors",
                        path="/monitoring/ipmi/sensors"
                    ),
                    MenuItem(
                        id="ipmi-events",
                        label="IPMI Events",
                        path="/monitoring/ipmi/events"
                    ),
                ],
            )
        ]

    async def on_startup(self) -> None:
        """Initialize plugin resources."""
        # Initialize IPMI connection pool, load config, etc.
        logger.info("IPMI plugin started")

    async def on_shutdown(self) -> None:
        """Cleanup plugin resources."""
        # Close IPMI connections, save state, etc.
        logger.info("IPMI plugin stopped")
```

### 2. Create API Router

```python
# src/rackscope/plugins/monitoring/ipmi/router.py
from fastapi import APIRouter, Depends
from typing import List

router = APIRouter(prefix="/api/monitoring/ipmi", tags=["monitoring", "ipmi"])

@router.get("/sensors")
async def get_ipmi_sensors() -> List[dict]:
    """Get all IPMI sensors."""
    # Implementation
    return []

@router.get("/events")
async def get_ipmi_events() -> List[dict]:
    """Get IPMI event log."""
    # Implementation
    return []
```

### 3. Register the Plugin

In `src/rackscope/api/app.py`, register your plugin during startup:

```python
from rackscope.plugins.monitoring.ipmi import IpmiPlugin
from rackscope.plugins.registry import registry

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Register plugins
    registry.register(SimulatorPlugin())
    registry.register(SlurmPlugin())
    registry.register(IpmiPlugin())  # Add your plugin

    # Initialize plugins
    await registry.initialize(app)

    yield

    # Shutdown plugins
    await registry.shutdown()
```

## Plugin Components

### MenuSection

Defines a navigation section in the UI sidebar.

```python
MenuSection(
    id="workload",              # Unique section ID
    label="Workload",           # Display label
    icon="Zap",                 # Lucide icon name (optional)
    order=50,                   # Display order (lower = higher)
    items=[...]                 # List of MenuItem
)
```

**Order Guidelines**:
- Core sections: 0-49 (Dashboard, Infrastructure, Configuration, System)
- Plugin sections: 50-199 (Workload=50, Monitoring=75, etc.)
- Dev tools: 200+ (Simulator=200)

### MenuItem

Defines a menu item within a section.

```python
MenuItem(
    id="slurm-overview",        # Unique item ID
    label="Overview",           # Display label
    path="/slurm/overview",     # Route path
    icon="Activity"             # Lucide icon name (optional)
)
```

## Plugin API Endpoints

### GET /api/plugins

List all registered plugins with metadata.

**Response**:
```json
{
  "plugins": [
    {
      "id": "workload-slurm",
      "name": "Slurm Workload Manager",
      "version": "1.0.0",
      "description": "Slurm cluster monitoring and job tracking",
      "author": "Rackscope Team"
    },
    {
      "id": "simulator",
      "name": "Metrics Simulator",
      "version": "1.0.0",
      "description": "Demo mode with configurable scenarios",
      "author": "Rackscope Team"
    }
  ]
}
```

### GET /api/plugins/menu

Get aggregated menu sections from all plugins.

**Response**:
```json
{
  "sections": [
    {
      "id": "workload",
      "label": "Workload",
      "icon": "Zap",
      "order": 50,
      "items": [
        {
          "id": "slurm-overview",
          "label": "Overview",
          "path": "/slurm/overview",
          "icon": null
        }
      ]
    }
  ]
}
```

## Built-in Plugins

### SimulatorPlugin

**Plugin ID**: `simulator`
**Order**: 200 (dev tool)

Generates realistic Prometheus metrics for demos and testing.

**Features**:
- Configurable scenarios (demo-small, full-ok, random failures)
- Runtime metric overrides
- Deterministic seeding for repeatable demos

**Routes**:
- `GET /api/simulator/scenarios` - List available scenarios
- `GET /api/simulator/overrides` - List active overrides
- `POST /api/simulator/overrides` - Create override
- `DELETE /api/simulator/overrides` - Clear all overrides
- `DELETE /api/simulator/overrides/{id}` - Delete specific override

**Configuration**:
```yaml
# config/app.yaml
features:
  demo: true

simulator:
  scenario: demo-small
  seed: 42
  update_interval_seconds: 20
```

See [SIMULATOR.md](SIMULATOR.md) for full documentation.

### SlurmPlugin

**Plugin ID**: `workload-slurm`
**Order**: 50

Integrates Slurm workload manager for HPC cluster monitoring.

**Features**:
- Node state tracking (idle, allocated, down, drain, etc.)
- Partition-level monitoring
- Topology-aware node mapping
- Severity mapping (OK/WARN/CRIT)

**Routes**:
- `GET /api/slurm/nodes` - Flat list of Slurm nodes with topology
- `GET /api/slurm/summary` - Aggregated cluster status
- `GET /api/slurm/partitions` - Per-partition status
- `GET /api/slurm/rooms/{room_id}/nodes` - Room-specific nodes

**Configuration**:
```yaml
# config/app.yaml
slurm:
  metric: slurm_node_status
  label_node: node
  label_status: status
  label_partition: partition
  status_map:
    OK: [idle, completing, allocated, mixed]
    WARN: [drain, drained, draining, reserved]
    CRIT: [down, down*, fail, failing, error, unknown]
  mapping_path: config/slurm_mapping.yaml  # Optional
```

## Best Practices

### 1. Plugin Naming

- **Plugin ID**: Use `category-name` format (e.g., `monitoring-ipmi`, `workload-slurm`)
- **Plugin Name**: Human-readable (e.g., "IPMI Monitoring", "Slurm Workload Manager")
- **Route Prefix**: Use `/api/category/name` (e.g., `/api/monitoring/ipmi`)

### 2. Error Handling

Plugins should handle errors gracefully:

```python
async def on_startup(self) -> None:
    try:
        # Initialize resources
        self.connection = await connect_to_service()
    except Exception as e:
        logger.error(f"Failed to initialize {self.plugin_name}: {e}")
        # Plugin continues but may have limited functionality
```

The registry continues with other plugins even if one fails.

### 3. Resource Cleanup

Always implement `on_shutdown()` to clean up resources:

```python
async def on_shutdown(self) -> None:
    if hasattr(self, 'connection'):
        await self.connection.close()
        logger.info(f"{self.plugin_name} connection closed")
```

### 4. Configuration

Use `app.yaml` for plugin configuration:

```yaml
plugins:
  ipmi:
    enabled: true
    timeout_seconds: 5
    max_retries: 3
```

Access config via dependencies:

```python
from rackscope.api.dependencies import get_app_config

@router.get("/sensors")
async def get_sensors(config = Depends(get_app_config)):
    ipmi_config = config.plugins.get("ipmi", {})
    timeout = ipmi_config.get("timeout_seconds", 5)
    # ...
```

### 5. Testing

Create unit tests for your plugin:

```python
# tests/plugins/test_ipmi_plugin.py
import pytest
from rackscope.plugins.monitoring.ipmi import IpmiPlugin

def test_plugin_metadata():
    plugin = IpmiPlugin()
    assert plugin.plugin_id == "monitoring-ipmi"
    assert plugin.plugin_name == "IPMI Monitoring"
    assert plugin.version == "1.0.0"

def test_menu_sections():
    plugin = IpmiPlugin()
    sections = plugin.register_menu_sections()
    assert len(sections) == 1
    assert sections[0].id == "monitoring"
    assert len(sections[0].items) == 2
```

### 6. Logging

Use structured logging:

```python
import logging

logger = logging.getLogger(__name__)

class IpmiPlugin(RackscopePlugin):
    async def on_startup(self) -> None:
        logger.info(f"Starting {self.plugin_name} v{self.version}")
        # ...
```

## Frontend Integration

### Dynamic Menu

The frontend fetches plugin menu sections from `/api/plugins/menu` and dynamically builds the sidebar.

**React Example**:
```typescript
// Fetch plugin menu sections
const { data: pluginMenu } = useQuery({
  queryKey: ['plugins', 'menu'],
  queryFn: () => fetch('/api/plugins/menu').then(r => r.json())
});

// Render sidebar with core + plugin sections
<Sidebar>
  {coreMenuSections.map(section => <MenuSection {...section} />)}
  {pluginMenu?.sections.map(section => <MenuSection {...section} />)}
</Sidebar>
```

### Plugin Routes

Create React routes for plugin pages:

```typescript
// src/App.tsx
<Routes>
  <Route path="/monitoring/ipmi/sensors" element={<IpmiSensorsPage />} />
  <Route path="/monitoring/ipmi/events" element={<IpmiEventsPage />} />
</Routes>
```

## Troubleshooting

### Plugin Not Loading

1. Check plugin registration in `app.py`:
   ```python
   registry.register(YourPlugin())
   ```

2. Check logs for initialization errors:
   ```bash
   make logs | grep "plugin"
   ```

3. Verify plugin ID is unique:
   ```bash
   curl http://localhost:8000/api/plugins | jq '.plugins[].id'
   ```

### Routes Not Working

1. Verify route registration:
   ```python
   def register_routes(self, app: FastAPI) -> None:
       from .router import router
       app.include_router(router)
   ```

2. Check route prefix matches your menu items:
   ```python
   # Router prefix
   router = APIRouter(prefix="/api/monitoring/ipmi")

   # Menu item path
   MenuItem(path="/monitoring/ipmi/sensors")
   ```

3. Test API endpoint directly:
   ```bash
   curl http://localhost:8000/api/monitoring/ipmi/sensors
   ```

### Menu Not Appearing

1. Check menu section order (lower = higher in menu)
2. Verify frontend is fetching `/api/plugins/menu`
3. Check browser console for errors
4. Verify Lucide icon name is valid

## Examples

### Minimal Plugin

```python
from rackscope.plugins.base import RackscopePlugin

class MinimalPlugin(RackscopePlugin):
    @property
    def plugin_id(self) -> str:
        return "example-minimal"

    @property
    def plugin_name(self) -> str:
        return "Minimal Example"
```

### Plugin with Routes

```python
from fastapi import APIRouter, FastAPI
from rackscope.plugins.base import RackscopePlugin

router = APIRouter(prefix="/api/example", tags=["example"])

@router.get("/hello")
async def hello() -> dict:
    return {"message": "Hello from plugin!"}

class ExamplePlugin(RackscopePlugin):
    @property
    def plugin_id(self) -> str:
        return "example"

    @property
    def plugin_name(self) -> str:
        return "Example Plugin"

    def register_routes(self, app: FastAPI) -> None:
        app.include_router(router)
```

### Plugin with Menu

```python
from rackscope.plugins.base import RackscopePlugin, MenuSection, MenuItem

class ExamplePlugin(RackscopePlugin):
    @property
    def plugin_id(self) -> str:
        return "example"

    @property
    def plugin_name(self) -> str:
        return "Example Plugin"

    def register_menu_sections(self) -> List[MenuSection]:
        return [
            MenuSection(
                id="example",
                label="Example",
                icon="Box",
                order=100,
                items=[
                    MenuItem(id="dashboard", label="Dashboard", path="/example/dashboard"),
                    MenuItem(id="settings", label="Settings", path="/example/settings"),
                ],
            )
        ]
```

## See Also

- [DEVELOPMENT.md](DEVELOPMENT.md) - Developer guide
- [API_REFERENCE.md](API_REFERENCE.md) - API endpoints
- [SIMULATOR.md](SIMULATOR.md) - Simulator plugin documentation
