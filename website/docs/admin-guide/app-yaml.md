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
| [`plugins`](#plugins) | Plugin enable/disable flags |

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
  metrics_ttl_seconds: 120      # Detailed metrics (include_metrics=true)
  service_ttl_seconds: 5        # Response-level ServiceCache
```

| Key | Type | Default | Min | Description |
|-----|------|---------|-----|-------------|
| `ttl_seconds` | integer | `30` | 1 | Generic cache TTL. **Deprecated** — kept for backward compatibility with pre-v1.0 configs. Use `health_checks_ttl_seconds` instead |
| `health_checks_ttl_seconds` | integer | `30` | 1 | TTL for health check query results. Shorter = more responsive to failures |
| `metrics_ttl_seconds` | integer | `120` | 1 | TTL for detailed metric queries (temperature, power, PDU). Longer = fewer heavy Prometheus calls |
| `service_ttl_seconds` | integer | `5` | 1 | TTL for the **ServiceCache** — the response-level cache above the planner. Caches fully assembled JSON responses (room state, rack state, global stats). Lower = more responsive but more Planner calls |

:::note Choosing TTL values
- `health_checks_ttl_seconds: 30` is a good balance — failures appear within 30 s.
- `metrics_ttl_seconds: 120` is intentional: metric charts are expensive and do not need
  sub-minute refresh. Reduce only if users need near-realtime metric graphs.
- `service_ttl_seconds: 5` is a short cache above everything. Increase to `10-15` on large
  deployments where many users refresh the same views simultaneously.

See [Performance & Caching](/architecture/performance-and-caching) for the full cache layer diagram.
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
| `prometheus_timeout_seconds` | float | `5.0` | 0 | Timeout in seconds for each Prometheus HTTP request. Increase if your Prometheus is slow to respond on large clusters. Maximum: 60 |
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
At the default of `200`, a topology with 1 000 nodes produces approximately 5 batched
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
  wizard: true
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `notifications` | boolean | `true` | Show the notifications bell in the header. When `false`, the bell and notification panel are hidden |
| `notifications_max_visible` | integer | `10` | Maximum number of notifications shown in the panel at once (minimum: 1) |
| `playlist` | boolean | `false` | Enable NOC playlist mode (screen rotation). Exposes the playlist controls and `/playlist` route |
| `offline` | boolean | `false` | Enable offline mode indicator. When Prometheus is unreachable, shows a banner rather than erroring |
| `worldmap` | boolean | `true` | Show the World Map view (`/views/worldmap`). Hide this if all your sites lack geolocation data |
| `dev_tools` | boolean | `false` | Show developer tools pages (UI component showcase, internal diagnostics). Disable in production |
| `wizard` | boolean | `true` | Show the setup wizard on first launch. Set to `false` to disable permanently |

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
  default_zoom: null
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

## `plugins`

Plugin enable/disable flags. Detailed plugin configuration lives in separate files at `config/plugins/{plugin_id}/config.yml`, not in `app.yaml`. This separation was introduced to avoid configuration duplication and improve maintainability.

```yaml
plugins:
  simulator:
    enabled: true
  slurm:
    enabled: true
```

| Plugin | Key | Type | Default | Description |
|--------|-----|------|---------|-------------|
| Simulator | `simulator.enabled` | boolean | `false` | Activate the SimulatorPlugin for demo/testing mode |
| Slurm | `slurm.enabled` | boolean | `true` | Activate the SlurmPlugin for HPC workload manager integration |

:::warning app.yaml must only carry `enabled`
**Never put simulator behaviour settings in `app.yaml`** (incident_mode, changes_per_hour, slurm_random_statuses, etc.). The simulator process merges `plugin.yaml` with `app.yaml`, and `app.yaml` wins on conflicts — so any `incident_mode` in `app.yaml` silently overrides the value you set in the Settings UI.

Rule: `app.yaml` → `enabled: true/false` only. Everything else → dedicated file.
:::

:::note Plugin configuration files
Each plugin's detailed settings are managed in dedicated configuration files:

| Plugin | File | Managed by |
|---|---|---|
| Simulator | `config/plugins/simulator/config/plugin.yaml` | Settings UI → Plugins → Simulator |
| Slurm | `config/plugins/slurm/config.yml` | Settings UI → Plugins → Slurm |

See [Plugins](/plugins/overview) for the full configuration reference.
:::


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
  service_ttl_seconds: 5

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
  wizard: true                    # Show setup wizard on first launch

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
  default_zoom: null
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
# Only enabled flags live here — full config in config/plugins/{id}/config.yml
plugins:
  simulator:
    enabled: true
  slurm:
    enabled: true
```

---

## Reference file

A fully annotated reference file is included in the repository at `config/app.yaml.reference`. It documents every key with its default value, type, and description — useful as a starting point when setting up a new deployment.

```bash
# Start from the reference
cp config/app.yaml.reference config/app.yaml
# Then edit for your environment
```

The reference file always reflects the current schema. It is kept in sync with this page.
