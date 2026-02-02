# Metrics Library

The Metrics Library defines how metrics are collected, displayed, and visualized in Rackscope. Unlike health checks (which determine OK/WARN/CRIT states), metrics focus on **data visualization** and **historical trends**.

## Overview

**Metrics** vs **Checks**:
- **Checks** (`config/checks/library/`) → Health states (OK/WARN/CRIT)
- **Metrics** (`config/metrics/library/`) → Data visualization (charts, gauges, trends)

A metric can be referenced by templates and rendered in the UI with proper units, colors, and time ranges.

## Architecture

```
config/metrics/library/          ← Metric definitions (YAML)
  ├── node_cpu_usage.yaml
  ├── node_power_watts.yaml
  ├── pdu_active_power.yaml
  └── rack_temperature.yaml

src/rackscope/
  ├── model/metrics.py            ← Pydantic models
  ├── api/routers/metrics.py      ← API endpoints
  └── model/loader.py             ← YAML loader
```

## Metric Definition Format

Each metric is defined in a YAML file under `config/metrics/library/`.

### Basic Example

```yaml
# config/metrics/library/node_power_watts.yaml
id: node_power_watts
name: Node Power Consumption
description: Power consumption in watts from IPMI sensors
metric: ipmi_power_watts{instance="{instance}"}
labels:
  instance: "{instance}"
display:
  unit: "W"
  chart_type: line
  color: "#f59e0b"
  time_ranges:
    - 1h
    - 6h
    - 24h
    - 7d
  default_range: 24h
  aggregation: avg
  thresholds:
    warn: 300
    crit: 350
category: power
tags:
  - compute
  - hardware
  - ipmi
```

### Field Reference

#### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique metric identifier (e.g., `node_power_watts`) |
| `name` | string | ✅ | Human-readable name (e.g., "Node Power Consumption") |
| `description` | string | ❌ | Detailed description |
| `metric` | string | ✅ | Prometheus metric name or PromQL query |
| `labels` | dict | ❌ | Label substitutions for query templating |
| `display` | object | ✅ | Display configuration (see below) |
| `category` | string | ❌ | Metric category (power, temperature, network, storage, performance) |
| `tags` | list | ❌ | Tags for filtering and grouping |

#### Display Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `unit` | string | ✅ | Display unit (`W`, `°C`, `%`, `bytes`, `bps`, etc.) |
| `chart_type` | string | ❌ | Chart type: `line`, `area`, `bar`, `gauge` (default: `line`) |
| `color` | string | ❌ | Hex color for chart (e.g., `#3b82f6`) |
| `time_ranges` | list | ❌ | Available time ranges (default: `["1h", "6h", "24h", "7d"]`) |
| `default_range` | string | ❌ | Default time range (default: `24h`) |
| `aggregation` | string | ❌ | Aggregation function: `avg`, `max`, `min`, `sum`, `p95`, `p99` (default: `avg`) |
| `thresholds` | dict | ❌ | Visual thresholds (`warn`, `crit`) for indicators |
| `format` | dict | ❌ | Formatting options (`decimals`, `multiplier`, `prefix`, `suffix`) |

### Advanced Examples

#### Complex PromQL Query

```yaml
id: node_cpu_usage
name: Node CPU Usage
description: CPU usage percentage (100 - idle time)
metric: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle",instance="{instance}"}[5m])) * 100)
labels:
  instance: "{instance}"
display:
  unit: "%"
  chart_type: area
  color: "#3b82f6"
  time_ranges:
    - 1h
    - 6h
    - 24h
    - 7d
  default_range: 6h
  aggregation: avg
  thresholds:
    warn: 80
    crit: 95
category: performance
tags:
  - compute
  - cpu
  - node_exporter
```

#### Rack-Level Metric

```yaml
id: pdu_active_power
name: PDU Active Power
description: PDU active power consumption in watts
metric: raritan_pdu_activepower_watt{rack_id="{rack_id}"}
labels:
  rack_id: "{rack_id}"
  pduid: "{pduid}"
  inletid: "{inletid}"
display:
  unit: "W"
  chart_type: area
  color: "#f59e0b"
  time_ranges:
    - 1h
    - 6h
    - 24h
    - 7d
    - 30d
  default_range: 6h
  aggregation: avg
  thresholds:
    warn: 3000
    crit: 3500
  format:
    decimals: 1
category: power
tags:
  - infrastructure
  - pdu
  - energy
```

#### Network Metric with Formatting

```yaml
id: node_network_receive_bytes
name: Network Receive Rate
description: Network receive rate in bytes per second
metric: rate(node_network_receive_bytes_total{instance="{instance}",device!="lo"}[5m])
labels:
  instance: "{instance}"
  device: "{device}"
display:
  unit: "Bps"
  chart_type: line
  color: "#10b981"
  time_ranges:
    - 1h
    - 6h
    - 24h
  default_range: 6h
  aggregation: avg
  format:
    decimals: 2
    multiplier: 1
    prefix: ""
    suffix: "/s"
category: network
tags:
  - network
  - node_exporter
```

## Label Substitutions

Labels support template substitutions for dynamic queries:

| Variable | Description | Example |
|----------|-------------|---------|
| `{instance}` | Node/device instance name | `compute001` |
| `{rack_id}` | Rack identifier | `r01-01` |
| `{chassis_id}` | Chassis identifier | `r01-01-c01` |
| `{device}` | Network device name | `eth0`, `ib0` |
| `{pduid}` | PDU identifier | `pdu-left` |
| `{inletid}` | PDU inlet identifier | `inlet1` |

**Example Usage**:
```yaml
metric: node_temperature_celsius{instance="{instance}"}
labels:
  instance: "{instance}"
```

When queried for `compute001`, becomes:
```promql
node_temperature_celsius{instance="compute001"}
```

## Template Integration

Templates reference metrics by ID to specify which metrics to collect and display.

### Device Template

```yaml
# config/templates/devices/server/my-server.yaml
templates:
  - id: my-quad-server
    name: "Quad Node 2U Server"
    type: server
    u_height: 2
    layout:
      type: grid
      rows: 2
      cols: 2
      matrix: [[1, 2], [3, 4]]
    metrics:
      - node_cpu_usage
      - node_power_watts
      - node_temperature_celsius
      - node_memory_used_percent
    checks:
      - node_up
      - ipmi_temp_warn
```

### Rack Component Template

```yaml
# config/templates/rack_components/pdu.yaml
rack_component_templates:
  - id: pdu-raritan-16u
    name: PDU Raritan
    type: pdu
    location: side
    u_height: 16
    metrics:
      - pdu_active_power
      - pdu_voltage
      - pdu_energy_total
    checks:
      - pdu_power_present
      - pdu_current_warn
```

## API Endpoints

### GET /api/metrics/library

Get all metrics from the library.

**Response**:
```json
{
  "metrics": [
    {
      "id": "node_cpu_usage",
      "name": "Node CPU Usage",
      "description": "CPU usage percentage",
      "metric": "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\",instance=\"{instance}\"}[5m])) * 100)",
      "labels": {
        "instance": "{instance}"
      },
      "display": {
        "unit": "%",
        "chart_type": "area",
        "color": "#3b82f6",
        "time_ranges": ["1h", "6h", "24h", "7d"],
        "default_range": "6h",
        "aggregation": "avg",
        "thresholds": {
          "warn": 80,
          "crit": 95
        }
      },
      "category": "performance",
      "tags": ["compute", "cpu", "node_exporter"]
    }
  ]
}
```

### GET /api/metrics/library/{metric_id}

Get a specific metric by ID.

**Example**: `GET /api/metrics/library/node_cpu_usage`

**Response**:
```json
{
  "id": "node_cpu_usage",
  "name": "Node CPU Usage",
  "description": "CPU usage percentage",
  "metric": "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\",instance=\"{instance}\"}[5m])) * 100)",
  "labels": {
    "instance": "{instance}"
  },
  "display": {
    "unit": "%",
    "chart_type": "area",
    "color": "#3b82f6"
  },
  "category": "performance",
  "tags": ["compute", "cpu"]
}
```

### POST /api/metrics/data

Query metric data with parameters.

**Request**:
```json
{
  "metric_id": "node_cpu_usage",
  "targets": ["compute001", "compute002", "compute003"],
  "time_range": "6h",
  "aggregation": "avg"
}
```

**Response**:
```json
{
  "metric_id": "node_cpu_usage",
  "data": {
    "compute001": [
      [1675000000, 45.2],
      [1675003600, 48.1],
      [1675007200, 52.3]
    ],
    "compute002": [
      [1675000000, 38.5],
      [1675003600, 41.2],
      [1675007200, 39.8]
    ]
  },
  "unit": "%",
  "color": "#3b82f6"
}
```

### GET /api/metrics/files

List all metric files in the library.

**Response**:
```json
{
  "files": [
    "node_cpu_usage.yaml",
    "node_power_watts.yaml",
    "pdu_active_power.yaml"
  ]
}
```

### GET /api/metrics/files/{filename}

Get the raw YAML content of a metric file.

**Example**: `GET /api/metrics/files/node_cpu_usage.yaml`

### PUT /api/metrics/files/{filename}

Update a metric file (validated).

**Request**:
```yaml
id: node_cpu_usage
name: Node CPU Usage (Updated)
metric: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
# ... rest of fields
```

## Categories

Standard metric categories:

| Category | Description | Examples |
|----------|-------------|----------|
| `power` | Power consumption, energy | PDU power, node watts |
| `temperature` | Temperature sensors | CPU temp, ambient temp |
| `network` | Network traffic, bandwidth | RX/TX bytes, packet loss |
| `storage` | Disk I/O, capacity | Disk read/write, usage % |
| `performance` | CPU, memory, load | CPU usage, memory used |
| `hardware` | Hardware status | Fan speed, voltage |

## Tags

Use tags for flexible filtering and grouping:

**Common Tags**:
- **Source**: `node_exporter`, `ipmi`, `snmp`, `redfish`, `eseries`
- **Component**: `cpu`, `memory`, `disk`, `network`, `psu`, `fan`
- **Scope**: `compute`, `storage`, `network`, `infrastructure`
- **Priority**: `critical`, `important`, `optional`

**Example**:
```yaml
tags:
  - compute
  - hardware
  - ipmi
  - critical
```

Query metrics by tag:
```bash
curl http://localhost:8000/api/metrics/library?tag=compute
```

## Best Practices

### 1. Metric Naming

- Use descriptive IDs: `node_cpu_usage`, `pdu_active_power`
- Match Prometheus conventions when possible
- Prefix by scope: `node_*`, `rack_*`, `pdu_*`, `switch_*`

### 2. Units

Use standard SI units:
- Power: `W` (watts), `kW` (kilowatts)
- Temperature: `°C`, `°F`, `K`
- Network: `Bps` (bytes/sec), `bps` (bits/sec), `Gbps`
- Storage: `bytes`, `MB`, `GB`, `TB`
- Percentage: `%`

### 3. Color Scheme

Use consistent colors by category:
- **Power**: `#f59e0b` (amber)
- **Temperature**: `#ef4444` (red)
- **Network**: `#10b981` (green)
- **Performance**: `#3b82f6` (blue)
- **Storage**: `#8b5cf6` (purple)

### 4. Thresholds

Set realistic thresholds based on your hardware:

```yaml
thresholds:
  warn: 80   # Yellow indicator at 80%
  crit: 95   # Red indicator at 95%
```

### 5. Aggregation

Choose aggregation based on metric type:
- **CPU/Memory**: `avg` (average usage)
- **Power**: `sum` (total consumption)
- **Temperature**: `max` (hottest sensor)
- **Latency**: `p95`, `p99` (percentiles)

### 6. Time Ranges

Provide meaningful ranges:
- **Real-time monitoring**: `["5m", "15m", "1h"]`
- **Operational**: `["1h", "6h", "24h"]`
- **Historical**: `["24h", "7d", "30d"]`

## Creating New Metrics

### Step 1: Create YAML File

Create `config/metrics/library/my_metric.yaml`:

```yaml
id: my_metric
name: My Custom Metric
description: Description of what this metric measures
metric: prometheus_metric_name{label="{value}"}
labels:
  value: "{value}"
display:
  unit: "unit"
  chart_type: line
  color: "#3b82f6"
  time_ranges:
    - 1h
    - 6h
    - 24h
  default_range: 24h
  aggregation: avg
category: performance
tags:
  - custom
```

### Step 2: Reference in Template

Add metric ID to device/rack template:

```yaml
templates:
  - id: my-device
    metrics:
      - my_metric  # Reference by ID
```

### Step 3: Reload Backend

```bash
make restart
```

Or use the API:
```bash
curl -X PUT http://localhost:8000/api/metrics/files/my_metric.yaml \
  -H "Content-Type: application/yaml" \
  --data-binary @config/metrics/library/my_metric.yaml
```

### Step 4: Query Data

```bash
curl -X POST http://localhost:8000/api/metrics/data \
  -H "Content-Type: application/json" \
  -d '{
    "metric_id": "my_metric",
    "targets": ["device001"],
    "time_range": "6h"
  }'
```

## Troubleshooting

### Metric Not Loading

1. **Check YAML syntax**:
   ```bash
   python -c "import yaml; yaml.safe_load(open('config/metrics/library/my_metric.yaml'))"
   ```

2. **Check logs**:
   ```bash
   make logs | grep "metrics"
   ```

3. **Verify metric ID is unique**:
   ```bash
   curl http://localhost:8000/api/metrics/library | jq '.metrics[].id'
   ```

### Data Not Showing

1. **Test Prometheus query directly**:
   ```bash
   curl 'http://localhost:9090/api/v1/query?query=my_metric'
   ```

2. **Check label substitution**:
   ```yaml
   # Ensure labels match your Prometheus data
   metric: my_metric{instance="{instance}"}
   labels:
     instance: "{instance}"
   ```

3. **Verify instance name matches**:
   ```bash
   curl http://localhost:8000/api/racks/r01-01 | jq '.devices[].instances'
   ```

### Chart Not Displaying

1. **Check color format** (must be hex):
   ```yaml
   color: "#3b82f6"  # ✅ Valid
   color: "blue"      # ❌ Invalid
   ```

2. **Verify chart_type**:
   ```yaml
   chart_type: line   # ✅ Valid: line, area, bar, gauge
   chart_type: pie    # ❌ Invalid
   ```

3. **Check time_ranges format**:
   ```yaml
   time_ranges:
     - 1h    # ✅ Valid
     - 6h
     - 24h
   ```

## Examples by Category

### Power Metrics

```yaml
id: node_power_watts
name: Node Power Consumption
metric: ipmi_power_watts{instance="{instance}"}
labels:
  instance: "{instance}"
display:
  unit: "W"
  chart_type: area
  color: "#f59e0b"
  aggregation: avg
  thresholds:
    warn: 300
    crit: 350
category: power
tags: [compute, hardware, ipmi]
```

### Temperature Metrics

```yaml
id: node_temperature_celsius
name: Node Temperature
metric: ipmi_temperature_celsius{instance="{instance}"}
labels:
  instance: "{instance}"
display:
  unit: "°C"
  chart_type: line
  color: "#ef4444"
  aggregation: max
  thresholds:
    warn: 70
    crit: 85
category: temperature
tags: [compute, hardware, ipmi]
```

### Network Metrics

```yaml
id: node_network_transmit_bytes
name: Network Transmit Rate
metric: rate(node_network_transmit_bytes_total{instance="{instance}"}[5m])
labels:
  instance: "{instance}"
  device: "{device}"
display:
  unit: "Bps"
  chart_type: area
  color: "#10b981"
  aggregation: avg
  format:
    decimals: 2
    suffix: "/s"
category: network
tags: [network, node_exporter]
```

### Storage Metrics

```yaml
id: node_disk_usage_percent
name: Disk Usage
metric: (1 - (node_filesystem_avail_bytes{instance="{instance}"} / node_filesystem_size_bytes{instance="{instance}"})) * 100
labels:
  instance: "{instance}"
  mountpoint: "{mountpoint}"
display:
  unit: "%"
  chart_type: gauge
  color: "#8b5cf6"
  aggregation: avg
  thresholds:
    warn: 80
    crit: 90
category: storage
tags: [storage, node_exporter]
```

## See Also

- [ADMIN_GUIDE.md](ADMIN_GUIDE.md) - Template configuration
- [API_REFERENCE.md](API_REFERENCE.md) - API endpoints
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
