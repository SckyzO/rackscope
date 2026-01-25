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

#### `GET /api/catalog`
Retrieve all available hardware templates (devices and racks).

#### `GET /api/checks`
Retrieve the checks library (built-in monitoring checks).

---

## Development

The API server runs on port `8000` inside the Docker container.
In development mode, it uses auto-reload.
