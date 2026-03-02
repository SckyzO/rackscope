---
id: simulator
title: Simulator Plugin
sidebar_position: 2
---

# Simulator Plugin

The Simulator plugin provides demo mode, failure injection, and interactive
override capabilities for testing and presentations. It bridges the backend
API with the standalone simulator process (`tools/simulator/main.py`) that
exposes Prometheus metrics on port 9000.

**Plugin ID**: `simulator`
**Version**: 1.0.0
**Default order (sidebar)**: 200

---

## Architecture

The Simulator plugin consists of two distinct components:

### Backend Plugin (`src/rackscope/plugins/simulator/plugin.py`)

A `RackscopePlugin` subclass that:

- Registers the `/api/simulator/*` routes on the FastAPI application
- Reads and writes `overrides.yaml` in response to API calls
- Reads `scenarios.yaml` to enumerate available scenarios
- Checks whether the simulator service is reachable at `simulator:9000`
- Contributes a "Simulator" menu section (order=200) when enabled
- Supports hot configuration reload via `on_config_reload()`

The backend plugin does **not** generate any metrics. It is a control
plane only.

### Simulator Process (`tools/simulator/main.py`)

A standalone Python process that runs in its own Docker container:

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
scenario: demo-stable
scale_factor: 1
```

To disable the plugin at runtime without restarting: set `enabled: false`
in `plugin.yaml`. The simulator continues running but the menu section
disappears and the API routes return appropriate errors.

---

## Configuration Reference

All fields are defined in
`src/rackscope/plugins/simulator/config.py` (`SimulatorPluginConfig`).

### Top-Level Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `enabled` | bool | `true` | Whether the plugin is active. Controls menu visibility and API behavior. |
| `update_interval_seconds` | int (1–3600) | `20` | Simulator tick interval in seconds. Lower values produce more responsive demos but increase CPU usage. |
| `seed` | int or null | `null` | Random seed for deterministic metric generation. `null` uses wall-clock entropy (different values each run). Set an integer for reproducible demos. |
| `scenario` | string or null | `null` | Active scenario name. Must match a key in `scenarios.yaml`. `null` uses the global `incident_rates` and `profiles` without scenario overrides. |
| `scale_factor` | float (≥ 0.0) | `1.0` | Global multiplier applied to all incident rates. `0.0` completely disables all incidents. `2.0` doubles all incident probabilities. |

### `incident_rates`

Controls the per-tick probability of each incident type. Values are
floating-point probabilities between 0.0 and 1.0. Applied after
`scale_factor` multiplication.

| Field | Type | Default | Description |
|---|---|---|---|
| `node_micro_failure` | float (0.0–1.0) | `0.001` | Probability per tick that a single random node goes down. At default 20s interval: ~1 event per 5.5 hours. |
| `rack_macro_failure` | float (0.0–1.0) | `0.01` | Probability per tick that an entire rack loses power. At default interval: ~1 event per 33 minutes. |
| `aisle_cooling_failure` | float (0.0–1.0) | `0.005` | Probability per tick that a cooling failure affects an entire aisle. At default interval: ~1 event per 66 minutes. |

Example disabling all rack-level incidents while keeping node failures:

```yaml
incident_rates:
  node_micro_failure: 0.002
  rack_macro_failure: 0.0
  aisle_cooling_failure: 0.0
```

### `incident_durations`

Controls how long an incident persists before automatic recovery.
Values are in **seconds** (not ticks).

| Field | Type | Default | Description |
|---|---|---|---|
| `rack` | int (≥ 1) | `300` | Duration of a rack macro-failure in seconds. Default: 5 minutes — realistic PDU reset / power restore time. |
| `aisle` | int (≥ 1) | `600` | Duration of an aisle cooling failure in seconds. Default: 10 minutes — cooling unit restart + temperature stabilization. |

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
scenario: demo-stable
scale_factor: 1

incident_rates:
  node_micro_failure: 0.001
  rack_macro_failure: 0.01
  aisle_cooling_failure: 0.005

incident_durations:
  rack: 300    # seconds — PDU reset / power restore (5 min)
  aisle: 600   # seconds — cooling unit restart + stabilization (10 min)

overrides_path: config/plugins/simulator/overrides/overrides.yaml
default_ttl_seconds: 120

metrics_catalog_path: config/plugins/simulator/metrics/metrics_full.yaml
metrics_catalogs: []
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
  "scenario": "demo-stable",
  "overrides_count": 2
}
```

| Field | Description |
|---|---|
| `running` | `true` if the simulator responded with HTTP 200 within 1 second. |
| `endpoint` | The Prometheus metrics URL the simulator is serving. |
| `update_interval` | Current tick interval in seconds. |
| `scenario` | Active scenario name, or `null` if none. |
| `overrides_count` | Number of overrides currently loaded from `overrides.yaml`. |

### GET `/api/simulator/scenarios`

Lists all scenarios defined in `scenarios.yaml`.

**Response**:

```json
{
  "scenarios": [
    {"name": "demo-stable", "description": "Stable baseline with few incidents."},
    {"name": "full-ok",     "description": "No incidents. Low temps and load for a fully green demo."},
    {"name": "random-demo-small", "description": "Mostly OK, rare warning/critical incidents."},
    {"name": "random-1-critical", "description": "Occasional single critical node incident."},
    {"name": "random-1-rack-down", "description": "Occasional rack down incident (affects all nodes in a rack)."},
    {"name": "random-demo-high", "description": "High churn demo with frequent warning/critical incidents."}
  ]
}
```

Scenarios are returned in alphabetical order.

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
| `SIMULATOR_CONFIG` | `/app/config/plugins/simulator/scenarios/scenarios.yaml` | Path to scenarios + behavioral profiles |
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

`plugin.yaml` is reloaded on **every simulator tick**. This covers:

- Scenario changes
- Scale factor adjustments
- Incident rate tuning

`overrides.yaml` is also reloaded on every tick so newly added overrides
take effect without waiting for a config reload.

`scenarios.yaml` is **not** hot-reloaded by the simulator process. Changes
require a container restart (`docker compose -f docker-compose.dev.yml
restart simulator`).
