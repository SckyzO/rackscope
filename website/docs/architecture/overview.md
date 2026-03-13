---
id: overview
title: Architecture Overview
sidebar_position: 1
---

# Architecture Overview

Rackscope follows a clean separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    YAML Configuration                   │
│  topology/ + templates/ + checks/ + metrics/            │
└─────────────────────┬───────────────────────────────────┘
                      │ loaded at startup + on API writes
         ┌────────────▼──────────────────────────────┐
         │         Backend (FastAPI :8000)             │
         │                                            │
         │  ┌─────────────────────────────────────┐  │
         │  │  TopologyIndex (O(1) dict lookups)  │  │  ← built on load
         │  └─────────────────────────────────────┘  │
         │  ┌─────────────────────────────────────┐  │
         │  │  ServiceCache        (5s TTL)        │  │  ← response cache
         │  └──────────────┬──────────────────────┘  │
         │  ┌──────────────▼──────────────────────┐  │
         │  │  TelemetryPlanner    (60s TTL)       │  │  ← batches PromQL
         │  └──────────────┬──────────────────────┘  │
         │  ┌──────────────▼──────────────────────┐  │
         │  │  PrometheusClient    (60/120s TTL)   │  │  ← in-flight dedup
         │  └──────────────┬──────────────────────┘  │
         └─────────────────┼──────────────────────────┘
                           │ PromQL (batched)
         ┌─────────────────▼──────────┐
         │    Prometheus (:9090)       │
         └─────────────────┬──────────┘
                           │ scrapes
         ┌─────────────────▼──────────┐
         │  Simulator (:9000)          │  or real exporters
         └─────────────────────────────┘
                           ▲
         ┌─────────────────┴──────────────────────────┐
         │   Frontend (Vite :5173)                     │
         │   fetchWithCache (localStorage, 5s TTL)     │
         └─────────────────────────────────────────────┘
```

## Design Principles

1. **No database**: YAML is the source of truth
2. **Prometheus-only telemetry**: no internal time-series
3. **Template-driven**: hardware defined once, reused everywhere
4. **Plugin architecture**: optional features as plugins
5. **Generic core**: no vendor-specific code in core modules

## Backend Stack

- Python 3.12+, FastAPI, Uvicorn
- Pydantic v2 for models
- httpx for async Prometheus client
- PyYAML for configuration

## Frontend Stack

- React 19 + TypeScript
- Tailwind CSS v4
- React Router (routes at `/`)
- ApexCharts for metrics visualization
- Leaflet for world map
- Monaco Editor for YAML editing

## Plugin Architecture

Plugins extend Rackscope without modifying core:

```python
class MyPlugin(RackscopePlugin):
    @property
    def plugin_id(self) -> str:
        return "my-plugin"

    def register_routes(self, app: FastAPI) -> None:
        app.include_router(my_router)

    def register_menu_sections(self) -> List[MenuSection]:
        return [MenuSection(section_id="my-section", ...)]
```

Active plugins: **SimulatorPlugin**, **SlurmPlugin**
