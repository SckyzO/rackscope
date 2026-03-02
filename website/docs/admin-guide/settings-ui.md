---
id: settings-ui
title: Settings UI
sidebar_position: 2
---

# Settings UI

Access via **Settings** (gear icon) in the sidebar, or `/editors/settings`.

## General

Application-level settings: Prometheus URL, cache TTL, refresh intervals, authentication.

## Views

### Tooltip style

Choose how node/device tooltips look across all rack views.
Applied globally — affects rack view, room view, cluster view, Slurm wallboard.

| Style | Description |
|---|---|
| **Tinted** (default) | Header tinted by severity, alerts first, arc gauge |
| **Compact** | 2px top bar, split temp/power columns |
| **Glass cards** | Glassmorphism, 2 equal metric cards |
| **Split layout** | Info left, TempArc gauge right |
| **Terminal** | Monospace HPC style |
| **Ultra-compact** | 220px for wallboard/cluster views |

**Color aura**: glow shadow matching severity color (toggle on/off).

**Live preview**: hover the "Try it" button to test the selected style with CRIT/WARN/OK sample data.

### World map style

`Minimal` · `Flat` · `NOC` · `Retro` · `Midnight`

Minimal adapts to dark/light mode. NOC uses glowing teal lines for wallboards.
Retro = warm parchment. Midnight = ultra-dark, minimal borders.

### Other view settings

- Worldmap default zoom, center coordinates
- Aisle dashboard enable/disable
- Playlist interval and views

## Plugins

### Simulator Plugin

| Setting | Description |
|---|---|
| Enable | Activate the simulator — shows DEMO ribbon in UI |
| Show DEMO ribbon | Toggle the corner ribbon |
| Scenario | Active scenario (hot-reload, no restart needed) |
| Update interval | Tick interval in seconds |
| Scale factor | Incident rate multiplier (0 = no incidents) |
| Seed | Random seed (empty = random each restart) |
| Advanced | Incident rates, durations, overrides path, metrics catalog |

### Slurm Plugin

| Setting | Description |
|---|---|
| Enable | Activate Slurm integration |
| Prometheus source | Metric name, node/status/partition label names |
| Node filtering | Device roles (TagInput), include unlabeled toggle |
| Node mapping editor | Add/remove/edit node name → instance mappings (wildcard support) |
| Severity colors | Color pickers per severity level (OK/WARN/CRIT/INFO) |
| Status mapping | Drag & drop Slurm statuses between severity zones |

#### Node Mapping Editor

The mapping editor lets you link Slurm node names to topology instance names directly from the UI, without editing YAML files.

**Opening the editor**: Settings → Plugins → Slurm → expand **Node mapping** → click **Edit mappings**

Each entry maps a Slurm node name (or wildcard pattern) to a topology instance name:

| Field | Example | Description |
|---|---|---|
| Slurm node | `n001` or `n*` | Slurm node name, supports `*` wildcard |
| Instance | `compute001` or `compute*` | Topology instance name in `config/topology/` |

**Wildcard rules**:
- `n*` → `compute*` maps all nodes matching `n*` in order: `n001 → compute001`, `n002 → compute002`, etc.
- Exact matches take priority over wildcard patterns
- Patterns are evaluated top-to-bottom; first match wins

**Buttons**:
- **+ Add entry** — append a new row
- **Delete** (×) — remove a mapping
- **Save** — writes to `config/plugins/slurm/node_mapping.yaml`

Changes take effect on the next Prometheus scrape cycle (no restart required).

See [Slurm node mapping](../user-guide/slurm#node-mapping) for the full YAML reference.

## Topology Editor

Visual editor for sites, rooms, aisles, racks, devices.
See [Topology Editor](../user-guide/topology-editor).

## Template Editor

Edit device templates, rack templates, rack components.
Includes per-template thermal thresholds for the HUD tooltip.

## Checks Library Editor

Browse and edit health check definitions.
