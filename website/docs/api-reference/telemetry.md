---
id: telemetry
title: Telemetry API
sidebar_position: 2
---

# Telemetry API

Telemetry endpoints expose live health states, active alerts, and aggregated metrics derived from Prometheus queries. These endpoints are read-only — they do not modify topology or configuration.

:::note Configuration dependency
All telemetry endpoints return `UNKNOWN` states (rather than errors) when the backend configuration has not finished loading. This allows the frontend to render a degraded-but-functional view during startup.
:::

---

## Stats

### `GET /api/stats/global`

Returns a summary of the global infrastructure health state. Counts are derived from rack-level health aggregation via the TelemetryPlanner.

```bash
curl http://localhost:8000/api/stats/global
```

**Response**

```json
{
  "total_rooms": 4,
  "total_racks": 48,
  "active_alerts": 14,
  "crit_count": 3,
  "warn_count": 11,
  "status": "CRIT"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `total_rooms` | integer | Number of rooms in the first site |
| `total_racks` | integer | Total rack count across all sites and rooms |
| `active_alerts` | integer | `crit_count + warn_count` |
| `crit_count` | integer | Number of racks in `CRIT` state |
| `warn_count` | integer | Number of racks in `WARN` state |
| `status` | string | Worst state across all racks: `OK`, `WARN`, or `CRIT` |

**Error cases**

- Returns `{"total_rooms": 0, "total_racks": 0, "active_alerts": 0, "crit_count": 0, "warn_count": 0, "status": "OK"}` when topology is not loaded.

---

### `GET /api/stats/prometheus`

Returns Prometheus client latency statistics and heartbeat timing. Useful for diagnosing connectivity issues and measuring query performance.

```bash
curl http://localhost:8000/api/stats/prometheus
```

**Response**

```json
{
  "last_ms": 42.7,
  "avg_ms": 38.1,
  "last_ts": 1709295600000,
  "heartbeat_seconds": 60,
  "next_ts": 1709295660000
}
```

| Field | Type | Description |
|-------|------|-------------|
| `last_ms` | float or null | Latency of the most recent query in milliseconds |
| `avg_ms` | float or null | Rolling average latency over the last 20 queries |
| `last_ts` | integer or null | Unix timestamp (ms) of the last successful query |
| `heartbeat_seconds` | integer | Configured heartbeat interval from `app.yaml` |
| `next_ts` | integer or null | Projected timestamp of the next scheduled heartbeat |

Returns `{"last_ms": null, "avg_ms": null, "last_ts": null}` if no queries have been made yet.

---

### `GET /api/stats/telemetry`

Returns detailed telemetry planner statistics including cache performance and in-flight query tracking. Intended for operators debugging query load and cache behavior.

```bash
curl http://localhost:8000/api/stats/telemetry
```

**Response**

```json
{
  "query_count": 1247,
  "cache_hits": 1189,
  "cache_misses": 58,
  "in_flight": 0,
  "last_batch": {
    "total_ids": 128,
    "query_count": 4,
    "max_ids_per_query": 50,
    "ts": 1709295600000
  },
  "last_ms": 41.3,
  "avg_ms": 37.9
}
```

| Field | Type | Description |
|-------|------|-------------|
| `query_count` | integer | Total Prometheus queries issued since startup |
| `cache_hits` | integer | Number of responses served from cache |
| `cache_misses` | integer | Number of cache misses triggering a real query |
| `in_flight` | integer | Number of queries currently awaiting a Prometheus response |
| `last_batch` | object or null | Metadata from the most recent planner batch run |
| `last_batch.total_ids` | integer | Number of node/rack IDs included in the batch |
| `last_batch.query_count` | integer | Number of PromQL queries generated for the batch |
| `last_batch.max_ids_per_query` | integer | Configured ID limit per query (`planner.max_ids_per_query`) |
| `last_batch.ts` | float | Unix timestamp (ms) when the batch ran |
| `last_ms` | float or null | Latency of the last query in milliseconds |
| `avg_ms` | float or null | Rolling average latency over the last 20 queries |

---

## Alerts

### `GET /api/alerts/active`

Returns all active `WARN` and `CRIT` alerts enriched with full topology context (site, room, rack, device). Combines both node-level and rack-level alert sources from the TelemetryPlanner snapshot.

```bash
curl http://localhost:8000/api/alerts/active
```

**Response**

```json
{
  "alerts": [
    {
      "type": "node",
      "node_id": "compute042",
      "state": "CRIT",
      "checks": [
        { "id": "ipmi_temp_crit", "severity": "CRIT" }
      ],
      "site_id": "dc1",
      "site_name": "Primary DC",
      "room_id": "dc1-r001",
      "room_name": "Server Room A",
      "rack_id": "a01-r03",
      "rack_name": "Rack A01-R03",
      "device_id": "blade-chassis-01",
      "device_name": "Blade Chassis 01"
    },
    {
      "type": "rack",
      "rack_id": "a02-r07",
      "state": "WARN",
      "checks": [
        { "id": "pdu_current_warn", "severity": "WARN" }
      ],
      "site_id": "dc1",
      "site_name": "Primary DC",
      "room_id": "dc1-r001",
      "room_name": "Server Room A",
      "rack_name": "Rack A02-R07"
    }
  ]
}
```

**Alert object fields**

| Field | Type | Present on | Description |
|-------|------|------------|-------------|
| `type` | string | all | `"node"` or `"rack"` |
| `node_id` | string | `node` only | Prometheus instance name |
| `rack_id` | string | `rack` only | Rack identifier |
| `state` | string | all | `WARN` or `CRIT` |
| `checks` | array | all | Failed checks with their severities |
| `checks[].id` | string | all | Check identifier (e.g., `ipmi_temp_crit`) |
| `checks[].severity` | string | all | `WARN` or `CRIT` |
| `site_id` | string | all | Parent site identifier |
| `site_name` | string | all | Parent site display name |
| `room_id` | string | all | Parent room identifier |
| `room_name` | string | all | Parent room display name |
| `rack_id` | string | `node` only | Parent rack identifier |
| `rack_name` | string | all | Parent rack display name |
| `device_id` | string | `node` only | Parent device identifier |
| `device_name` | string | `node` only | Parent device display name |

Returns `{"alerts": []}` when topology or checks are not loaded.

---

## Rooms

### `GET /api/rooms`

Returns all rooms across all sites with basic metadata and aisle/rack structure. This is the primary endpoint for the room list view.

```bash
curl http://localhost:8000/api/rooms
```

**Response**

```json
[
  {
    "id": "dc1-r001",
    "name": "Server Room A",
    "site_id": "dc1",
    "site_name": "Primary DC",
    "aisle_count": 3,
    "rack_count": 36,
    "standalone_rack_count": 2
  }
]
```

Returns `[]` when topology is not loaded.

---

### `GET /api/rooms/{room_id}/layout`

Returns the full room object including aisle definitions, rack references, and optional floor plan metadata (grid layout, compass orientation, door markers).

```bash
curl http://localhost:8000/api/rooms/dc1-r001/layout
```

**Response**

The response is a full `Room` Pydantic model. Key fields:

```json
{
  "id": "dc1-r001",
  "name": "Server Room A",
  "aisles": [
    {
      "id": "a01",
      "name": "Aisle 01",
      "racks": [
        { "id": "a01-r01", "name": "Rack A01-R01", "u_height": 42 }
      ]
    }
  ],
  "standalone_racks": []
}
```

**Error cases**

- `404` if the room ID does not exist in the loaded topology.
- `503` if topology is not loaded.

---

### `GET /api/rooms/{room_id}/state`

Returns the aggregated health state for a room, with a per-rack breakdown including node counts. This is the primary endpoint used by the room floor plan view to color-code racks.

```bash
curl http://localhost:8000/api/rooms/dc1-r001/state
```

**Response**

```json
{
  "room_id": "dc1-r001",
  "state": "WARN",
  "racks": {
    "a01-r01": {
      "state": "OK",
      "node_total": 16,
      "node_crit": 0,
      "node_warn": 0
    },
    "a01-r02": {
      "state": "WARN",
      "node_total": 16,
      "node_crit": 0,
      "node_warn": 3
    },
    "a01-r03": {
      "state": "CRIT",
      "node_total": 16,
      "node_crit": 1,
      "node_warn": 2
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `room_id` | string | The requested room identifier |
| `state` | string | Worst rack state in the room: `OK`, `WARN`, `CRIT`, or `UNKNOWN` |
| `racks` | object | Map of rack ID to per-rack summary |
| `racks[id].state` | string | Rack health state |
| `racks[id].node_total` | integer | Total number of Prometheus instances in the rack |
| `racks[id].node_crit` | integer | Number of instances in `CRIT` state |
| `racks[id].node_warn` | integer | Number of instances in `WARN` state |

Returns `{"room_id": "...", "state": "UNKNOWN", "racks": {}}` when topology or planner is not loaded.

---

## Racks

### `GET /api/racks/{rack_id}`

Returns the full rack object with all devices, as defined in topology. Does not include live health or metric data.

```bash
curl http://localhost:8000/api/racks/a01-r01
```

**Response**

The response is a full `Rack` Pydantic model. Key fields:

```json
{
  "id": "a01-r01",
  "name": "Rack A01-R01",
  "u_height": 42,
  "template_id": "standard-42u",
  "devices": [
    {
      "id": "blade-chassis-01",
      "name": "Blade Chassis 01",
      "template_id": "bullsequana-x440-quad",
      "u_position": 1,
      "instance": ["compute001", "compute002", "compute003", "compute004"]
    }
  ]
}
```

**Error cases**

- `404` if the rack ID does not exist.
- `503` if topology is not loaded.

---

### `GET /api/racks/{rack_id}/state`

The primary rack telemetry endpoint. Returns the aggregated rack health state, per-node states, check results, and — optionally — live metric values.

:::tip Performance
Use `include_metrics=false` (the default) for all list and grid views. Only request `include_metrics=true` on detail views where metric values are actually displayed.

- Without metrics: **~30–40 ms** (health states from planner snapshot only)
- With metrics: **~743 ms** (20+ additional Prometheus queries for temperature, power, and component metrics)
:::

```bash
# Fast — health states only (default)
curl http://localhost:8000/api/racks/a01-r01/state

# Full — health + metrics
curl "http://localhost:8000/api/racks/a01-r01/state?include_metrics=true"
```

**Query parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `include_metrics` | boolean | `false` | When `true`, fetches temperature, power, and component metrics from Prometheus |

**Response (without metrics)**

```json
{
  "rack_id": "a01-r01",
  "state": "WARN",
  "checks": [
    { "id": "pdu_current_warn", "severity": "WARN" }
  ],
  "alerts": [
    { "id": "pdu_current_warn", "severity": "WARN" }
  ],
  "metrics": {
    "temperature": 0,
    "power": 0
  },
  "infra_metrics": {
    "components": {}
  },
  "nodes": {
    "compute001": {
      "state": "OK",
      "temperature": 0,
      "power": 0,
      "checks": [],
      "alerts": []
    },
    "compute002": {
      "state": "WARN",
      "temperature": 0,
      "power": 0,
      "checks": [{ "id": "ipmi_temp_warn", "severity": "WARN" }],
      "alerts": [{ "id": "ipmi_temp_warn", "severity": "WARN" }]
    }
  }
}
```

**Response (with `include_metrics=true`)**

When metrics are included, the `metrics` and `nodes` fields are populated with live values from Prometheus:

```json
{
  "rack_id": "a01-r01",
  "state": "WARN",
  "checks": [],
  "alerts": [
    { "id": "ipmi_temp_warn", "severity": "WARN" }
  ],
  "metrics": {
    "temperature": 43.7,
    "power": 3240.0
  },
  "infra_metrics": {
    "components": {
      "pdu-left": {
        "active_power": 1620.0,
        "current": 7.3
      },
      "pdu-right": {
        "active_power": 1620.0,
        "current": 7.3
      }
    }
  },
  "nodes": {
    "compute001": {
      "state": "OK",
      "temperature": 41.0,
      "power": 380.0,
      "checks": [],
      "alerts": []
    },
    "compute002": {
      "state": "WARN",
      "temperature": 67.5,
      "power": 410.0,
      "checks": [{ "id": "ipmi_temp_warn", "severity": "WARN" }],
      "alerts": [{ "id": "ipmi_temp_warn", "severity": "WARN" }]
    }
  }
}
```

**Response fields**

| Field | Type | Description |
|-------|------|-------------|
| `rack_id` | string | The requested rack identifier |
| `state` | string | Aggregated rack state: `OK`, `WARN`, `CRIT`, or `UNKNOWN` |
| `checks` | array | Rack-level check results (from rack template checks) |
| `alerts` | array | Rack-level checks currently in a non-OK state |
| `metrics.temperature` | float | Average inlet/CPU temperature across all nodes (degrees C). `0` when not requested. |
| `metrics.power` | float | Total power draw across all nodes (watts). `0` when not requested. |
| `infra_metrics.components` | object | Per-component metrics keyed by component ID (PDUs, switches, etc.). Empty when not requested. |
| `nodes` | object | Per-instance health and metrics, keyed by Prometheus instance name |
| `nodes[id].state` | string | Instance health state |
| `nodes[id].temperature` | float | Instance temperature in degrees C. `0` when not requested. |
| `nodes[id].power` | float | Instance power in watts. `0` when not requested. |
| `nodes[id].checks` | array | All check results for this instance |
| `nodes[id].alerts` | array | Non-OK checks for this instance |

Returns `{"rack_id": "...", "state": "UNKNOWN", "metrics": {}, "nodes": {}}` when topology or planner is not loaded.

---

### `GET /api/devices/{rack_id}/{device_id}/metrics`

Returns live metrics for a single device, querying only the instances belonging to that device. This is faster than loading full rack metrics when only one device needs to be refreshed.

```bash
curl http://localhost:8000/api/devices/a01-r01/blade-chassis-01/metrics
```

**Response**

```json
{
  "device_id": "blade-chassis-01",
  "rack_id": "a01-r01",
  "metrics": {
    "compute001": {
      "node_temperature_celsius": 41.0,
      "node_power_watts": 380.0,
      "node_cpu_usage": 0.72
    },
    "compute002": {
      "node_temperature_celsius": 67.5,
      "node_power_watts": 410.0,
      "node_cpu_usage": 0.85
    }
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `device_id` | string | The requested device identifier |
| `rack_id` | string | The parent rack identifier |
| `metrics` | object | Map of instance ID to metric values. Metric names and presence depend on the device template's `metrics` list. |

Returns `{"device_id": "...", "rack_id": "...", "metrics": {}}` in all error cases:
- Rack not found in topology
- Device not found in the rack
- Device template has no `metrics` defined
- Topology or catalog not loaded
