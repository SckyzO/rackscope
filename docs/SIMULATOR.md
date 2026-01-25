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

## Overrides TTL

`simulator.default_ttl_seconds` sets the default TTL (seconds) for overrides when
the UI leaves TTL empty. Use `0` for no expiry.

## Labels and instance mapping

The simulator emits `node_id` on metrics to let Prometheus relabel `instance`
consistently (including the `up` series).

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
