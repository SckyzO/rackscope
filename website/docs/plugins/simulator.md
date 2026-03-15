---
id: simulator
title: Simulator Plugin
sidebar_position: 2
---

# Simulator Plugin

The Simulator plugin provides demo mode, failure injection, and interactive
override capabilities for testing and presentations. It bridges the backend
API with the standalone simulator process (`plugins/simulator/process/`) that
exposes Prometheus metrics on port 9000.

**Plugin ID**: `simulator`
**Version**: 1.0.0
**Default order (sidebar)**: 200

---

## Architecture

The Simulator plugin consists of two distinct components:

### Backend Plugin (`plugins/simulator/backend/plugin.py`)

A `RackscopePlugin` subclass that:

- Registers the `/api/simulator/*` routes on the FastAPI application
- Reads and writes `overrides.yaml` in response to API calls
- Checks whether the simulator service is reachable at `simulator:9000`
- Contributes a "Simulator" menu section (order=200) when enabled
- Supports hot configuration reload via `on_config_reload()`

The backend plugin does **not** generate any metrics. It is a control
plane only.

### Simulator Process (`plugins/simulator/process/`)

A standalone Python process that runs in its own Docker container.
The process is split into focused modules:

| Module | Responsibility |
|---|---|
| `main.py` | Entry point — starts HTTP server + calls `simulate()` |
| `config.py` | Load `plugin.yaml` + `app.yaml` override, return merged config dict |
| `topology.py` | Parse topology YAML, expand nodeset patterns |
| `metrics.py` | Prometheus Gauge registry, fallback metric definitions |
| `labels.py` | Template label resolution (`$instance`, `$rack_id`, …) |
| `overrides.py` | Load time-filtered overrides from YAML |
| `loop.py` | Main simulation loop + `_apply_failures` / `_apply_overrides` helpers |

- Reads the topology to discover all instances and racks
- Loads `plugin.yaml` on every tick (hot-reload)
- Runs the tick loop: generate metrics → expose on `:9000`
- Reads `overrides.yaml` on every tick to apply runtime overrides
- Applies incidents (micro-failure, rack-down, aisle cooling)
- Registers Prometheus gauges via the `prometheus_client` library

These two components communicate through shared YAML files
(`overrides.yaml`, `plugin.yaml`) mounted into both containers via Docker
Compose volumes. The backend writes; the simulator reads.

### Configuration Priority Chain

The backend plugin resolves its configuration in this order (first found wins):

1. `config/plugins/simulator/config/plugin.yaml` (recommended — hot-reloaded)
2. `app.yaml` key `plugins.simulator` (legacy embedded format)
3. `app.yaml` key `simulator` (legacy top-level format)
4. Pydantic model defaults

:::note Migration note
Pre-plugin-architecture deployments stored simulator settings directly in
`app.yaml` under the `simulator:` key. This format continues to work but
triggers a deprecation warning in the backend logs. Migrate to
`config/plugins/simulator/config/plugin.yaml`.
:::

---

## Enabling the Plugin

Set the plugin flag in `config/app.yaml`:

```yaml
plugins:
  simulator:
    enabled: true
```

When the simulator is active, a **DEMO** ribbon is displayed in the top-left
corner of the UI as a visual indicator.

The dedicated plugin config file takes precedence over `app.yaml` values:

```yaml
# config/plugins/simulator/config/plugin.yaml
update_interval_seconds: 20
seed: null
incident_mode: light
changes_per_hour: 2
```

To disable the plugin at runtime without restarting: set `enabled: false`
in `plugin.yaml`. The simulator continues running but the menu section
disappears and the API routes return appropriate errors.

---

## Configuration Reference

All fields are defined in
`plugins/simulator/backend/config.py` (`SimulatorPluginConfig`).

### Top-Level Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `enabled` | bool | `true` | Whether the plugin is active. Controls menu visibility and API behavior. |
| `update_interval_seconds` | int (1–3600) | `20` | Simulator tick interval in seconds. Lower values produce more responsive demos but increase CPU usage. |
| `seed` | int or null | `null` | Random seed for deterministic metric generation. `null` uses wall-clock entropy. Set an integer for reproducible demos. |
| `incident_mode` | string | `light` | Failure pattern. One of `full_ok`, `light`, `medium`, `heavy`, `chaos`, `custom`. See below. |
| `changes_per_hour` | int (≥ 1) | `2` | How many times per hour the set of failing devices is reshuffled. Ignored in `full_ok` mode. |

### `incident_mode`

The `incident_mode` field selects a named failure preset. On each reshuffle
cycle (`3600 / changes_per_hour / update_interval_seconds` ticks), the simulator
draws a new random set of victims within the configured bounds.

| Mode | Nodes CRIT | Nodes WARN | Racks CRIT | Aisles hot |
|---|---|---|---|---|
| `full_ok` | 0 | 0 | 0 | 0 |
| `light` | 1–3 | 1–5 | 0 | 0 |
| `medium` | 1–3 | 5–10 | 1 | 0 |
| `heavy` | 5–10 | 10–20 | 2 | 1 |
| `chaos` | 15 % of nodes | 25 % of nodes | 20 % of racks | 25 % of aisles |
| `custom` | see `custom_incidents` | see `custom_incidents` | see `custom_incidents` | see `custom_incidents` |

CRIT nodes get `up=0` (Slurm: `down`). WARN nodes get `health_status=1` (Slurm: `drain`).
Nodes in a CRIT rack are all brought down. Nodes in a hot aisle receive a +12 °C
temperature boost.

### `custom_incidents`

Used only when `incident_mode: custom`. Specifies exact counts.

| Field | Type | Default | Description |
|---|---|---|---|
| `devices_crit` | int (≥ 0) | `0` | Number of nodes forced to `up=0`. |
| `devices_warn` | int (≥ 0) | `0` | Number of nodes forced to `health_status=1`. |
| `racks_crit` | int (≥ 0) | `0` | Number of racks brought fully down. |
| `aisles_hot` | int (≥ 0) | `0` | Number of aisles with a +12 °C temperature boost. |

```yaml
incident_mode: custom
custom_incidents:
  devices_crit: 5
  devices_warn: 10
  racks_crit: 1
  aisles_hot: 0
```

### Paths

| Field | Type | Default | Description |
|---|---|---|---|
| `overrides_path` | string | `config/plugins/simulator/overrides/overrides.yaml` | Path to the overrides persistence file. Relative to the project root. |
| `metrics_catalog_path` | string | `config/plugins/simulator/metrics/metrics_full.yaml` | Path to the primary metrics catalog. Defines which Prometheus metrics the simulator generates. |

### Overrides

| Field | Type | Default | Description |
|---|---|---|---|
| `default_ttl_seconds` | int (≥ 0) | `120` | TTL applied to new overrides when the API caller omits `ttl_seconds`. `0` means permanent (no expiry). |

### `metrics_catalogs`

A list of additional metric catalog files merged on top of
`metrics_catalog_path`. Later entries take precedence (higher index
wins on name collision).

Each entry is a `SimulatorMetricsCatalog` object:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | yes | Unique identifier for this catalog entry (used in logs). |
| `path` | string | yes | Path to the catalog YAML file, relative to the project root. |
| `enabled` | bool | no (default: `true`) | Set to `false` to temporarily disable this catalog without removing it from the list. |

Example adding a Slurm-only catalog on top of the full catalog:

```yaml
metrics_catalog_path: config/plugins/simulator/metrics/metrics_full.yaml

metrics_catalogs:
  - id: slurm
    path: config/plugins/simulator/metrics/metrics_slurm.yaml
    enabled: true
```

### Full Default Configuration

```yaml
# config/plugins/simulator/config/plugin.yaml
update_interval_seconds: 20
seed: null

incident_mode: light
changes_per_hour: 2

custom_incidents:
  devices_crit: 0
  devices_warn: 0
  racks_crit: 0
  aisles_hot: 0

overrides_path: config/plugins/simulator/overrides/overrides.yaml
default_ttl_seconds: 120

metrics_catalog_path: config/plugins/simulator/metrics/metrics_full.yaml
metrics_catalogs: []

# Process-only fields (ignored by the Pydantic backend model)
profiles:
  compute: { base_temp: 24.0, temp_range: 8.0, base_power: 200.0, power_var: 200.0, load_min: 40.0, load_max: 80.0 }
  gpu:     { base_temp: 28.0, temp_range: 25.0, base_power: 250.0, power_var: 500.0, load_min: 5.0, load_max: 100.0 }
  service: { base_temp: 21.0, temp_range: 3.0, base_power: 100.0, power_var: 20.0, load_min: 2.0, load_max: 8.0 }
  network: { base_temp: 32.0, temp_range: 4.0, base_power: 120.0, power_var: 10.0, load_min: 15.0, load_max: 15.0 }
slurm_alloc_percent: 80
slurm_random_statuses: { drain: 1, down: 1, maint: 1 }
slurm_random_match: [compute*, visu*]
```

---

## API Endpoints

All routes are prefixed with `/api/simulator` and tagged `simulator` in
the OpenAPI schema. Routes are always registered (even when `enabled:
false`); callers should check the status endpoint before relying on data.

### GET `/api/simulator/status`

Returns the current plugin state and whether the simulator process is
reachable.

**Response**:

```json
{
  "running": true,
  "endpoint": "http://simulator:9000/metrics",
  "update_interval": 20,
  "incident_mode": "light",
  "changes_per_hour": 2,
  "overrides_count": 2
}
```

| Field | Description |
|---|---|
| `running` | `true` if the simulator responded with HTTP 200 within 1 second. |
| `endpoint` | The Prometheus metrics URL the simulator is serving. |
| `update_interval` | Current tick interval in seconds. |
| `incident_mode` | Active incident mode (`full_ok`, `light`, `medium`, `heavy`, `chaos`, `custom`). |
| `changes_per_hour` | How many times per hour incidents are reshuffled. |
| `overrides_count` | Number of overrides currently loaded from `overrides.yaml`. |

### POST `/api/simulator/restart`

Sends a restart signal to the simulator container via its internal control
server (port 9001). The process exits cleanly and Docker restarts it
automatically (`restart: unless-stopped`). Config changes that require a
restart (e.g. `overrides_path`, `metrics_catalog_path`) are picked up
after the container comes back up.

**Response**:

```json
{"status": "restarting"}
```

Returns `503` if the simulator control server is unreachable.

### GET `/api/simulator/overrides`

Returns all overrides currently stored in `overrides.yaml`. Expired
overrides (past `expires_at`) are included in the file but skipped by
the simulator at generation time; they are not filtered out in this
response.

**Response**:

```json
{
  "overrides": [
    {
      "id": "compute001-up-1770032278",
      "instance": "compute001",
      "rack_id": null,
      "metric": "up",
      "value": 0.0
    }
  ]
}
```

### POST `/api/simulator/overrides`

Adds a new override. The override is appended to `overrides.yaml`
immediately.

**Request body**:

| Field | Type | Required | Description |
|---|---|---|---|
| `instance` | string | one of `instance`/`rack_id` | Instance name to override. Mutually exclusive with `rack_id`. |
| `rack_id` | string | one of `instance`/`rack_id` | Rack identifier. Only valid with `metric: "rack_down"`. |
| `metric` | string | yes | Metric name to override. See Overridable Metrics table. |
| `value` | number | yes | Override value. Must pass metric-specific validation. |
| `ttl_seconds` | int | no | Seconds until expiry. `0` = permanent. Omit to use `default_ttl_seconds`. |

**Validation rules**:

- `metric` must be `up`, `rack_down`, `node_temperature_celsius`,
  `node_power_watts`, `node_load_percent`, `node_health_status`, or any
  metric from the display library
- `up` value must be `0` or `1`
- `node_health_status` value must be `0`, `1`, or `2`
- `rack_down` requires `rack_id` (not `instance`)
- `rack_id` overrides only accept `metric: "rack_down"`
- `value` must be numeric

**Example request** — force node down for 10 minutes:

```bash
curl -X POST http://localhost:8000/api/simulator/overrides \
  -H "Content-Type: application/json" \
  -d '{
    "instance": "compute005",
    "metric": "up",
    "value": 0,
    "ttl_seconds": 600
  }'
```

**Response**: updated list of all overrides (same format as GET).

### DELETE `/api/simulator/overrides`

Clears all overrides. Truncates `overrides.yaml` to an empty list.

**Response**:

```json
{"overrides": []}
```

### `DELETE /api/simulator/overrides/{override_id}`

Deletes a single override by its `id` field.

**Path parameter**: `override_id` — the string `id` field from the
override object (e.g. `compute001-up-1770032278`).

**Response**: updated list of remaining overrides.

### GET `/api/simulator/metrics`

Returns metrics available for use in override requests. The list is
derived from the display library (`METRICS_LIBRARY`). When the library
is not loaded, a minimal hardcoded set is returned so the Settings UI
remains functional.

**Response**:

```json
{
  "metrics": [
    {"id": "up",                      "name": "Node Up",          "unit": "bool",  "category": "health"},
    {"id": "node_temperature_celsius","name": "Node Temperature",  "unit": "°C",    "category": "temperature"},
    {"id": "node_power_watts",        "name": "Node Power",       "unit": "W",     "category": "power"},
    {"id": "node_load_percent",       "name": "Node Load",        "unit": "%",     "category": "performance"},
    {"id": "node_health_status",      "name": "Node Health Status","unit": "enum", "category": "health"}
  ]
}
```

### POST `/api/simulator/incidents`

Triggers a named incident via API without waiting for the random
probability check to fire.

**Request body**:

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | string | yes | `"rack_down"` or `"aisle_cooling"` |
| `target_id` | string | yes | Rack ID (for `rack_down`) or aisle ID (for `aisle_cooling`) |
| `duration` | int | no (default: 300) | Duration in seconds. `0` = permanent until cleared. |

:::note
`aisle_cooling` incidents triggered via this endpoint return
`status: "not_implemented"` (HTTP 200). Aisle cooling incidents are
currently only injected via the probabilistic tick mechanism.
`rack_down` incidents are fully supported.
:::

**Example** — take down rack r02-01 for 2 minutes:

```bash
curl -X POST http://localhost:8000/api/simulator/incidents \
  -H "Content-Type: application/json" \
  -d '{"type": "rack_down", "target_id": "r02-01", "duration": 120}'
```

**Response**:

```json
{
  "status": "triggered",
  "incident_type": "rack_down",
  "target_id": "r02-01",
  "duration": 120,
  "expires_at": 1770034278
}
```

---

## Metrics Catalog Schema

The metrics catalog (`metrics_full.yaml`, `metrics_slurm.yaml`, or a
custom file) defines what the simulator generates. The top-level key is
`metrics` containing a list of metric definition objects.

### Metric Definition Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Prometheus metric name (must be a valid Prometheus identifier). |
| `scope` | `node` or `rack` | yes | Whether to generate one series per instance (`node`) or per rack (`rack`). |
| `instances` | list of strings | for `scope: node` | fnmatch patterns selecting which instances get this metric. |
| `racks` | list of strings | for `scope: rack` | fnmatch patterns selecting which racks get this metric. |
| `labels` | mapping | no | Extra label key=value pairs. Values may contain `$placeholder` variables. |
| `labels_only` | bool | no (default: `false`) | When `true`, BASE\_LABELS are omitted. Only the labels defined in `labels` are added. Required for Slurm and other exporters with fixed label schemas. |

### BASE\_LABELS

Automatically added to every metric unless `labels_only: true`:

```
site_id   room_id   rack_id   chassis_id   node_id   instance   job
```

### Placeholder Variables

| Placeholder | Description |
|---|---|
| `$node_id` | Instance name at generation time |
| `$rack_id` | Rack identifier |
| `$status` | Status string: `optimal`/`degraded`/`failed` (storage), `idle`/`allocated`/`drain`/`down`/`maint` (Slurm) |
| `$port` | Switch port number |
| `$cpu` | CPU index |
| `$pduid` | PDU unit ID |
| `$pduname` | PDU unit name |
| `$inletid` | PDU inlet identifier (`I1`, `I2`) |
| `$inletname` | PDU inlet name |
| `$outletid` | PDU outlet ID |
| `$outletname` | PDU outlet name |
| `$drive_id` | E-Series drive identifier |
| `$slot` | Slot number |
| `$tray` | Tray number |
| `$partition` | Slurm partition name |
| `$state` | Sequana3 HYC state string |

### Pattern Syntax

Instance and rack patterns use Python `fnmatch` (shell-style wildcards):

- `*` — any sequence of characters
- `?` — exactly one character
- `[001-010]` — numeric range expansion (proprietary extension): expands
  to zero-padded integers, e.g. `compute[001-010]` → `compute001` …
  `compute010`

Patterns are case-sensitive.

### Catalog Merging

When `metrics_catalogs` lists multiple files, the simulator merges them
in order. The merge key is the metric `name`. If two catalogs define
an entry with the same name, the entry from the **later** catalog in the
list wins.

The primary catalog (`metrics_catalog_path`) is loaded first, then each
additional catalog is applied in list order.

---

## Slurm Metrics (`metrics_slurm.yaml`)

When the Slurm metrics catalog is enabled (`metrics_catalogs` in `plugin.yaml`), the simulator generates a full set of metrics that match the output of [SckyzO/slurm_exporter](https://github.com/SckyzO/slurm_exporter).

All Slurm metrics use `labels_only: true` — no `BASE_LABELS` (`rack_id`, `job`, etc.) are added, matching the real exporter's label schema.

### Per-node metrics (scope: `node`)

Applied to all instances matching `compute*` and `visu*`:

| Metric | Labels | Description |
|---|---|---|
| `slurm_node_status` | `node`, `status`, `partition` | Node active status, value always 1 |
| `slurm_node_cpu_alloc` | `node`, `partition`, `status` | CPUs currently allocated on this node |
| `slurm_node_cpu_total` | `node`, `partition`, `status` | Total CPUs available on this node |
| `slurm_node_mem_alloc` | `node`, `partition`, `status` | Memory allocated (MB) |
| `slurm_node_mem_total` | `node`, `partition`, `status` | Total memory (MB) |

### Cluster CPU aggregates (scope: `rack`, no labels)

| Metric | Description |
|---|---|
| `slurm_cpus_alloc` | Total allocated CPUs across the cluster |
| `slurm_cpus_idle` | Total idle CPUs |
| `slurm_cpus_total` | Total CPUs in the cluster |

### Cluster node aggregates (scope: `rack`, no labels)

| Metric | Description |
|---|---|
| `slurm_nodes_alloc` | Nodes with at least one running job |
| `slurm_nodes_idle` | Nodes with no running job |
| `slurm_nodes_down` | Nodes in DOWN state |
| `slurm_nodes_drain` | Nodes being drained |
| `slurm_nodes_total` | Total nodes registered |

### Per-partition aggregates (label: `partition`)

| Metric | Description |
|---|---|
| `slurm_partition_cpus_allocated` | Allocated CPUs in this partition |
| `slurm_partition_cpus_idle` | Idle CPUs in this partition |
| `slurm_partition_cpus_total` | Total CPUs in this partition |
| `slurm_partition_jobs_running` | Running jobs in this partition |
| `slurm_partition_jobs_pending` | Pending (queued) jobs in this partition |

### GPU aggregates (scope: `rack`, no labels)

| Metric | Description |
|---|---|
| `slurm_gpus_alloc` | Allocated GPUs |
| `slurm_gpus_idle` | Idle GPUs |
| `slurm_gpus_total` | Total GPUs |
| `slurm_gpus_utilization` | GPU utilization (0–100) |

### Slurm allocation behaviour

The simulator controls the proportion of nodes in each Slurm state via two config fields:

| Field | Type | Default | Description |
|---|---|---|---|
| `slurm_alloc_percent` | int (0–100) | `80` | Percentage of eligible nodes placed in `allocated` state. Remaining nodes become `idle`. Reflects a typical busy HPC cluster where 80% of capacity is in use. |
| `slurm_random_statuses` | `{status: count}` | `{drain:1, down:1}` | Force N nodes to a specific status each reshuffle cycle (drain, down, maint, …). Applied before the alloc ratio, so forced nodes are excluded from the ratio calculation. |
| `slurm_random_match` | list of globs | `[compute*, visu*]` | Node patterns eligible for both forced statuses and allocation ratio. |

**Status priority** (highest to lowest):

1. `slurm_random_statuses` forced assignment
2. Hardware incident (`up=0` → `down`, `health_status=1` → `drain`)
3. `slurm_alloc_percent` ratio → `allocated` or `idle`

The allocated set is determined **deterministically** (alphabetical sort, first N%) — no randomness between ticks, so the Slurm state is stable within a cycle.

Configure via **Settings → Plugins → Simulator → Slurm → Allocation ratio**.

---

### Enabling the Slurm catalog

The Slurm catalog is enabled via `plugin.yaml`:

```yaml
# config/plugins/simulator/config/plugin.yaml
metrics_catalog_path: config/plugins/simulator/metrics/metrics_full.yaml
metrics_catalogs:
  - id: slurm
    path: config/plugins/simulator/metrics/metrics_slurm.yaml
    enabled: true
```

And declared in `app.yaml` so the simulator tool can discover it:

```yaml
# config/app.yaml
simulator:
  metrics_catalogs:
    - id: slurm
      path: config/plugins/simulator/metrics/metrics_slurm.yaml
      enabled: true
```

---

## Overrides File Format

`config/plugins/simulator/overrides/overrides.yaml` is managed
exclusively by the backend API. Do not edit it manually while the stack
is running.

### Schema

```yaml
overrides:
  - id: "compute001-up-1770032278"   # Unique identifier (string)
    instance: "compute001"            # Instance name (or null if rack override)
    rack_id: null                     # Rack ID (or null if instance override)
    metric: "up"                      # Metric name
    value: 0.0                        # Override value (float)
    expires_at: 1770035878            # Unix timestamp (omitted if permanent)
```

### TTL Expiry

The `expires_at` field is a Unix timestamp (seconds since epoch). The
simulator checks `time.time() > expires_at` on each tick and skips expired
overrides. Expired entries remain in the file until the next API write
operation (POST or DELETE) which rewrites the file.

---

## Menu Contribution

When `enabled: true`, the plugin registers the following sidebar section:

```
Section: Simulator   (order=200, icon=Sparkles)
  └─ Control Panel   (path=/simulator, icon=Sliders)
```

`order=200` places the Simulator section after all core navigation
sections (Monitoring, Editors) and after the Slurm section (order=50).

The `register_menu_sections()` method re-reads the current app config on
every call so that toggling the plugin on/off in the Settings UI takes
effect immediately without a backend restart.

---

## Environment Variables

The simulator process (not the backend plugin) reads the following
environment variables, set by Docker Compose:

| Variable | Default | Description |
|---|---|---|
| `TOPOLOGY_FILE` | `/app/config/topology` | Path to topology root directory or file |
| `TEMPLATES_PATH` | `/app/config/templates` | Path to templates directory |
| `SIMULATOR_CONFIG` | `/app/config/plugins/simulator/config/plugin.yaml` | Path to the plugin config file (base config + behavioral profiles) |
| `SIMULATOR_APP_CONFIG` | `/app/config/app.yaml` | Path to app.yaml (read for legacy config compat) |
| `METRICS_LIBRARY` | `/app/config/metrics/library` | Path to display metrics library (used to determine node/rack scope) |

The backend plugin reads one environment variable:

| Variable | Default | Description |
|---|---|---|
| `SIMULATOR_URL` | `http://simulator:9000` | Base URL for health-checking the simulator process |

---

## Implementation Notes

### Why Two Separate Processes

The simulator is intentionally isolated in its own container and process:

1. **Isolation**: A crash or hang in metric generation cannot affect the
   backend API.
2. **Purity**: The backend queries Prometheus exactly as in production.
   There is no "fake" code path for demo mode in the telemetry pipeline.
3. **Realism**: Prometheus scrape intervals, staleness, and metric
   label schemas behave identically to real exporters.

### Override Flow

```
User → POST /api/simulator/overrides
          ↓
  backend validates payload
          ↓
  appends to overrides.yaml
          ↓
  simulator reads overrides.yaml on next tick
          ↓
  metric value replaced in generated output
          ↓
  Prometheus scrapes updated value
          ↓
  backend query returns overridden value
          ↓
  UI shows forced state
```

End-to-end latency from API call to UI update is
`update_interval_seconds + prometheus_scrape_interval` (typically 20–40
seconds with default settings).

### Reload Semantics

`plugin.yaml` (and `app.yaml` overlay) is reloaded on **every simulator tick**. This covers:

- `incident_mode` / `changes_per_hour` changes — effective within one tick (~20 s)
- `seed` changes

The following fields are read **once at startup** and require a container
restart to take effect:

- `overrides_path`
- `metrics_catalog_path` / `metrics_catalogs`

Use the **Restart** button in Settings → Plugins → Simulator, or run:
```bash
docker compose -f docker-compose.dev.yml restart simulator
```

`overrides.yaml` is reloaded on every tick; new overrides take effect without any restart.

## Dashboard Widget

When the Simulator plugin is enabled, a **Simulator Status** widget is available in the Dashboard Widget Library:

| Widget type | Group | Description |
|---|---|---|
| `simulator-status` | Overview | Running state, incident mode, changes/hour, override count, update interval |

The widget is hidden automatically when the plugin is disabled (`requiresPlugin: 'simulator'`). It lives in `plugins/simulator/frontend/widgets/SimulatorStatusWidget.tsx`.

Clicking **Settings ↗** in the widget footer navigates to **Settings → Plugins** where you can change the incident mode and manage overrides.

---

## Examples integration

Each bundled example (`homelab`, `small-cluster`, `hpc-cluster`, `exascale`) ships with its own simulator configuration at `config/examples/{name}/plugins/simulator/config/plugin.yaml`.

The simulator reads its topology path from `app.yaml paths.topology` — when you switch examples with `use-example.sh`, the simulator automatically generates metrics for the new topology.

### Incident modes per example

| Example | Default mode | Typical behavior |
|---|---|---|
| homelab | `light` | 1–3 CRIT, 1–5 WARN |
| small-cluster | `medium` | 1–3 CRIT, 5–10 WARN, 1 rack |
| hpc-cluster | `medium` | 1–3 CRIT, 5–10 WARN, 1 rack |
| exascale | `heavy` | 5–10 CRIT, 10–20 WARN, 2 racks, 1 hot aisle |

### Metrics generated by example

| Metric | homelab | small | hpc | exascale |
|---|---|---|---|---|
| `up{job="node"}` | ~23 | ~600 | ~1 900 | ~14 000 |
| `node_temperature_celsius` | ~23 | ~600 | ~1 900 | ~14 000 |
| `node_power_watts` | ~23 | ~600 | ~1 900 | ~14 000 |
| `ipmi_temperature_state` | ~16 | ~480 | ~1 200 | ~12 000 |
| `raritan_pdu_activepower_watt` | 6 | 22 | 50 | 188 |

Note: `ipmi_*` series count is lower than node count — switches and storage-heads have no IPMI in the simulator (expected).
