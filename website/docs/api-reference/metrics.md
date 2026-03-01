---
id: metrics
title: Metrics API
sidebar_position: 4
---

# Metrics API

The metrics API provides access to the metrics library and live metric data.

## Metrics Library

### GET /api/metrics/library

Returns all metric definitions.

```json
[
  {
    "id": "node_temperature",
    "name": "Node Temperature",
    "description": "CPU/IPMI temperature sensor",
    "expr": "node_hwmon_temp_celsius{instance=\"{instance}\"}",
    "display": {
      "unit": "°C",
      "chart_type": "line",
      "color": "#ef4444",
      "time_ranges": ["1h", "6h", "24h", "7d"],
      "default_range": "24h",
      "aggregation": "avg",
      "thresholds": { "warn": 70, "crit": 85 }
    },
    "category": "temperature",
    "tags": ["compute", "hardware"]
  }
]
```

### `GET /api/metrics/library/{metric_id}`

Returns a single metric definition.

## Live Metric Data

### GET /api/metrics/data

Query live metric data from Prometheus.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `metric_id` | string | yes | Metric ID from library |
| `instance` | string | yes | Instance name |
| `range` | string | no | Time range: `1h`, `6h`, `24h`, `7d` (default: metric's default_range) |
| `step` | string | no | Query resolution step (default: auto) |

**Example:**

```bash
curl "http://localhost:8000/api/metrics/data?metric_id=node_temperature&instance=compute001&range=24h"
```

**Response:**

```json
{
  "metric_id": "node_temperature",
  "instance": "compute001",
  "range": "24h",
  "data": [
    { "timestamp": 1706745600, "value": 42.5 },
    { "timestamp": 1706749200, "value": 43.1 }
  ],
  "current": 43.1,
  "unit": "°C"
}
```

## Metric Categories

| Category | Metrics |
|----------|---------|
| `temperature` | node_temperature, chassis_temperature |
| `power` | node_power, rack_power, pdu_active_power |
| `compute` | node_cpu_load, node_memory_used |
| `storage` | drive_status, controller_status |
| `network` | port_state, port_speed |
| `infrastructure` | pdu_current, pdu_voltage, fan_speed |
