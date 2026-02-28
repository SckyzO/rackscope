---
id: simulator
title: Metrics Simulator
sidebar_position: 5
---

# Metrics Simulator

The simulator generates realistic Prometheus metrics for testing and demonstration without real hardware.

## How It Works

The simulator:
1. Reads your topology to determine what instances to simulate
2. Generates Prometheus-format metrics for all instances
3. Exposes them on `:9000` (Docker hostname: `simulator:9000`)
4. Prometheus scrapes the simulator on its normal schedule

The backend queries Prometheus exactly as it would in production — the simulator is transparent.

## Enable Demo Mode

In `config/app.yaml`:

```yaml
features:
  demo: true

simulator:
  scenario: demo-small   # see below
```

## Scenarios

| Scenario | Description |
|----------|-------------|
| `demo-small` | Small topology, a few nodes in WARN/CRIT state |
| `full-ok` | All nodes healthy (good for baseline testing) |
| `random-demo-small` | Random failures with different seed each run |

## Runtime Overrides

Override any metric for any instance at runtime:

### Via API

```bash
# Force a node down
curl -X POST http://localhost:8000/api/simulator/overrides \
  -H "Content-Type: application/json" \
  -d '{"instance": "compute001", "metric": "up", "value": 0, "ttl_seconds": 0}'

# Force high temperature
curl -X POST http://localhost:8000/api/simulator/overrides \
  -H "Content-Type: application/json" \
  -d '{"instance": "compute001", "metric": "node_temperature_celsius", "value": 90, "ttl_seconds": 300}'

# Clear all overrides
curl -X DELETE http://localhost:8000/api/simulator/overrides
```

### Via Settings UI

Navigate to `/editors/settings` → Simulator section to manage overrides visually.

## Metric Bundles

The simulator generates multiple metric bundles per instance:

- **Node**: `up`, `node_cpu_seconds_total`, `node_memory_MemAvailable_bytes`, etc.
- **IPMI**: `ipmi_temperature_celsius`, `ipmi_fan_speed_rpm`, `ipmi_power_watts`, etc.
- **Storage**: `eseries_drive_status`, `eseries_controller_status`, etc.
- **Infrastructure**: PDU power, current, PDU unit status
- **Slurm**: `slurm_node_status` with partition labels

## Discovering Available Metrics

```bash
curl http://localhost:8000/api/simulator/metrics
```

Returns all metrics the simulator can generate, based on the metrics library.
