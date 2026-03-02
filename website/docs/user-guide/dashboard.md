---
id: dashboard
title: Dashboard
sidebar_position: 1
---

# Dashboard

The Rackscope dashboard is a fully customizable grid of widgets showing infrastructure health at a glance.

## Layout

The dashboard uses a **12-column responsive grid** (react-grid-layout).
Each widget can be:
- Dragged to any position
- Resized freely
- Added or removed from the catalog
- Arranged across multiple named dashboards

## Edit Mode

Click the **Edit** button (pencil icon) in the header to enter edit mode:

- **Drag** widgets by their grip handle
- **Resize** by dragging any corner
- **Remove** widgets with the × button
- **Add** widgets from the catalog (+ button)
- **Reset** layout to default
- **Save** or **Cancel** to confirm changes

## Multiple Dashboards

Create multiple dashboards for different use cases (Overview, NOC, Slurm, etc.).
Use the dashboard selector in the header to switch between them.

Operations: **Create** · **Duplicate** · **Rename** · **Delete**

## Widget Catalog

### Infrastructure KPIs

| Widget | Description |
|---|---|
| Stat Card | Single KPI: Sites / Rooms / Racks / Devices / CRIT / WARN |
| Stats Row | All 6 KPIs in a single row |
| Health Gauge | Global health score (0–100%) |
| Severity Donut | OK/WARN/CRIT/UNKNOWN distribution |
| Alert Count | Total active alert count with severity badge |

### Monitoring

| Widget | Description |
|---|---|
| Active Alerts | Paginated WARN/CRIT alert list with rack/room navigation |
| Recent Alerts | Latest 5 alerts |
| Node Heatmap | All nodes color-coded by health state |
| Rack Utilization | Device/slot occupancy across all racks |
| Check Summary | Check counts by scope (node / chassis / rack) |

### Infrastructure

| Widget | Description |
|---|---|
| Infrastructure | Device counts by type (server, switch, storage, PDU, cooling) |
| Device Types | Device type distribution chart |
| Catalog Checks | Active check counts from the checks library |
| Uptime | Simulated uptime counter |

### Maps & Connectivity

| Widget | Description |
|---|---|
| World Map | Interactive site map with health markers |
| Site Map | Site status overview |
| Prometheus | Prometheus connection status, scrape stats, latency |

### Slurm (requires Slurm plugin)

| Widget | Description |
|---|---|
| Slurm Cluster | Node state summary (idle, alloc, down, drain) |
| Slurm Nodes | Per-partition node distribution |
| Slurm Utilization | CPU/memory allocation gauge |

## Persistence

Widget layouts are stored in `localStorage` under `rackscope.dashboards`.
They are **not synced to the server** — each browser has its own layout.

## Default Layout

On first load (empty localStorage):
- **Row 0**: 6 stat cards (Sites · Rooms · Racks · Devices · CRIT · WARN)
- **Row 1**: Active Alerts (left) + World Map (right)
- **Row 4**: Health Gauge · Severity Donut · Prometheus
- **Row 6**: Infrastructure · Node Heatmap · Catalog Checks
