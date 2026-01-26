# Device Template Schema

Device templates describe the physical layout of an enclosure (chassis) and how logical nodes are mapped to it.

## File Layout

Each device template is stored in its own file and grouped by type:

```
config/templates/devices/
  server/
    bs-x430-service-2u.yaml
  storage/
    storage-2u-24disk.yaml
  network/
    ib-switch-l1.yaml
```

The template `type` determines the folder name. Files are named after the template `id`.

## Schema Specification

```yaml
templates:
  - id: string          # Unique identifier (used in topology.yaml)
    name: string        # Human-readable label
    type: string        # Category: server, network, storage, power, other
    u_height: integer   # Height in Rack Units (U)
    
    # Front View Layout
    layout:
      type: "grid"      # Layout engine (currently only 'grid')
      rows: integer     # Number of horizontal rows
      cols: integer     # Number of vertical columns
      matrix: [[int]]   # Mapping of visual cells to slot numbers
      
    # Rear View Layout (Optional)
    rear_layout:
      type: "grid"
      rows: integer
      cols: integer
      matrix: [[int]]   # Specific slot IDs > 900 denote infra components (Fans, PSUs)
```

## Matrix Mapping Logic

The `matrix` represents what you see from the front (or back). Each number in the matrix is a **Slot ID**.

### Example: BullSequana X440-A5 (2U, 4 Nodes)
Physical layout: 2 nodes on top, 2 nodes on bottom.
```yaml
layout:
  rows: 2
  cols: 2
  matrix:
    - [3, 4] # Top row: Slot 3 and 4
    - [1, 2] # Bottom row: Slot 1 and 2
```

## Rear View Components
In `rear_layout`, you can use specific Slot IDs to trigger special rendering:
- `901`: Fan Module
- `902`: PSU / Power Inlet
- `903+`: Sequential infra modules
