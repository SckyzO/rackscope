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
    description: Primary site
    location:
      lat: 48.8566
      lon: 2.3522
      address: Paris, FR
    rooms:
      - id: room-a
        name: Room A
```

`datacenters/dc1/rooms/room-a/room.yaml`
```yaml
id: room-a
name: Room A
layout:
  shape: rectangle
  size:
    width_m: 28
    height_m: 18
  orientation:
    north: top
  grid:
    enabled: true
    cell: 28
  door:
    side: north
    position: 0.2
    label: Door A
aisles:
  - id: aisle-01
    name: Aisle Compute
  - id: aisle-02
    name: Aisle Storage
standalone_racks:
  - mgmt-01
```

Layout fields (optional)
- `layout.shape`: visual hint for the room (e.g. rectangle, L).
- `layout.size`: physical size in meters (optional; used for UI scaling later).
- `layout.orientation.north`: where north is on screen (`top`, `right`, `bottom`, `left`).
- `layout.grid`: show a subtle grid (`enabled`) with cell size in px (`cell`).
- `layout.door`: add a door marker on a side with a position (0..1) and a label.

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
