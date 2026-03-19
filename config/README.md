# Example: Full Datacenter (Generic HPC)

A realistic generic HPC datacenter — vendor-agnostic, works with the simulator.

## Scale

| Category | Count |
|---|---|
| Total nodes | **827** |
| Compute (quad chassis) | 480 (compute001–480) |
| High-memory (twin chassis) | 160 (hm001–160) |
| GPU nodes (4U quad-GPU) | 96 (gpu001–096) |
| DR compute | 80 (dr-compute001–080) |
| Service (login/visu/mgmt) | 11 |

## Topology

```
dc-paris (Paris, 48°N 2°E)           dc-lyon (Lyon, 46°N 5°E)
├── machine-room-a (Compute Floor)    └── machine-room-dr
│   ├── aisle-compute-std                 └── aisle-dr
│   │   └── 6 racks × 80 nodes                └── rack-dr01, rack-dr02
│   ├── aisle-compute-hm                        (2U twin, 40 nodes each)
│   │   └── 4 racks × 40 nodes
│   ├── aisle-gpu
│   │   └── 3 racks × 32 GPU nodes
│   └── aisle-storage
│       ├── rack-sto01, rack-sto02
│       └── rack-net01, rack-net02
└── machine-room-b (Services)
    └── aisle-services
        ├── rack-login  (login01–04)
        ├── rack-visu   (visu01–04)
        └── rack-admin  (mgmt01–02, monitoring01)
```

## Templates

| Template | Type | Nodes/unit |
|---|---|---|
| `generic-1u-server` | server | 1 |
| `generic-2u-twin` | server | 2 (1U×2 side-by-side) |
| `generic-2u-quad` | server | 4 (2×2 grid) |
| `generic-4u-quad-gpu` | server | 4 GPU nodes (2×2 grid) |
| `generic-tor-switch-1u` | switch | — |
| `generic-core-switch-2u` | switch | — |
| `generic-ib-switch-1u` | switch | — |
| `generic-2u-jbod` | storage | — |
| `standard-42u-air` | rack | — (with left+right PDUs) |
| `generic-pdu-1phase` | rack_component | — |

## Checks

- `node_up` — Prometheus `up` metric
- `ipmi_temp_warn / crit` — IPMI temperature (node exporter)
- `ipmi_power_state` — IPMI power consumption threshold
- `switch_up` — switch availability
- `switch_port_err` — switch port error rate
- `pdu_load_warn / crit` — PDU total load (rack component check)
- `pdu_current_warn` — PDU outlet current (rack component check)
- `storage_up` — storage node availability

## Slurm integration

`plugins/slurm/node_mapping.yaml` maps Slurm node names (c001–c480, hm001, g001, dr001)
to topology instance names. Enable in `app.yaml` with `plugins.slurm.enabled: true`.

## Usage

```bash
./scripts/use-example.sh full-datacenter
# → backs up config/, loads this example, restarts backend + simulator
```
