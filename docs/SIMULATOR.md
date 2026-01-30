# Simulator

The simulator generates Prometheus metrics for demo and testing. It is driven by topology
and a configurable simulator section in `config/app.yaml`.

## Enable Demo Mode

In `config/app.yaml`:

```yaml
features:
  demo: true

simulator:
  update_interval_seconds: 20
  seed: 42
  scenario: demo-small
  scale_factor: 1.0
  incident_rates:
    node_micro_failure: 0.001
    rack_macro_failure: 0.01
    aisle_cooling_failure: 0.005
  incident_durations:
    rack: 3
    aisle: 5
  overrides_path: config/simulator_overrides.yaml
  default_ttl_seconds: 0
  metrics_catalog_path: config/simulator_metrics_full.yaml
  metrics_catalogs:
    - id: core
      path: config/simulator_metrics_full.yaml
      enabled: true
    - id: slurm
      path: config/simulator_metrics_slurm.yaml
      enabled: false
```

## Scenarios

Scenarios live in `config/simulator.yaml` and override simulator settings. You can
select a scenario via `simulator.scenario` in `app.yaml`. When a scenario is set,
the base `incident_rates` are not inherited unless the scenario explicitly defines
them.
Scenarios can include an optional `description` field used by the UI.

Each scenario can override:
- `update_interval_seconds`
- `seed`
- `scale_factor`
- `incident_rates`
- `incident_durations`
- `profiles`

Incident rates are probabilistic and apply per target (node/rack/aisle) on each
simulation tick. Warning states are mostly driven by cooling incidents (aisle),
and critical states are typically driven by node micro-failures or rack-down events.
Tune `scale_factor` to match your topology size.

Example scenario:

```yaml
scenarios:
  random-demo-small:
    seed: 42
    scale_factor: 1.0
    incident_rates:
      node_micro_failure: 0.001
      rack_macro_failure: 0.0
      aisle_cooling_failure: 0.004
```

The built-in `full-ok` scenario also overrides profiles to keep temperatures under
warning thresholds.

## Metrics Catalog

`simulator.metrics_catalog_path` points to a YAML file that defines which metrics
are emitted and for which instances/racks. You can also enable multiple catalogs
with `simulator.metrics_catalogs` (each entry can be toggled on/off).

Example (`config/simulator_metrics_examples.yaml`):

```yaml
metrics:
  - name: ipmi_temperature_state
    scope: node
    instances:
      - compute[001-010]
      - switch001
    labels:
      job: node

  - name: eseries_storage_system_status
    scope: node
    instances:
      - storage[001-002]

  - name: sequana3_hyc_p_in_kpa
    scope: rack
    racks:
      - r01-01
    labels:
      cluster: demo
      env: demo
      mc_type: xh3000
      model: xh3000
      region: demo
      sequana_type: liquid

  - name: sequana3_hyc_state_info
    scope: rack
    racks:
      - r01-01
    labels:
      cluster: demo
      env: demo
      host: demo
      mc_type: xh3000
      model: xh3000
      region: demo
      sequana_type: liquid
```

Notes:
- `instances` and `racks` accept ranges like `compute[001-700]` and wildcards like `compute*`.
- `labels` can override default labels for a metric (only use labels supported by that metric).
  - Tokens: `$site_id`, `$room_id`, `$rack_id`, `$chassis_id`, `$node_id`, `$instance`, `$job`,
    plus metric-specific tokens like `$status`, `$tray`, `$slot`, `$collector`, `$state`, `$name`.
- `labels_only: true` removes the default base labels (useful for Slurm exporters).

Full catalog: `config/simulator_metrics_full.yaml`.
Slurm catalog: `config/simulator_metrics_slurm.yaml`.

## Slurm Random Statuses

To force a few nodes into Slurm states for demo:

```yaml
slurm_random_statuses:
  drain: 1
  down: 1
  maint: 1
slurm_random_match:
  - compute*
  - visu*
```

`slurm_random_match` restricts which nodes can be selected (use wildcards).

These random statuses are applied on each simulator tick, so the selected
states remain active until you change the configuration.

## Adding a new metric

1) Add the metric to your catalog YAML (`config/simulator_metrics_full.yaml`).
2) Implement its value generation in `tools/simulator/main.py`:
   - add the metric name to `SUPPORTED_METRICS`
   - emit its values in the simulation loop (with `set_metric_value`)

This keeps the metric list declarative while making value generation explicit.

## Overrides TTL

`simulator.default_ttl_seconds` sets the default TTL (seconds) for overrides when
the UI leaves TTL empty. Use `0` for no expiry. The UI now forces TTL to `0`
when you add an override or select a scenario (so overrides persist).

## Labels and instance mapping

The simulator uses `instance = node_id` for node metrics by default (including `up`).
You can relabel further in Prometheus if needed.

## Live Overrides

Overrides apply on the next scrape. Use the Settings UI (Demo mode) or the API:

- `GET /api/simulator/overrides`
- `POST /api/simulator/overrides`
- `DELETE /api/simulator/overrides/{id}`

Example payload:

```json
{
  "instance": "compute001",
  "metric": "up",
  "value": 0,
  "ttl_seconds": 120
}
```

Supported metrics:
- `up`
- `node_temperature_celsius`
- `node_power_watts`
- `node_load_percent`
- `node_health_status`
- `rack_down` (use with `rack_id`)

## Files

- `config/app.yaml` (simulator configuration)
- `config/simulator.yaml` (legacy config, still supported)
- `config/simulator_overrides.yaml` (runtime overrides)
- `config/slurm_mapping.yaml` (optional Slurm node → instance mapping)
