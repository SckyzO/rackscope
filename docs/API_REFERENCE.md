# API Reference

Rackscope provides a REST API to retrieve topology and telemetry data.

Interactive documentation is available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## Endpoints

### 📡 Telemetry & Health

#### `GET /api/stats/global`
Returns aggregated statistics for the entire datacenter.
- **Response**:
  ```json
  {
    "total_rooms": 1,
    "total_racks": 15,
    "active_alerts": 2,
    "crit_count": 1,
    "warn_count": 1,
    "status": "CRIT"
  }
  ```

#### `GET /api/rooms/{room_id}/state`
Returns the aggregated health status of a specific room.
- **Status**: `OK`, `WARN`, `CRIT`, `UNKNOWN`.

#### `GET /api/racks/{rack_id}/state`
Returns the health and metrics for a specific rack and all its nodes.
- **Response**:
  ```json
  {
    "rack_id": "r01-01",
    "state": "OK",
    "metrics": { "temperature": 24.5, "power": 12500 },
    "nodes": {
      "compute001": { "state": "OK", "temperature": 23.1, "power": 250 },
      ...
    }
  }
  ```

---

### 📐 Topology & Inventory

#### `GET /api/sites`
List all sites and their nested rooms/racks.

#### `GET /api/rooms`
List all rooms with their aisle/rack hierarchy (optimized for sidebars).

#### `GET /api/rooms/{room_id}/layout`
Get the complete physical layout of a room (aisles, racks, and their positions).

#### `GET /api/racks/{rack_id}`
Get the full technical details of a rack (dimensions, devices list, template).

#### `GET /api/racks/{rack_id}/devices/{device_id}`
Get the full context for a device (rack, aisle, room, site + template metadata).

#### `GET /api/catalog`
Retrieve all available hardware templates (devices and racks).

#### `GET /api/checks`
Retrieve the checks library (built-in monitoring checks).

#### `GET /api/checks/files`
List check library files under `config/checks/library/`.

#### `GET /api/checks/files/{name}`
Get a specific checks file.

#### `PUT /api/checks/files/{name}`
Update a checks file (validated).

#### `POST /api/catalog/templates`
Create a device or rack template (validated and persisted to YAML).

#### `PUT /api/catalog/templates`
Update a device or rack template.

#### `GET /api/config`
Retrieve the app configuration (paths, refresh, cache, telemetry).

#### `PUT /api/config`
Update the app configuration (validated).

#### `POST /api/topology/sites`
Create a datacenter (site).

#### `POST /api/topology/sites/{site_id}/rooms`
Create a room under a datacenter.

#### `POST /api/topology/rooms/{room_id}/aisles/create`
Create aisles for a room.

#### `PUT /api/topology/rooms/{room_id}/aisles`
Reorder/move racks between aisles.

#### `PUT /api/topology/racks/{rack_id}/template`
Assign a rack template.

#### `POST /api/topology/racks/{rack_id}/devices`
Add a device to a rack.

#### `PUT /api/topology/racks/{rack_id}/devices/{device_id}`
Move a device within a rack.

#### `DELETE /api/topology/racks/{rack_id}/devices/{device_id}`
Remove a device from a rack.

#### `PUT /api/topology/racks/{rack_id}/devices`
Replace the full device list for a rack.

#### `GET /api/stats/telemetry`
Retrieve telemetry debug stats (query counts, cache hits/misses, last batch).

---

### ⚙️ Slurm Wallboard

#### `GET /api/slurm/rooms/{room_id}/nodes`
Returns Slurm node states for a room.
- **Response**:
  ```json
  {
    "room_id": "room-a",
    "nodes": {
      "compute001": {
        "status": "idle",
        "severity": "OK",
        "statuses": ["idle"],
        "partitions": ["all", "cpu"]
      }
    }
  }
  ```

Notes:
- Slurm nodes can be mapped to topology instances via `slurm.mapping_path`.

#### `GET /api/slurm/summary`
Returns an aggregated Slurm summary across all rooms or a single room.
- **Query**: `room_id` (optional)
- **Response**:
  ```json
  {
    "room_id": "room-a",
    "total_nodes": 128,
    "by_status": {
      "idle": 120,
      "allocated": 4,
      "down": 4
    },
    "by_severity": {
      "OK": 120,
      "WARN": 4,
      "CRIT": 4,
      "UNKNOWN": 0
    }
  }
  ```

#### `GET /api/slurm/partitions`
Returns per-partition status counts.
- **Query**: `room_id` (optional)
- **Response**:
  ```json
  {
    "room_id": "room-a",
    "partitions": {
      "all": { "idle": 120, "allocated": 4, "down": 4 },
      "cpu": { "idle": 120, "allocated": 4, "down": 4 }
    }
  }
  ```

#### `GET /api/slurm/nodes`
Returns a flat list of Slurm nodes with topology context.
- **Query**: `room_id` (optional)
- **Response**:
  ```json
  {
    "room_id": "room-a",
    "nodes": [
      {
        "node": "compute001",
        "status": "idle",
        "severity": "OK",
        "statuses": ["idle"],
        "partitions": ["all", "cpu"],
        "site_id": "dc1",
        "site_name": "Datacenter 1",
        "room_id": "room-a",
        "room_name": "Room A",
        "rack_id": "r01-01",
        "rack_name": "Rack 01",
        "device_id": "r01-01-c01",
        "device_name": "Compute 01"
      }
    ]
  }
  ```

#### `GET /api/stats/prometheus`
Prometheus heartbeat + latency stats.

#### `GET /api/alerts/active`
Active alert list (for header/notifications).

#### `GET /api/simulator/scenarios`
List available simulator scenarios.

#### `GET /api/simulator/overrides`
List active simulator overrides.

#### `POST /api/simulator/overrides`
Create an override (per instance or rack).

#### `DELETE /api/simulator/overrides`
Clear all overrides.

#### `DELETE /api/simulator/overrides/{id}`
Delete a specific override.

---

## Development

The API server runs on port `8000` inside the Docker container.
In development mode, it uses auto-reload.
