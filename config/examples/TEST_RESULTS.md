# Rackscope Example Test Results

> Generated: 2026-03-09 20:32
> Suite started: 2026-03-09 20:28

## Lint: ✅ passed

## Validation Results

| Example | Loop | Mode | Rooms | Racks | Up nodes | Temp | Power | PDU | OK | CRIT | UNKNOWN | Slurm | Incident | Pass/Fail |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hpc-cluster | 1 | default | 2 | 25 | 1912 | 1912 | 1912 | 50 | 23 | 2 | 0 | OK | N/A | ✅ (8/8) |
| hpc-cluster | 2 | custom_10_10_1 | 2 | 25 | 1912 | 1912 | 1912 | 50 | 15 | 10 | 0 | OK | down=132 crit_alerts=130 rack_crit=10 | ✅ (11/11) |

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