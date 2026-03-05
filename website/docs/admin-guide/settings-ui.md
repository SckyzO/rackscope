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
| **Restart** | Restart the simulator container (Docker hot-restart, ~5 s) |
| Update interval | Tick interval in seconds — hot-reloaded each tick |
| Seed | Random seed (empty = different each restart) |
| **Incident mode** | Failure pattern: `full_ok` / `light` / `medium` / `heavy` / `chaos` / `custom` — hot-reloaded |
| **Changes / hour** | How often the failing set is reshuffled — hot-reloaded |
| Custom counts | Exact device/rack/aisle counts (visible only in `custom` mode) |
| Overrides path | Path to the overrides YAML file — requires restart |
| Default TTL | Default lifetime for new overrides (seconds, 0 = permanent) |
| Metrics catalog | Primary Prometheus metric generation catalog — requires restart |
| Additional catalogs | Extra catalogs merged on top (toggle per catalog) |

**Incident modes at a glance**:

| Mode | Nodes CRIT | Nodes WARN | Racks | Aisles |
|---|---|---|---|---|
| `full_ok` | 0 | 0 | 0 | 0 |
| `light` | 1–3 | 1–5 | 0 | 0 |
| `medium` | 1–3 | 5–10 | 1 | 0 |
| `heavy` | 5–10 | 10–20 | 2 | 1 |
| `chaos` | 15 % | 25 % | 20 % | 25 % |
| `custom` | configurable | configurable | configurable | configurable |

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

---

## Appearance

### Tooltip style

Choose how node/device tooltips look across all rack views.
Applied globally — affects rack view, room view, cluster view, Slurm wallboard.

| Style | Description |
|---|---|
| **Tinted** | Header tinted by severity, alerts first, arc gauge |
| **Compact** | 2px top bar, split temp/power columns |
| **Glass cards** | Glassmorphism, 2 equal metric cards |
| **Split layout** | Info left, TempArc gauge right |
| **Terminal** | Monospace HPC style |
| **Ultra-compact** | 220px for wallboard/cluster views |

**Preview**: each style card shows three `StatusPill` buttons (CRIT / WARN / OK).
Hovering a pill renders the real tooltip in that style with sample data — no
style selection change occurs.

**Color aura**: glow shadow around the tooltip matching alert severity (toggle on/off).

### Severity Labels

**Location**: Settings → Appearance → Severity display labels

Configure how health states are displayed throughout the UI. These are display-only labels — they do not affect data, API responses, or YAML configuration.

| State key | Default label | Description |
|---|---|---|
| `OK` | OK | All checks passing |
| `WARN` | Warning | At least one warning |
| `CRIT` | Critical | At least one critical failure |
| `UNKNOWN` | Unknown | No data or check error |
| `INFO` | Info | Informational state |

**Changes are applied immediately** and persist in `localStorage` under `rackscope.severity-labels`.

To reset to defaults, use the **Reset to defaults** button at the bottom of the section.

---

## Notifications

**Location**: Settings → Notifications

### Sound alerts

Configure sounds that play when new Critical or Warning alerts arrive (synchronized with toast notifications):

| Setting | Description |
|---|---|
| **Enable sound alerts** | Master toggle |
| **Critical sound** | Sound for new CRIT alerts |
| **Warning sound** | Sound for new WARN alerts |
| **Volume** | 0–100% |
| **Play when** | Always / Tab in background only / Tab in foreground only |

Available presets: Soft ping, Double beep, Alert tone, Alarm, NOC chime, Siren.

### Visual notifications (toast popups)

| Setting | Description |
|---|---|
| **Position** | Bottom right or Top right |
| **Display duration** | How long each toast stays visible (seconds) |
| **Stack threshold** | Maximum toasts shown simultaneously |
