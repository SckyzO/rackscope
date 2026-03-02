---
id: templates
title: Templates
sidebar_position: 3
---

# Templates Reference

Templates define hardware characteristics and are reused across racks to avoid repetition.

## Device Templates

**Location**: `config/templates/devices/{type}/`

```yaml
templates:
  - id: bs-x440-a5
    name: "BullSequana X440 A5"
    type: server            # server, switch, storage, pdu
    role: compute           # optional: compute, visu, login, io, storage
    u_height: 10

    # Front-view layout (chassis node grid)
    layout:
      type: grid
      rows: 5
      cols: 4
      matrix:
        - [1, 2, 3, 4]
        - [5, 6, 7, 8]
        - [9, 10, 11, 12]
        - [13, 14, 15, 16]
        - [17, 18, 19, 20]

    # Rear-view layout (optional)
    rear_layout:
      type: grid
      rows: 2
      cols: 2
      matrix: [[1, 2], [3, 4]]

    # Health checks to run for this device type
    checks:
      - node_up
      - ipmi_temp_warn
      - ipmi_temp_crit

    # Metrics to display for this device type
    metrics:
      - node_temperature
      - node_power
      - node_cpu_load

    # Per-device tooltip thresholds (override the global metrics library defaults)
    display_thresholds:
      temperature:
        warn: 55    # °C — arc gauge turns amber above this
        crit: 70    # °C — arc gauge turns red above this
      power:
        warn: 400   # W
        crit: 600   # W
```

### `display_thresholds`

The `display_thresholds` block customises the **WARN / CRIT** colour breakpoints shown in the HUD tooltip arc gauge, overriding the global defaults from the metrics library.

| Key | Description |
|---|---|
| `temperature.warn` | Temperature (°C) above which the arc gauge turns amber |
| `temperature.crit` | Temperature (°C) above which the arc gauge turns red |
| `power.warn` | Power draw (W) above which the power bar turns amber |
| `power.crit` | Power draw (W) above which the power bar turns red |

All keys are optional. Omitted keys fall back to the default thresholds defined in the metrics library YAML (`config/metrics/library/`).

**When to use it**: GPU servers and storage arrays typically run hotter than standard compute nodes. Set device-specific thresholds to avoid false-amber alerts on high-TDP hardware.

```yaml
# GPU server — higher temperature thresholds than standard compute
display_thresholds:
  temperature:
    warn: 65
    crit: 80
```

## Rack Templates

**Location**: `config/templates/racks/`

```yaml
templates:
  - id: standard-42u-pdu
    name: "Standard 42U with PDUs"
    u_height: 42

    infrastructure:
      rack_components:
        - template_id: pdu-raritan-px3
          location: left     # left, right, front, rear
          id: pdu-left
        - template_id: pdu-raritan-px3
          location: right
          id: pdu-right
```

## Rack Component Templates

**Location**: `config/templates/rack_components/`

```yaml
templates:
  - id: pdu-raritan-px3
    name: "Raritan PX3 PDU"
    type: pdu              # pdu, switch, hmc, rmc, cooling
    location: side         # side, rear, front
    u_height: 1

    checks:
      - pdu_status

    metrics:
      - pdu_active_power
      - pdu_current
      - pdu_voltage
```

## Template Types

| Type | Description | Views |
|------|-------------|-------|
| `server` | Single or multi-node server | Front/rear rack views |
| `switch` | Network switch | Front/rear rack views |
| `storage` | Storage array | Front/rear rack views |
| `pdu` | Power distribution unit | Rack component panel |
| `hmc` | Hardware Management Controller | Rack component panel |
| `cooling` | Cooling unit | Rack component panel |
