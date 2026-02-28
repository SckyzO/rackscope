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

Plugins are registered in `api/app.py` during the FastAPI lifespan:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    registry = PluginRegistry()
    registry.register(SimulatorPlugin())
    registry.register(SlurmPlugin())
    await registry.initialize(app)
    yield
    await registry.shutdown()
```

## Discovering Plugins

```bash
# List all registered plugins
curl http://localhost:8000/api/plugins

# Get plugin menu contributions
curl http://localhost:8000/api/plugins/menu
```
