---
id: simulator
title: Metrics Simulator
sidebar_position: 5
---

# Metrics Simulator

The Rackscope Simulator generates **realistic Prometheus metrics** for
development, testing, and presentations without any real hardware.
Prometheus scrapes it on its normal schedule; the backend queries Prometheus
exactly as in production — the simulator is completely transparent to the
rest of the stack.

![Simulator Settings](/img/screenshots/settings.png)

---

## Architecture: Two Independent Systems

The simulator involves two completely separate concepts that are often
confused. Understanding the distinction is critical before making any
configuration change.

### Simulator Catalog — What Gets Generated

**File**: `config/plugins/simulator/metrics/metrics_full.yaml`

The metrics catalog defines **which Prometheus metrics the simulator
generates and exposes** on `:9000`. It controls metric names, label sets,
instance filtering, and how the simulator engine populates values (from
behavioral profiles, incidents, and overrides).

The catalog is read by `tools/simulator/main.py` on every tick. Changes to
it do not affect what the UI displays — only what Prometheus scrapes.

The default catalog (`metrics_full.yaml`) produces 43 distinct metric
families grouped by exporter:

| Group | Metric prefix | Notes |
|---|---|---|
| Simulator synthetic | `up`, `node_temperature_celsius`, `node_power_watts`, `node_load_percent`, `node_health_status` | Derived from behavioral profiles |
| Node Exporter — CPU | `node_cpu_seconds_total` | Monotonic idle counter |
| Node Exporter — Memory | `node_memory_MemTotal_bytes`, `node_memory_MemAvailable_bytes` | |
| Node Exporter — Filesystem | `node_filesystem_size_bytes`, `node_filesystem_avail_bytes` | mountpoint=/ |
| Node Exporter — Disk I/O | `node_disk_read_bytes_total`, `node_disk_written_bytes_total` | device=sda |
| Node Exporter — Network | `node_network_receive_bytes_total`, `node_network_transmit_bytes_total` | device=eth0 |
| IPMI | `ipmi_fan_speed_state`, `ipmi_power_state`, `ipmi_sensor_state`, `ipmi_temperature_state`, `ipmi_voltage_state`, `ipmi_up` | compute/visu/srv/service only |
| Switches | `switch_port_oper_status`, `switch_port_in_octets`, `switch_port_out_octets` | `*isw*`, `*esw*`, `sw-*` |
| Slurm | `slurm_node_status` | compute/visu, labels\_only |
| E-Series storage | `eseries_*` (8 metrics) | `da*-r02-*` pattern |
| Sequana3 HYC | `sequana3_hyc_*` (4 metrics) | `r01-*` racks |
| Sequana3 PMC | `sequana3_pmc_total_watt` | `r01-*` racks |
| Raritan PDU | `raritan_pdu_*` (6 metrics) | all racks |

### Display Library — How Metrics Are Shown

**Directory**: `config/metrics/library/`

The display library defines **how the UI renders metrics** in charts:
units, axis labels, colors, thresholds, and chart types. It does not affect
which metrics the simulator generates.

The default library ships with 7 display metrics: `node_temperature`,
`node_power`, `pdu_active_power`, `pdu_apparent_power`, `pdu_current`,
`pdu_voltage`, and `pdu_energy`.

Adding a metric to the display library does not make the simulator generate
it. Adding a metric to the simulator catalog does not make the UI show a
chart for it. Both must be configured independently.

---

## Folder Structure

```
config/plugins/simulator/
├── config/
│   └── plugin.yaml          ← main plugin config (hot-reloaded every tick)
├── metrics/
│   ├── metrics_full.yaml    ← primary catalog (all 43 metric families)
│   ├── metrics_slurm.yaml   ← Slurm-only catalog (labels_only format)
│   └── metrics_examples.yaml ← reference examples for custom catalogs
├── overrides/
│   └── overrides.yaml       ← runtime metric overrides (TTL-aware)
└── scenarios/
    └── scenarios.yaml       ← scenarios + behavioral profiles
```

---

## How It Works: The Tick Loop

The simulator runs a continuous loop. On every tick:

```
Every N seconds (update_interval_seconds, default: 20):

  1. Reload plugin.yaml
     Hot-reload: changes take effect on the next tick without restarting.

  2. Load topology
     Discovers all instances (compute nodes, switches, storage arrays, PDUs)
     from the YAML topology files mounted into the simulator container.

  3. Load overrides (with TTL expiration)
     Reads config/plugins/simulator/overrides/overrides.yaml.
     Overrides with expires_at in the past are silently skipped.

  4. Apply incidents
     On each tick, random incidents may fire based on configured rates:
     - node_micro_failure: individual node goes down
     - rack_macro_failure: entire rack loses power
     - aisle_cooling_failure: aisle-wide temperature spike

  5. Generate metrics
     For each discovered instance, compute gauge values based on the
     active behavioral profile, any active incidents, and overrides.

  6. Expose on :9000
     All gauges are registered with the prometheus_client library and
     served at http://simulator:9000/metrics in Prometheus text format.

  7. Prometheus scrapes :9000
     The Prometheus container scrapes the simulator at its configured
     interval. The backend then queries Prometheus with PromQL exactly
     as it would against production exporters.
```

---

## Enabling Demo Mode

Demo mode requires two settings: the feature flag in `config/app.yaml` and
the plugin enabled flag in `config/plugins/simulator/config/plugin.yaml`.

**`config/app.yaml`**:

```yaml
features:
  demo: true

plugins:
  simulator:
    enabled: true
    scenario: demo-stable
```

**`config/plugins/simulator/config/plugin.yaml`** (authoritative config,
hot-reloaded every tick):

```yaml
update_interval_seconds: 20
seed: null
scenario: demo-stable
scale_factor: 1
```

Alternatively, navigate to **Settings** in the UI, find the
**Plugins — Simulator** section, and use the Enable toggle and scenario
selector. Settings changes are written back to `app.yaml` immediately.

:::tip Hot-reload
`plugin.yaml` is re-read on every simulator tick. You can edit it while
the stack is running and the change will take effect within one tick
(default: 20 seconds). No container restart is required.
:::

---

## Scenarios

A scenario is a named configuration profile stored in
`config/plugins/simulator/scenarios/scenarios.yaml`. When a scenario is
active, its values override the global defaults in `plugin.yaml` for
incident rates, behavioral profiles, seed, and scale factor.

### Available Scenarios

| Scenario | Description | Best for |
|---|---|---|
| `full-ok` | No incidents. Low temperatures and load. All nodes green. | Baseline demos, testing normal state, UI walkthroughs |
| `demo-stable` | Default. Few incidents. `scale_factor: 0.5`, `seed: 7`. | Day-to-day development and standard demos |
| `random-demo-small` | Occasional WARN/CRIT incidents. `scale_factor: 1.0`, `seed: 42`. | Reproducible failure demonstrations |
| `random-1-critical` | Periodic single-node failures only. `scale_factor: 0.05`. | Testing health state propagation in isolation |
| `random-1-rack-down` | Periodic whole-rack power outages. `scale_factor: 0.1`. | Testing rack-level aggregation and recovery |
| `random-demo-high` | Chaos mode. Frequent WARN/CRIT everywhere. `scale_factor: 1.0`, `seed: 99`. | Stress-testing the dashboard under high incident load |

### Changing the Active Scenario

**Via the Settings UI** (recommended):

Navigate to Settings → Plugins → Simulator → Scenario and select from the
dropdown. The change is saved to `app.yaml` immediately.

**Via `plugin.yaml`**:

```yaml
# config/plugins/simulator/config/plugin.yaml
scenario: random-demo-small
```

The simulator picks up the change on the next tick (within 20 seconds).

**Via `app.yaml`** (legacy):

```yaml
plugins:
  simulator:
    scenario: full-ok
```

---

## Behavioral Profiles

Behavioral profiles define the baseline characteristics of different node
types. The simulator assigns each instance to a profile based on its name
and then generates metric values by sampling from the profile's ranges.

### Profile Definitions (from `scenarios.yaml`)

| Profile | `base_temp` | `temp_range` | `base_power` | `power_var` | `load_min` | `load_max` |
|---|---|---|---|---|---|---|
| `compute` | 24 °C | ±8 °C | 200 W | ±200 W | 40 % | 80 % |
| `gpu` | 28 °C | ±25 °C | 250 W | ±500 W | 5 % | 100 % |
| `service` | 21 °C | ±3 °C | 100 W | ±20 W | 2 % | 8 % |
| `network` | 32 °C | ±4 °C | 120 W | ±10 W | 15 % | 15 % |

Profile assignment rules (evaluated in order, first match wins):

- Instance name matches `gpu*` → `gpu`
- Instance name matches `login*`, `mngt*`, `srv*`, `service*` → `service`
- Instance name matches `sw-*`, `*isw*`, `*esw*` → `network`
- Everything else → `compute`

### Per-Scenario Profile Overrides

Scenarios can redefine profile values. For example, `full-ok` lowers
temperatures and load across all profiles:

```yaml
# config/plugins/simulator/scenarios/scenarios.yaml
scenarios:
  full-ok:
    seed: 1
    scale_factor: 0.0
    profiles:
      compute:
        base_temp: 20.0
        temp_range: 4.0
        base_power: 140.0
        power_var: 40.0
        load_min: 5.0
        load_max: 20.0
```

---

## Incident Types

Incidents are random events that inject realistic failure states into the
simulation. They are controlled by `incident_rates` (probability per tick)
and `scale_factor` (global multiplier).

Setting `scale_factor: 0` disables all incidents regardless of the
individual rates.

### Node Micro-Failure

**Rate**: `node_micro_failure: 0.001` (1 in 1000 ticks, approximately once
every 5.5 hours at the default 20-second interval)

A single randomly chosen node experiences a transient failure:

- `up` set to `0`
- Temperature spikes +25 °C before going down (emulates thermal runaway)
- `node_health_status` set to `2` (CRIT)
- Power drops to 50 W (standby/BMC-only draw)
- The node recovers automatically on the next tick

### Rack Macro-Failure

**Rate**: `rack_macro_failure: 0.01` (1 in 100 ticks)
**Duration**: `incident_durations.rack: 3` ticks (60 seconds at 20-second interval)

A whole rack loses power (simulates a PDU failure or breaker trip):

- All nodes in the affected rack: `up=0`, `node_power_watts=50`
- CPU load drops to 0
- The rack recovers after `rack` ticks and all nodes come back online

### Aisle Cooling Failure

**Rate**: `aisle_cooling_failure: 0.005` (1 in 200 ticks)
**Duration**: `incident_durations.aisle: 5` ticks (100 seconds)

All nodes in a randomly chosen aisle receive a +12 °C temperature boost:

- Temperatures exceed WARN thresholds (typically 38 °C) on most nodes
- High-draw nodes (GPU) may exceed CRIT threshold (45 °C)
- After `aisle` ticks the cooling unit is considered restarted and
  temperatures return to normal
- `up` is NOT affected — nodes remain reachable

### Incident Rate Reference

```yaml
# config/plugins/simulator/config/plugin.yaml
scale_factor: 1.0        # 0.0 = no incidents, 2.0 = double rate

incident_rates:
  node_micro_failure: 0.001    # Per-tick probability (0.0–1.0)
  rack_macro_failure: 0.01
  aisle_cooling_failure: 0.005

incident_durations:
  rack: 3    # ticks (rack_macro_failure recovery)
  aisle: 5   # ticks (aisle_cooling_failure recovery)
```

---

## Metrics Catalog

### Catalog Files

**`metrics_full.yaml`** — Primary catalog for the default demo topology.
Covers all 43 metric families: node exporter, IPMI, switches, Slurm,
E-Series, Sequana3, and Raritan PDU. This is the file used by default.

**`metrics_slurm.yaml`** — Standalone Slurm catalog. Use this when you
want Slurm metrics (`slurm_node_status`) without the full E-Series and
Sequana3 families, for example on a simple air-cooled topology with no
storage arrays.

**`metrics_examples.yaml`** — Not loaded in production. Contains annotated
examples of every catalog feature: static labels, `$placeholder` variables,
`labels_only`, rack-scoped metrics, and explicit instance lists vs wildcard
patterns. Start here when writing a custom catalog.

### Catalog Entry Schema

```yaml
metrics:
  - name: metric_name          # Prometheus metric name (required)
    scope: node | rack         # Evaluation scope (required)
    instances: ["pattern"]     # fnmatch patterns — node-scoped only
    racks: ["pattern"]         # fnmatch patterns — rack-scoped only
    labels:                    # Extra label key=value pairs (optional)
      key: $placeholder        # $var resolved at generation time
      key: literal_value       # static label value
    labels_only: true          # Omit BASE_LABELS (see below)
```

### Instance and Rack Patterns

Patterns follow `fnmatch` syntax:

| Pattern | Matches |
|---|---|
| `"*"` | All instances |
| `"compute*"` | Instances starting with `compute` |
| `"*isw*"` | Instances containing `isw` (InfiniBand switches) |
| `"da*-r02-*"` | E-Series arrays in rack group r02 |
| `"compute[001-010]"` | Expanded range: compute001 through compute010 |

### BASE\_LABELS

Unless `labels_only: true` is set, the simulator automatically adds the
following topology context labels to every node-scoped metric:

```
site_id, room_id, rack_id, chassis_id, node_id, instance, job
```

These labels allow Rackscope's health checks to filter metrics by topology
position (e.g. `up{rack_id="r01-01"}`).

### labels\_only Mode

Use `labels_only: true` when the target metric must match a real exporter
format that does NOT include topology labels. The primary example is
`slurm_node_status` from `slurm_exporter`:

```yaml
- name: slurm_node_status
  scope: node
  instances: ["compute*", "visu*"]
  labels_only: true     # Only emit the labels defined below
  labels:
    node: $node_id
    partition: $partition
    status: $status
```

Real output matches the exporter exactly:
```
slurm_node_status{node="compute001",partition="compute",status="idle"} 1
```

### Available Placeholders

Placeholders in label values are resolved at metric generation time:

| Placeholder | Resolved to |
|---|---|
| `$node_id` | Instance name (e.g. `compute001`) |
| `$rack_id` | Rack identifier (e.g. `r01-01`) |
| `$status` | Inferred state (`optimal`/`degraded`/`failed` for storage; `idle`/`allocated`/`drain` for Slurm) |
| `$port` | Port number (for switch port metrics) |
| `$cpu` | CPU index |
| `$pduid` | PDU unit identifier |
| `$pduname` | PDU unit name |
| `$inletid` | PDU inlet identifier (e.g. `I1`, `I2`) |
| `$drive_id` | E-Series drive identifier |
| `$slot` | Slot number |
| `$tray` | Tray number |
| `$partition` | Slurm partition name |
| `$state` | Sequana3 HYC state string |

---

## Runtime Overrides

Overrides allow you to force specific metric values for any instance or
rack at runtime — without touching any configuration file. This is the
primary mechanism for interactive demos and failure injection during
presentations.

Overrides are persisted to
`config/plugins/simulator/overrides/overrides.yaml` and survive backend
restarts. The simulator reads this file on every tick and applies
overrides before generating the final metric values.

### TTL Rules

- `ttl_seconds: 0` — Permanent. The override stays until manually deleted
  via the API or the Settings UI.
- `ttl_seconds: 300` — Expires after 5 minutes. The simulator skips
  expired overrides without deleting the file.
- No `ttl_seconds` in the request — the backend uses `default_ttl_seconds`
  from `plugin.yaml` (default: 120 seconds).

### Common Override Examples

**Force a node down permanently**:

```bash
curl -X POST http://localhost:8000/api/simulator/overrides \
  -H "Content-Type: application/json" \
  -d '{"instance": "compute001", "metric": "up", "value": 0, "ttl_seconds": 0}'
```

**Spike temperature for 5 minutes**:

```bash
curl -X POST http://localhost:8000/api/simulator/overrides \
  -H "Content-Type: application/json" \
  -d '{"instance": "compute001", "metric": "node_temperature_celsius", "value": 92, "ttl_seconds": 300}'
```

**Set a node into WARN health state**:

```bash
curl -X POST http://localhost:8000/api/simulator/overrides \
  -H "Content-Type: application/json" \
  -d '{"instance": "compute001", "metric": "node_health_status", "value": 1, "ttl_seconds": 0}'
```

**Take down an entire rack for 2 minutes**:

```bash
curl -X POST http://localhost:8000/api/simulator/overrides \
  -H "Content-Type: application/json" \
  -d '{"rack_id": "r02-01", "metric": "rack_down", "value": 1, "ttl_seconds": 120}'
```

**List all active overrides**:

```bash
curl http://localhost:8000/api/simulator/overrides
```

**Delete a specific override** (use the `id` field from the list response):

```bash
curl -X DELETE http://localhost:8000/api/simulator/overrides/compute001-up-1770032278
```

**Clear all overrides**:

```bash
curl -X DELETE http://localhost:8000/api/simulator/overrides
```

### Overridable Metrics

The following metrics can be set via the override API:

| Metric | Valid values | Notes |
|---|---|---|
| `up` | `0` or `1` | Node reachability |
| `rack_down` | `0` or `1` | Requires `rack_id`, not `instance` |
| `node_temperature_celsius` | Any float | Degrees Celsius |
| `node_power_watts` | Any float | Watts |
| `node_load_percent` | Any float | 0–100 |
| `node_health_status` | `0`, `1`, or `2` | 0=OK, 1=WARN, 2=CRIT |

Any metric defined in the display library (`config/metrics/library/`) is
also accepted.

---

## Slurm Integration

When the Slurm plugin is enabled alongside the Simulator, the simulator
injects random Slurm node status transitions every tick to populate
the Slurm wallboard and dashboards with realistic data.

The `slurm_random_statuses` block in `scenarios.yaml` controls how many
nodes are randomly placed into each non-idle state per tick:

```yaml
# config/plugins/simulator/scenarios/scenarios.yaml
slurm_random_statuses:
  drain: 1   # 1 random node set to drain each tick
  down: 1    # 1 random node set to down each tick
  maint: 1   # 1 random node set to maint each tick

slurm_random_match:
  - compute*   # Only apply to nodes matching these patterns
  - visu*
```

These Slurm statuses are generated via `slurm_node_status` metrics with
`labels_only: true`. The Rackscope backend queries them with the standard
PromQL: `slurm_node_status{node=~"..."}` — exactly the same query used
against a real `slurm_exporter`.

---

## Custom Metrics Catalog

### When to Use a Custom Catalog

- Your topology has hardware not covered by the default catalog
  (e.g. a different storage vendor, custom health exporter)
- You want to reduce the number of generated metrics for a lighter demo
- You have a standalone topology with no E-Series or Sequana3 hardware

### Adding a Custom Catalog

1. Copy `config/plugins/simulator/metrics/metrics_examples.yaml` to a new
   file (e.g. `config/plugins/simulator/metrics/my_metrics.yaml`).

2. Define your metrics using the schema described in the Metrics Catalog
   section above. Use `metrics_examples.yaml` as a reference for all
   supported patterns.

3. Add the new catalog to `plugin.yaml`:

```yaml
# config/plugins/simulator/config/plugin.yaml
metrics_catalog_path: config/plugins/simulator/metrics/metrics_full.yaml

metrics_catalogs:
  - id: my_hardware
    path: config/plugins/simulator/metrics/my_metrics.yaml
    enabled: true
```

Additional catalogs are merged on top of the primary. When two catalogs
define an entry with the same `name`, the later entry (higher in the list)
takes precedence.

4. The change takes effect on the next simulator tick — no restart needed.

### Replacing the Primary Catalog

For a minimal deployment (e.g. Slurm-only demo without any storage metrics):

```yaml
# config/plugins/simulator/config/plugin.yaml
metrics_catalog_path: config/plugins/simulator/metrics/metrics_slurm.yaml
metrics_catalogs: []
```

---

## Discovering Available Metrics

To list all metrics that the display library can render (used by the
Settings UI override form):

```bash
curl http://localhost:8000/api/simulator/metrics
```

To see raw Prometheus output from the simulator directly:

```bash
curl http://localhost:9000/metrics
```

To check whether the simulator is running and what scenario is active:

```bash
curl http://localhost:8000/api/simulator/status
```
