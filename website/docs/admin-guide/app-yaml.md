---
id: app-yaml
title: app.yaml Reference
sidebar_position: 5
---

# app.yaml — Complete Reference

The `config/app.yaml` file is the central configuration file for Rackscope. Every aspect of the
system — from Prometheus connectivity to plugin behavior — is controlled here. The file is loaded
at startup and can be reloaded without restarting the container via the Settings UI or by
calling `POST /api/config/reload`.

## Quick Navigation

| Section | Purpose |
|---------|---------|
| [`app`](#app) | Application identity |
| [`paths`](#paths) | File system paths for all config |
| [`refresh`](#refresh) | State polling intervals |
| [`cache`](#cache) | Prometheus query cache TTLs |
| [`telemetry`](#telemetry) | Prometheus connection and authentication |
| [`planner`](#planner) | Batching and caching for PromQL execution |
| [`features`](#features) | Feature flags |
| [`auth`](#auth) | UI authentication |
| [`map`](#map) | World map defaults |
| [`playlist`](#playlist) | NOC screen rotation |
| [`plugins.simulator`](#pluginssimulator) | Demo/simulation mode |
| [`plugins.slurm`](#pluginsslurm) | Slurm workload manager integration |

---

## `app`

Application identity shown in the browser title and header.

```yaml
app:
  name: Rackscope
  description: Datacenter Monitoring
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `name` | string | `Rackscope` | Application name displayed in the UI header and browser tab |
| `description` | string | `Datacenter Overview` | Short subtitle shown below the name |

---

## `paths`

Filesystem paths (relative to the working directory, or absolute) for the four configuration
directories that Rackscope loads at startup.

```yaml
paths:
  topology: config/topology
  templates: config/templates
  checks: config/checks/library
  metrics: config/metrics/library
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `topology` | string | — (required) | Path to topology root. Can be a directory (segmented layout) or a single `topology.yaml` file |
| `templates` | string | — (required) | Path to device and rack template directories |
| `checks` | string | — (required) | Path to health checks library directory (YAML files, one per family) |
| `metrics` | string | `config/metrics/library` | Path to metrics library directory (YAML files describing queryable metrics) |

:::note Segmented vs monolithic topology
When `topology` points to a directory, Rackscope expects the segmented layout:
`sites.yaml` at the root plus per-site/room/aisle/rack files. When it points to a
single `.yaml` file, the entire topology is loaded from that file. The segmented layout
is strongly recommended for production environments.
:::

---

## `refresh`

Controls how often Rackscope re-fetches health states from Prometheus for room and rack views.
These intervals affect how quickly changes appear in the UI.

```yaml
refresh:
  room_state_seconds: 60
  rack_state_seconds: 60
```

| Key | Type | Default | Min | Description |
|-----|------|---------|-----|-------------|
| `room_state_seconds` | integer | `30` | 10 | How often room-level health state is refreshed (seconds) |
| `rack_state_seconds` | integer | `30` | 10 | How often rack-level health state is refreshed (seconds) |

:::note Performance impact
Lower values increase Prometheus query frequency. For large topologies (hundreds of racks),
keep these at 60 seconds or higher. The TelemetryPlanner batches all queries, so the
actual Prometheus load is much lower than the number of devices might suggest.
:::

---

## `cache`

Controls the time-to-live (TTL) for different categories of Prometheus query results stored
in Rackscope's in-process cache. Separate TTLs allow fast health feedback while reducing load
from expensive metric queries.

```yaml
cache:
  ttl_seconds: 60               # Generic cache (backward compatibility)
  health_checks_ttl_seconds: 30 # Health check queries
  metrics_ttl_seconds: 120      # Detailed metrics
```

| Key | Type | Default | Min | Description |
|-----|------|---------|-----|-------------|
| `ttl_seconds` | integer | `30` | 1 | Generic cache TTL. Used for queries that do not fall into the categories below. Kept for backward compatibility |
| `health_checks_ttl_seconds` | integer | `30` | 1 | TTL for health check query results. Shorter = more responsive to failures |
| `metrics_ttl_seconds` | integer | `120` | 1 | TTL for detailed metric queries (temperature, power, PDU). Longer = fewer heavy Prometheus calls |

:::note Choosing TTL values
- `health_checks_ttl_seconds: 30` is a good balance — failures appear within 30 s.
- `metrics_ttl_seconds: 120` is intentional: metric charts are expensive and do not need
  sub-minute refresh. Reduce only if users need near-realtime metric graphs.
:::

---

## `telemetry`

All configuration for connecting to Prometheus, including URL, authentication, TLS, and
diagnostic tunables.

```yaml
telemetry:
  prometheus_url: http://prometheus:9090
  identity_label: instance
  rack_label: rack_id
  chassis_label: chassis_id
  job_regex: node|rackscope-simulator
  prometheus_heartbeat_seconds: 30
  prometheus_latency_window: 20
  debug_stats: false
  basic_auth_user: null
  basic_auth_password: null
  tls_verify: false
  tls_ca_file: null
  tls_cert_file: null
  tls_key_file: null
```

### Connection

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `prometheus_url` | string \| null | `null` | Full URL of the Prometheus HTTP API. Example: `http://prometheus:9090` or `https://prometheus.example.com` |
| `identity_label` | string | `instance` | Prometheus label that maps to topology instance names. Rackscope uses this label to match metric series to physical devices |
| `rack_label` | string | `rack_id` | Prometheus label used to identify rack-scoped metrics |
| `chassis_label` | string | `chassis_id` | Prometheus label used to identify chassis-scoped metrics |
| `job_regex` | string | `.*` | Regular expression matched against the Prometheus `job` label to filter relevant scrape targets. Example: `node\|rackscope-simulator` matches two jobs |

:::note `identity_label` is critical
If your node_exporter labels use `node` instead of `instance`, set `identity_label: node`.
Mismatched labels cause all devices to show UNKNOWN state.
:::

### Diagnostic tunables

| Key | Type | Default | Min | Description |
|-----|------|---------|-----|-------------|
| `prometheus_heartbeat_seconds` | integer | `30` | 10 | Interval in seconds for the background Prometheus reachability probe. Shown in the connection status indicator |
| `prometheus_latency_window` | integer | `20` | 1 | Number of samples used to compute the rolling average query latency shown in diagnostics |
| `debug_stats` | boolean | `false` | — | When `true`, logs per-query timing and cache hit/miss statistics to the backend log. Useful for diagnosing slow views |

### Basic authentication

```yaml
telemetry:
  basic_auth_user: monitoring
  basic_auth_password: s3cr3t
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `basic_auth_user` | string \| null | `null` | HTTP Basic Auth username for Prometheus |
| `basic_auth_password` | string \| null | `null` | HTTP Basic Auth password. Requires `basic_auth_user` to also be set |

### TLS

```yaml
telemetry:
  tls_verify: true
  tls_ca_file: config/certs/ca.pem
  tls_cert_file: config/certs/client.crt
  tls_key_file: config/certs/client.key
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `tls_verify` | boolean | `true` | Whether to verify the Prometheus server's TLS certificate. Set to `false` only for self-signed certificates in development |
| `tls_ca_file` | string \| null | `null` | Path to a custom CA certificate bundle (PEM) for verifying the Prometheus server |
| `tls_cert_file` | string \| null | `null` | Path to a client certificate (PEM) for mutual TLS authentication |
| `tls_key_file` | string \| null | `null` | Path to the client private key (PEM). Requires `tls_cert_file` |

---

## `planner`

The TelemetryPlanner batches all topology node/chassis/rack IDs into a small set of PromQL
queries (using `instance=~"id1|id2|..."`) and caches the result snapshot. This avoids
per-device query explosion in large topologies.

```yaml
planner:
  unknown_state: UNKNOWN
  cache_ttl_seconds: 60
  max_ids_per_query: 300
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `unknown_state` | `OK` \| `WARN` \| `CRIT` \| `UNKNOWN` | `UNKNOWN` | Health state assigned to devices for which Prometheus returns no data. Set to `OK` to suppress noise for devices not yet instrumented |
| `cache_ttl_seconds` | integer | `30` | How long (seconds) a PlannerSnapshot is reused before the planner re-queries Prometheus. Lower values increase Prometheus load |
| `max_ids_per_query` | integer | `200` | Maximum number of IDs packed into a single PromQL regex match. Prevents URL length limits from being hit with very large clusters |

:::note Tuning `max_ids_per_query`
At the default of `300`, a topology with 1 000 nodes produces approximately 4 batched
queries instead of 1 000 individual ones. Reduce this value if Prometheus returns
`URI Too Long` errors (typically at 500+ IDs depending on ID length).
:::

---

## `features`

Feature flags control which UI sections and behaviors are active. All are boolean.

```yaml
features:
  notifications: true
  notifications_max_visible: 10
  playlist: true
  offline: true
  worldmap: true
  dev_tools: true
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `notifications` | boolean | `true` | Show the notifications bell in the header. When `false`, the bell and notification panel are hidden |
| `notifications_max_visible` | integer | `10` | Maximum number of notifications shown in the panel at once (minimum: 1) |
| `playlist` | boolean | `false` | Enable NOC playlist mode (screen rotation). Exposes the playlist controls and `/playlist` route |
| `offline` | boolean | `false` | Enable offline mode indicator. When Prometheus is unreachable, shows a banner rather than erroring |
| `demo` | boolean | `false` | Activate the SimulatorPlugin and demo mode. Required for the simulator to generate metrics |
| `worldmap` | boolean | `true` | Show the World Map view (`/views/worldmap`). Hide this if all your sites lack geolocation data |
| `dev_tools` | boolean | `false` | Show developer tools pages (UI component showcase, internal diagnostics). Disable in production |

---

## `auth`

Controls access to the Rackscope UI. Authentication is disabled by default. When enabled,
users must log in with a username and bcrypt-hashed password.

```yaml
auth:
  enabled: false
  username: admin
  password_hash: $2b$12$X91lqP3eT0gSs7rF9JdM0OtowhwbsugMYDDGySdrXscVmtggB4eCS
  secret_key: ''
  session_duration: 24h
  policy:
    min_length: 6
    max_length: 128
    require_digit: false
    require_symbol: false
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | `false` | Enable authentication. When `false`, all UI routes are accessible without login |
| `username` | string | `admin` | Login username |
| `password_hash` | string | `""` | bcrypt hash of the password. An empty string means authentication is not yet configured even if `enabled: true` |
| `secret_key` | string | `""` | JWT signing secret. Auto-generated at startup when empty. Set explicitly for multi-instance deployments to preserve sessions across restarts |
| `session_duration` | `8h` \| `24h` \| `unlimited` | `24h` | How long a login session remains valid |

### Generating a password hash

```bash
docker compose exec backend python -c \
  "import bcrypt; print(bcrypt.hashpw(b'yourpassword', bcrypt.gensalt()).decode())"
```

Copy the output (starting with `$2b$`) into `password_hash`.

### `auth.policy`

Password validation rules applied when changing the password via the Settings UI.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `min_length` | integer | `6` | Minimum password length (1–128) |
| `max_length` | integer | `128` | Maximum password length (6–512) |
| `require_digit` | boolean | `false` | Require at least one digit |
| `require_symbol` | boolean | `false` | Require at least one non-alphanumeric character |

---

## `map`

Defaults for the World Map view. These control the initial viewport when the map is loaded.

```yaml
map:
  default_view: world
  default_zoom: 3
  min_zoom: 2
  max_zoom: 7
  zoom_controls: true
  center:
    lat: 20.0
    lon: 0.0
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `default_view` | `world` \| `continent` \| `country` \| `city` \| null | `world` | Initial zoom preset applied when the map first loads |
| `default_zoom` | integer \| null | `null` | Explicit zoom level (1–18). When set, overrides `default_view` zoom calculation |
| `min_zoom` | integer | `2` | Minimum zoom level the user can zoom out to (1–18) |
| `max_zoom` | integer | `7` | Maximum zoom level the user can zoom in to (1–18) |
| `zoom_controls` | boolean | `true` | Show the `+` / `−` zoom buttons on the map |
| `center.lat` | float | `20.0` | Initial map center latitude (−90 to 90) |
| `center.lon` | float | `0.0` | Initial map center longitude (−180 to 180) |

---

## `playlist`

Configures the NOC wallboard screen-rotation mode. When enabled via `features.playlist: true`,
the UI cycles through the listed routes automatically.

```yaml
playlist:
  interval_seconds: 30
  views:
    - /views/worldmap
    - /slurm/overview
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `interval_seconds` | integer | `30` | Seconds each view is displayed before advancing (minimum: 5) |
| `views` | list of strings | `[/views/worldmap, /slurm/overview]` | Ordered list of frontend routes to cycle through. Any valid Rackscope route can be used |

Example with multiple room views:

```yaml
playlist:
  interval_seconds: 20
  views:
    - /views/worldmap
    - /views/room/r001
    - /views/room/r002
    - /slurm/wallboard/a01
```

---

## `plugins.simulator`

Configuration for the SimulatorPlugin, which generates realistic Prometheus metrics for
testing and demos. Enable by setting `plugins.simulator.enabled: true`.

```yaml
plugins:
  simulator:
    enabled: true
    update_interval_seconds: 20
    seed: null
    scenario: demo-stable
    scale_factor: 1
    incident_rates:
      node_micro_failure: 0.001
      rack_macro_failure: 0.01
      aisle_cooling_failure: 0.005
    incident_durations:
      rack: 300    # seconds (5 min)
      aisle: 600   # seconds (10 min)
    overrides_path: config/plugins/simulator/overrides.yaml
    default_ttl_seconds: 120
    metrics_catalog_path: config/plugins/simulator/metrics_full.yaml
    metrics_catalogs: []
```

### Core options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | `false` | Activate the SimulatorPlugin. When enabled, a "DEMO" ribbon appears in the UI corner |
| `update_interval_seconds` | integer | `20` | How often (seconds) the simulator regenerates its metric dataset |
| `seed` | integer \| null | `null` | Random seed for deterministic metric generation. Set to a fixed integer for reproducible demos |
| `scenario` | string \| null | `null` | Named scenario to load from `config/plugins/simulator/scenarios.yaml`. Examples: `demo-stable`, `demo-small`, `random-failures` |
| `scale_factor` | float | `1.0` | Multiplier applied to all generated metric values. Values below `1.0` reduce simulated power/temperature readings |

### Incident injection

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `incident_rates.node_micro_failure` | float | `0.001` | Per-update probability (0–1) of a single node transitioning to a failure state |
| `incident_rates.rack_macro_failure` | float | `0.01` | Per-update probability (0–1) of a rack-wide failure event |
| `incident_rates.aisle_cooling_failure` | float | `0.005` | Per-update probability (0–1) of an aisle-level cooling failure |
| `incident_durations.rack` | integer | `3` | Number of update cycles a rack incident persists |
| `incident_durations.aisle` | integer | `5` | Number of update cycles an aisle incident persists |

### Overrides and catalog

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `overrides_path` | string | `config/plugins/simulator/overrides.yaml` | Path to the overrides file where runtime metric overrides are persisted |
| `default_ttl_seconds` | integer | `120` | Default time-to-live for manual overrides created via the API. `0` = permanent |
| `metrics_catalog_path` | string | `config/plugins/simulator/metrics_full.yaml` | Primary metrics catalog file used by the simulator |
| `metrics_catalogs` | list | `[]` | Additional metrics catalog files. Each entry has `id`, `path`, and optional `enabled: true/false` |

---

## `plugins.slurm`

Configuration for the SlurmPlugin, which reads Slurm node states from Prometheus and adds
HPC-specific views (Wallboard, Cluster Overview, Partitions, Node List, Alerts).

```yaml
plugins:
  slurm:
    enabled: true
    metric: slurm_node_status
    label_node: node_id
    label_status: status
    label_partition: partition
    mapping_path: config/plugins/slurm/node_mapping.yaml
    roles:
      - compute
      - visu
    include_unlabeled: false
    status_map:
      ok:
        - allocated
        - alloc
        - completing
        - comp
        - idle
        - mixed
        - mix
      warn:
        - maint
        - planned
        - plnd
        - reserved
        - resv
        - blocked
        - block
        - power_down
        - pow_dn
        - power_up
        - pow_up
        - powering_up
        - powered_down
        - reboot_issued
        - reboot_req
      crit:
        - down
        - drain
        - drained
        - draining
        - drng
        - fail
        - failing
        - failg
        - error
        - unknown
        - unk
        - noresp
        - inval
      info: []
    severity_colors:
      ok: '#22c55e'
      warn: '#f59e0b'
      crit: '#ef4444'
      info: '#3b82f6'
```

### Core options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | `true` | Activate the SlurmPlugin and its views |
| `metric` | string | `slurm_node_status` | Prometheus metric name that carries Slurm node state |
| `label_node` | string | `node` | Prometheus label on the metric that holds the Slurm node name |
| `label_status` | string | `status` | Prometheus label that holds the Slurm node status string |
| `label_partition` | string | `partition` | Prometheus label that holds the partition name |
| `mapping_path` | string \| null | `config/plugins/slurm/node_mapping.yaml` | Optional path to a YAML file mapping Slurm node names to topology instance names. Required when Slurm node names differ from Prometheus instance labels |
| `roles` | list of strings | `[compute, visu]` | Device template roles that Slurm views should display. Devices whose template has a `role` not in this list are excluded |
| `include_unlabeled` | boolean | `false` | When `true`, include devices that have no `role` label in their template |

### `status_map`

Maps Slurm status strings (as they appear in the Prometheus metric label) to Rackscope
severity levels. All four severity buckets accept a list of strings.

| Bucket | Severity | Typical statuses |
|--------|----------|-----------------|
| `ok` | OK (green) | `idle`, `allocated`, `completing` |
| `warn` | WARN (orange) | `maint`, `reserved`, `power_down`, `reboot_issued` |
| `crit` | CRIT (red) | `down`, `drain`, `fail`, `error`, `unknown` |
| `info` | INFO (blue) | Custom statuses; empty by default |

Any status string not found in any bucket is treated as UNKNOWN.

### `severity_colors`

Hex color codes used in the Slurm Wallboard and dashboards to represent each severity.

| Key | Default | Description |
|-----|---------|-------------|
| `severity_colors.ok` | `#22c55e` | Color for OK severity |
| `severity_colors.warn` | `#f59e0b` | Color for WARN severity |
| `severity_colors.crit` | `#ef4444` | Color for CRIT severity |
| `severity_colors.info` | `#3b82f6` | Color for INFO severity |

---

## Complete example

The following is the full `config/app.yaml` as shipped with the development stack:

```yaml
# ── Application identity ──────────────────────────────────────────────────────
app:
  name: Rackscope
  description: Datacenter Monitoring

# ── Config file paths ─────────────────────────────────────────────────────────
paths:
  topology: config/topology
  templates: config/templates
  checks: config/checks/library
  metrics: config/metrics/library

# ── State refresh intervals (seconds) ─────────────────────────────────────────
refresh:
  room_state_seconds: 60
  rack_state_seconds: 60

# ── Prometheus query cache TTLs ───────────────────────────────────────────────
cache:
  ttl_seconds: 60
  health_checks_ttl_seconds: 30
  metrics_ttl_seconds: 120

# ── Prometheus connection ─────────────────────────────────────────────────────
telemetry:
  prometheus_url: http://prometheus:9090
  identity_label: instance
  rack_label: rack_id
  chassis_label: chassis_id
  job_regex: node|rackscope-simulator
  prometheus_heartbeat_seconds: 30
  prometheus_latency_window: 20
  debug_stats: false
  basic_auth_user: null
  basic_auth_password: null
  tls_verify: false
  tls_ca_file: null
  tls_cert_file: null
  tls_key_file: null

# ── Telemetry planner ─────────────────────────────────────────────────────────
planner:
  unknown_state: UNKNOWN
  cache_ttl_seconds: 60
  max_ids_per_query: 300

# ── Feature flags ─────────────────────────────────────────────────────────────
features:
  notifications: true
  notifications_max_visible: 10
  playlist: true
  offline: true
  worldmap: true
  dev_tools: true

# ── Authentication ────────────────────────────────────────────────────────────
auth:
  enabled: false
  username: admin
  password_hash: ''
  secret_key: ''
  session_duration: 24h
  policy:
    min_length: 6
    max_length: 128
    require_digit: false
    require_symbol: false

# ── World map defaults ────────────────────────────────────────────────────────
map:
  default_view: world
  default_zoom: 3
  min_zoom: 2
  max_zoom: 7
  zoom_controls: true
  center:
    lat: 20.0
    lon: 0.0

# ── Playlist (NOC wallboard rotation) ─────────────────────────────────────────
playlist:
  interval_seconds: 30
  views:
    - /views/worldmap
    - /slurm/overview

# ── Plugins ───────────────────────────────────────────────────────────────────
plugins:
  simulator:
    enabled: true
    update_interval_seconds: 20
    seed: null
    scenario: demo-stable
    scale_factor: 1
    incident_rates:
      node_micro_failure: 0.001
      rack_macro_failure: 0.01
      aisle_cooling_failure: 0.005
    incident_durations:
      rack: 300    # seconds (5 min)
      aisle: 600   # seconds (10 min)
    overrides_path: config/plugins/simulator/overrides.yaml
    default_ttl_seconds: 120
    metrics_catalog_path: config/plugins/simulator/metrics_full.yaml
    metrics_catalogs: []
  slurm:
    enabled: true
    metric: slurm_node_status
    label_node: node_id
    label_status: status
    label_partition: partition
    mapping_path: config/plugins/slurm/node_mapping.yaml
    roles:
      - compute
      - visu
    include_unlabeled: false
    status_map:
      ok:
        - allocated
        - alloc
        - completing
        - comp
        - idle
        - mixed
        - mix
      warn:
        - maint
        - planned
        - plnd
        - reserved
        - resv
        - blocked
        - block
        - power_down
        - pow_dn
        - power_up
        - pow_up
        - powering_up
        - powered_down
        - reboot_issued
        - reboot_req
      crit:
        - down
        - drain
        - drained
        - draining
        - drng
        - fail
        - failing
        - failg
        - error
        - unknown
        - unk
        - noresp
        - inval
      info: []
    severity_colors:
      ok: '#22c55e'
      warn: '#f59e0b'
      crit: '#ef4444'
      info: '#3b82f6'
```
