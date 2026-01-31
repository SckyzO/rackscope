# Administrator Guide

How to configure Rackscope topology and templates.

## Configuration Structure

All configuration resides in YAML files. The default location is `config/`.

### 1. Defining Hardware Templates

Templates describe **what** your hardware looks like physically.

Optional naming convention (not required, but recommended for consistency):
- Rack templates: `config/templates/racks/rack-<name>.yaml`
- Rack components (PDU/HMC/etc): `config/templates/rack_components/rack-component-<name>.yaml`
- Device templates: `config/templates/devices/<type>/<device-name>.yaml`

**Example: A 2U Server with 4 Nodes (Quad)**
File: `templates/devices/my-server.yaml`
```yaml
templates:
  - id: my-quad-server
    name: "Quad Node 2U"
    type: server
    u_height: 2
    layout:
      type: grid
      rows: 2
      cols: 2
      matrix: [[3, 4], [1, 2]] # Visual mapping of slots
    rear_layout:
      type: grid
      rows: 1
      cols: 2
      matrix: [[901, 902]] # Rear grid slots
    rear_components:
      - id: 901
        name: "PSU A"
        type: psu
      - id: 902
        name: "PSU B"
        type: psu
```

**Example: A Rack with Infrastructure**
File: `templates/racks/my-rack.yaml`
```yaml
rack_templates:
  - id: hpc-rack-dlc
    name: "HPC Rack DLC"
    infrastructure:
      rear_components:
        - id: psu-bank
          type: power
          location: u-mount
          u_position: 40
          u_height: 3
      rack_components:
        - template_id: pdu-raritan-16u
          side: left
          u_position: 1
        - template_id: pdu-raritan-16u
          side: right
          u_position: 1
```

**Example: Rack Component Template (PDU)**
File: `templates/rack_components/pdu.yaml`
```yaml
rack_component_templates:
  - id: pdu-raritan-16u
    name: PDU Raritan
    type: pdu
    location: side
    u_height: 16
    checks:
      - pdu_power_present
      - pdu_current_warn
      - pdu_current_crit
    metrics:
      - power
      - current
```

**Notes**
- Rack component checks are included in the planner (scope = rack) and will affect rack health.
- Switch checks live in `config/checks/library/switch.yaml` and are assigned to network templates.

### 2. Defining Topology

The topology describes **where** your hardware is located.

Rackscope supports **two formats**:
- **Monolithic**: a single `topology.yaml` file (simple labs, demos)
- **Segmented**: a folder tree under `config/topology/` (recommended for real DCs)

Why segmented is preferred:
- Smaller files, cleaner diffs
- Safer editor writes (room/aisle/rack scoped)
- Easier automation/importers per zone

#### Option A — Monolithic
File: `topology.yaml`
```yaml
sites:
  - id: dc1
    rooms:
      - id: room-a
        aisles:
          - id: aisle-1
            racks:
              - id: r1-01
                template_id: hpc-rack-dlc
                devices:
                  - id: chassis-01
                    template_id: my-quad-server
                    u_position: 10
                    # Assign logical node hostnames to physical slots
                    nodes: "compute[001-004]" 
```

#### Option B — Segmented (Recommended)
Files are split under `config/topology/`:
```
config/topology/
  sites.yaml
  datacenters/
    dc1/
      rooms/
        room-a/
          room.yaml
          aisles/
            aisle-01/
              aisle.yaml
              racks/
                r01-01.yaml
```

`sites.yaml`:
```yaml
sites:
  - id: dc1
    name: Main Datacenter
    rooms:
      - id: room-a
        name: Room A
```

`room.yaml`:
```yaml
id: room-a
name: Room A
aisles:
  - id: aisle-01
    name: Aisle 01
standalone_racks: []
```

`aisle.yaml`:
```yaml
id: aisle-01
name: Aisle 01
racks:
  - r01-01
```

`r01-01.yaml`:
```yaml
id: r01-01
name: Rack 01
template_id: hpc-rack-dlc
devices:
  - id: chassis-01
    template_id: my-quad-server
    u_position: 10
    nodes: "compute[001-004]"
```

## Instance Naming Patterns

You can assign instances using:
1.  **Pattern**: `"compute[01-04]"` -> `compute01`, `compute02`, `compute03`, `compute04`.
2.  **Explicit Map**:
    ```yaml
    instance:
      1: "master-node"
      2: "login-node"
      3: "spare"
    ```
`nodes:` is still accepted as a deprecated alias for `instance:`.

## Adding Metrics

The backend is pre-configured to query:
- `node_temperature_celsius`
- `node_power_watts`
- `node_health_status`

Ensure your Prometheus exporters expose these metrics with a `node_id` label matching the hostnames defined in your topology.

## Telemetry Refresh & Cache

Rackscope does not pull metrics on a background schedule. The UI refresh interval
triggers backend requests, and the backend queries Prometheus on demand.

Key settings in `config/app.yaml`:
- `refresh.room_state_seconds` / `refresh.rack_state_seconds`: UI refresh interval.
- `cache.ttl_seconds`: Prometheus query cache TTL (seconds).
- `planner.cache_ttl_seconds`: Planner snapshot TTL (seconds).
- `planner.max_ids_per_query`: Max IDs per PromQL query chunk.

Typical guidance (hardware monitoring):
- Set TTLs to the same value as the UI refresh (e.g., 60s).
- Increase `max_ids_per_query` (e.g., 200–300) to reduce query count.

If you need "live" every refresh, keep TTL <= refresh interval.
