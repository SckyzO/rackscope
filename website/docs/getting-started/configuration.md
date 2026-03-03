---
id: configuration
title: Configuration
sidebar_position: 3
---

# Configuration

All Rackscope configuration lives in `config/` as YAML files. The main entry point is `config/app.yaml`.

## app.yaml — annotated reference

```yaml
# Application identity
app:
  name: Rackscope
  description: Datacenter Monitoring

# Paths to config file trees
paths:
  topology: config/topology         # or a single topology.yaml
  templates: config/templates
  checks: config/checks/library
  metrics: config/metrics/library

# Prometheus connection
telemetry:
  prometheus_url: http://prometheus:9090
  identity_label: instance          # Prometheus label that maps to a node
  rack_label: rack_id
  chassis_label: chassis_id
  job_regex: node|rackscope-simulator   # Jobs included in queries
  prometheus_heartbeat_seconds: 30
  prometheus_latency_window: 20         # Number of samples for avg latency
  tls_verify: false
  # tls_ca_file: /certs/ca.crt
  # basic_auth_user: user
  # basic_auth_password: secret

# How often room/rack state is refreshed from API
refresh:
  room_state_seconds: 60
  rack_state_seconds: 60

# Prometheus query cache
cache:
  ttl_seconds: 60
  health_checks_ttl_seconds: 30
  metrics_ttl_seconds: 120

# Query planner
planner:
  cache_ttl_seconds: 60
  max_ids_per_query: 300      # Max node IDs per PromQL query (tune for large clusters)
  unknown_state: UNKNOWN

# Feature flags
features:
  notifications: true
  notifications_max_visible: 10
  playlist: true
  offline: true
  worldmap: true
  dev_tools: false

# Authentication (disabled by default)
auth:
  enabled: false
  username: admin
  password_hash: ""             # bcrypt hash — generate via Settings UI
  secret_key: ""                # JWT secret — generate a random string
  session_duration: 24h
  policy:
    min_length: 6
    max_length: 128
    require_digit: false
    require_symbol: false

# World map defaults
map:
  default_zoom: 2
  min_zoom: 2
  max_zoom: 7
  center:
    lat: 20.0
    lon: 0.0

# Playlist rotation defaults
playlist:
  interval_seconds: 30
  views:
    - /views/worldmap
    - /slurm/overview

# Plugins
plugins:
  simulator:
    enabled: true
    scenario: demo-stable
    update_interval_seconds: 20
    scale_factor: 1.0

  slurm:
    enabled: true
    metric: slurm_node_status
    label_node: node
    label_status: status
    label_partition: partition
    roles: [compute, visu]
    mapping_path: config/plugins/slurm/node_mapping.yaml
    status_map:
      ok:   [allocated, alloc, idle, mixed, mix, completing, comp]
      warn: [maint, drain, draining, planned, reserved, power_down, power_up]
      crit: [down, drained, fail, error, unknown, noresp]
```

## Topology

Topology can be defined in two formats:

### Monolithic (simple labs/demos)

A single `config/topology.yaml` with all sites, rooms, racks, and devices.

### Segmented (recommended for production)

```
config/topology/
  sites.yaml
  datacenters/{site_id}/
    rooms/{room_id}/
      room.yaml                         # Room + aisle/rack references
      aisles/{aisle_id}/
        aisle.yaml                      # Aisle + rack references
        racks/{rack_id}.yaml            # Rack + devices
      standalone_racks/{rack_id}.yaml   # Racks outside aisles
```

### Rack example

```yaml
id: a01-r01
name: "Rack A01-R01"
u_height: 42
template_id: standard-42u

devices:
  - id: compute-01
    name: "Compute 01"
    template_id: bs-x440-a5
    u_position: 1
    instance: compute[001-004]    # expands to compute001..compute004
```

> **`instance` vs `nodes`**: Use `instance` in all new configs. `nodes` is a deprecated alias kept for backward compatibility.

## Templates

Templates define hardware characteristics, reused across the topology.

### Device template example

```yaml
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

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `RACKSCOPE_APP_CONFIG` | `config/app.yaml` | Path to app.yaml |
| `RACKSCOPE_CONFIG_DIR` | `config` | Base config directory |
| `RACKSCOPE_CONFIG` | — | Topology root (fallback if no app.yaml) |
| `RACKSCOPE_TEMPLATES` | — | Templates directory (fallback) |
| `RACKSCOPE_CHECKS` | — | Checks library (fallback) |
