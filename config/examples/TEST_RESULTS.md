# Rackscope Example Test Results

> Generated: 2026-03-12 04:27
> Suite started: 2026-03-12 04:23

## Lint: ✅ passed

## Validation Results

| Example | Loop | Mode | Rooms | Racks | Up nodes | Temp | Power | PDU | OK | CRIT | UNKNOWN | Slurm | Incident | Pass/Fail |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| exascale | 1 | default | 9 | 140 | 14138 | 14138 | 14138 | 188 | 229 | 12 | 0 | OK | N/A | ✅ (8/8) |
| exascale | 2 | custom_10_10_1 | 9 | 140 | 14138 | 14138 | 14138 | 188 | 207 | 34 | 0 | OK | down=252 crit_alerts=371 rack_crit=34 | ✅ (11/11) |

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
