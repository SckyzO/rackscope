# CHECKS_LIBRARY.md (Private) — v0.2
This file defines the built-in monitoring checks library used by templates.

## File layout
- `config/checks/library/` contains one YAML file per family (ipmi, eseries, sequana3, up, etc.).
- The loader reads all `*.yaml`/`*.yml` files in that folder.

## Goals
- Provide standard checks per kind (compute, switch, pdu, cooling, services)
- Keep checks cheap to evaluate (avoid PromQL explosion)
- Prefer recording rules when available
- Support scopes: node, chassis, rack

## Core state model
- OK / WARN / CRIT / UNKNOWN
- Highest severity wins
- No data -> UNKNOWN

## Check definition (concept)
Each check has:
- id, name, scope (node|chassis|rack)
- kind (server|switch|storage|pdu|cooling) — for UI grouping
- expr (PromQL, vector-friendly)
- selectors (labels expected, resolved from topology)
- rules (operator/value -> severity)
- output (bool or numeric)
- expand_by_label (optional) — label name to expand into virtual nodes (e.g. "slot" for per-drive checks)

### expand_by_label — Virtual Nodes

When a check defines `expand_by_label: "slot"`, the planner performs a discovery pre-pass:
1. Queries Prometheus for all unique values of the label
2. Creates virtual instance keys: `{instance}.{label_value}` (e.g. `da01-r02-01.3`)
3. Evaluates health per virtual node independently
4. Propagates to parent: if ≥1 virtual node is CRIT, parent instance is CRIT

This is used for storage arrays (per-disk health), switches (per-port), chassis (per-fan).
See `config/checks/library/eseries.yaml` for a real example.

## YAML format (v0.1)
Each file under `config/checks/library/` must contain a top-level `checks:` list.

Planner integration:
- `$instances`, `$racks`, `$chassis` placeholders are replaced by the planner.
- `$jobs` placeholder can be used for job label filtering (config-driven).
- The planner groups by scope labels from `config/app.yaml`:
  - `identity_label` (default: instance)
  - `rack_label` (default: rack_id)
  - `chassis_label` (default: chassis_id)
- UNKNOWN is applied when no series is returned for an expected scope.

Example:
```
- id: node_up
  scope: node
  expr: up{job="node", instance=~"$instances"}
  output: bool
  rules:
    - op: "=="
      value: 0
      severity: CRIT
```

## Library structure (conceptual)
- kinds:
  - compute:
    - node_up
    - temp_warn
    - temp_crit
  - switch_eth:
    - exporter_up
    - port_down_optional
  - switch_ib:
    - exporter_up
    - link_state_degraded_optional
  - pdu:
    - power_feed_alarm
    - overload_optional
  - cooling_door / hydraulics:
    - water_temp_alarm
    - water_pressure_alarm
  - services:
    - service_up
    - latency_budget_optional

## Overrides
- enable/disable per template or instance
- thresholds and severity override within bounded rules
- silence per check (time window)
- custom checks allowed, but must declare:
  - required labels
  - expected output type (bool/vector)
