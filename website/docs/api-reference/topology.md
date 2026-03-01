---
id: topology
title: Topology & Catalog API
sidebar_position: 3
---

# Topology & Catalog API

This page covers the three main configuration APIs: **Topology** (sites, rooms, aisles, racks, devices), **Catalog** (device and rack templates), and **Checks** (health check library).

All write operations persist changes to YAML files on disk and reload global backend state automatically.

---

## Topology

### Sites

#### GET /api/sites

Returns all sites with their room lists.

```bash
curl http://localhost:8000/api/sites
```

```json
[
  {
    "id": "dc1",
    "name": "Paris DC1",
    "description": "Main datacenter",
    "location": {
      "lat": 48.8566,
      "lon": 2.3522
    },
    "rooms": ["r001", "r002"]
  }
]
```

---

#### POST /api/topology/sites

Creates a new site. The `id` field is optional — if omitted, one is auto-generated from the name.

```bash
curl -X POST http://localhost:8000/api/topology/sites \
  -H "Content-Type: application/json" \
  -d '{"id": "dc1", "name": "Paris DC1"}'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | no | Site identifier (auto-generated if omitted) |
| `name` | string | yes | Human-readable site name |
| `description` | string | no | Optional description |
| `location.lat` | number | no | Latitude for world map pin |
| `location.lon` | number | no | Longitude for world map pin |

```json
{
  "site": {
    "id": "dc1",
    "name": "Paris DC1",
    "rooms": []
  }
}
```

:::tip
Supply `location.lat` and `location.lon` to make the site appear as a pin on the World Map view.
:::

---

#### `DELETE /api/topology/sites/{site_id}`

Deletes a site and all of its rooms, aisles, racks, and devices. This is irreversible.

```bash
curl -X DELETE http://localhost:8000/api/topology/sites/dc1
```

```json
{
  "status": "deleted",
  "site_id": "dc1"
}
```

:::warning
This cascades through the entire hierarchy: all rooms, aisles, racks, and devices under the site are permanently removed from YAML.
:::

---

### Rooms

#### GET /api/rooms

Returns all rooms across all sites, including their aisle and rack hierarchy.

```bash
curl http://localhost:8000/api/rooms
```

```json
[
  {
    "id": "r001",
    "name": "Server Room A",
    "site_id": "dc1",
    "aisles": [
      {
        "id": "a01",
        "name": "Aisle A01",
        "racks": [
          { "id": "a01-r01", "name": "Rack A01-R01" },
          { "id": "a01-r02", "name": "Rack A01-R02" }
        ]
      }
    ],
    "standalone_racks": [
      { "id": "standalone-r01", "name": "Standalone Rack" }
    ]
  }
]
```

---

#### `GET /api/rooms/{room_id}/layout`

Returns the full room object including layout metadata used to render the floor plan (grid dimensions, compass orientation, door position).

```bash
curl http://localhost:8000/api/rooms/r001/layout
```

```json
{
  "id": "r001",
  "name": "Server Room A",
  "site_id": "dc1",
  "layout": {
    "grid": {
      "rows": 6,
      "cols": 4
    },
    "compass": "north",
    "door": {
      "wall": "south",
      "position": 2
    }
  },
  "aisles": ["a01", "a02"],
  "standalone_racks": []
}
```

---

#### `POST /api/topology/sites/{site_id}/rooms`

Creates a new room under the specified site.

```bash
curl -X POST http://localhost:8000/api/topology/sites/dc1/rooms \
  -H "Content-Type: application/json" \
  -d '{"id": "r001", "name": "Server Room A", "description": "Main hall"}'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | no | Room identifier (auto-generated if omitted) |
| `name` | string | yes | Human-readable room name |
| `description` | string | no | Optional description |

```json
{
  "room": {
    "id": "r001",
    "name": "Server Room A",
    "description": "Main hall",
    "aisles": [],
    "standalone_racks": []
  },
  "site_id": "dc1"
}
```

---

#### `DELETE /api/topology/rooms/{room_id}`

Deletes a room and all aisles, racks, and devices it contains.

```bash
curl -X DELETE http://localhost:8000/api/topology/rooms/r001
```

```json
{
  "status": "deleted",
  "room_id": "r001"
}
```

---

### Aisles

#### `POST /api/topology/rooms/{room_id}/aisles/create`

Creates one or more aisles in a room in a single request.

```bash
curl -X POST http://localhost:8000/api/topology/rooms/r001/aisles/create \
  -H "Content-Type: application/json" \
  -d '{
    "aisles": [
      {"id": "a01", "name": "Aisle A01"},
      {"name": "Aisle A02"}
    ]
  }'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `aisles` | array | yes | List of aisle objects to create |
| `aisles[].id` | string | no | Aisle identifier (auto-generated if omitted) |
| `aisles[].name` | string | yes | Human-readable aisle name |

```json
{
  "room_id": "r001",
  "aisles": [
    { "id": "a01", "name": "Aisle A01", "racks": [] },
    { "id": "a02", "name": "Aisle A02", "racks": [] }
  ]
}
```

---

#### `PUT /api/topology/rooms/{room_id}/aisles`

Reorganizes the aisles in a room and assigns racks to each aisle. Use this to reorder aisles or move racks between aisles.

```bash
curl -X PUT http://localhost:8000/api/topology/rooms/r001/aisles \
  -H "Content-Type: application/json" \
  -d '{
    "aisles": {
      "a01": ["a01-r01", "a01-r02"],
      "a02": ["a02-r01"]
    }
  }'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `aisles` | object | yes | Map of aisle ID to ordered list of rack IDs |

```json
{
  "status": "ok",
  "room_id": "r001"
}
```

---

#### `DELETE /api/topology/aisles/{aisle_id}`

Deletes an aisle and all racks and devices it contains.

```bash
curl -X DELETE http://localhost:8000/api/topology/aisles/a01
```

```json
{
  "status": "deleted",
  "aisle_id": "a01"
}
```

---

### Racks

#### `PUT /api/topology/aisles/{aisle_id}/racks`

Reorders the racks within an aisle. The `room_id` is required for context.

```bash
curl -X PUT http://localhost:8000/api/topology/aisles/a01/racks \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "r001",
    "racks": ["a01-r01", "a01-r02", "a01-r03"]
  }'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `room_id` | string | yes | Parent room ID |
| `racks` | array | yes | Ordered list of rack IDs |

```json
{
  "status": "ok",
  "aisle_id": "a01",
  "racks": ["a01-r01", "a01-r02", "a01-r03"]
}
```

---

#### `GET /api/racks/{rack_id}`

Returns a rack with all of its devices, including device templates and instance definitions.

```bash
curl http://localhost:8000/api/racks/a01-r01
```

```json
{
  "id": "a01-r01",
  "name": "Rack A01-R01",
  "u_height": 42,
  "template_id": "standard-42u",
  "devices": [
    {
      "id": "compute-blade-01",
      "name": "Compute Blade 01",
      "template_id": "bs-x440-a5",
      "u_position": 1,
      "instance": "compute[001-020]"
    },
    {
      "id": "top-of-rack-switch",
      "name": "ToR Switch",
      "template_id": "qib-36p",
      "u_position": 40,
      "instance": ["switch01", "switch02"]
    }
  ]
}
```

---

#### `POST /api/topology/aisles/{aisle_id}/racks`

Creates a new rack in the specified aisle.

```bash
curl -X POST http://localhost:8000/api/topology/aisles/a01/racks \
  -H "Content-Type: application/json" \
  -d '{
    "id": "a01-r01",
    "name": "Rack A01-R01",
    "u_height": 42,
    "template_id": "standard-42u"
  }'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | no | Rack identifier (auto-generated if omitted) |
| `name` | string | yes | Human-readable rack name |
| `u_height` | integer | no | Rack height in rack units. Default: `42`, range: 1–100 |
| `template_id` | string | no | Rack template ID for built-in infrastructure (PDUs, HMC, etc.) |

```json
{
  "rack_id": "a01-r01",
  "name": "Rack A01-R01",
  "aisle_id": "a01"
}
```

---

#### `PUT /api/topology/racks/{rack_id}/template`

Assigns or removes a rack template. Pass `null` as `template_id` to detach the current template.

```bash
# Assign template
curl -X PUT http://localhost:8000/api/topology/racks/a01-r01/template \
  -H "Content-Type: application/json" \
  -d '{"template_id": "standard-42u"}'

# Remove template
curl -X PUT http://localhost:8000/api/topology/racks/a01-r01/template \
  -H "Content-Type: application/json" \
  -d '{"template_id": null}'
```

```json
{
  "status": "ok",
  "rack_id": "a01-r01",
  "template_id": "standard-42u"
}
```

:::note
Rack templates define built-in infrastructure like PDUs and HMC cooling modules. Removing a template removes those components from rack views.
:::

---

### Devices

#### `GET /api/racks/{rack_id}/devices/{device_id}`

Returns a device with full topology context: the device definition, its resolved template, and parent rack, aisle, room, and site.

```bash
curl http://localhost:8000/api/racks/a01-r01/devices/compute-blade-01
```

```json
{
  "device": {
    "id": "compute-blade-01",
    "name": "Compute Blade 01",
    "template_id": "bs-x440-a5",
    "u_position": 1,
    "instance": "compute[001-020]"
  },
  "template": {
    "id": "bs-x440-a5",
    "name": "BullSequana X440 A5",
    "type": "server",
    "u_height": 10,
    "layout": { "type": "grid", "rows": 5, "cols": 4 }
  },
  "rack": {
    "id": "a01-r01",
    "name": "Rack A01-R01"
  },
  "aisle": {
    "id": "a01",
    "name": "Aisle A01"
  },
  "room": {
    "id": "r001",
    "name": "Server Room A"
  },
  "site": {
    "id": "dc1",
    "name": "Paris DC1"
  }
}
```

---

#### `POST /api/topology/racks/{rack_id}/devices`

Adds a device to a rack. The `instance` field maps the device to Prometheus instance labels — it can be a pattern string, an explicit list, or a slot map.

```bash
curl -X POST http://localhost:8000/api/topology/racks/a01-r01/devices \
  -H "Content-Type: application/json" \
  -d '{
    "id": "compute-blade-01",
    "name": "Compute Blade 01",
    "template_id": "bs-x440-a5",
    "u_position": 1,
    "instance": "compute[001-020]"
  }'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | no | Device identifier (auto-generated if omitted) |
| `name` | string | yes | Human-readable device name |
| `template_id` | string | yes | Device template ID |
| `u_position` | integer | yes | Bottom U position in the rack (1 = lowest) |
| `instance` | string / array / object | no | Prometheus instance mapping (see below) |

**`instance` formats:**

```json
// Pattern string — expands to compute001, compute002, ..., compute020
"instance": "compute[001-020]"

// Explicit list
"instance": ["compute001", "compute002", "compute003"]

// Slot map — maps visual slot number to instance name
"instance": { "1": "compute001", "2": "compute002", "3": "compute003" }
```

```json
{
  "status": "ok",
  "rack_id": "a01-r01",
  "device_id": "compute-blade-01"
}
```

:::warning
Returns `400 Bad Request` if `u_position` overlaps with an existing device in the rack. Check the `GET /api/racks/{rack_id}` response to inspect current placements before adding.
:::

---

#### `PUT /api/topology/racks/{rack_id}/devices/{device_id}`

Moves a device to a new U position within the same rack.

```bash
curl -X PUT http://localhost:8000/api/topology/racks/a01-r01/devices/compute-blade-01 \
  -H "Content-Type: application/json" \
  -d '{"u_position": 5}'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `u_position` | integer | yes | New bottom U position in the rack |

```json
{
  "status": "ok",
  "rack_id": "a01-r01",
  "device_id": "compute-blade-01",
  "u_position": 5
}
```

:::warning
Returns `400 Bad Request` if the new position overlaps another device. The existing device is not moved on failure.
:::

---

#### `DELETE /api/topology/racks/{rack_id}/devices/{device_id}`

Removes a device from a rack.

```bash
curl -X DELETE http://localhost:8000/api/topology/racks/a01-r01/devices/compute-blade-01
```

```json
{
  "status": "ok",
  "rack_id": "a01-r01",
  "device_id": "compute-blade-01"
}
```

---

#### `PUT /api/topology/racks/{rack_id}/devices`

Replaces **all** devices in a rack atomically. Used by the Rack Editor to persist a full drag-and-drop session.

```bash
curl -X PUT http://localhost:8000/api/topology/racks/a01-r01/devices \
  -H "Content-Type: application/json" \
  -d '{
    "devices": [
      {
        "id": "compute-blade-01",
        "name": "Compute Blade 01",
        "template_id": "bs-x440-a5",
        "u_position": 1,
        "instance": "compute[001-020]"
      },
      {
        "id": "top-of-rack-switch",
        "name": "ToR Switch",
        "template_id": "qib-36p",
        "u_position": 40,
        "instance": ["switch01", "switch02"]
      }
    ]
  }'
```

```json
{
  "status": "ok",
  "rack_id": "a01-r01",
  "devices": 2
}
```

:::warning
This replaces the entire device list for the rack. Any device not included in the request body will be deleted. Prefer the individual `POST` / `PUT` / `DELETE` endpoints for surgical changes.
:::

---

## Catalog {#catalog}

The catalog stores device templates, rack templates, and rack component templates. Templates define hardware dimensions, visual layouts, health checks, and metrics — they are referenced by topology devices and racks.

### GET /api/catalog

Returns the full catalog with all template types.

```bash
curl http://localhost:8000/api/catalog
```

```json
{
  "device_templates": [
    {
      "id": "bs-x440-a5",
      "name": "BullSequana X440 A5",
      "type": "server",
      "u_height": 10,
      "layout": {
        "type": "grid",
        "rows": 5,
        "cols": 4,
        "matrix": [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]]
      },
      "checks": ["node_up", "ipmi_temp_warn", "ipmi_temp_crit"],
      "metrics": ["node_temperature", "node_power"]
    }
  ],
  "rack_templates": [
    {
      "id": "standard-42u",
      "name": "Standard 42U Rack",
      "u_height": 42,
      "infrastructure": {
        "rack_components": ["pdu-left", "pdu-right"]
      },
      "checks": ["pdu_active_power"]
    }
  ],
  "rack_component_templates": [
    {
      "id": "pdu-vertiv-24c",
      "name": "Vertiv PDU 24C",
      "type": "pdu",
      "location": "side",
      "u_height": 1,
      "checks": ["pdu_active_power", "pdu_current"],
      "metrics": ["pdu_active_power", "pdu_current", "pdu_voltage"]
    }
  ]
}
```

---

### POST /api/catalog/templates

Creates a new template. Set `kind` to `"device"`, `"rack"`, or `"rack_component"` to indicate the template type.

```bash
curl -X POST http://localhost:8000/api/catalog/templates \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "device",
    "template": {
      "id": "my-2u-server",
      "name": "Generic 2U Server",
      "type": "server",
      "u_height": 2,
      "checks": ["node_up", "ipmi_temp_warn"],
      "metrics": ["node_temperature", "node_power"]
    }
  }'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | string | yes | Template type: `"device"`, `"rack"`, or `"rack_component"` |
| `template.id` | string | yes | Unique template identifier |
| `template.name` | string | yes | Human-readable template name |
| `template.type` | string | yes (device) | Device kind: `server`, `switch`, `storage`, `pdu`, `cooling` |
| `template.u_height` | integer | yes | Height in rack units |
| `template.layout` | object | no | Front-panel grid layout for chassis devices |
| `template.rear_layout` | object | no | Rear-panel grid layout |
| `template.checks` | array | no | List of check IDs applied to devices using this template |
| `template.metrics` | array | no | List of metric IDs shown on device detail views |

```json
{
  "status": "ok",
  "kind": "device",
  "id": "my-2u-server"
}
```

:::note
Returns `400 Bad Request` if a template with the same `id` already exists. Use `PUT /api/catalog/templates` to update an existing template.
:::

---

### PUT /api/catalog/templates

Updates an existing template. The body format is identical to `POST`. The existing template is replaced in full.

```bash
curl -X PUT http://localhost:8000/api/catalog/templates \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "device",
    "template": {
      "id": "my-2u-server",
      "name": "Generic 2U Server (updated)",
      "type": "server",
      "u_height": 2,
      "checks": ["node_up", "ipmi_temp_warn", "ipmi_temp_crit"],
      "metrics": ["node_temperature", "node_power", "node_cpu_load"]
    }
  }'
```

```json
{
  "status": "ok",
  "kind": "device",
  "id": "my-2u-server"
}
```

---

### `DELETE /api/catalog/templates/device/{template_id}`

Deletes a device template by ID.

```bash
curl -X DELETE http://localhost:8000/api/catalog/templates/device/my-2u-server
```

```json
{
  "status": "ok",
  "deleted": "my-2u-server"
}
```

:::warning
Deleting a template that is still referenced by topology devices will cause those devices to lose their template. Always verify topology references before deleting a template.
:::

---

### POST /api/catalog/templates/validate

Validates a template definition without saving it. Useful for editors and CI pipelines to check template correctness before committing.

```bash
curl -X POST http://localhost:8000/api/catalog/templates/validate \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "device",
    "template": {
      "id": "my-2u-server",
      "name": "Generic 2U Server",
      "type": "server",
      "u_height": 2
    }
  }'
```

**On success:**

```json
{
  "status": "ok"
}
```

**On failure (HTTP 400):**

```json
{
  "detail": "Validation error: u_height must be between 1 and 100"
}
```

---

## Checks {#checks}

Health checks are defined in YAML files under `config/checks/library/`. Each check specifies a PromQL expression, evaluation scope, and threshold rules that map metric values to health severities.

### GET /api/checks

Returns all checks loaded from the library.

```bash
curl http://localhost:8000/api/checks
```

```json
{
  "checks": [
    {
      "id": "node_up",
      "name": "Node Up",
      "kind": "server",
      "scope": "node",
      "expr": "up{job=\"node\", instance=~\"$instances\"}",
      "output": "bool",
      "rules": [
        { "op": "==", "value": 0, "severity": "CRIT" }
      ]
    },
    {
      "id": "ipmi_temp_warn",
      "name": "IPMI Temperature Warning",
      "kind": "server",
      "scope": "node",
      "expr": "ipmi_temperature_celsius{instance=~\"$instances\"}",
      "output": "numeric",
      "rules": [
        { "op": ">=", "value": 70, "severity": "WARN" },
        { "op": ">=", "value": 85, "severity": "CRIT" }
      ]
    }
  ]
}
```

**Check fields:**

| Field | Description |
|-------|-------------|
| `id` | Unique check identifier, referenced by templates |
| `name` | Human-readable label shown in the UI |
| `kind` | Device type filter: `server`, `switch`, `storage`, `pdu`, `cooling` |
| `scope` | Evaluation scope: `node`, `chassis`, or `rack` |
| `expr` | PromQL expression with placeholders (`$instances`, `$chassis`, `$racks`) |
| `output` | Result type: `bool` (0/1) or `numeric` (threshold comparison) |
| `rules` | Ordered list of threshold rules mapping values to severities |

---

### GET /api/checks/files

Returns the list of YAML files that make up the checks library.

```bash
curl http://localhost:8000/api/checks/files
```

```json
{
  "files": [
    {
      "name": "up.yaml",
      "path": "config/checks/library/up.yaml",
      "relative": "up.yaml"
    },
    {
      "name": "ipmi.yaml",
      "path": "config/checks/library/ipmi.yaml",
      "relative": "ipmi.yaml"
    },
    {
      "name": "pdu.yaml",
      "path": "config/checks/library/pdu.yaml",
      "relative": "pdu.yaml"
    }
  ]
}
```

---

### `GET /api/checks/files/{filename}`

Reads the raw YAML content of a specific checks file. Used by the Checks Library editor.

```bash
curl http://localhost:8000/api/checks/files/up.yaml
```

```json
{
  "name": "up.yaml",
  "content": "checks:\n  - id: node_up\n    name: Node Up\n    kind: server\n    scope: node\n    expr: 'up{job=\"node\", instance=~\"$instances\"}'\n    output: bool\n    rules:\n      - op: \"==\"\n        value: 0\n        severity: CRIT\n"
}
```

---

### `PUT /api/checks/files/{filename}`

Writes a new YAML content to a checks file. The backend validates the YAML structure and check definitions before saving. If validation fails, the file is not modified.

```bash
curl -X PUT http://localhost:8000/api/checks/files/up.yaml \
  -H "Content-Type: application/json" \
  -d '{
    "content": "checks:\n  - id: node_up\n    name: Node Up\n    kind: server\n    scope: node\n    expr: '\''up{job=\"node\", instance=~\"$instances\"}'\''\\n    output: bool\n    rules:\n      - op: \"==\"\n        value: 0\n        severity: CRIT\n"
  }'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | yes | Full YAML content of the checks file |

```json
{
  "status": "ok",
  "name": "up.yaml"
}
```

:::warning
Returns `400 Bad Request` if the YAML is syntactically invalid or if check definitions fail schema validation (missing required fields, unknown severity values, etc.). The original file is preserved on failure.
:::

---

### POST /api/checks/test

Tests a PromQL expression by substituting variable placeholders and executing the query against Prometheus. Useful for validating expressions in the Checks Library editor before saving.

```bash
curl -X POST http://localhost:8000/api/checks/test \
  -H "Content-Type: application/json" \
  -d '{
    "expr": "up{job=\"node\", instance=~\"$instances\"}",
    "variables": {
      "instances": "compute001|compute002"
    }
  }'
```

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `expr` | string | yes | PromQL expression with `$instances`, `$chassis`, `$racks` placeholders |
| `variables` | object | yes | Placeholder substitutions (key = placeholder name without `$`) |

```json
{
  "expr": "up{job=\"node\", instance=~\"compute001|compute002\"}",
  "prometheus": {
    "status": "success",
    "data": {
      "resultType": "vector",
      "result": [
        {
          "metric": { "instance": "compute001", "job": "node" },
          "value": [1706745600, "1"]
        },
        {
          "metric": { "instance": "compute002", "job": "node" },
          "value": [1706745600, "0"]
        }
      ]
    }
  }
}
```

:::tip
Use this endpoint to verify that your PromQL expression returns the expected shape of data before adding a check to the library. A result with `"value": "0"` for `node_up` means the node is reported as down.
:::

:::note Performance
Check test queries bypass the planner cache and execute directly against Prometheus, so they always return fresh data. Do not use this endpoint in automated polling loops.
:::
