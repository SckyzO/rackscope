---
id: overview
title: Plugin System
sidebar_position: 1
---

# Plugin System

Rackscope uses a plugin architecture to keep the core lean and extensible.

## Core vs Plugins

**Core** (always active):
- Physical topology visualization
- Prometheus telemetry integration
- Health checks and alerting
- Visual editors (topology, rack, templates, checks, settings)
- REST API

**Plugins** (optional):
- **SimulatorPlugin**: demo mode with metric overrides
- **SlurmPlugin**: HPC workload manager integration

## Plugin Capabilities

Plugins can:
- Register custom API routes
- Contribute menu sections to the sidebar
- Access global state (topology, catalog, config)
- Run startup/shutdown hooks

## Plugin Registration

Plugins are registered in `api/app.py` during the FastAPI lifespan using a **conditional import pattern**. A plugin's code is only imported when it is explicitly enabled in `app.yaml` — disabled plugins have zero overhead (no routes mounted, no memory used, nothing exposed in the API).

```python
# In api/app.py — REQUIRED pattern for all plugins
if _plugin_enabled("my-plugin"):
    from plugins.my_plugin.backend import MyPlugin
    plugin_registry.register(MyPlugin())
```

The `_plugin_enabled()` helper returns `True` only when `plugins.<id>.enabled: true` is set in `app.yaml`:

```yaml
# config/app.yaml
plugins:
  my-plugin:
    enabled: true   # false (or absent) = plugin never imported
```

:::warning Never use top-level imports for plugins
A top-level import (`from plugins.X import ...` at module level in `app.py`) loads the plugin unconditionally regardless of configuration, defeating the autonomous plugin architecture. Always use the deferred `if _plugin_enabled(...)` pattern.
:::

The full lifecycle inside `lifespan()` looks like this:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    if _plugin_enabled("simulator"):
        from plugins.simulator.backend import SimulatorPlugin
        plugin_registry.register(SimulatorPlugin())
    if _plugin_enabled("slurm"):
        from plugins.slurm.backend import SlurmPlugin
        plugin_registry.register(SlurmPlugin())
    await plugin_registry.initialize(app)
    yield
    await plugin_registry.shutdown()
```

## Discovering Plugins

```bash
# List all registered plugins
curl http://localhost:8000/api/plugins

# Get plugin menu contributions
curl http://localhost:8000/api/plugins/menu
```
