---
id: examples
title: Example Configurations
sidebar_position: 5
---

# Example Configurations

Rackscope ships with four ready-to-use configurations that work immediately with the built-in simulator. Each example is self-contained under `config/examples/` and activated with a single command.

## Available examples

| Example | Nodes | Racks | Sites | Slurm | Use case |
|---|---|---|---|---|---|
| [`homelab`](#homelab) | ~23 | 3 | 1 | ✗ | Local lab, first discovery |
| [`small-cluster`](#small-cluster) | ~600 | 12 | 1 | ✅ | University, SME, small HPC |
| [`hpc-cluster`](#hpc-cluster) | ~1 900 | 25 | 1 | ✅ | Production HPC cluster |
| [`exascale`](#exascale) | ~14 000 | 241 | 3 | ✅ | Large-scale datacenter |

---

## Quick switch

```bash
# Switch to an example (backs up current config/app.yaml)
./scripts/use-example.sh homelab
./scripts/use-example.sh small-cluster
./scripts/use-example.sh hpc-cluster
./scripts/use-example.sh exascale

# Restore previous config
cp config/app.yaml.bak config/app.yaml && make restart
```

The script copies `config/app.example.{name}.yaml` to `config/app.yaml` and restarts the backend and simulator. The `config/` directory itself is **never deleted** — this preserves the Docker bind mount.

---

## `homelab` {#homelab}

The minimal starting point. Good for first-time setup, local testing, or development.

```
my-lab
└── server-room
    └── main-aisle
        ├── rack-01  — 8 × 1U compute servers (compute001–008)
        ├── rack-02  — 8 × 1U compute servers (compute009–016)
        └── rack-03  — management + network rack
```

- **~23 nodes** — compute, mgmt, login, storage-head, switches
- **Rack type**: `rack-42u-air` (PDU ×2, FAN module, PSU module at rear)
- **No Slurm** — standalone compute, no workload manager
- **Simulator**: `incident_mode: light`
- **Checks**: node_up, temperature (°C), power (W), PDU load, fan state

---

## `small-cluster` {#small-cluster}

A realistic small HPC cluster — university scale or departmental computing.

```
dc-main
└── machine-room (1 room)
    ├── aisle-compute — 6 racks air (2U quad-chassis, 4 nodes each)
    ├── aisle-gpu     — 2 racks DCW (4U GPU chassis, 4 nodes each)
    └── aisle-infra   — login/visu/mgmt + storage + network
```

- **~600 nodes** — compute, GPU, login, visu, mgmt, storage, switches
- **Rack types**: `rack-42u-air` (infra) + `rack-42u-dcw` (GPU — PMC + 2×HMC)
- **Slurm**: enabled · partitions: `cpu`, `gpu`
- **Simulator**: `incident_mode: medium`
- **Checks**: + IB port state, switch port errors, PDU current

---

## `hpc-cluster` {#hpc-cluster}

A production-grade HPC cluster with water-cooled compute aisles.

```
dc-paris (1 site)
├── machine-room-a (Compute Floor)
│   ├── aisle-compute-std  — 10 racks DCW (1U 3-node chassis)
│   ├── aisle-compute-hm   — 5 racks DCW (1U 2-node high-memory)
│   ├── aisle-gpu          — 5 racks DCW (4U quad-GPU chassis)
│   └── aisle-storage      — storage + network racks (air)
└── machine-room-b (Services)
    └── aisle-services     — login, visu, mgmt
```

| Category | Racks | Nodes |
|---|---|---|
| Standard compute (1U 3-node DCW) | 10 | ~400 |
| High-memory (1U 2-node DCW) | 5 | ~200 |
| GPU (4U quad DCW) | 5 | ~200 |
| Services + storage | 5 | ~60 |

- **Rack types**: DCW dominant (`rack-42u-dcw` with PMC + 2×HMC)
- **Slurm**: enabled · partitions: `cpu`, `gpu`, `hm`, `visu`
- **Simulator**: `incident_mode: medium`
- **Checks**: + HMC temperature/flow/leak, PMC power

---

## `exascale` {#exascale}

A large-scale datacenter across three sites — Paris, Toulouse, Berlin.

```
site-paris (Paris, 48°N 2°E)       site-toulouse (Toulouse, 44°N 1°E)
├── room-compute-a (4 aisles)       ├── room-compute-a (3 aisles)
├── room-compute-b (2 aisles)       ├── room-gpu-hm (2 aisles)
├── room-gpu-hm (2 aisles)          └── room-infra (services+network)
└── room-infra (services+network)
                                    site-berlin (Berlin, 52°N 13°E)
                                    ├── room-compute-a (2 aisles)
                                    └── room-infra (services)
```

| Category | Total nodes |
|---|---|
| Compute (1U 3-node DCW) | ~4 000 |
| GPU (4U quad DCW) | ~800 |
| High-memory (1U 2-node DCW) | ~520 |
| Services (login, visu, mgmt) | ~150 |
| **Total** | **~14 000** |

- **World Map**: lat/lon on all 3 sites
- **Slurm**: enabled · partitions: `cpu`, `gpu`, `hm`, `visu`, `bigmem`, `transfer`
- **Simulator**: `incident_mode: heavy`
- **Note**: the planner needs ~30s after startup to process all nodes

:::tip Performance
With 14 000 nodes, the exascale example requires `max_ids_per_query: 300` (default) and a few extra seconds for the initial planner snapshot. All racks will be green once the first full cycle completes.
:::

---

## Rack types

Both rack templates include IB + ETH switches in each rack slot.

| Template | Cooling | Rear components |
|---|---|---|
| `rack-42u-air` | Air | PDU ×2 (sides) + FAN module + PSU module |
| `rack-42u-dcw` | Direct water | PDU ×2 (sides) + PMC power module + HMC module ×2 |

---

## Config structure

Each example is self-contained:

```
config/examples/{name}/
├── topology/            ← sites, rooms, aisles, racks, devices
├── templates/           ← device + rack + rack_component templates
├── checks/library/      ← PromQL health checks
├── metrics/library/     ← metric definitions (temp, power, PDU…)
└── plugins/
    ├── simulator/config/plugin.yaml  ← incident mode, catalogs
    └── slurm/config.yml              ← Slurm labels, status map
```

The corresponding `config/app.example.{name}.yaml` points all paths to `config/examples/{name}/`.

---

## Non-regression tests

A complete test suite validates all examples:

```bash
# Run full suite (~25 min)
python3 scripts/validate_examples.py all

# Run single example
python3 scripts/validate_examples.py hpc-cluster
```

Each example runs 2 loops:
1. **Normal mode** — baseline validation (topology, metrics, rack states)
2. **Incident mode** — injects 10 CRIT + 10 WARN + 1 rack CRIT to validate the check engine

See [`config/examples/TEST_PLAN.md`](https://github.com/SckyzO/rackscope/blob/main/config/examples/TEST_PLAN.md) for the full test specification.
