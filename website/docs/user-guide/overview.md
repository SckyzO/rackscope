---
id: overview
title: Overview
sidebar_position: 1
---

# User Guide Overview

Rackscope provides several views and tools for monitoring physical infrastructure.

![Rackscope Overview](/img/screenshots/rackscope-dashboard-overview.png)

## Navigation

The sidebar provides access to all views, organized by domain:

- **Infrastructure**: World map, room views, rack views, device views
- **Workload** (Slurm plugin): Overview, Nodes, Partitions, Alerts, Wallboard
- **Editors**: Topology, Rack, Templates, Checks, Settings
- **Simulator** (demo plugin): Scenario control, overrides

## Core Concepts

### Health States

Every entity in the topology has a health state:

| State | Meaning |
|-------|---------|
| <span className="state-ok">OK</span> | All checks passing |
| <span className="state-warn">WARN</span> | At least one warning |
| <span className="state-crit">CRIT</span> | At least one critical issue |
| <span className="state-unknown">UNKNOWN</span> | No data or check error |

States aggregate upward: Node → Chassis → Rack → Room → Site. The worst state wins.

### Physical Hierarchy

```
Site
└── Room
    └── Aisle
        └── Rack
            └── Device
                └── Instance (Prometheus node)
```

Each level shows the aggregated health of everything below it.

## Views Overview

| View | URL | Purpose |
|------|-----|---------|
| World Map | `/views/worldmap` | Site overview with geolocation |
| Room | `/views/room/:id` | Floor plan with rack grid |
| Rack | `/views/rack/:id` | Front/rear rack views |
| Device | `/views/device/:rackId/:deviceId` | Instance-level detail |
| Cluster | `/views/cluster` | Cluster overview |
