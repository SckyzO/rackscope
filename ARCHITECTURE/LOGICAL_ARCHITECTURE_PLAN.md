LOGICAL ARCHITECTURE PLAN — Multi-Datacenter Physical Monitoring UI
WORKING NAME: RACKSCOPE (placeholder)
DEPLOYMENT: Containers (single-node or HA-ready later)
SOURCE OF TRUTH: YAML/JSON + Templates (GitOps-friendly)
REFRESH: Near-real-time (e.g. 60s) with scalable query strategy

===============================================================================
1. PRODUCT GOAL (OPERATOR-FIRST)
===============================================================================

Provide an operator/NOC-friendly physical visualization of multiple datacenters:

- A rotating "playlist" wallboard:
  - datacenter top view (room/floor plan)
  - auto-switch every N minutes
- When a rack/device turns WARN/CRIT:
  - it becomes orange/red on the room view
  - operator clicks the rack tile
  - rack elevation opens instantly
  - problematic device/slot is highlighted
- Provide additional views:
  - compute grid view (all compute nodes)
  - service view (management services health)
  - optional “summary dashboards” beyond physical layout

The UI must be readable at a glance, suitable for:
- N1 sysadmins
- operators / pupitreurs
- MCO teams

===============================================================================
2. MULTI-DATACENTER REQUIREMENTS
===============================================================================

The program must support:
- multiple sites/datacenters
- multiple rooms per site
- arbitrary room grids (different sizes)
- heterogeneous rack types (42U, 48U, custom)
- different hardware layouts (HPC chassis, classic servers, storage, switches)
- different metric naming conventions per environment (via label mapping)

Configuration approach:
- File-based YAML/JSON remains viable if template-driven and well validated
- Templates must reduce repeated configuration across sites/rooms/racks

===============================================================================
3. CORE UX FLOWS
===============================================================================

3.1 Wallboard Flow (Playlist)
-----------------------------
- Full-screen mode
- Playlist cycles through selected views every X minutes:
  - Site A / Room 1 top view
  - Site A / Room 2 top view
  - Site B / Room 1 top view
  - Optional: compute grid view, services view

3.2 Operator Drilldown
----------------------
- Room top view shows racks as tiles colored by severity
- Click on a rack tile -> rack elevation view
- Rack view highlights failing device(s) and provides tooltips/reasons
- Optional next click -> device detail (quick diagnostics)

3.3 Notification / Alert Header
-------------------------------
- Persistent header (even in wallboard mode, minimal)
- Notification icon with badge count
- When a component transitions to WARN/CRIT:
  - badge increments
  - optional sound plays (configurable)
  - notification dropdown shows recent transitions and affected entities
- Acknowledgement model (optional later):
  - “ack” locally to hide repeated sound
  - does NOT replace Alertmanager

3.4 Navigation Tree (Sidebar)
-----------------------------
- Left navigation is a compact, explorer-like tree
- Hierarchy: Datacenter -> Room -> Aisle -> Rack
- Low indentation to preserve long rack names
- Expand/collapse at every level
- Must support multi-DC navigation in a single tree

===============================================================================
4. VISUAL VIEWS (MUST HAVE)
===============================================================================

4.1 Room Top View
-----------------
- 2D grid (x,y), each rack has coordinates and footprint
- Color is aggregated rack severity
- Hover: summary counts (OK/WARN/CRIT/UNKNOWN)
- Filters:
  - show only WARN/CRIT
  - search by rack name, device name, hostname

4.2 Rack Elevation View
-----------------------
- U-by-U rack display
- Slot devices placed by U range
- Composite chassis display with internal split (e.g., 4 nodes in 4U)
- Attachments area (PDU, power feeds, door cooling, sensors)
- Highlight failing entities
- Tooltip shows failing checks and last update

4.3 Compute Grid View (non-physical)
------------------------------------
- Grid of all compute nodes across a selection (room/site/cluster)
- Color by node health
- Quick sorting (worst first) and filtering

4.4 Services View (non-physical)
--------------------------------
- Grid/list of management services:
  - provisioning, scheduler, auth, storage gateways, monitoring stack, etc.
- Color by service health
- Click -> details / links

===============================================================================
5. THEMING & ACCESSIBILITY REQUIREMENTS
===============================================================================

- Dark theme (default for NOC)
- Light theme
- High-contrast option (accessibility)
- Color is not the only signal (icons/patterns)
- Sounds configurable with rate limiting

===============================================================================
6. OFFLINE MODE & RESILIENCE
===============================================================================

- Local cache of last state snapshot
- “DATA STALE” indicator + last update timestamp
- UI remains navigable on cached layout/state
- Automatic recovery on backend return

===============================================================================
7. CONFIGURATION ARCHITECTURE (FILES + TEMPLATES)
===============================================================================

- File-based YAML/JSON as source of truth
- Segmented directories
- Templates for racks/devices/chassis/attachments/facilities
- Built-in checks library + controlled overrides
- Copy/paste friendly instances

Topology layout (scale-friendly):
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

===============================================================================
8. TELEMETRY & REFRESH (DYNAMIC UPDATES)
===============================================================================

- Refresh loop (e.g. 60s) must scale
- Avoid per-device PromQL
- Prefer vector queries and recording rules (“health series”)
- Mandatory caching + dedup

===============================================================================
9. NOTIFICATIONS (UI-LEVEL)
===============================================================================

- Header badge + list of transitions
- Optional sound (configurable)
- Grouping and rate limiting

===============================================================================
10. DEVELOPMENT PHASES
===============================================================================

Phase 0: Foundations (name + plan + view model decisions)
Phase 1: Viewer MVP (room + rack + notifications + playlist + offline snapshots)
Phase 2: Templates + density (core visuals)
Phase 3: Telemetry foundation
Phase 4: Config + segmentation
Phase 5: Visual completion
Phase 6: Editor MVP (room/rack)
Phase 7: Additional views + importers (compute/services + CMDB adapters)
Phase 8: Production hardening (optional auth, etc.)

===============================================================================
END OF DOCUMENT
===============================================================================
