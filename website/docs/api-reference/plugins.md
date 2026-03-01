---
id: plugins
title: Plugins, Simulator & Slurm API
sidebar_position: 5
---

# Plugins, Simulator & Slurm API

This page covers the Plugin Discovery endpoints, the Simulator plugin API, the Slurm plugin API, and the Config & System endpoints.

---

## Plugin Discovery {#plugins}

### GET /api/plugins

Returns all registered plugins with their current status.

```http
GET /api/plugins
```

**Response**

```json
[
  {"plugin_id": "simulator", "plugin_name": "Metrics Simulator", "enabled": true, "version": "1.0.0"},
  {"plugin_id": "workload-slurm", "plugin_name": "Slurm Workload Manager", "enabled": true, "version": "1.0.0"}
]
```

| Field | Type | Description |
|---|---|---|
| `plugin_id` | string | Unique plugin identifier |
| `plugin_name` | string | Human-readable plugin name |
| `enabled` | boolean | Whether the plugin is currently active |
| `version` | string | Plugin version |

---

### GET /api/plugins/menu

Returns the sidebar navigation sections contributed by all active plugins. The frontend uses this endpoint to build dynamic navigation — each plugin registers its own menu sections and items.

```http
GET /api/plugins/menu
```

**Response**

```json
[
  {
    "id": "workload",
    "label": "Workload",
    "icon": "Zap",
    "order": 50,
    "items": [
      {"id": "slurm-overview", "label": "Overview", "path": "/slurm/overview", "icon": "BarChart2"},
      {"id": "slurm-nodes", "label": "Nodes", "path": "/slurm/nodes", "icon": "Server"},
      {"id": "slurm-partitions", "label": "Partitions", "path": "/slurm/partitions", "icon": "Layers"},
      {"id": "slurm-alerts", "label": "Alerts", "path": "/slurm/alerts", "icon": "AlertTriangle"}
    ]
  },
  {
    "id": "simulator",
    "label": "Simulator",
    "icon": "FlaskConical",
    "order": 200,
    "items": [
      {"id": "sim-control", "label": "Control", "path": "/editors/settings#simulator", "icon": "Settings"}
    ]
  }
]
```

| Field | Type | Description |
|---|---|---|
| `id` | string | Section identifier |
| `label` | string | Display label in the sidebar |
| `icon` | string | Lucide icon name |
| `order` | integer | Sidebar sort order (lower = higher in sidebar) |
| `items` | array | Navigation items within this section |
| `items[].path` | string | Frontend route path |

---

## Simulator Plugin {#simulator}

The Simulator plugin generates realistic Prometheus metrics for testing without real hardware. It is enabled when `features.demo: true` is set in `config/app.yaml`. Prometheus scrapes the simulator and the backend queries Prometheus normally, making the demo environment behaviorally identical to production.

---

### GET /api/simulator/status

Returns the current simulator status, including the active scenario and number of active overrides.

```http
GET /api/simulator/status
```

**Response**

```json
{
  "running": true,
  "endpoint": "http://simulator:9000",
  "update_interval": 20,
  "scenario": "demo-stable",
  "overrides_count": 2
}
```

| Field | Type | Description |
|---|---|---|
| `running` | boolean | Whether the simulator process is reachable |
| `endpoint` | string | Simulator scrape endpoint used by Prometheus |
| `update_interval` | integer | Metric refresh interval in seconds |
| `scenario` | string | Currently active scenario name |
| `overrides_count` | integer | Number of active metric overrides |

---

### GET /api/simulator/scenarios

Returns all available scenarios. Scenarios define the baseline behavior of the simulated environment (failure rate, seed, topology coverage).

```http
GET /api/simulator/scenarios
```

**Response**

```json
{
  "scenarios": [
    {"name": "demo-stable", "description": "Stable demo with minor variations"},
    {"name": "demo-small", "description": "Small topology with a few failures"},
    {"name": "full-ok", "description": "All nodes healthy — baseline testing"},
    {"name": "random-demo-small", "description": "Random failures, different seed each run"}
  ]
}
```

The active scenario is set via `simulator.scenario` in `config/app.yaml` or through the Settings UI.

---

### GET /api/simulator/overrides

Returns all currently active metric overrides.

```http
GET /api/simulator/overrides
```

**Response**

```json
{
  "overrides": [
    {"id": "ov-001", "instance": "compute001", "rack_id": null, "metric": "up", "value": 0, "expires_at": null},
    {"id": "ov-002", "instance": "compute002", "rack_id": null, "metric": "node_temperature_celsius", "value": 90, "expires_at": 1709251200}
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | Override identifier |
| `instance` | string or null | Target node instance name |
| `rack_id` | string or null | Target rack ID (for rack-level overrides) |
| `metric` | string | Metric name to override |
| `value` | number | Override value |
| `expires_at` | integer or null | Unix timestamp when override expires, or null if permanent |

---

### POST /api/simulator/overrides

Adds a new metric override. Use overrides to simulate failures, temperature spikes, or power anomalies without restarting the simulator.

```http
POST /api/simulator/overrides
Content-Type: application/json
```

**Request body examples**

Force a node down permanently:
```json
{"instance": "compute001", "metric": "up", "value": 0, "ttl_seconds": 0}
```

Simulate a high temperature for 5 minutes:
```json
{"instance": "compute001", "metric": "node_temperature_celsius", "value": 90, "ttl_seconds": 300}
```

Override an entire rack PDU:
```json
{"rack_id": "a01-r01", "metric": "up", "value": 0}
```

**Request fields**

| Field | Type | Required | Description |
|---|---|---|---|
| `instance` | string | Conditional | Target node instance name. Either `instance` or `rack_id` must be provided. |
| `rack_id` | string | Conditional | Target rack ID. Either `instance` or `rack_id` must be provided. |
| `metric` | string | Yes | Metric name to override (see `GET /api/simulator/metrics`) |
| `value` | number | Yes | Value to inject |
| `ttl_seconds` | integer | No | Duration in seconds. `0` = permanent. Omit to use the default TTL from config. |

**Response**

Returns the updated override list:
```json
{"overrides": []}
```

---

### DELETE /api/simulator/overrides

Clears **all** active overrides immediately.

```http
DELETE /api/simulator/overrides
```

**Response**

```json
{"overrides": []}
```

---

### `DELETE /api/simulator/overrides/{override_id}`

Deletes a specific override by its ID.

```http
DELETE /api/simulator/overrides/{override_id}
```

**Path parameter**

| Parameter | Description |
|---|---|
| `override_id` | The override ID returned by `GET /api/simulator/overrides` |

**Response**

Returns the remaining override list:
```json
{"overrides": []}
```

---

### GET /api/simulator/metrics

Returns all metrics available for override, grouped by category.

```http
GET /api/simulator/metrics
```

**Response**

```json
{
  "metrics": [
    {"id": "node_temperature", "name": "Node Temperature", "unit": "°C", "category": "temperature"},
    {"id": "up", "name": "Node Up", "unit": "", "category": "compute"},
    {"id": "pdu_active_power", "name": "PDU Active Power", "unit": "W", "category": "power"}
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `id` | string | Metric identifier used in override requests |
| `name` | string | Human-readable metric name |
| `unit` | string | Measurement unit (empty string if dimensionless) |
| `category` | string | Grouping category (compute, temperature, power, etc.) |

---

## Slurm Plugin {#slurm}

The Slurm plugin reads node states from Prometheus via a Slurm exporter and maps them to the physical topology. It provides workload-aware views for HPC cluster operations. The plugin is only available when `slurm.enabled: true` is set in `config/app.yaml`.

Node states are mapped to health severities using `slurm.status_map` in the application config. For example: `allocated` → `OK`, `drain` → `CRIT`, `down` → `CRIT`.

---

### `GET /api/slurm/rooms/{room_id}/nodes`

Returns Slurm node states for all nodes in a given room, keyed by instance name. Used by the Slurm Wallboard view to color-code devices by workload state.

```http
GET /api/slurm/rooms/{room_id}/nodes
```

**Path parameter**

| Parameter | Description |
|---|---|
| `room_id` | The room identifier from the topology |

**Response**

```json
{
  "room_id": "dc1-r001",
  "nodes": {
    "compute001": {
      "status": "allocated",
      "severity": "OK",
      "statuses": ["allocated"],
      "partitions": ["compute", "all"]
    },
    "compute002": {
      "status": "drain",
      "severity": "CRIT",
      "statuses": ["drain"],
      "partitions": ["compute"]
    }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `room_id` | string | Room identifier |
| `nodes` | object | Map of instance name → node state |
| `nodes[].status` | string | Primary Slurm status |
| `nodes[].severity` | string | Mapped severity: `OK`, `WARN`, `CRIT`, or `UNKNOWN` |
| `nodes[].statuses` | array | All Slurm statuses reported for the node |
| `nodes[].partitions` | array | Partitions the node belongs to |

---

### GET /api/slurm/summary

Returns an aggregate summary of node counts by Slurm status and health severity. Optionally scoped to a single room.

```http
GET /api/slurm/summary?room_id=dc1-r001
```

**Query parameter**

| Parameter | Required | Description |
|---|---|---|
| `room_id` | No | Scope the summary to a specific room. Omit for cluster-wide totals. |

**Response**

```json
{
  "room_id": null,
  "total_nodes": 320,
  "by_status": {
    "allocated": 280,
    "idle": 24,
    "down": 8,
    "drain": 6,
    "mixed": 2
  },
  "by_severity": {
    "OK": 306,
    "WARN": 6,
    "CRIT": 8,
    "UNKNOWN": 0
  }
}
```

---

### GET /api/slurm/partitions

Returns per-partition node count breakdowns. Optionally scoped to a single room.

```http
GET /api/slurm/partitions?room_id=dc1-r001
```

**Query parameter**

| Parameter | Required | Description |
|---|---|---|
| `room_id` | No | Scope to a specific room. Omit for cluster-wide data. |

**Response**

```json
{
  "room_id": null,
  "partitions": {
    "compute": {"allocated": 200, "idle": 15, "down": 5, "drain": 4, "mixed": 2},
    "visu": {"allocated": 8, "idle": 4, "down": 0, "drain": 0, "mixed": 0},
    "all": {"allocated": 280, "idle": 24, "down": 8, "drain": 6, "mixed": 2}
  }
}
```

---

### GET /api/slurm/nodes

Returns the full flat node list with Slurm state and topology placement context. Used by the Node List dashboard view.

```http
GET /api/slurm/nodes?room_id=dc1-r001
```

**Query parameter**

| Parameter | Required | Description |
|---|---|---|
| `room_id` | No | Filter nodes to a specific room. Omit for all nodes. |

**Response**

```json
{
  "room_id": null,
  "nodes": [
    {
      "node": "compute001",
      "status": "allocated",
      "severity": "OK",
      "statuses": ["allocated"],
      "partitions": ["compute"],
      "site_id": "dc1",
      "room_id": "dc1-r001",
      "aisle_id": "a01",
      "rack_id": "a01-r01",
      "device_id": "compute-blade-01"
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `node` | string | Slurm node name (matched via `slurm.mapping_path` if configured) |
| `status` | string | Primary Slurm status |
| `severity` | string | Mapped severity (`OK`, `WARN`, `CRIT`, `UNKNOWN`) |
| `statuses` | array | All reported Slurm statuses |
| `partitions` | array | Partitions the node belongs to |
| `site_id` | string or null | Topology site ID |
| `room_id` | string or null | Topology room ID |
| `aisle_id` | string or null | Topology aisle ID |
| `rack_id` | string or null | Topology rack ID |
| `device_id` | string or null | Topology device ID |

---

## Config & System {#config}

---

### GET /api/config

Returns the full application configuration as a JSON object. This reflects the contents of `config/app.yaml` at the time of the last reload.

```http
GET /api/config
```

**Response**

The full `AppConfig` object. See [Configuration Reference](/docs/admin-guide) for the complete schema.

---

### PUT /api/config

Updates the application configuration and persists the changes to `config/app.yaml`. Triggers a config reload and syncs dependent plugin configurations (simulator scenario, Slurm settings, etc.).

```http
PUT /api/config
Content-Type: application/json
```

**Request body**

The full `AppConfig` object. Sensitive fields such as `password_hash` and `secret_key` are preserved from the current config if they are not included in the request body.

**Notes**

- Prometheus URL and credential changes take effect on the next query.
- Simulator scenario changes apply to the next metrics generation cycle.
- Slurm label and status map changes apply to the next state fetch.

---

### GET /api/env

Returns the environment variables that affect Rackscope's behavior. Useful for debugging deployment configuration.

```http
GET /api/env
```

**Response**

```json
{
  "RACKSCOPE_APP_CONFIG": "config/app.yaml",
  "PROMETHEUS_URL": "http://prometheus:9090",
  "RACKSCOPE_CONFIG_DIR": null
}
```

| Variable | Description |
|---|---|
| `RACKSCOPE_APP_CONFIG` | Path to the main application config file |
| `PROMETHEUS_URL` | Prometheus base URL (from config or environment) |
| `RACKSCOPE_CONFIG_DIR` | Base config directory override (null if not set) |

---

### POST /api/system/restart

Triggers a backend server restart. Only available when the backend is running in development mode with `uvicorn --reload`.

```http
POST /api/system/restart
```

**Response**

```json
{"status": "ok", "message": "Backend restart initiated"}
```

:::warning
This endpoint is intended for development use only. It requires the backend to be started with `uvicorn --reload`. It has no effect in production deployments.
:::
