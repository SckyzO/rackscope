---
id: views
title: Views
sidebar_position: 2
---

# Views

## World Map

**URL**: `/views/worldmap`

Shows all sites on a world map with health status markers. Click a site to navigate to its rooms.

Sites with coordinates defined in the topology are shown as colored pins:
- Green: OK
- Orange: WARN
- Red: CRIT
- Gray: UNKNOWN

## Room View

**URL**: `/views/room/:roomId`

Shows the floor plan of a room with all racks represented as a grid. Each rack is color-coded by its aggregated health state.

**Features:**
- Click a rack to open the rack detail panel (right side)
- The detail panel shows: rack state, temperature, power, PDU metrics
- Hover for quick health summary

## Rack View

**URL**: `/views/rack/:rackId`

Shows front and rear views of a rack with all devices rendered in their actual rack units.

**Features:**
- Front view: devices with chassis node grids
- Rear view: rear components (PSUs, IO, cable management)
- Click a device to navigate to device view
- Health state shown per device and per instance (chassis nodes)

## Device View

**URL**: `/views/device/:rackId/:deviceId`

Shows a device with its instances (Prometheus nodes) as tabs.

**Features:**
- Instance-level health checks (OK/WARN/CRIT per check)
- Metrics: temperature, power, CPU load (if configured)
- Check details: which PromQL query, current value, threshold

## Cluster View

**URL**: `/views/cluster`

Compact overview of all racks in the topology with health summary.
