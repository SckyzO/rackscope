# VIEW_MODEL.md (Private) — Spec v0.2
This file defines the canonical View Model required to render physical
monitoring views (datacenter/room/rack/front+rear/equipment) independently
from any CMDB.

## Non-goals
- Not a CMDB database
- No attempt to model every CMDB field
- No direct metric collection

## File segmentation (topology)
Topology is split for large deployments:
- `sites.yaml` (list of sites)
- `datacenters/<dc_slug>/rooms/<room_id>/room.yaml` (room + aisle refs + standalone racks)
- `datacenters/<dc_slug>/rooms/<room_id>/aisles/<aisle_id>/aisle.yaml` (aisle + rack refs)
- `datacenters/<dc_slug>/rooms/<room_id>/aisles/<aisle_id>/racks/<rack_id>.yaml` (full rack + devices)
- `datacenters/<dc_slug>/rooms/<room_id>/standalone_racks/<rack_id>.yaml` (rack outside aisles)

## Entities (minimum)
- Site
  - id, name
  - optional: location (lat, lon), region, tags
- Room
  - id, name, description?
  - aisles[] (list of aisle refs with names)
  - standalone_racks[] (optional racks outside aisles)
- Aisle
  - id, name
  - racks[] (list of rack ids)
- Rack
  - id, name
  - template_id (rack template)
  - aisle_id (optional, when nested)
  - u_height
  - devices[] (chassis)
- Device (chassis)
  - id, name, template_id
  - u_position (bottom U)
  - instance (logical instances inside chassis):
    - string nodeset: `compute[001-003]`
    - ordered list: `[compute001, compute002, compute003]`
    - slot map: `{1: compute001, 2: compute002, 3: compute003}`
  - nodes (deprecated alias, still accepted)

## Telemetry mapping
Telemetry is resolved via a global identity label, with optional scope labels.
- Global config defines `identity_label` (default: `instance`)
- Optional labels: `rack_label`, `chassis_label`
- Scopes:
  - node (per logical node / instance)
  - chassis (per device)
  - rack (per rack)

## Checks binding
Checks are defined in a separate library and bound by scope:
- Scope: `node`, `chassis`, `rack`
- Each template lists `checks[]` with optional overrides:
  - enable/disable, threshold, severity, silence, labels

## Health states
- OK / WARN / CRIT / UNKNOWN
- Aggregation: max severity by default
- Propagation: node -> chassis -> rack -> room -> site
- Transition detection for notifications

## Constraints
- Every id must be unique within its scope
- Slotted placements must not overlap within a rack face
- Device height must fit rack bounds
- Node slots must match device layout (when layout is split)
- Telemetry identity must be resolvable from instance/nodeset
