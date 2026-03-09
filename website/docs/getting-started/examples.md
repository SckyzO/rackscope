---
id: examples
title: Example Configurations
sidebar_position: 5
---

# Example Configurations

Rackscope ships with ready-to-use example configurations that work immediately with the built-in simulator. Each example is a complete, standalone config directory — no real hardware or Prometheus required.

## Available examples

| Example | Nodes | Sites | Rooms | Best for |
|---|---|---|---|---|
| [`simple-room`](#simple-room) | ~10 | 1 | 1 | First-time setup, local lab |
| [`full-datacenter`](#full-datacenter) | **855** | 2 | 3 | Production-like HPC demo |
| [`hpc-cluster`](#hpc-cluster) | 80+ | 2 | 2 | Real HPC hardware templates (Bullsequana) |

---

## Quick switch

The `use-example.sh` script backs up your current `config/` and loads the selected example:

```bash
# Switch to an example (backs up current config/ to config.bak/)
./scripts/use-example.sh simple-room
./scripts/use-example.sh full-datacenter

# Restore your previous config
cp -r config.bak/* config/
make restart
```

The script restarts the backend and simulator automatically.

:::caution Docker bind mount
The script replaces the **contents** of `config/` but preserves the directory itself. Do not use `rm -rf config && cp ...` — this breaks the Docker bind mount under WSL2.
:::

---

## `simple-room` {#simple-room}

The minimal starting point. Good for first-time setup or local testing.

```
my-lab
└── server-room
    └── main-aisle
        ├── rack-01  — 4 × 1U compute servers (server001–004)
        ├── rack-02  — 4 × 1U compute servers (server005–008)
        ├── rack-03  — 1U network switch
        └── rack-04  — management + login nodes
```

- **~10 nodes** total
- Templates: `simple-1u-server`, `simple-1u-switch`
- Checks: `node_up`, `switch_up`
- Simulator: `incident_mode: custom`, 1 CRIT + 2 WARN by default

```bash
./scripts/use-example.sh simple-room
```

---

## `full-datacenter` {#full-datacenter}

A production-representative HPC datacenter with 855 nodes across 22 racks.

```
dc-paris (Paris, 48°N 2°E)           dc-lyon (Lyon DR site)
├── machine-room-a (Compute Floor)    └── machine-room-dr
│   ├── aisle-compute-std                 └── aisle-dr (80 nodes)
│   │   └── 6 racks × 80 nodes
│   ├── aisle-compute-hm
│   │   └── 4 racks × 40 nodes
│   ├── aisle-gpu
│   │   └── 3 racks × 32 GPU nodes
│   └── aisle-storage (servers + network)
└── machine-room-b (Services)
    └── login, visualization, admin nodes
```

| Category | Racks | Nodes |
|---|---|---|
| Standard compute (2U quad, 4 nodes) | 6 | 480 |
| High-memory (2U twin, 2 nodes) | 4 | 160 |
| GPU (4U quad-GPU, 4 nodes) | 3 | 96 |
| DR compute | 2 | 80 |
| Services | 3 | ~11 |

- World Map enabled (lat/lon on both sites)
- Slurm node mapping included
- Checks: `node_up`, IPMI (temp/power), `switch_up`, PDU load/current

```bash
./scripts/use-example.sh full-datacenter
```

---

## `hpc-cluster` {#hpc-cluster}

A real HPC cluster configuration based on Bull/Atos Bullsequana X hardware. Contains vendor-specific device templates (XH3150, XH3406, X440, etc.) and a full check library for IPMI, InfiniBand, E-Series storage, and liquid cooling (Sequana3).

:::note
This example will be anonymized before the public release. It is intended as a reference for Bullsequana X deployments.
:::

---

## Example structure

Each example is self-contained under `examples/{name}/`:

```
examples/simple-room/
├── app.yaml                    ← only 'enabled' flags for plugins
├── topology/                   ← sites.yaml + per-room/aisle/rack files
├── templates/
│   ├── devices/
│   ├── racks/
│   └── rack_components/
├── checks/library/
└── plugins/
    └── simulator/
        └── config/plugin.yaml  ← incident mode, profiles, etc.
```

:::tip app.yaml convention
`app.yaml` should only carry `enabled: true/false` for each plugin. All simulator behaviour (incident mode, changes per hour, profiles) lives in `config/plugins/simulator/config/plugin.yaml`. This prevents Settings UI saves from accidentally overriding manual config changes.
:::

---

## Adding your own example

1. Create a directory under `examples/your-name/`
2. Follow the same structure as `simple-room`
3. Include an `app.yaml` with paths pointing to `config/…` (relative to the backend workdir)
4. Add a `README.md` describing the scenario

See the [Topology YAML reference](/admin-guide/topology-yaml) for the full schema.
