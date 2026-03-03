---
id: slurm
title: Slurm Plugin
sidebar_position: 3
---

# Slurm Plugin

The Slurm plugin integrates HPC workload manager data with physical infrastructure views.
It is enabled by setting `plugins.slurm.enabled: true` in `config/app.yaml`.
Full configuration lives in `config/plugins/slurm/config.yml`.

## Plugin ID: `workload-slurm`

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/slurm/rooms/{room_id}/nodes` | Node states mapped to room layout |
| GET | `/api/slurm/summary` | Cluster-wide Slurm summary |
| GET | `/api/slurm/partitions` | Per-partition statistics |
| GET | `/api/slurm/nodes` | Flat node list with topology context |
| GET | `/api/slurm/mapping` | Read current node name mappings |
| POST | `/api/slurm/mapping` | Save node name mappings |
| GET | `/api/slurm/metrics/catalog` | List loaded Slurm metric definitions |
| POST | `/api/slurm/metrics/catalog/config` | Update which metric files to load |
| GET | `/api/slurm/metrics/data?metric_id=X` | Query Prometheus for a Slurm metric |

## Menu Section

Contributes a **Workload** section (order=50) to the sidebar:

- Overview (`/slurm/overview`)
- Nodes (`/slurm/nodes`)
- Alerts (`/slurm/alerts`)
- Partitions (`/slurm/partitions`)
- Wallboard per-room
- Wall V2 (`/slurm/wall`) — multi-room view with selectable display modes

## Configuration

Full configuration lives in `config/plugins/slurm/config.yml`
(`config/app.yaml` only controls `plugins.slurm.enabled`):

```yaml
# config/plugins/slurm/config.yml
metric: slurm_node_status
label_node: node
label_status: status
label_partition: partition

roles: [compute, visu]
include_unlabeled: false
mapping_path: config/plugins/slurm/node_mapping.yaml

status_map:
  ok:   [idle, allocated, alloc, completing, comp, mixed, mix]
  warn: [maint, planned, reserved, drain, power_down, power_up, reboot_issued]
  crit: [down, fail, error, unknown, noresp, inval]
  info: []

severity_colors:
  ok: '#22c55e'
  warn: '#f59e0b'
  crit: '#ef4444'
  info: '#3b82f6'

metrics_catalog_dir: config/plugins/slurm/metrics
metrics_catalogs: [metrics.yaml]
```

## Node Mapping

Node name mapping supports **wildcards** — no need to list every node individually:

```yaml
# config/plugins/slurm/node_mapping.yaml
mappings:
  # Pattern: n001 → compute001, n002 → compute002, etc.
  - node: "n*"
    instance: "compute*"
  # Exact override for edge cases
  - node: "login01"
    instance: "service001"
```

The `*` wildcard matches any suffix; exact entries have higher priority.
Mappings can also be managed from the UI: **Settings → Plugins → Slurm → Edit mappings**.

## Metrics Catalog

Add YAML files under `config/plugins/slurm/metrics/` to expose your exporter metrics in dashboards and tooltips.
No code changes needed — register new files via `metrics_catalogs`.

```yaml
# config/plugins/slurm/metrics/metrics.yaml
metrics:
  - id: slurm_running_jobs
    name: Running Jobs
    metric: slurm_running_jobs_total
    scope: global
    display: { unit: jobs, chart_type: gauge }

  - id: slurm_node_cpus_alloc
    name: Node CPU Allocated
    metric: slurm_node_cpu_alloc
    scope: node
    display: { unit: cores, thresholds: { warn: 80, crit: 95 } }
```

## Device Role Filtering

Templates declare a `role` field to filter devices shown in Slurm views:

```yaml
templates:
  - id: compute-node
    type: server
    role: compute   # compute | visu | login | io | storage
```

## Dashboard Widgets

When the Slurm plugin is enabled, three widgets become available in the Dashboard Widget Library:

| Widget type | Group | Description |
|---|---|---|
| `slurm-cluster` | Overview | Node state bar + severity breakdown |
| `slurm-nodes` | Stats | Total Slurm node count |
| `slurm-utilization` | Charts | Allocated % gauge |

These widgets live in `frontend/src/app/plugins/slurm/widgets/` and are hidden automatically when the plugin is disabled. They use `requiresPlugin: 'slurm'` — see the [Dashboard Widget System](../architecture/dashboard-widgets) guide.
