---
id: settings-ui
title: Settings UI
sidebar_position: 6
---

# Settings

The Settings page (`/settings`) provides a graphical interface for configuring Rackscope
without editing YAML files directly. Changes made here are written back to `config/app.yaml`
and take effect immediately — no container restart required.

![Settings page](/img/screenshots/settings.png)

:::note Changes are persisted
Every field on the Settings page writes directly to `config/app.yaml`. The file is
reloaded on the backend after each save. You can verify the current live configuration at
any time via `GET /api/config`.
:::

---

## Sections

The Settings page is divided into collapsible sections. Each section maps to a top-level
key in `app.yaml`.

---

## Appearance

Controls the visual theme of the Rackscope UI. These settings are stored client-side in
`localStorage` and are not written to `app.yaml` — each user's browser retains its own
preference.

![Settings page](/img/screenshots/settings.png)

### Dark / Light mode

Toggle between **Dark** (default, optimized for NOC wallboards) and **Light** mode using
the theme switch in the header or the toggle in this section. Dark mode is the recommended
default for round-the-clock operations centers.

### Accent color

Choose from a set of predefined accent colors. The accent color is applied to interactive
elements, active navigation items, and highlight badges across the UI.

### Dark palettes

Select from multiple dark-mode color palettes (e.g., Slate, Zinc, Neutral). Each palette
adjusts the background shades and surface colors while keeping the accent color intact.

### Light palettes

Select from multiple light-mode color palettes. Palettes control card backgrounds, borders,
and muted text colors.

---

## Telemetry

Configure the connection between Rackscope and your Prometheus instance.

![Settings page](/img/screenshots/settings.png)

These settings map to [`telemetry`](./app-yaml.md#telemetry) in `app.yaml`.

### Prometheus URL

The full base URL of the Prometheus HTTP API. Rackscope appends `/api/v1/query` and
`/api/v1/query_range` to this URL.

Examples:
- `http://prometheus:9090` — Docker Compose service name (default)
- `https://prometheus.internal.example.com` — internal production Prometheus

After saving, the connection status indicator in the header updates within
`prometheus_heartbeat_seconds` (default: 30 s).

### Authentication

Enable HTTP Basic Auth for Prometheus instances that require credentials.

| Field | Description |
|-------|-------------|
| **Username** | Maps to `telemetry.basic_auth_user` |
| **Password** | Maps to `telemetry.basic_auth_password` |

Leave both fields empty to disable Basic Auth.

### TLS

Controls TLS certificate verification for HTTPS Prometheus endpoints.

| Field | Description |
|-------|-------------|
| **Verify TLS** | Toggle TLS certificate verification (`telemetry.tls_verify`) |
| **CA Certificate path** | Filesystem path to a custom CA bundle (`telemetry.tls_ca_file`) |
| **Client Certificate path** | Filesystem path to a client certificate for mTLS (`telemetry.tls_cert_file`) |
| **Client Key path** | Filesystem path to the client private key (`telemetry.tls_key_file`) |

:::note TLS files must be mounted
If running Rackscope in Docker, certificate files must be mounted into the container.
Edit `docker-compose.yml` to add the appropriate volume mounts before entering file paths
in the Settings UI.
:::

---

## Features

Toggle optional UI features on and off. All toggles map to the
[`features`](./app-yaml.md#features) section of `app.yaml`.

![Settings page](/img/screenshots/settings.png)

| Toggle | `app.yaml` key | Description |
|--------|---------------|-------------|
| **Notifications** | `features.notifications` | Show the notification bell and alert panel in the header |
| **Notifications max visible** | `features.notifications_max_visible` | Maximum alerts shown in the panel at once |
| **World Map** | `features.worldmap` | Show the World Map view. Disable if sites have no geolocation data |
| **Playlist** | `features.playlist` | Enable NOC screen-rotation mode. See [Playlist](./app-yaml.md#playlist) |
| **Offline mode** | `features.offline` | Display a banner instead of an error page when Prometheus is unreachable |
| **Dev tools** | `features.dev_tools` | Show developer and diagnostic pages. Disable in production |

---

## Simulator

Manage the SimulatorPlugin that generates realistic Prometheus metrics for testing and
demos. This section is only visible when `plugins.simulator.enabled` is set.

![Settings page](/img/screenshots/settings.png)

These settings map to [`plugins.simulator`](./app-yaml.md#pluginssimulator) in `app.yaml`.

### Scenario selection

Choose a named scenario from the dropdown. Scenarios are defined in
`config/plugins/simulator/scenarios.yaml` and control which failure patterns are active.

| Scenario | Description |
|----------|-------------|
| `demo-stable` | All nodes healthy, minimal noise — good for feature demos |
| `demo-small` | Small subset of nodes with occasional failures |
| `random-failures` | Randomized node and rack failures for stress testing views |

Changing the scenario takes effect on the next simulator update cycle
(`update_interval_seconds`, default: 20 s).

### Overrides management

Runtime overrides force specific metric values for named instances, bypassing the scenario.
This is useful to simulate a specific failure without changing the scenario.

**Adding an override:**

1. Enter the instance name (e.g., `compute001`)
2. Enter the metric name (e.g., `up`)
3. Enter the override value (e.g., `0`)
4. Optionally set a TTL in seconds (`0` = permanent)
5. Click **Add Override**

**Removing overrides:**

- Click the **Remove** button next to a single override to delete it
- Click **Clear All Overrides** to reset all overrides at once

Overrides are persisted to `config/plugins/simulator/overrides.yaml` (path configurable via
`plugins.simulator.overrides_path`).

---

## Slurm

Enable or disable the Slurm workload manager integration and review its configuration.

![Settings page](/img/screenshots/settings.png)

These settings map to [`plugins.slurm`](./app-yaml.md#pluginsslurm) in `app.yaml`.

### Enable / Disable

The **Enable Slurm** toggle maps to `plugins.slurm.enabled`. When disabled, all Slurm
views (`/slurm/*`) are hidden from the navigation menu and the plugin does not query
Prometheus for Slurm metrics.

### Configuration summary

The Settings UI displays the current read-only configuration for reference:

| Displayed field | `app.yaml` key | Description |
|----------------|---------------|-------------|
| Metric | `plugins.slurm.metric` | Prometheus metric name (e.g., `slurm_node_status`) |
| Node label | `plugins.slurm.label_node` | Label carrying the Slurm node name |
| Status label | `plugins.slurm.label_status` | Label carrying the node status string |
| Partition label | `plugins.slurm.label_partition` | Label carrying the partition name |
| Mapping file | `plugins.slurm.mapping_path` | Path to the node-name-to-instance mapping file |

To change these values, edit `config/app.yaml` directly and reload the backend. Full
field documentation is in the [app.yaml Slurm reference](./app-yaml.md#pluginsslurm).

---

## Auth

Control whether login is required to access the Rackscope UI.

![Settings page](/img/screenshots/settings.png)

These settings map to [`auth`](./app-yaml.md#auth) in `app.yaml`.

:::note Auth is disabled by default
Rackscope ships with authentication disabled. Enable it only when the UI is exposed to
untrusted networks. In air-gapped or VPN-only deployments, consider leaving it disabled.
:::

### Enable / Disable authentication

The **Enable Authentication** toggle maps to `auth.enabled`. When enabled, all UI routes
redirect to a login page until the user authenticates.

### Username

The login username. Maps to `auth.username`. Default: `admin`.

### Change password

Enter a new password and confirm it. The Settings UI validates the password against the
active policy before saving. On save, the password is hashed with bcrypt and written to
`auth.password_hash` in `app.yaml`. The plaintext password is never stored.

**Password policy** (configurable in `auth.policy`):

| Policy field | Default | Description |
|-------------|---------|-------------|
| Minimum length | 6 | Minimum number of characters |
| Maximum length | 128 | Maximum number of characters |
| Require digit | false | At least one numeric character required |
| Require symbol | false | At least one non-alphanumeric character required |

### Session duration

Controls how long a login session remains valid before the user must re-authenticate.

| Value | Duration |
|-------|---------|
| `8h` | 8 hours |
| `24h` | 24 hours (default) |
| `unlimited` | Session never expires |

Maps to `auth.session_duration`.

---

## Related references

- [app.yaml Complete Reference](./app-yaml.md) — all configuration options
- [Deployment](./deployment.md) — container setup and environment variables
- [Prometheus Integration](./prometheus.md) — Prometheus connection details
- [Simulator (Plugin)](../plugins/simulator.md) — full simulator documentation
- [Slurm (Plugin)](../plugins/slurm.md) — full Slurm integration documentation
