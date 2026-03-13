---
id: topology-yaml
title: Topology YAML
sidebar_position: 2
---

# Topology YAML Reference

The topology describes your physical infrastructure. It can be defined as a single file (monolithic) or split across multiple files (segmented).

## Segmented Layout (Recommended)

```
config/topology/
  sites.yaml                                    # Site list
  datacenters/{site_id}/
    rooms/{room_id}/
      room.yaml                                 # Room + references
      aisles/{aisle_id}/
        aisle.yaml                              # Aisle + rack refs
        racks/{rack_id}.yaml                    # Individual rack
      standalone_racks/{rack_id}.yaml           # Racks not in aisles
```

## Site Definition

```yaml
# config/topology/sites.yaml
sites:
  - id: dc1
    name: "Paris DC1"
    location:
      lat: 48.8566
      lon: 2.3522
    timezone: "Europe/Paris"   # optional IANA timezone
    rooms:
      - r001
      - r002
```

## Room Definition

```yaml
# config/topology/datacenters/dc1/rooms/r001/room.yaml
id: r001
name: "Server Room A"
site_id: dc1
layout:
  rows: 5
  cols: 8
  compass: north   # direction racks face (north, south, east, west)
  door:
    row: 0
    col: 4
aisles:
  - a01
  - a02
standalone_racks: []
```

## Aisle Definition

```yaml
# config/topology/datacenters/dc1/rooms/r001/aisles/a01/aisle.yaml
id: a01
name: "Aisle A01"
room_id: r001
racks:
  - a01-r01
  - a01-r02
  - a01-r03
```

## Rack Definition

> **Note**: The field `nodes` is a deprecated alias for `instance`. New configurations should use `instance:`.

```yaml
# config/topology/datacenters/dc1/rooms/r001/aisles/a01/racks/a01-r01.yaml
id: a01-r01
name: "Rack A01-R01"
u_height: 42
template_id: standard-42u-pdu   # optional rack template

devices:
  - id: compute-blade-01
    name: "Compute Blade 01"
    template_id: bs-x440-a5
    u_position: 1
    instance: compute[001-020]   # pattern expansion
    role: compute                # optional: compute, visu, login, io, storage

  - id: top-of-rack-switch
    name: "ToR Switch"
    template_id: cisco-c9300
    u_position: 40
    instance: switch-a01-r01
```

## Instance Formats

| Format | Example | Expands to |
|--------|---------|------------|
| **Pattern** | `compute[001-004]` | compute001, compute002, compute003, compute004 |
| **List** | `[node01, node02]` | node01, node02 |
| **Slot map** | `{1: node01, 2: node02}` | slot 1 → node01, slot 2 → node02 |
| **Single** | `switch01` | switch01 |

## Constraints

- Device IDs must be unique within a rack
- U positions must not overlap (collision detection enforced)
- Devices must fit within rack height
- Instance count must match template layout (for chassis with matrices)
