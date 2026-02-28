---
id: slurm
title: Slurm Plugin
sidebar_position: 3
---

# Slurm Plugin

The Slurm plugin integrates HPC workload manager data with physical infrastructure views.

## Plugin ID: `workload-slurm`

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/slurm/rooms/{room_id}/nodes` | Node states mapped to room layout |
| GET | `/api/slurm/summary` | Cluster-wide Slurm summary |
| GET | `/api/slurm/partitions` | Per-partition statistics |
| GET | `/api/slurm/nodes` | Flat node list with topology context |

## Menu Section

Contributes a "Workload" section (order=50) to the sidebar navigation, appearing before Simulator:

- Overview (`/slurm/overview`)
- Nodes (`/slurm/nodes`)
- Alerts (`/slurm/alerts`)
- Partitions (`/slurm/partitions`)
- Wallboard (dynamic link per room)

## Configuration

```yaml
# config/app.yaml
slurm:
  metric: slurm_node_status      # Prometheus metric name
  label_node: node               # Label containing node name
  label_status: status           # Label containing Slurm status
  label_partition: partition     # Label containing partition name
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
  mapping_path: config/plugins/slurm/node_mapping.yaml   # optional
```

## Data Source

The plugin reads Slurm node states from Prometheus — not directly from `slurmctld`. You need a Prometheus exporter that provides `slurm_node_status` metrics with node, status, and partition labels.

## Node Mapping

If Slurm node names differ from topology instance names:

```yaml
# config/plugins/slurm/node_mapping.yaml
mappings:
  - slurm_node: r01c01
    topology_instance: compute001
  - slurm_node: r01c02
    topology_instance: compute002
```
