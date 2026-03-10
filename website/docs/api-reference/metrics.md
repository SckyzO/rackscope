---
id: metrics
title: Metrics API
sidebar_position: 4
---

# Metrics API

The Metrics API exposes the metrics library and live time-series data sourced from Prometheus. It is the primary interface used by the frontend for charts, metric discovery, and simulator configuration.

:::info Architecture note
Rackscope does **not** collect or store metrics. All data is queried live from Prometheus at request time. The metrics library is a YAML-driven catalog that describes *how* to query and display each metric — not the data itself.
:::

---

## Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/metrics/library` | List all metrics (with optional filtering) |
| `GET` | `/api/metrics/library/{metric_id}` | Get a single metric definition |
| `GET` | `/api/metrics/library/files` | List all YAML files in the metrics library directory |
| `GET` | `` `/api/metrics/library/files/{name}` `` | Read raw YAML content of a specific metric file |
| `PUT` | `` `/api/metrics/library/files/{name}` `` | Create or update a metric YAML file |
| `DELETE` | `` `/api/metrics/library/files/{name}` `` | Delete a metric YAML file |
| `GET` | `/api/metrics/data` | Query live time-series data from Prometheus |
| `GET` | `/api/metrics/categories` | List all unique categories |
| `GET` | `/api/metrics/tags` | List all unique tags |
| `GET` | `/api/metrics/files` | List YAML files in the metrics library directory (legacy) |

---

## <span class="method-get">GET</span> `/api/metrics/library`
List all metric definitions in the library. Supports filtering by category or tag.

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category. One of: `temperature`, `power`, `compute`, `storage`, `network`, `infrastructure` |
| `tag` | string | No | Filter by tag (e.g. `compute`, `hardware`, `ipmi`, `eseries`, `pdu`, `slurm`) |

### Response

```json
{
  "count": 38,
  "metrics": [
    {
      "id": "node_temperature",
      "name": "Node Temperature",
      "description": "CPU/IPMI temperature sensor",
      "metric": "node_hwmon_temp_celsius",
      "category": "temperature",
      "tags": ["compute", "hardware"],
      "display": {
        "unit": "°C",
        "chart_type": "line",
        "color": "#ef4444",
        "time_ranges": ["1h", "6h", "24h", "7d"],
        "default_range": "24h",
        "aggregation": "avg",
        "thresholds": { "warn": 70, "crit": 85 }
      }
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `count` | integer | Total number of metrics returned |
| `metrics` | array | List of metric definition objects |
| `metrics[].id` | string | Unique metric identifier |
| `metrics[].name` | string | Human-readable display name |
| `metrics[].description` | string | Short description of what the metric measures |
| `metrics[].metric` | string | Prometheus metric name used in PromQL queries |
| `metrics[].category` | string | Category for grouping and filtering |
| `metrics[].tags` | array of strings | Tags for secondary filtering |
| `metrics[].display` | object | Display configuration (see below) |
| `metrics[].display.unit` | string | Unit string shown in the UI (e.g. `°C`, `W`, `A`) |
| `metrics[].display.chart_type` | string | Chart type: `line`, `bar`, or `gauge` |
| `metrics[].display.color` | string | Hex color for the chart series |
| `metrics[].display.time_ranges` | array of strings | Allowed time range options |
| `metrics[].display.default_range` | string | Default time range selected in UI |
| `metrics[].display.aggregation` | string | Default aggregation function |
| `metrics[].display.thresholds` | object | Optional warn/crit thresholds for visual indicators |

### Examples

```bash
# All metrics
curl "http://localhost:8000/api/metrics/library"

# Temperature metrics only
curl "http://localhost:8000/api/metrics/library?category=temperature"

# All metrics tagged with 'ipmi'
curl "http://localhost:8000/api/metrics/library?tag=ipmi"

# Storage metrics tagged with 'eseries'
curl "http://localhost:8000/api/metrics/library?category=storage&tag=eseries"
```

---

## <span class="method-get">GET</span> `/api/metrics/library/{metric_id}`
Retrieve a single metric definition by its unique identifier.

### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `metric_id` | Metric identifier (e.g. `node_temperature`, `pdu_active_power`) |

### Response

Returns a single metric object with the same structure as entries in the library list response.

```json
{
  "id": "pdu_active_power",
  "name": "PDU Active Power",
  "description": "Active power draw reported by the PDU",
  "metric": "pdu_active_power_watts",
  "category": "power",
  "tags": ["pdu", "infrastructure"],
  "display": {
    "unit": "W",
    "chart_type": "line",
    "color": "#f59e0b",
    "time_ranges": ["1h", "6h", "24h", "7d"],
    "default_range": "6h",
    "aggregation": "avg",
    "thresholds": { "warn": 4000, "crit": 5000 }
  }
}
```

### Error Responses

| Status | Condition |
|--------|-----------|
| `404 Not Found` | No metric with the given `metric_id` exists in the library |
| `503 Service Unavailable` | Metrics library has not been loaded (check backend startup logs) |

### Example

```bash
curl "http://localhost:8000/api/metrics/library/node_temperature"
```

---

## Metrics Library Files (CRUD)

These endpoints allow you to list, read, create, update, and delete metric YAML files directly via the API. The metrics library is automatically reloaded after every write or delete operation.

:::tip Visual editor
The **Metrics Library Editor** at `/editors/metrics` provides a visual UI for managing metric definitions without editing raw YAML. Use these API endpoints for automation, importers, or CI/CD workflows.
:::

---

### <span class="method-get">GET</span> `/api/metrics/library/files`
List all YAML files present in the metrics library directory.

#### Response

```json
{
  "files": [
    {
      "name": "node_temperature.yaml",
      "path": "/app/config/metrics/library/node_temperature.yaml"
    },
    {
      "name": "pdu_active_power.yaml",
      "path": "/app/config/metrics/library/pdu_active_power.yaml"
    }
  ]
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `files` | array | List of file entries found in the library directory |
| `files[].name` | string | Filename (basename, e.g. `node_temperature.yaml`) |
| `files[].path` | string | Absolute path inside the container |

#### Example

```bash
curl "http://localhost:8000/api/metrics/library/files"
```

---

### <span class="method-get">GET</span> `/api/metrics/library/files/{name}`
Read the raw YAML content of a specific metric file. The `{name}` parameter is the filename including the `.yaml` extension.

#### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `name` | Filename to read (e.g. `node_temperature.yaml`) |

#### Response

```json
{
  "name": "node_temperature.yaml",
  "content": "id: node_temperature\nname: Node Temperature\n..."
}
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| `404 Not Found` | No file with the given name exists in the library directory |
| `503 Service Unavailable` | Metrics library configuration has not been loaded |

#### Example

```bash
curl "http://localhost:8000/api/metrics/library/files/node_temperature.yaml"
```

---

### <span class="method-put">PUT</span> `/api/metrics/library/files/{name}`
Create or update a metric YAML file. The metrics library is automatically reloaded after the file is saved.

#### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `name` | Filename to create or overwrite (e.g. `my_metric.yaml`) |

#### Request Body

```json
{
  "content": "id: my_metric\nname: My Metric\ndescription: A custom metric\nmetric: my_prometheus_metric\ndisplay:\n  unit: W\n  chart_type: line\n  aggregation: avg\ncategory: power\ntags: [infrastructure]"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Yes | Raw YAML content to write to the file |

#### Response

```json
{ "status": "ok", "name": "my_metric.yaml" }
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| `400 Bad Request` | The provided YAML content is invalid and could not be parsed |
| `503 Service Unavailable` | Metrics library configuration has not been loaded |

#### Example

```bash
curl -X PUT "http://localhost:8000/api/metrics/library/files/my_metric.yaml" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "id: my_metric\nname: My Metric\nmetric: my_prometheus_metric\ncategory: power\ndisplay:\n  unit: W\n  chart_type: line\n  aggregation: avg"
  }'
```

---

### <span class="method-delete">DELETE</span> `/api/metrics/library/files/{name}`
Delete a metric YAML file and reload the metrics library. This operation is irreversible.

#### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `name` | Filename to delete (e.g. `my_metric.yaml`) |

#### Response

```json
{ "status": "deleted", "name": "my_metric.yaml" }
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| `404 Not Found` | No file with the given name exists in the library directory |
| `503 Service Unavailable` | Metrics library configuration has not been loaded |

#### Example

```bash
curl -X DELETE "http://localhost:8000/api/metrics/library/files/my_metric.yaml"
```

---

## <span class="method-get">GET</span> `/api/metrics/data`
Query live time-series metric data from Prometheus. This is the primary endpoint consumed by frontend charts.

:::caution Performance
Each call to this endpoint issues one or more range queries against Prometheus. Avoid calling it in tight loops or for many instances simultaneously — prefer batching or using the [Telemetry Planner](/docs/architecture/backend#telemetry-planner) for health state queries instead.
:::

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `metric_id` | string | Yes | — | Metric ID from the library (e.g. `node_temperature`) |
| `target_id` | string | Yes | — | Instance or node name to query (e.g. `compute001`, `a01-r01`) |
| `time_range` | string | No | `24h` | Time window to query. One of: `1h`, `6h`, `24h`, `7d`, `30d` |
| `aggregation` | string | No | metric default | Override the aggregation function. One of: `avg`, `max`, `min`, `sum`, `p95`, `p99` |
| `step` | string | No | `1m` | Prometheus query resolution step. One of: `1m`, `5m`, `15m`, `1h` |

### Response

```json
{
  "metric_id": "node_temperature",
  "target_id": "compute001",
  "time_range": "24h",
  "step": "1m",
  "unit": "°C",
  "aggregation": "avg",
  "query": "avg_over_time(node_hwmon_temp_celsius{instance=\"compute001\"}[5m])",
  "series": [
    {
      "metric": { "instance": "compute001", "job": "node_exporter" },
      "values": [
        [1706745600, "42.5"],
        [1706745660, "43.1"],
        [1706745720, "42.8"]
      ]
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `metric_id` | string | The metric ID that was queried |
| `target_id` | string | The target instance that was queried |
| `time_range` | string | The time range used |
| `step` | string | The resolution step used |
| `unit` | string | Display unit (from the metric definition) |
| `aggregation` | string | Aggregation function applied |
| `query` | string | The exact PromQL query that was sent to Prometheus |
| `series` | array | List of time series returned by Prometheus |
| `series[].metric` | object | Label set identifying this series |
| `series[].values` | array | List of `[unix_timestamp, string_value]` pairs |

:::note Values format
The `values` array uses the standard Prometheus range query format: each entry is a two-element array `[unix_timestamp, string_value]`. The timestamp is a Unix epoch integer; the value is a string representation of the float (e.g. `"42.5"`). Parse the value with `parseFloat()` on the frontend.
:::

### Error Responses

| Status | Condition |
|--------|-----------|
| `400 Bad Request` | `metric_id` not found in library, or `target_id` is missing/invalid |
| `500 Internal Server Error` | Prometheus query failed (check Prometheus connectivity) |
| `503 Service Unavailable` | Metrics library has not been loaded |

### Examples

```bash
# Temperature for compute001 over the last 24 hours
curl "http://localhost:8000/api/metrics/data?metric_id=node_temperature&target_id=compute001&time_range=24h"

# PDU active power for rack a01-r01 over the last 6 hours, at 5-minute resolution
curl "http://localhost:8000/api/metrics/data?metric_id=pdu_active_power&target_id=a01-r01&time_range=6h&step=5m"

# Peak CPU load for compute042 over the last hour
curl "http://localhost:8000/api/metrics/data?metric_id=node_cpu_load&target_id=compute042&time_range=1h&aggregation=max"
```

---

## <span class="method-get">GET</span> `/api/metrics/categories`
List all unique metric categories present in the loaded library.

### Response

```json
{
  "categories": [
    "compute",
    "infrastructure",
    "network",
    "power",
    "storage",
    "temperature"
  ]
}
```

Categories are returned in alphabetical order.

### Example

```bash
curl "http://localhost:8000/api/metrics/categories"
```

---

## <span class="method-get">GET</span> `/api/metrics/tags`
List all unique tags across all metrics in the loaded library.

### Response

```json
{
  "tags": [
    "compute",
    "eseries",
    "hardware",
    "hpc",
    "infrastructure",
    "ipmi",
    "network",
    "pdu",
    "sequana3",
    "slurm",
    "storage"
  ]
}
```

Tags are returned in alphabetical order.

### Example

```bash
curl "http://localhost:8000/api/metrics/tags"
```

---

## <span class="method-get">GET</span> `/api/metrics/files`
List YAML files present in the metrics library directory. Used internally by the simulator and the Settings UI to enumerate available configuration files.

### Response

```json
{
  "files": [
    {
      "name": "node_temperature.yaml",
      "path": "config/metrics/library/node_temperature.yaml"
    },
    {
      "name": "pdu_active_power.yaml",
      "path": "config/metrics/library/pdu_active_power.yaml"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `files` | array | List of file entries found in the library directory |
| `files[].name` | string | Filename (basename only) |
| `files[].path` | string | Relative path from the project root |

### Example

```bash
curl "http://localhost:8000/api/metrics/files"
```

---

## Metric Definition Format

Each metric is defined as a YAML file in `config/metrics/library/`. A single file may contain one or more metric definitions.

```yaml
metrics:
  - id: node_temperature
    name: "Node Temperature"
    description: "CPU/IPMI temperature sensor reported by node_exporter hwmon"
    metric: node_hwmon_temp_celsius
    category: temperature
    tags:
      - compute
      - hardware
      - ipmi
    display:
      unit: "°C"
      chart_type: line
      color: "#ef4444"
      time_ranges: ["1h", "6h", "24h", "7d"]
      default_range: "24h"
      aggregation: avg
      thresholds:
        warn: 70
        crit: 85
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier used in API calls and template references |
| `name` | string | Yes | Human-readable label shown in the UI |
| `description` | string | No | Short explanation of what the metric measures |
| `metric` | string | Yes | Prometheus metric name (used to construct PromQL queries) |
| `category` | string | Yes | Category for filtering and UI grouping |
| `tags` | list of strings | No | Secondary labels for finer filtering |
| `display.unit` | string | No | Unit string appended to values in the UI |
| `display.chart_type` | string | No | `line` (default), `bar`, or `gauge` |
| `display.color` | string | No | Hex color for the chart series |
| `display.time_ranges` | list of strings | No | Time ranges offered in the UI dropdown |
| `display.default_range` | string | No | Default time range pre-selected in the UI |
| `display.aggregation` | string | No | Default aggregation: `avg`, `max`, `min`, `sum`, `p95`, `p99` |
| `display.thresholds.warn` | number | No | Value above which the UI shows a warning indicator |
| `display.thresholds.crit` | number | No | Value above which the UI shows a critical indicator |

:::tip Adding a new metric
1. Create or edit a YAML file in `config/metrics/library/`.
2. Add your metric definition following the format above.
3. Restart the backend: `make restart` (or `docker compose restart backend`).
4. Verify it appears at `GET /api/metrics/library`.

No code changes required — the library is fully configuration-driven.
:::

---

## Available Categories

| Category | Description | Typical metrics |
|----------|-------------|-----------------|
| `temperature` | Thermal sensors from IPMI, hwmon, or chassis management | CPU temperature, chassis inlet/outlet, drive temperature |
| `power` | Power consumption at device, rack, or PDU level | Node power draw, PDU active power, rack total wattage |
| `compute` | CPU and memory utilization metrics | CPU load, memory used/free, system load average |
| `storage` | Disk and array health or throughput metrics | Drive status, controller IOPS, array rebuild progress |
| `network` | Interface state and throughput metrics | Port link state, port speed, RX/TX bytes |
| `infrastructure` | Rack-level shared components: PDUs, cooling, humidity | PDU current, PDU voltage, fan speed, humidity |

---

## Workflow Example

The following example walks through a typical frontend chart rendering flow.

### Step 1 — Discover temperature metrics

```bash
GET /api/metrics/library?category=temperature
```

```json
{
  "count": 3,
  "metrics": [
    { "id": "node_temperature", "name": "Node Temperature", ... },
    { "id": "chassis_inlet_temp", "name": "Chassis Inlet Temperature", ... },
    { "id": "drive_temperature", "name": "Drive Temperature", ... }
  ]
}
```

### Step 2 — Query a node's temperature over 24 hours

```bash
GET /api/metrics/data?metric_id=node_temperature&target_id=compute001&time_range=24h
```

```json
{
  "metric_id": "node_temperature",
  "target_id": "compute001",
  "time_range": "24h",
  "step": "1m",
  "unit": "°C",
  "aggregation": "avg",
  "query": "avg_over_time(node_hwmon_temp_celsius{instance=\"compute001\"}[5m])",
  "series": [
    {
      "metric": { "instance": "compute001", "job": "node_exporter" },
      "values": [
        [1706745600, "42.5"],
        [1706745660, "43.1"],
        [1706745720, "42.8"]
      ]
    }
  ]
}
```

Pass `series[0].values` directly to a Chart.js dataset — map `values[i][0]` to the x-axis timestamp and `parseFloat(values[i][1])` to the y-axis.

### Step 3 — Plot PDU power over 6 hours for a rack

```bash
GET /api/metrics/data?metric_id=pdu_active_power&target_id=a01-r01&time_range=6h&step=5m
```

Use `step=5m` for PDU and rack-level metrics to reduce the number of data points returned and keep chart rendering fast. The `target_id` here is the rack or PDU instance name as defined in the topology.

:::info Tip — choosing `step`
Smaller steps (`1m`) give higher resolution but return more points. For time ranges of `24h` or longer, prefer `step=5m` or `step=15m` to keep response sizes reasonable and Prometheus load low.
:::
