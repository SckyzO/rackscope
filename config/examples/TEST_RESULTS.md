# Rackscope Example Test Results

> Generated: 2026-03-10 18:57
> Suite started: 2026-03-10 18:42

## Lint: ✅ passed

## Validation Results

| Example | Loop | Mode | Rooms | Racks | Up nodes | Temp | Power | PDU | OK | CRIT | UNKNOWN | Slurm | Incident | Pass/Fail |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| homelab | 1 | default | 1 | 3 | 23 | 23 | 23 | 6 | 0 | 3 | 0 | disabled | N/A | ✅ (8/8) |
| homelab | 2 | default | 1 | 3 | 23 | 23 | 23 | 6 | 0 | 3 | 0 | disabled | N/A | ✅ (8/8) |
| small-cluster | 1 | default | 1 | 11 | 608 | 608 | 608 | 22 | 9 | 2 | 0 | OK | N/A | ✅ (8/8) |
| small-cluster | 2 | custom_10_10_1 | 1 | 11 | 608 | 608 | 608 | 22 | 4 | 7 | 0 | OK | down=91 crit_alerts=88 rack_crit=7 | ✅ (11/11) |
| hpc-cluster | 1 | default | 2 | 25 | 1912 | 1912 | 1912 | 50 | 21 | 3 | 1 | OK | N/A | ✅ (8/8) |
| hpc-cluster | 2 | custom_10_10_1 | 2 | 25 | 1912 | 1912 | 1912 | 50 | 16 | 9 | 0 | OK | down=27 crit_alerts=50 rack_crit=9 | ✅ (11/11) |
| exascale | 1 | default | 9 | 140 | 14138 | 14138 | 14138 | 188 | 236 | 5 | 0 | OK | N/A | ✅ (8/8) |
| exascale | 2 | custom_10_10_1 | 9 | 140 | 14138 | 14138 | 14138 | 188 | 214 | 27 | 0 | OK | down=92 crit_alerts=92 rack_crit=27 | ✅ (11/11) |

## Column definitions
- **Loop 1**: normal incident mode
- **Loop 2**: custom mode (10 CRIT + 10 WARN + 1 rack CRIT for non-homelab)
- **Up nodes**: count(`up{job="node"}`) in Prometheus
- **Temp/Power**: count(`node_temperature_celsius` / `node_power_watts`)
- **PDU**: racks with `raritan_pdu_activepower_watt{inletid="I1"}`
- **Incident**: down nodes + CRIT alerts + rack CRIT from custom mode

## How to replay
```bash
python3 scripts/validate_examples.py all
python3 scripts/validate_examples.py hpc-cluster  # single example
```