# Rackscope — Example Test Plan

## Overview

This document describes the non-regression test suite for the 4 bundled examples.
The suite validates that each example is correctly configured, loads without errors,
generates expected metrics in the simulator, and responds correctly to incident injection.

**Run the full suite:**
```bash
python3 scripts/validate_examples.py all
```

**Run a single example:**
```bash
python3 scripts/validate_examples.py hpc-cluster
```

---

## Test Structure

Each example runs **2 validation loops**:

| Loop | Mode | Purpose |
|---|---|---|
| Loop 1 | Normal (light/medium/heavy) | Baseline validation — topology loads, metrics flow, no UNKNOWN racks |
| Loop 2 | Custom (10 CRIT + 10 WARN + 1 rack CRIT) | Incident injection — validates check engine and alert aggregation |

Exception: `homelab` runs Loop 2 in normal mode (no Slurm, simpler config).

---

## Pre-conditions

Before each example:
1. **Lint** — ruff check + ruff format + eslint + prettier (all must pass)
2. **Config switch** — `cp app.example.{ex}.yaml config/app.yaml`
3. **Restart** — backend + simulator containers restarted
4. **Wait** — simulator generates expected node count before assertions

---

## Test Cases per Example

### TC-01 — Backend topology loaded
- **Assert**: `GET /api/stats/global` returns expected room count
- **Assert**: rack count >= expected minimum
- **Expected**: homelab=1r/3rk | small=1r/10rk | hpc=2r/25rk | exascale=9r/200rk

### TC-02 — Simulator node count
- **Assert**: `count(up{job="node"})` in Prometheus >= expected minimum
- **Assert**: count <= expected maximum
- **Expected**: homelab≥20 | small≥500 | hpc≥1800 | exascale≥13000

### TC-03 — Temperature metrics
- **Assert**: `count(node_temperature_celsius)` >= expected
- **Validates**: node temperature metric generated for all compute nodes
- **Expected**: same as TC-02 (all compute nodes have temperature)

### TC-04 — Power metrics
- **Assert**: `count(node_power_watts)` >= expected
- **Validates**: node power metric generated for all compute nodes
- **Expected**: same as TC-02

### TC-05 — PDU metrics
- **Assert**: `count(raritan_pdu_activepower_watt{inletid="I1"})` >= 1
- **Validates**: rack-level PDU power generated
- **Expected**: homelab≥1 | small≥10 | hpc≥25 | exascale≥100

### TC-06 — No UNKNOWN racks
- **Assert**: count of UNKNOWN racks == 0
- **Validates**: all devices have check data, no broken template/check bindings
- **Critical**: UNKNOWN racks indicate misconfiguration

### TC-07 — Slurm plugin
- **Assert** (non-homelab): `GET /api/slurm/summary` returns valid JSON (not 404)
- **Assert** (homelab): returns 404 (disabled)
- **Validates**: Slurm plugin correctly enabled/disabled per example

### TC-08 — Incident injection (Loop 2 only, non-homelab)
**Setup**: `incident_mode: custom, devices_crit=10, devices_warn=10, racks_crit=1`

- **Assert**: `count(up{job="node"} == 0)` between 7 and 13 (tolerance ±3)
- **Validates**: TelemetryPlanner detects down nodes as CRIT

- **Assert**: CRIT alerts in `GET /api/alerts/active` >= 8
- **Validates**: Alert aggregation propagates node CRIT to API

- **Assert**: at least 1 rack shows CRIT state (from `racks_crit=1`)
- **Validates**: rack-level incident injection (all nodes in 1 rack forced down)

---

## Expected Node Counts

| Example | Compute | GPU | HM | Login | Visu | Mgmt | Storage | Switches | Total sim |
|---|---|---|---|---|---|---|---|---|---|
| homelab | 16 | 0 | 0 | 1 | 0 | 2+1 | 1 | 3 | ~23 |
| small-cluster | ~120 | ~32 | 0 | 4 | 4 | 4 | 16+ | ~15 | ~600 |
| hpc-cluster | ~400 | ~200 | ~200 | 6 | 6 | 8+ | 30+ | ~25 | ~1900 |
| exascale | ~4000 | ~800 | ~520 | 24 | 12 | 18 | 51+ | ~80 | ~14000 |

---

## Check Assertions (per-check validation)

| Check ID | Expression | for: | Loop 1 expected | Loop 2 expected |
|---|---|---|---|---|
| node_up | `up{...} == 0` | 30s | 0 firing | ~10 firing |
| node_temp_warn | `node_temperature_celsius > 75` | 5m | 0 normally | depends on incident |
| ipmi_temp_state | `ipmi_temperature_state > 0` | 3m | 0-3 | ~3 |
| node_power_warn | `node_power_watts > 500` | 5m | 0 normally | 0 |
| ipmi_fan_state | `ipmi_fan_speed_state > 0` | 3m | 0-3 | ~3 |
| pdu_load_warn | rack PDU > 5000W | 5m | 0 normally | 0 |
| switch_up | `up{...} == 0` for switches | 30s | 0 | 0 |

---

## Output

Results are written to `config/examples/TEST_RESULTS.md` after each run.

---

## Failure investigation

| Symptom | Likely cause |
|---|---|
| TC-02 fails (too few nodes) | Simulator not ready — increase wait time |
| TC-06 fails (UNKNOWN racks) | Template `checks:` list references wrong IDs |
| TC-07 fails (Slurm) | `plugins.slurm.enabled` not set in app.yaml |
| TC-08 fails (no CRIT) | Planner cache TTL too long — wait longer |
| Lint fails | Run `make lint` and fix before running tests |
