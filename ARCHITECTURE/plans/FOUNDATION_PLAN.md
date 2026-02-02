FOUNDATION PLAN — “Physical Monitoring Views” Core (CMDB-agnostic)
STATUS: Draft v0.1 (architecture + requirements, no code)
GOAL: Define the minimal, solid, extensible core needed to build the “perfect”
monitoring views (datacenter/room/rack/server) independently from any CMDB.

===============================================================================
1. CORE IDEA (NON-NEGOTIABLE)
===============================================================================

- The application does NOT own the CMDB database.
- The application owns a “View Model” designed for physical monitoring.
- External CMDBs (NetBox, RacksDB, BlueBanquise inventory, etc.) are inputs.
- Importers/adapters/scripts transform CMDB data into our View Model.
- The View Model can be stored as files (YAML/JSON) and versioned (GitOps).

===============================================================================
2. TARGET “PERFECT VIEW”
===============================================================================

- Multi-site datacenter/room/rack/server views
- Rack front + rack rear (PDUs, hydraulics, cooling doors, etc.)
- Playlist wallboard + notifications header (badge + sound)
- Dark/light themes, accessibility, offline mode
- Additional grid views (compute, services)

===============================================================================
3. VIEW MODEL MINIMUM
===============================================================================

- Physical topology: site, room grid, rack placement, rack U height
- Equipment placement:
  - slotted (U range, face)
  - attached/non-slotted (front/rear)
- Composite devices (HPC chassis containing multiple nodes)
- Telemetry mapping (stable label strategy)
- Health states (OK/WARN/CRIT/UNKNOWN) + aggregation
- Optional metadata (tags, ownership, maintenance, links)

===============================================================================
4. CONFIGURATION
===============================================================================

- Files as source of truth (YAML preferred, JSON ok)
- Segmentation by directories (racksdb-style) with strict validation
- App-level config file (config.yaml / rackscope.yaml):
  - identity label default (instance) + optional overrides
  - root paths (topology, templates, checks)
  - cache/refresh options
  - UNKNOWN handling policies
- Topology segmentation layout:
  - config/
    - app.yaml
    - topology/
      - sites.yaml
      - datacenters/<dc_id>/rooms/<room_id>/room.yaml
      - datacenters/<dc_id>/rooms/<room_id>/aisles/<aisle_id>/aisle.yaml
      - datacenters/<dc_id>/rooms/<room_id>/aisles/<aisle_id>/racks/<rack_id>.yaml
      - datacenters/<dc_id>/rooms/<room_id>/standalone_racks/<rack_id>.yaml
    - templates/{devices,racks}/
    - checks/library/
      - ipmi.yaml
      - up.yaml
      - eseries.yaml
      - sequana3.yaml
- Room files reference aisles by id; aisles reference racks by id; racks carry devices/instances.
- Template-driven:
  - rack templates
  - device templates (slotted)
  - chassis templates (composite)
  - attachment templates (PDU, cooling door)
  - facility templates (water loops, zones)
- Built-in checks library, with controlled overrides
- Checks library granularity:
  - a folder of files per type (temp/up/rack/compute, etc.)
  - each file carries a library "name" for UI grouping/search
  - optional per-check metadata: group + tags for UI filters
- Telemetry refactor staged:
  - Step A: extensible schemas + paths + loaders
  - Step B: PromQL vector planner + cache/dedup/TTL

===============================================================================
5. CMDB ADAPTERS (OUTSIDE CORE)
===============================================================================

- Separate tools convert external sources -> View Model files
- BlueBanquise/NetBox/RacksDB exporters
- Import bootstrap and later merge strategy (future)

===============================================================================
6. CORE COMPONENTS
===============================================================================

- Config & model layer (loader, validator, template resolver)
- Telemetry layer (PromQL adapters, query planner, cache, snapshots)
- Health engine (evaluate, aggregate, transitions)
- REST API
- UI (wallboard + views + notifications; editor later)

===============================================================================
7. PHASED DELIVERY (SMALL STEPS)
===============================================================================

Phase 0: name + plan + view model decisions
Phase 1: viewer MVP (room->rack drilldown, playlist, notifications, offline)
Phase 2: templates + density (core visuals)
Phase 3: telemetry foundation
Phase 4: config + segmentation
Phase 5: visual completion
Phase 6: editor MVP
Phase 7: additional views + importers
Phase 8: hardening

===============================================================================
END OF DOCUMENT
===============================================================================
