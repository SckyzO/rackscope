# User Guide

## Dashboard Overview
The main dashboard gives you a high-level view of the data center health.

## Navigation
Use the Sidebar to navigate:
- **Topology**: Datacenters → Rooms → Aisles → Racks (tree view).
- **Catalog**: Devices, Racks, Checks.
- **Editors**: Topology Editor, Rack Editor, Template Editor, Checks Editor.

## Views

### Room View
- Shows all racks in a room grouped by aisle.
- **Color Codes**:
    - 🟢 OK
    - 🟠 WARN
    - 🔴 CRIT
- Click a rack to inspect it.

### Rack Cockpit View
Click "INSPECT" or the rack name to enter the full Rack View.
- **Left Panel**: Infrastructure status (Power, Cooling, Management).
- **Center Panel**: Front View (Compute nodes, Disks). Hover to see detailed metrics.
- **Right Panel**: Rear View (Fans, PSUs, Cabling).

### Slurm Wallboard
The Slurm Wallboard is a compact, rack‑dense view focused on node states.
- **Purpose**: show compute/visu nodes at a glance with Slurm status colors.
- **Metric**: `slurm_node_status{node,partition,status}` (Prometheus).
- **Query** (backend): `max by (node,status,partition) (slurm_node_status)`.
- **Status mapping** is configurable in Settings (OK/WARN/CRIT lists).
- **Role filter**: only devices whose template `role` is in the allowed list
  (ex: compute, visu). Unlabeled devices can be included or excluded.

## Editors
- **Topology Editor**: reorder racks across aisles, save layout.
- **Rack Editor**: drag devices into U slots, delete, save.
- **Template Editor**: edit device/rack templates with preview.
- **Checks Editor**: view and edit check library files.

## Settings
Access settings via the sidebar to:
- Configure Prometheus + telemetry refresh.
- Toggle features (notifications, playlist, offline, demo).
- Adjust theme (dark/light, accent).
- Manage simulator scenario and overrides.

## Notifications
A header badge shows recent WARN/CRIT transitions and lists them on click.

## Offline Mode
If the backend is unreachable, the UI uses the last cached data and shows a **STALE** indicator in the header.
