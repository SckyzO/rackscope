# Examples — Validation Table

> Last updated: 2026-03-09

## Backend + Simulator validation results

| Example | Rooms | Racks | Sim nodes | ✅ OK | 🔴 CRIT | ⬜ UNKNOWN | Slurm | Checks |
|---|---|---|---|---|---|---|---|---|
| homelab | 1 | 3 | 23 | 1 | 2 | 0 | ✗ disabled | 13 |
| small-cluster | 1 | 11 | 573 | 8 | 3 | 0 | ✅ | 13 |
| hpc-cluster | 2 | 25 | 1 841 | 22 | 3 | 0 | ✅ | 19 |
| exascale | 9 | 241 | 13 953 | 233 | 8 | 0 | ✅ | 19 |

CRIT count = expected simulator incidents (light/medium/heavy mode).
UNKNOWN = 0 on all examples ✅

## Notes
- Exascale requires ~30s for the planner to process all 13 953 nodes before racks turn green
- Simulator topology path is now read from app.yaml `paths.topology` (fixed in loop.py)

## Activation

```bash
./scripts/use-example.sh homelab
./scripts/use-example.sh small-cluster
./scripts/use-example.sh hpc-cluster
./scripts/use-example.sh exascale
```

## Rack Component Templates

| Template | Type | Rack type | Checks |
|---|---|---|---|
| pdu-1phase | pdu | both | pdu_load_warn/crit, pdu_current_warn |
| fan-module | cooling | air only | fan_speed_warn |
| psu-module | pdu | air only | psu_status |
| pmc-module | pdu | DCW only | pmc_power_warn/crit |
| hmc-module | cooling | DCW only | hmc_temp_warn/crit, hmc_flow_warn, hmc_leak |

## Device Templates (16)

| Template | U | Nodes | Role | Cooling |
|---|---|---|---|---|
| generic-1u-server | 1 | 1 | compute | air |
| generic-2u-twin | 2 | 2 | compute | air |
| generic-2u-quad | 2 | 4 | compute | air |
| hpc-1u-3node | 1 | 3 | compute | DCW |
| hpc-1u-2node-hm | 1 | 2 | highmem | DCW |
| hpc-4u-quad-gpu | 4 | 4 | gpu | DCW |
| generic-1u-login | 1 | 1 | login | air |
| generic-2u-visu | 2 | 1 | visu | air |
| generic-1u-mgmt | 1 | 1 | management | air |
| generic-tor-eth-1u | 1 | — | switch | air |
| generic-core-eth-2u | 2 | — | switch | air |
| generic-ib-switch-1u | 1 | — | switch | air |
| generic-ib-switch-2u | 2 | — | switch | air |
| generic-mgmt-switch-1u | 1 | — | switch | air |
| generic-1u-storage-head | 1 | 1 | storage | air |
| generic-2u-jbod | 2 | — | storage | air |

## TODO — remaining
- [ ] Phase 11: Documentation update (examples.md, simulator.md, deployment.md)
- [ ] Screenshots for each example
- [ ] hpc-cluster anonymisation (Bullsequana → generic)
