# Example: HPC Cluster (Bullsequana)

A realistic HPC cluster configuration based on Bull/Atos Bullsequana X hardware.

## Topology

```
Site dc1 (Paris, lat/lon)
└── Room room-a (Machine Room A, 4×8 grid, North orientation)
    ├── Aisle aisle-01  — 7 racks of compute (twin/quad chassis)
    ├── Aisle aisle-02  — 4 racks of compute + GPU
    └── Aisle aisle-03  — 2 racks of storage + network

Site dc2 (Lyon, lat/lon)
└── Room room-b (standalone racks)
```

## Hardware templates

| Template | Type | Description |
|---|---|---|
| `bs-x440-compute-2u-4n` | server | Bullsequana X440 — 2U chassis, 4 compute nodes |
| `bs-x440-compute-2u-2n` | server | Bullsequana X440 — 2U chassis, 2 compute nodes |
| `bs-xh3150-tino-1u-3n` | server | Bullsequana XH3150 Tino — 1U, 3 nodes |
| `bs-4u-quad-gpu` | server | 4U chassis with 4 GPU nodes |
| `storage-4u-60disk` | storage | 4U 60-disk JBOD |
| `ib-switch-l1` | switch | InfiniBand L1 leaf switch |
| `eth-switch-tor` | switch | Ethernet Top-of-Rack switch |

## Checks included

- `up.yaml` — node_up (Prometheus `up` metric)
- `ipmi.yaml` — IPMI temperature, power, fan, voltage
- `ib.yaml` — InfiniBand port status
- `switch.yaml` — Ethernet switch port status
- `eseries.yaml` — E-Series storage system health
- `pdu.yaml` — PDU load and current
- `sequana3.yaml` — Sequana liquid cooling (temp, pressure, leak)

## Usage

```bash
cp -r examples/hpc-cluster/* config/
make up
```
