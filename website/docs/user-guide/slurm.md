---
id: slurm
title: Slurm Integration
sidebar_position: 4
---

# Slurm Integration

The Slurm plugin provides HPC-specific views for monitoring cluster workloads alongside physical infrastructure.

![Slurm Overview](/img/screenshots/slurm-overview.png)

## Views

### Slurm Wallboard

**URL**: `/slurm/wallboard/:roomId`

Compact aisle view mapping Slurm node states to the physical rack layout. Ideal for NOC displays.

Node states are color-coded according to the `status_map` configuration.

### Cluster Overview

**URL**: `/slurm/overview`

Aggregate cluster status:
- Total nodes by state (idle, allocated, down, drain, etc.)
- Health severity distribution
- Partition summary

### Partitions Dashboard

**URL**: `/slurm/partitions`

Per-partition breakdown:
- Nodes per state
- Usage percentage
- Health indicators

### Node List

**URL**: `/slurm/nodes`

Flat list of all nodes with:
- Slurm state
- Topology context (site/room/rack/device)
- Health state from Prometheus checks

### Alerts Dashboard

**URL**: `/slurm/alerts`

Nodes in WARN or CRIT state requiring attention.

## Configuration

Enable Slurm in `config/app.yaml`:

```yaml
slurm:
  metric: slurm_node_status
  label_node: node
  label_status: status
  label_partition: partition
  status_map:
    idle: OK
    allocated: OK
    completing: OK
    down: CRIT
    drain: WARN
    drained: WARN
    fail: CRIT
    maint: WARN
    reboot: WARN
  # Optional: map Slurm names to topology instance names
  # mapping_path: config/plugins/slurm/node_mapping.yaml
```

## Node Mapping (Optional)

If your Slurm node names differ from your topology instance names, create a mapping file:

```yaml
# config/plugins/slurm/node_mapping.yaml
mappings:
  - slurm_node: node001
    topology_instance: compute001
  - slurm_node: node002
    topology_instance: compute002
```

## Device Role Filtering

Templates can define a `role` field to filter devices shown in Slurm views:

```yaml
templates:
  - id: my-compute-node
    type: server
    role: compute   # compute, visu, login, io, storage
    ...
```
