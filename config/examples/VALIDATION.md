# Examples — Validation Table

> Last updated: 2026-03-09 — All 4 examples validated

## Final validation results

| Example | up nodes | temp (°C) | power (W) | ipmi_temp | ipmi_fan | PDU (L1) | Slurm | for: |
|---|---|---|---|---|---|---|---|---|
| homelab | 23 | 23 | 23 | 16 | 16 | 6 | ✗ | ✅ in memory |
| small-cluster | 573 | 573 | 573 | 482 | 482 | 22 | ✅ | ✅ in memory |
| hpc-cluster | 1 841 | 1 841 | 1 841 | 1 202 | 1 202 | 50 | ✅ | ✅ in memory |
| exascale | 13 953 | 13 953 | 13 953 | 12 000 | 12 000 | 188 | ✅ | ✅ in memory |

- `ipmi_*` < total nodes: expected — switches, storage-heads, login nodes have no IPMI in simulator
- `PDU (L1)` ≈ rack count × 1 inlet: correct — 1 `inletid="I1"` per PDU
- `for:` durations: loaded in backend memory, applied by planner (API /api/checks doesn't serialize this field — display-only limitation)

## Rack states (0 UNKNOWN on all examples)

| Example | Total racks | ✅ OK | 🔴 CRIT | 🟡 WARN | ⬜ UNKNOWN |
|---|---|---|---|---|---|
| homelab | 3 | 1 | 2 | 0 | **0** |
| small-cluster | 11 | 8 | 3 | 0 | **0** |
| hpc-cluster | 25 | 22 | 3 | 0 | **0** |
| exascale | 241 | 233 | 8 | 0 | **0** |

CRIT = simulator incident_mode (light/medium/heavy). Expected behavior.

## Checks summary

### Node checks (all examples)
| ID | Expression | for: | When fires |
|---|---|---|---|
| node_up | `up{instance=~"$instances"}` == 0 | 30s | Node unreachable |
| node_temp_warn | `node_temperature_celsius` > 75/90 | 5m | Temperature threshold |
| ipmi_temp_state | `ipmi_temperature_state` > 0/1 | 3m | BMC reports abnormal temp |
| node_power_warn | `node_power_watts` > 500/800 | 5m | Power draw too high |
| ipmi_power_state | `ipmi_power_state` > 0 | 5m | BMC reports power anomaly |
| ipmi_fan_state | `ipmi_fan_speed_state` > 0 | 3m | Fan failure or low speed |

### PDU/Rack checks (all examples)
| ID | Expression | for: | Threshold |
|---|---|---|---|
| pdu_load_warn | `raritan_pdu_activepower_watt{inletid="I1"}` sum | 5m | > 5000W warn, > 7000W crit |
| pdu_current_warn | `raritan_pdu_current_ampere{inletid="I1"}` max | 5m | > 14A warn, > 16A crit |
| fan_speed_warn | `rack_fan_speed_state` | 2m | > 0 warn (air racks) |
| psu_status | `rack_psu_status` | 1m | > 0 crit |

### DCW checks (hpc-cluster, exascale only)
| ID | Expression | for: | Threshold |
|---|---|---|---|
| pmc_power_warn | `sequana3_pmc_total_watt` | 5m/2m | > 15kW warn, > 20kW crit |
| hmc_temp_warn | `sequana3_hyc_tmp_pcb_cel` | 3m/1m | > 35°C warn, > 45°C crit |
| hmc_flow_warn | `sequana3_hyc_flow_lmin` | 2m | < 5 L/min warn |
| hmc_leak | `sequana3_hyc_leak_sensor_pump` | **none** | == 1 → immediate CRIT |

## Activation

```bash
./scripts/use-example.sh homelab
./scripts/use-example.sh small-cluster
./scripts/use-example.sh hpc-cluster
./scripts/use-example.sh exascale
# Restore
cp config/app.yaml.bak config/app.yaml && make restart
```

## TODO
- [ ] Phase 11: Documentation update
- [ ] Screenshots for each example  
- [ ] hpc-cluster anonymisation
