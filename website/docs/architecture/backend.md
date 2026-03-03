---
id: backend
title: Backend Architecture
sidebar_position: 3
---

# Backend Architecture

## Module Structure

```
src/rackscope/
├── api/
│   ├── app.py              # FastAPI app, global state, lifespan
│   ├── dependencies.py     # FastAPI dependency injection
│   ├── middleware.py       # Request logging
│   ├── exceptions.py       # Global exception handlers
│   ├── models.py           # API response models
│   └── routers/
│       ├── topology.py     # /api/topology/*
│       ├── catalog.py      # /api/catalog/*
│       ├── checks.py       # /api/checks/*
│       ├── metrics.py      # /api/metrics/*
│       ├── telemetry.py    # /api/rooms/*, /api/racks/*, /api/alerts/*
│       ├── config.py       # /api/config
│       ├── plugins.py      # /api/plugins/*
│       ├── auth.py         # /api/auth/*
│       └── system.py       # /api/stats/*
├── model/
│   ├── domain.py           # Topology models (Site, Room, Rack, Device...)
│   ├── catalog.py          # Template models (DeviceTemplate, RackTemplate...)
│   ├── checks.py           # Health check models
│   ├── metrics.py          # Metrics library models
│   ├── config.py           # App configuration model
│   └── loader.py           # YAML loading and validation
├── telemetry/
│   ├── prometheus.py       # Async Prometheus client with cache
│   └── planner.py          # TelemetryPlanner (batched PromQL)
├── health/
│   └── ...                 # Health state calculation engine
├── services/
│   ├── topology_service.py
│   ├── telemetry_service.py
│   ├── instance_service.py
│   ├── metrics_service.py  # Generic template-driven metrics collection
│   └── slurm_service.py    # Slurm state resolution (SlurmConfigLike Protocol)
├── plugins/
│   ├── base.py             # RackscopePlugin ABC + MenuSection/MenuItem
│   ├── registry.py         # PluginRegistry
│   ├── simulator/
│   │   ├── plugin.py       # SimulatorPlugin
│   │   └── config.py       # SimulatorPluginConfig
│   └── slurm/
│       ├── plugin.py       # SlurmPlugin
│       └── config.py       # SlurmPluginConfig
└── utils/
    ├── aggregation.py
    └── validation.py
```

## Global State

The backend maintains global state loaded at startup:

```python
TOPOLOGY: Optional[Topology]
CATALOG: Optional[Catalog]
CHECKS_LIBRARY: Optional[ChecksLibrary]
METRICS_LIBRARY: Optional[MetricsLibrary]
APP_CONFIG: Optional[AppConfig]
PLANNER: Optional[TelemetryPlanner]
```

State is reloaded when files change (via PUT endpoints).

## Telemetry Planner

The TelemetryPlanner is critical for performance:

1. Collects all topology IDs (nodes, chassis, racks)
2. Builds batched PromQL queries (max `max_ids_per_query` IDs per query)
3. Replaces `$instances`, `$chassis`, `$racks` placeholders
4. Caches results for `cache_ttl_seconds`
5. Returns a `PlannerSnapshot`

Without batching, a 1000-node cluster would generate 1000 individual Prometheus queries on every refresh. With batching, it generates 10 queries (100 nodes per query).

### Virtual Node Expansion (`expand_by_label`)

When a check defines `expand_by_label: "slot"`, the planner performs a **discovery pre-pass**:

1. Runs a discovery query to enumerate all unique label values for the metric
2. Creates virtual instance keys: `{instance}.{label_value}` (e.g., `da01-r02-01.3`)
3. Adds these virtual keys to the `$instances` placeholder
4. Evaluates health per virtual node independently

This enables per-component monitoring (drives, ports, fans) without listing each component in the topology YAML. The backend creates the virtual identities at runtime from Prometheus data.

```python
# Example: check with expand_by_label
check = CheckDefinition(
    id="eseries_drive_status",
    expand_by_label="slot",   # ← planner will expand per slot value
    expr='eseries_drive_status{instance=~"$instances"}',
    ...
)
# Planner creates: da01-r02-01.1, da01-r02-01.2, ..., da01-r02-01.60
```

## Performance: Conditional Metrics

The `/api/racks/{id}/state` endpoint defaults to health-only (fast):

- `include_metrics=false` (default): ~30-40ms — health states only
- `include_metrics=true`: ~743ms — health + temperature/power/PDU (20+ queries)

Use `include_metrics=true` only on detail views (RackPage, DevicePage).
