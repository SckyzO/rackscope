---
id: telemetry
title: Telemetry API
sidebar_position: 2
---

# Telemetry API

## Stats

### GET /api/stats/global

Returns global infrastructure summary.

```json
{
  "total_sites": 2,
  "total_rooms": 4,
  "total_racks": 48,
  "total_devices": 384,
  "total_instances": 1536,
  "health_summary": {
    "OK": 1400,
    "WARN": 80,
    "CRIT": 12,
    "UNKNOWN": 44
  }
}
```

### GET /api/stats/prometheus

Returns Prometheus connection status and query statistics.

### GET /api/stats/telemetry

Returns detailed telemetry planner statistics (cache hits, query counts, etc.).

## Alerts

### GET /api/alerts/active

Returns all active WARN/CRIT alerts across all instances.

```json
[
  {
    "instance": "compute001",
    "rack_id": "a01-r01",
    "check_id": "ipmi_temp_crit",
    "severity": "CRIT",
    "value": 92.5,
    "message": "Temperature critical: 92.5°C"
  }
]
```

## Rooms

### GET /api/rooms

Returns all rooms with basic metadata.

### GET /api/rooms/{room_id}/state

Returns room state with per-rack health summary.

```json
{
  "room_id": "r001",
  "state": "WARN",
  "racks": {
    "a01-r01": "OK",
    "a01-r02": "WARN",
    "a01-r03": "CRIT"
  }
}
```

## Racks

### GET /api/racks/{rack_id}/state

Returns rack state. By default returns health only (fast). Add `?include_metrics=true` for full metrics.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `include_metrics` | bool | `false` | Include temperature, power, PDU metrics |

**Performance note:**
- `include_metrics=false`: ~30-40ms (health states only)
- `include_metrics=true`: ~743ms (health + metrics, 20+ Prometheus queries)

```json
{
  "rack_id": "a01-r01",
  "state": "WARN",
  "devices": {
    "compute-blade-01": {
      "state": "WARN",
      "instances": {
        "compute001": "OK",
        "compute002": "WARN"
      }
    }
  },
  "metrics": {
    "temperature_avg": 45.2,
    "power_watts": 3420,
    "pdu_left": {
      "active_power": 1850,
      "current": 8.2
    }
  }
}
```
