---
id: configuration
title: Configuration
sidebar_position: 3
---

# Configuration

All Rackscope configuration lives in the `config/` directory as YAML files.

## app.yaml — Central Configuration

The main configuration file is `config/app.yaml`:

```yaml
# Paths to configuration files
paths:
  topology: config/topology/sites.yaml     # or config/topology.yaml (monolithic)
  templates: config/templates/
  checks: config/checks/library/
  metrics: config/metrics/library/

# Telemetry: Prometheus connection
telemetry:
  prometheus_url: http://prometheus:9090
  # auth:
  #   type: bearer
  #   token: your-token
  # tls:
  #   verify: false
  identity_label: instance   # Prometheus label for node identity

# Refresh intervals
refresh:
  room_state_seconds: 60
  rack_state_seconds: 60

# Query cache TTL
cache:
  ttl_seconds: 60

# Query planner settings
planner:
  cache_ttl_seconds: 30
  max_ids_per_query: 100
  unknown_state: UNKNOWN

# Feature flags
features:
  demo: true           # Enable simulator/demo mode
  notifications: true
  playlist: true

# Slurm integration (optional)
# slurm:
#   metric: slurm_node_status
#   label_node: node
#   label_status: status
#   label_partition: partition
#   status_map:
#     idle: OK
#     allocated: OK
#     down: CRIT
#     drain: WARN
#   mapping_path: config/plugins/slurm/node_mapping.yaml

# Simulator settings (only when features.demo: true)
simulator:
  scenario: demo-small   # demo-small, full-ok, random-demo-small
```

## Topology Configuration

Topology can be defined in two ways:

### Option A: Monolithic (simple labs/demos)

A single `config/topology.yaml` with all sites, rooms, racks, and devices.

### Option B: Segmented (recommended for production)

```
config/topology/
  sites.yaml                              # List of all sites
  datacenters/{site_id}/
    rooms/{room_id}/
      room.yaml                           # Room + aisle/rack references
      aisles/{aisle_id}/
        aisle.yaml                        # Aisle + rack references
        racks/{rack_id}.yaml              # Individual rack definition
      standalone_racks/{rack_id}.yaml     # Racks outside aisles
```

### Example: site definition

```yaml
# config/topology/sites.yaml
sites:
  - id: dc1
    name: "Paris DC1"
    location:
      lat: 48.8566
      lon: 2.3522
    rooms:
      - r001
```

### Example: rack definition

```yaml
# config/topology/datacenters/dc1/rooms/r001/aisles/a01/racks/a01-r01.yaml
id: a01-r01
name: "Rack A01-R01"
u_height: 42
template_id: standard-42u

devices:
  - id: compute-01
    name: "Compute 01"
    template_id: bs-x440-a5
    u_position: 1
    instance: compute[001-004]   # expands to compute001..compute004
```

## Templates

Templates define hardware characteristics:

### Device template example

```yaml
# config/templates/devices/server/blade-server.yaml
templates:
  - id: bs-x440-a5
    name: "BullSequana X440 A5"
    type: server
    u_height: 10
    layout:
      type: grid
      rows: 5
      cols: 4
      matrix: [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]]
    checks:
      - node_up
      - ipmi_temp_warn
    metrics:
      - node_temperature
      - node_power
      - node_cpu_load
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RACKSCOPE_APP_CONFIG` | `config/app.yaml` | Path to app.yaml |
| `RACKSCOPE_CONFIG_DIR` | `config` | Base config directory |
| `RACKSCOPE_CONFIG` | — | Topology root (fallback) |
| `RACKSCOPE_TEMPLATES` | — | Templates directory (fallback) |
| `RACKSCOPE_CHECKS` | — | Checks library (fallback) |
