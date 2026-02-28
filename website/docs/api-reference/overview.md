---
id: overview
title: API Overview
sidebar_position: 1
---

# API Reference

Rackscope exposes a REST API at `http://localhost:8000`.

Interactive documentation (Swagger UI): **http://localhost:8000/docs**

## Authentication

Authentication is optional and disabled by default. When enabled:

```bash
POST /api/auth/login
GET  /api/auth/status
GET  /api/auth/me
POST /api/auth/logout
```

## Endpoint Groups

| Group | Base Path | Description |
|-------|-----------|-------------|
| [Telemetry](/api-reference/telemetry) | `/api/` | Health states, alerts, room/rack states |
| [Topology](/api-reference/topology) | `/api/topology/` | Sites, rooms, aisles, racks, devices |
| [Catalog](/api-reference/topology) | `/api/catalog/` | Device and rack templates |
| [Checks](/api-reference/topology) | `/api/checks/` | Health check library |
| [Metrics](/api-reference/metrics) | `/api/metrics/` | Metrics library and live data |
| [Plugins](/api-reference/plugins) | `/api/plugins/` | Plugin discovery and menu |
| [Simulator](/api-reference/plugins) | `/api/simulator/` | Demo mode control |
| [Slurm](/api-reference/plugins) | `/api/slurm/` | Workload manager data |
| [Config](/api-reference/overview) | `/api/config` | Application configuration |
| [System](/api-reference/overview) | `/api/stats/` | Backend statistics |

## Common Patterns

### Response Format

All endpoints return JSON. Errors use standard HTTP status codes:

```json
{
  "detail": "Error message here"
}
```

### Health States

All health state fields use one of: `"OK"`, `"WARN"`, `"CRIT"`, `"UNKNOWN"`

### Example Requests

```bash
# Get global stats
curl http://localhost:8000/api/stats/global

# Get all rooms with health states
curl http://localhost:8000/api/rooms

# Get rack state (health only — fast)
curl http://localhost:8000/api/racks/a01-r01/state

# Get rack state with metrics (slower — for detail views)
curl http://localhost:8000/api/racks/a01-r01/state?include_metrics=true

# Get active alerts
curl http://localhost:8000/api/alerts/active
```
