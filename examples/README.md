# Rackscope — Example Configurations

Ready-to-use configurations to explore Rackscope with realistic topologies.
Each example works out-of-the-box with the built-in simulator.

## Available examples

| Example | Description | Nodes | Sites | Rooms |
|---|---|---|---|---|
| [`simple-room/`](simple-room/) | Single room, 4 racks, minimal setup | ~10 | 1 | 1 |
| [`full-datacenter/`](full-datacenter/) | Two sites, four rooms, mixed compute/GPU/storage | ~50 | 2 | 4 |
| [`hpc-cluster/`](hpc-cluster/) | Real HPC cluster (Bullsequana X hardware) | ~80+ | 2 | 2 |

## Quick start

```bash
# Switch to an example and restart
./scripts/use-example.sh simple-room

# Or manually:
cp -r examples/simple-room/* config/
make restart
```

The script backs up your current `config/` to `config.bak/` before switching.

## Restore your config

```bash
cp -r config.bak/* config/
make restart
```

---

## What each example contains

### `simple-room/`

The minimal starting point. Good for first-time setup or local testing.

```
my-lab
└── server-room
    ├── rack-01  — 4 × 1U compute servers (server001–004)
    ├── rack-02  — 4 × 1U compute servers (server005–008)
    ├── rack-03  — 1U TOR switch + 2U storage
    └── rack-04  — management + login nodes
```

- Templates: `simple-1u-server`, `simple-1u-switch`, `simple-2u-storage`
- Checks: `node_up`, `switch_up`
- Simulator: `incident_mode: light`

### `full-datacenter/`

A realistic two-site datacenter with multiple room types, compute aisles,
GPU racks, storage, network, and management infrastructure.

```
dc-paris (Paris, 48°N 2°E)
├── machine-room-a  — 3 aisles: compute, GPU+compute, infra
│   ├── aisle-compute    — 4 compute racks (twin + quad chassis)
│   ├── aisle-infra      — network + storage racks
└── machine-room-b  — admin, backup, monitoring

dc-lyon (Lyon, 46°N 5°E)
└── machine-room-dr — disaster recovery (3 racks)
```

- Templates: 1U server, 2U twin (2 nodes), 2U quad (4 nodes), 4U GPU (2 nodes),
  TOR switch, core switch, 2U JBOD, PDU rack component
- Rack template: `standard-42u-air` with left/right PDUs
- Checks: `node_up`, IPMI (temp/power), `switch_up`, switch ports, PDU load/current
- Slurm node mapping included (disabled by default)
- World Map enabled (lat/lon on both sites)

### `hpc-cluster/`

Production-grade HPC cluster config. **Will be anonymized before public release.**
Based on Bullsequana X hardware from Bull/Atos.

---

## Adding your own example

1. Create a directory under `examples/your-name/`
2. Follow the same structure as `simple-room/` or `full-datacenter/`
3. Include an `app.yaml` with paths pointing to relative directories
4. Add a `README.md` describing the scenario

See the [Topology YAML reference](../website/docs/admin-guide/topology-yaml.md) for the full schema.
