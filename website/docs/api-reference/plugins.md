---
id: plugins
title: Plugins & Simulator API
sidebar_position: 5
---

# Plugins & Simulator API

## Plugin Discovery

### GET /api/plugins

Returns all registered plugins with their status.

```json
[
  {
    "plugin_id": "workload-slurm",
    "plugin_name": "Slurm Workload Manager",
    "enabled": true,
    "version": "1.0.0"
  },
  {
    "plugin_id": "simulator",
    "plugin_name": "Metrics Simulator",
    "enabled": true,
    "version": "1.0.0"
  }
]
```

### GET /api/plugins/menu

Returns the menu sections contributed by all active plugins. Used by the frontend to build the sidebar navigation.

```json
[
  {
    "section_id": "workload",
    "title": "Workload",
    "order": 50,
    "items": [
      { "id": "slurm-overview", "label": "Overview", "path": "/slurm/overview", "icon": "BarChart" },
      { "id": "slurm-nodes", "label": "Nodes", "path": "/slurm/nodes", "icon": "Server" }
    ]
  },
  {
    "section_id": "simulator",
    "title": "Simulator",
    "order": 200,
    "items": [
      { "id": "sim-control", "label": "Control", "path": "/editors/settings#simulator", "icon": "FlaskConical" }
    ]
  }
]
```

## Simulator API

### GET /api/simulator/status

Returns simulator status.

```json
{
  "running": true,
  "scenario": "demo-small",
  "hostname": "simulator",
  "port": 9000,
  "overrides_count": 2
}
```

### GET /api/simulator/scenarios

Returns available scenarios.

```json
["demo-small", "full-ok", "random-demo-small"]
```

### GET /api/simulator/overrides

Returns active metric overrides.

### POST /api/simulator/overrides

Add a metric override.

**Request body:**
```json
{
  "instance": "compute001",
  "metric": "up",
  "value": 0,
  "ttl_seconds": 300
}
```

`ttl_seconds: 0` means the override is permanent until explicitly cleared.

### DELETE /api/simulator/overrides

Clear all overrides.

### GET /api/simulator/metrics

Returns all metrics the simulator can generate (from the metrics library).

## Slurm API

### GET /api/slurm/rooms/{room_id}/nodes

Returns Slurm node states mapped to the room's physical layout.

### GET /api/slurm/summary

Returns cluster-wide Slurm summary (nodes per state, per partition).

### GET /api/slurm/partitions

Returns per-partition Slurm statistics.

### GET /api/slurm/nodes

Returns flat list of all nodes with Slurm state and topology context.

## Config API

### GET /api/config

Returns current application configuration.

### PUT /api/config

Updates application configuration. Saves to `config/app.yaml` and syncs dependent plugins.
