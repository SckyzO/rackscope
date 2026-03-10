---
id: configuration
title: Configuration
sidebar_position: 3
---

# Configuration

All Rackscope configuration lives in `config/` as YAML files. The main entry point is `config/app.yaml`.

:::tip Reference file
`config/app.yaml.reference` contains every available key with its default value and a description. Copy it to `config/app.yaml` as a starting point for your own deployment.
:::

---

## app.yaml overview

```yaml
app:
  name: Rackscope
  description: My Datacenter

# Paths to your topology, templates, checks, and metrics
paths:
  topology: config/examples/hpc-cluster/topology
  templates: config/examples/hpc-cluster/templates
  checks: config/examples/hpc-cluster/checks/library
  metrics: config/examples/hpc-cluster/metrics/library

# Prometheus connection
telemetry:
  prometheus_url: http://prometheus:9090
  identity_label: instance     # Prometheus label mapping to a node
  rack_label: rack_id
  chassis_label: chassis_id
  job_regex: node              # Jobs included in health check queries

# Cache and performance
cache:
  health_checks_ttl_seconds: 60
  metrics_ttl_seconds: 120
planner:
  cache_ttl_seconds: 60
  max_ids_per_query: 300       # Tune upward for large clusters (>1000 nodes)

# Feature flags
features:
  notifications: true
  playlist: true
  worldmap: true
  wizard: true

# Authentication (disabled by default)
auth:
  enabled: false

# Plugins
plugins:
  simulator:
    enabled: true    # Set to false on real infrastructure
  slurm:
    enabled: false   # Enable if you have a Slurm workload manager
```

> Full reference: every key with its default and description is in `config/app.yaml.reference`.

---

## Setting up for real infrastructure

When connecting Rackscope to a real Prometheus and real hardware, replace the `paths` section to point to your own config directories:

```yaml
paths:
  topology: config/topology       # your topology YAML files
  templates: config/templates     # your hardware templates
  checks: config/checks/library   # your health check definitions
  metrics: config/metrics/library # your metric definitions
```

Then disable the simulator and configure your Prometheus:

```yaml
telemetry:
  prometheus_url: http://your-prometheus:9090
  job_regex: node|ipmi            # match your actual Prometheus job names

plugins:
  simulator:
    enabled: false
```

---

## Topology

Topology can be defined in two formats:

### Monolithic (simple labs)

A single `config/topology.yaml` containing all sites, rooms, racks, and devices.

### Segmented (recommended for production)

```
config/topology/
  sites.yaml
  datacenters/{site_id}/
    rooms/{room_id}/
      room.yaml
      aisles/{aisle_id}/
        aisle.yaml
        racks/{rack_id}.yaml
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
    template_id: generic-1u-server
    u_position: 1
    instance: compute[001-004]   # expands to compute001..compute004
```

See [Topology YAML](/admin-guide/topology-yaml) for the full schema.

---

## Templates

Templates define hardware characteristics and are reused across the topology.

```yaml
templates:
  - id: generic-1u-server
    name: "Generic 1U Server"
    type: server
    u_height: 1
    checks:
      - node_up
      - ipmi_temp_warn
    metrics:
      - node_temperature
      - node_power
```

See [Templates](/admin-guide/templates) for all fields.

---

## Plugin configuration

Each plugin has its own config file. Only the `enabled` flag lives in `app.yaml`.

| Plugin | Config file |
|---|---|
| Simulator | `config/plugins/simulator/config/plugin.yaml` |
| Slurm | `config/plugins/slurm/config.yml` |

See [Simulator Plugin](/plugins/simulator) and [Slurm Plugin](/plugins/slurm) for details.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `RACKSCOPE_APP_CONFIG` | `config/app.yaml` | Path to app.yaml |
| `APP_CONFIG` | `app.yaml` | Filename within `config/` — set by `make use` |
| `RACKSCOPE_CONFIG_DIR` | `config` | Base config directory |
