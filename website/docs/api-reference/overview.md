---
id: overview
title: API Overview
sidebar_position: 1
---

# Rackscope REST API

Rackscope exposes a JSON REST API at `http://localhost:8000`.

:::tip Interactive docs
Browse and test every endpoint directly in **[Swagger UI](http://localhost:8000/docs)** — automatically generated from the FastAPI code.
:::

## Base URL

```
http://localhost:8000
```

All paths are relative to this base. In production, replace with your server hostname.

## Authentication

Authentication is **optional** and disabled by default. When disabled, all endpoints are publicly accessible with no credentials required.

Enable it in `config/app.yaml`:

```yaml
auth:
  enabled: true
  username: admin
  password_hash: $2b$12$...  # bcrypt hash
```

### Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "yourpassword"}'
```

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 28800,
  "username": "admin"
}
```

### Using the token

Pass the token in the `Authorization` header for all subsequent requests:

```bash
curl http://localhost:8000/api/rooms \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9..."
```

### Auth endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/status` | Check whether auth is enabled and configured |
| `POST` | `/api/auth/login` | Validate credentials and receive a JWT |
| `GET` | `/api/auth/me` | Return the currently authenticated user |
| `POST` | `/api/auth/change-password` | Update password (writes new bcrypt hash to `app.yaml`) |
| `POST` | `/api/auth/change-username` | Update username (requires current password for verification) |

## Response Format

All endpoints return JSON. Successful responses vary by endpoint — see each endpoint's section for the exact schema.

All error responses share the same envelope:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad request — validation error or conflict |
| `401` | Unauthorized — invalid or missing token |
| `404` | Resource not found |
| `500` | Internal server error |
| `502` | Bad gateway — Prometheus unreachable |
| `503` | Service unavailable — configuration not loaded |
| `504` | Timeout — Prometheus query timed out |

## Health States

Every entity (node, device, rack, room, site) carries one of four health states:

| State | Meaning |
|-------|---------|
| `OK` | All checks passing |
| `WARN` | At least one warning threshold exceeded |
| `CRIT` | At least one critical threshold exceeded |
| `UNKNOWN` | No data from Prometheus or check error |

States propagate upward through the hierarchy: **Node → Device → Rack → Room → Site**. The worst state wins at each level (`CRIT` beats `WARN` beats `UNKNOWN` beats `OK`).

## API Groups

| Group | Base path | Description |
|-------|-----------|-------------|
| [Telemetry](./telemetry) | `/api/` | Health states, alerts, room/rack states, stats |
| [Topology](./topology) | `/api/topology/` | Sites, rooms, aisles, racks, devices (CRUD) |
| [Catalog](./topology#catalog) | `/api/catalog/` | Device and rack hardware templates |
| [Checks](./topology#checks) | `/api/checks/` | Health check library |
| [Metrics](./metrics) | `/api/metrics/` | Metrics library and live time-series queries |
| [Plugins](./plugins) | `/api/plugins/` | Plugin discovery and dynamic menu |
| [Simulator](./plugins#simulator) | `/api/simulator/` | Demo mode control and metric overrides |
| [Slurm](./plugins#slurm) | `/api/slurm/` | HPC workload manager states |
| Config | `/api/config` | Application configuration read/write |
| System | `/api/system/` | Backend management (status, restart, process metrics) |

## System endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/system/status` | Liveness probe — returns `{ "status": "running", "pid": ... }` |
| `POST` | `/api/system/restart` | Trigger a uvicorn reload (dev mode only) |
| `GET` | `/api/system/process-stats` | Memory and CPU usage for backend, simulator and Prometheus |

### `GET /api/system/process-stats`

Returns live process metrics for the three core services. The backend reads its own stats from `/proc/self/`; simulator and Prometheus stats are fetched asynchronously.

```bash
curl http://localhost:8000/api/system/process-stats
```

```json
{
  "backend": {
    "memory_bytes": 108482560,
    "cpu_seconds": 2.53,
    "available": true
  },
  "simulator": {
    "memory_bytes": 820785152,
    "cpu_seconds": 875.96,
    "available": true
  },
  "prometheus": {
    "memory_bytes": 3788701696,
    "cpu_seconds": 1085.25,
    "available": true
  }
}
```

Each service block contains:

| Field | Type | Description |
|---|---|---|
| `memory_bytes` | `number \| null` | Resident set size in bytes (`null` if unavailable) |
| `cpu_seconds` | `number \| null` | Total CPU time in seconds since process start |
| `available` | `boolean` | Whether the service was reachable |

:::note
Simulator metrics are queried via the Prometheus API (not the `/metrics` endpoint directly) to avoid timeouts on large topologies. If the simulator is not enabled, `available` will be `false`.
:::

---

## Quick Start

```bash
# Liveness probe
curl http://localhost:8000/healthz

# Global infrastructure summary
curl http://localhost:8000/api/stats/global

# All rooms with rack counts
curl http://localhost:8000/api/rooms

# Room health state with per-rack breakdown
curl http://localhost:8000/api/rooms/dc1-r001/state

# Rack health only — fast (~30ms)
curl http://localhost:8000/api/racks/a01-r01/state

# Rack health + metrics — slower (~743ms, 20+ Prometheus queries)
curl "http://localhost:8000/api/racks/a01-r01/state?include_metrics=true"

# All active WARN/CRIT alerts with topology context
curl http://localhost:8000/api/alerts/active
```
