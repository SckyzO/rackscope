# Administrator Guide

How to configure Rackscope topology and templates.

## Configuration Structure

All configuration resides in YAML files. The default location is `config/`.

### 1. Defining Hardware Templates

Templates describe **what** your hardware looks like physically.

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
      matrix: [[901, 902]] # 9xx IDs are rendered as PSUs/Fans
```

**Example: A Rack with Infrastructure**
File: `templates/racks/my-rack.yaml`
```yaml
rack_templates:
  - id: hpc-rack-dlc
    name: "HPC Rack DLC"
    infrastructure:
      components:
        - id: pdu-01
          type: power
          location: u-mount
          u_position: 1
```

### 2. Defining Topology

The topology describes **where** your hardware is located.

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

## Node Naming Patterns

You can assign nodes using:
1.  **Pattern**: `"compute[01-04]"` -> `compute01`, `compute02`, `compute03`, `compute04`.
2.  **Explicit Map**:
    ```yaml
    nodes:
      1: "master-node"
      2: "login-node"
      3: "spare"
    ```

## Adding Metrics

The backend is pre-configured to query:
- `node_temperature_celsius`
- `node_power_watts`
- `node_health_status`

Ensure your Prometheus exporters expose these metrics with a `node_id` label matching the hostnames defined in your topology.
