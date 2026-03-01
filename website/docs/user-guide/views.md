---
id: views
title: Views
sidebar_position: 2
---

# Views

## World Map

**URL**: `/views/worldmap`

![World Map](/img/screenshots/worldmap.png)

Shows all sites on a world map with health status markers. Click a site to navigate to its rooms.

Sites with coordinates defined in the topology are shown as colored pins:
- 🟢 **Green**: OK — all checks passing
- 🟡 **Orange**: WARN — at least one warning
- 🔴 **Red**: CRIT — at least one critical issue
- ⚪ **Gray**: UNKNOWN — no data

## Room View

**URL**: `/views/room/:roomId`

![Room View](/img/screenshots/room-view.png)

Shows the floor plan of a room with all racks as a color-coded grid. Each rack square reflects the aggregated health state of everything inside it.

**Features:**
- Click a rack square → opens the rack detail panel on the right side
- Detail panel shows: rack state, temperature average, total power, PDU metrics
- Hover any rack for a quick health summary tooltip
- Aisles are labeled — racks are organized by their aisle assignment

## Rack View

**URL**: `/views/rack/:rackId`

![Rack View](/img/screenshots/rack-view.png)

Renders the full physical rack in front and rear views, with every device placed at its exact U position.

**Features:**
- **Front view**: devices with chassis node grids (shows individual blade states)
- **Rear view**: rear components — PSUs, IO modules, cable management
- Click any device → navigates to the Device View
- Each node slot in a chassis is color-coded by its health state
- Rack components (PDUs, HMC) shown on the side rails

## Device View

**URL**: `/views/device/:rackId/:deviceId`

Shows a device with its instances (Prometheus nodes) as tabs.

**Features:**
- Instance-level health checks (OK/WARN/CRIT per check)
- Metrics: temperature, power, CPU load (if configured in the device template)
- Check details: which PromQL query fired, current value, threshold

## Cluster View

**URL**: `/views/cluster`

![Cluster View](/img/screenshots/cluster-view.png)

Compact overview of all racks across the entire topology with health summary. Useful as a NOC wallboard showing global infrastructure status at a glance.
