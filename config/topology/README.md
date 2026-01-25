# Topology Layout

```
config/topology/
  sites.yaml
  datacenters/
    <dc_slug>/
      rooms/
        <room_id>/
          room.yaml
          aisles/
            <aisle_id>/
              aisle.yaml
              racks/
                <rack_id>.yaml
          standalone_racks/
            <rack_id>.yaml
```

Notes:
- `sites.yaml` lists all datacenters and their rooms.
- `room.yaml` declares aisles by id/name and references standalone racks by id.
- `aisle.yaml` lists rack ids for that aisle.
- Each rack is a standalone YAML file under its aisle (or standalone_racks).

Examples

`sites.yaml`
```yaml
sites:
  - id: dc1
    name: Datacenter 1
    rooms:
      - id: room-a
        name: Room A
```

`datacenters/dc1/rooms/room-a/room.yaml`
```yaml
id: room-a
name: Room A
aisles:
  - id: aisle-01
    name: Aisle Compute
  - id: aisle-02
    name: Aisle Storage
standalone_racks:
  - mgmt-01
```

`datacenters/dc1/rooms/room-a/aisles/aisle-01/aisle.yaml`
```yaml
id: aisle-01
name: Aisle Compute
racks:
  - r01-01
  - r01-02
```

`datacenters/dc1/rooms/room-a/aisles/aisle-01/racks/r01-01.yaml`
```yaml
id: r01-01
name: Rack 01
template_id: bull-xh3000
u_height: 42
devices:
  - id: r01-01-c01
    name: XH3140 Trio 01
    template_id: bs-xh3140-trio-1u-3n
    u_position: 1
    instance: compute[001-003]  # or a single instance like "esw01"
```

`datacenters/dc1/rooms/room-a/standalone_racks/mgmt-01.yaml`
```yaml
id: mgmt-01
name: Management Rack
template_id: standard-42u-air
u_height: 42
devices: []
```
