---
id: slurm
title: Slurm Integration
sidebar_position: 4
---

# Slurm Integration

The Slurm plugin provides HPC-specific views mapping workload manager states to the physical infrastructure.

## Views

### Wallboard V1 (per-room)

**URL**: `/slurm/wallboard/:roomId`

Compact aisle view mapping Slurm node states to the physical rack layout.
Ideal for NOC displays. Two view modes: compact dots and detailed slot grid.

### Wall V2 (multi-room)

**URL**: `/slurm/wall`

**New in v1.1** — Multi-room wallboard with 3 display modes and a Configure panel.

#### Display modes (Configure → View)

| Mode | Description |
|---|---|
| **Compact dots** | One colored dot per node — fast status scan across all rooms |
| **Rack physical** | Full `RackElevation` with Slurm colors — shows physical slot positions |
| **Slot grid** | Physical slot columns at exact U positions |

#### Layout modes

| Mode | Behavior |
|---|---|
| **Horizontal scroll** | Single row, racks fill full height |
| **Wrap + scroll** | Multiple rows, vertical scroll |
| **Wrap + autosize** | Card height auto-calculated so all racks fit without scrolling |

#### Card size: S / M / L

Sets the card width. In wrap-auto mode the height adapts automatically.

#### Grouping: By aisle / All flat

Toggle between grouped aisle sections and a flat list.

#### Auto-refresh: Off / 15s / 30s / 1m / 2m / 5m

#### Multi-room by default

Wall V2 loads all rooms and filters by device roles configured in the Slurm plugin.
No room selector needed — the view follows `plugins.slurm.roles` automatically.

### Cluster Overview

**URL**: `/slurm/overview`

Aggregate cluster statistics — nodes by state, health severity distribution, partition summary.

### Partitions Dashboard

**URL**: `/slurm/partitions`

Per-partition breakdown: nodes per state, usage percentage, health indicators.

### Node List

**URL**: `/slurm/nodes`

Flat list with Slurm state + topology context (site/room/rack/device) for each node.

### Alerts Dashboard

**URL**: `/slurm/alerts`

Nodes in WARN or CRIT state requiring attention.

## Configuration

Enable in `config/app.yaml`:

```yaml
plugins:
  slurm:
    enabled: true
```

Full configuration in `config/plugins/slurm/config.yml` — see [Slurm Plugin](../plugins/slurm) for all options.

## Node Mapping (Optional)

Map Slurm names to topology instance names. **Wildcards supported:**

```yaml
# config/plugins/slurm/node_mapping.yaml
mappings:
  - node: "n*"          # matches n001, n002, ...
    instance: "compute*" # → compute001, compute002, ...
```

Manage from the UI: **Settings → Plugins → Slurm → Edit mappings**.

## Device Role Filtering

Templates define a `role` field to control which devices appear in Slurm views:

```yaml
templates:
  - id: compute-node
    type: server
    role: compute   # compute | visu | login | io | storage
```

Roles to include: configured via `roles` in `config/plugins/slurm/config.yml`.
