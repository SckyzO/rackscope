---
id: settings-ui
title: Settings UI
sidebar_position: 2
---

# Settings UI

The Settings page is the central place to configure Rackscope without editing YAML files directly.
Access it via the gear icon in the sidebar, or navigate to `/editors/settings`.
Changes are written to `config/app.yaml` (and plugin config files) and take effect after the backend restarts — the UI handles that automatically on save.

---

## General

Configure the application name and description shown in the header, the file paths Rackscope uses for topology, templates, checks, and metrics, and the state refresh intervals for rooms and racks.

## Appearance

Choose the UI theme (dark / light / system), accent color, and app icon. This tab also controls the **tooltip style** used on device status pills across all rack views (six styles available, with a live preview), **severity display labels** (rename OK/WARN/CRIT/UNKNOWN in the UI without affecting data), and the color aura toggle for alert-severity glows.

## Telemetry

Set the Prometheus URL, identity/rack/chassis label names, job regex filter, and heartbeat interval. Also covers optional Prometheus **basic auth** credentials and **TLS** settings (CA file, client certificate, server verification toggle) for secured Prometheus deployments.

## Planner

Tune the TelemetryPlanner that batches Prometheus queries. Controls the snapshot cache TTL, the maximum number of node IDs packed into a single PromQL query, and how to handle nodes that return no data (UNKNOWN vs OK fallback). These settings are most relevant for large clusters (>500 nodes).

## Views

Enable or disable optional view features: the world map, the aisle dashboard, the auto-play playlist (and its interval and view list), and developer tools. Also sets the world map default style, zoom level, and center coordinates.

## Notifications

Configure toast popup behavior (position, display duration, stack threshold) and **sound alerts** — choose a sound preset and volume for new CRIT or WARN events, with control over whether sounds play in foreground, background, or both.

## Security

### Authentication

Enable authentication, set the session duration, configure the password policy (minimum/maximum length, require digit/symbol), and set the hashed admin password. Authentication is disabled by default — enable it for any deployment reachable outside localhost.

### Admin Endpoint Protection

When authentication is disabled, the **Admin Endpoint Protection** section lets you restrict access to destructive endpoints (`POST /api/system/restart`, `PUT /api/config`) by IP address or CIDR block. Read-only endpoints like `GET /api/system/process-stats` are always accessible (monitoring scrape use case).

Add entries in CIDR notation (`192.168.1.0/24`) or as exact IPs (`10.0.0.1`). Remove entries with the × button. Leave the list empty to allow all IPs (default — backward compatible).

An amber warning banner appears whenever authentication is disabled and the list is empty, reminding you that admin endpoints are open to all hosts on the network.

This setting maps to [`auth.trusted_networks`](./app-yaml#authtrusted_networks) in `app.yaml`.

See [Deployment — firewall port 8000](./deployment#network-security--firewall-port-8000) for the security implications of running without auth.

## Plugins — Simulator

Enable or disable the Simulator plugin (demo mode with generated metrics). Controls the incident mode (`full_ok` / `light` / `medium` / `heavy` / `chaos` / `custom`), reshuffle frequency, Slurm allocation ratio, and per-metric catalogs. Includes a **Restart** button to hot-restart the simulator container after config changes.

See [Simulator Plugin](/plugins/simulator) for the full reference.

## Plugins — Slurm

Enable or disable the Slurm plugin and configure how Rackscope reads node states from Prometheus: metric name, label names, status-to-severity mapping (drag & drop), severity colors, device role filtering, and the node name mapping editor (links Slurm node names to topology instance names, with wildcard support).

See [Slurm Plugin](/plugins/slurm) and [Slurm views](/user-guide/slurm) for the full reference.
