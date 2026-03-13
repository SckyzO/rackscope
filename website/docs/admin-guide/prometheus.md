---
id: prometheus
title: Prometheus Integration
sidebar_position: 4
---

# Prometheus Integration

Rackscope queries Prometheus for all metrics — it does not collect metrics itself.

## Connection Configuration

```yaml
# config/app.yaml
telemetry:
  prometheus_url: http://prometheus:9090
  identity_label: instance   # label that maps to topology instance names
```

## Authentication

```yaml
telemetry:
  prometheus_url: https://prometheus.example.com
  basic_auth_user: admin          # optional
  basic_auth_password: secret     # optional
  tls_verify: false   # only if using self-signed certificates
```

## Health Checks (PromQL)

Checks are defined in `config/checks/library/*.yaml`:

```yaml
checks:
  - id: node_up
    name: "Node Up"
    kind: server
    scope: node
    expr: "up{job=\"node_exporter\", instance=~\"$instances\"}"
    output: bool
    rules:
      - op: "=="
        value: 1
        severity: OK
      - op: "=="
        value: 0
        severity: CRIT
```

### PromQL Placeholders

| Placeholder | Replaced with |
|-------------|---------------|
| `$instances` | All node instance IDs (regex joined with `\|`) |
| `$chassis` | All chassis IDs |
| `$racks` | All rack IDs |
| `$jobs` | All Slurm job IDs |

The **TelemetryPlanner** replaces these placeholders with batched queries to avoid per-device query explosion.

### Check Scopes

| Scope | Description |
|-------|-------------|
| `node` | Evaluated per Prometheus instance |
| `chassis` | Evaluated per device chassis |
| `rack` | Evaluated per rack |

## Metrics Library

Metrics define how to query and display specific data points:

```yaml
# config/metrics/library/node_temperature.yaml
id: node_temperature
name: Node Temperature
description: "CPU/IPMI temperature sensor"
expr: "node_hwmon_temp_celsius{instance=\"{instance}\"}"
labels:
  instance: "{instance}"
display:
  unit: "°C"
  chart_type: line
  color: "#ef4444"
  time_ranges: [1h, 6h, 24h, 7d]
  default_range: 24h
  aggregation: avg
  thresholds:
    warn: 70
    crit: 85
category: temperature
tags: [compute, hardware]
```

## Query Optimization

Rackscope uses a **TelemetryPlanner** to avoid per-device query explosion:

- Groups all instances into batch queries (e.g., `up{instance=~"node001|node002|..."}`)
- Respects `planner.max_ids_per_query` limit (default: 200)
- Caches results for `planner.cache_ttl_seconds` (default: 30s)

**Never write per-node queries** — use the planner's batch mechanism via check definitions.

## Query Caching Strategy

Prometheus queries are cached at three independent levels:

| Layer | Config key | Default | What it caches |
|-------|-----------|---------|----------------|
| **ServiceCache** | `cache.service_ttl_seconds` | 5s | Fully assembled JSON responses (room state, rack state) |
| **Planner snapshot** | `planner.cache_ttl_seconds` | 60s | All node/rack health states in one snapshot |
| **Health query cache** | `cache.health_checks_ttl_seconds` | 30s | Raw PromQL results for health checks |
| **Metrics query cache** | `cache.metrics_ttl_seconds` | 120s | Raw PromQL results for detailed metrics |

On a cache hit, **zero Prometheus queries** are fired. A request only reaches Prometheus when all upstream caches are expired simultaneously.

To monitor cache effectiveness:

```bash
curl http://localhost:8000/api/stats/telemetry
# Returns: cache_hits, cache_misses, in_flight, query_count, avg_latency_ms
```

A healthy deployment shows `cache_hits / (cache_hits + cache_misses) > 95%` under normal load.

See [Performance & Caching](/architecture/performance-and-caching) for the full architecture diagram.
