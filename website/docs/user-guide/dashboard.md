---
id: dashboard
title: Dashboard
sidebar_position: 8
---

# Dashboard

The Dashboard is the central hub of Rackscope, showing a real-time overview of your infrastructure's health across all sites, rooms, and racks.

![Rackscope Dashboard](/img/screenshots/dashboard.png)

## Overview

When you open Rackscope, the Dashboard is the first thing you see. It aggregates the most important signals from your entire topology into a single screen:

- **KPI cards** — at-a-glance totals: total nodes, active alerts, CRIT and WARN counts
- **World Map widget** — geographic overview of all sites with health state pins
- **Alert feed** — the most recent WARN and CRIT alerts across the topology
- **Rack health summary** — compact grid of every rack's aggregated health state
- **Slurm widgets** — node state breakdown by partition (only shown when the Slurm plugin is enabled)

The goal is to let an NOC operator know within seconds whether anything requires attention without navigating into individual views.

## Widgets

### Stat Cards

The row of stat cards at the top of the page provides instant numeric context:

| Card | Description |
|------|-------------|
| **Total Nodes** | Number of Prometheus instances known to the topology |
| **Active Alerts** | Count of nodes currently in WARN or CRIT state |
| **CRIT** | Number of nodes in CRIT state |
| **WARN** | Number of nodes in WARN state |

Cards update on the same polling interval as the rest of the dashboard. A card that transitions from OK to CRIT is highlighted with a pulsing border so the change is visible at a glance.

### World Map

The World Map widget shows every site that has latitude/longitude coordinates defined in the topology. Each site is represented by a colored pin:

- **Green** — all racks in the site are OK
- **Orange** — at least one WARN in the site
- **Red** — at least one CRIT in the site
- **Gray** — no data (UNKNOWN)

![World Map widget](/img/screenshots/worldmap.png)

Click any site pin to navigate directly to the site's room list.

Sites without coordinates are listed in a compact text fallback below the map.

### Alert Feed

The Alert feed shows the most recent WARN and CRIT events, sorted by severity then timestamp (newest first). Each entry shows:

- Severity badge (WARN or CRIT)
- Node identifier and rack location
- The check that triggered the alert
- How long ago the alert was first detected

The feed is limited to the most recent 20 entries on the Dashboard widget. The full list is available on the **Notifications** page (`/notifications`).

### Rack Health Summary

The rack health summary renders every rack in the topology as a small colored square, grouped by site and room. The color represents the rack's aggregated health state (worst of all devices/nodes inside it).

This view is intentionally compact — it is designed to fit a wall-mounted display showing hundreds of racks without scrolling.

Click any rack square to navigate to the [Rack View](/user-guide/views#rack-view) for that rack.

### Slurm Widgets

When the [Slurm plugin](/user-guide/slurm) is enabled, two additional widgets appear at the bottom of the Dashboard:

**Node States by Partition** — a bar chart showing how many nodes are in each Slurm state (idle, alloc, drain, down, etc.) per partition. Colors map to the severity configured in `app.yaml` under `slurm.status_map`.

**Cluster Health Totals** — a condensed version of the Cluster Overview page showing total node counts across all partitions.

These widgets are hidden automatically when the Slurm plugin is disabled or when no `slurm` section is present in `app.yaml`.

## Customizing the Dashboard

Widget positions and sizes are adjustable using drag-and-drop:

1. Hover over a widget header until the grab cursor appears.
2. Drag the widget to a new position in the grid.
3. Drag the resize handle in the widget's bottom-right corner to change its size.

Layout changes are saved automatically to `localStorage` under the key `rackscope.dashboard.layout` and restored on the next page load. There is no server-side persistence for dashboard layouts — each browser session starts with the saved layout from that browser.

To reset the layout to the default arrangement, open **Settings** (`/settings`) and click **Reset Dashboard Layout**.

## Dark and Light Mode

The Dashboard (and the entire UI) renders in dark mode by default. This is intentional — dark mode is easier on the eyes in NOC environments with low ambient light and large wall displays.

To toggle the theme:

- Click the sun/moon icon in the top-right corner of the header.
- Or go to **Settings** (`/settings`) → **Appearance** → **Theme**.

The selected theme is persisted to `localStorage` under `rackscope.theme` and applied immediately without a page reload.

The accent color (the tint used for interactive elements and health state highlights) is also configurable from **Settings** → **Appearance** → **Accent Color**.

## Navigating from the Dashboard

The Dashboard is a starting point, not a destination. Most elements are interactive:

| Element | Navigation target |
|---------|-------------------|
| Site pin on World Map | Site room list |
| Rack square in health summary | Rack detail view |
| Alert feed entry | Device view for the alerting node |
| Slurm partition bar | Slurm partition detail view |

Use the sidebar on the left to navigate the full topology tree (Site → Room → Aisle → Rack) or to reach the editor and plugin pages directly.

## Real-Time Updates

The Dashboard polls the backend on a configurable interval. The refresh rate is controlled by two settings in `app.yaml`:

```yaml
refresh:
  room_state_seconds: 60
  rack_state_seconds: 60
```

The default is **60 seconds** for both. Lower values increase the load on Prometheus — do not set below 15 seconds in production environments with large topologies.

The last-updated timestamp is shown in the footer of each widget. A spinning indicator appears briefly during the polling request. If the backend is unreachable, widgets display a stale-data warning and continue showing the last successful response.

:::note
The telemetry planner caches Prometheus query results independently. Even if you set the refresh interval to 15 seconds, the actual Prometheus query may be served from cache if the planner's `cache_ttl_seconds` has not expired. See the [Admin Guide](/admin-guide) for tuning guidance.
:::
