---
id: editors
title: Visual Editors
sidebar_position: 3
---

# Visual Editors

Rackscope provides visual editors for all configuration. Changes are saved via the API and take effect immediately (no restart required for most changes).

![Visual Editors - Settings](/img/screenshots/settings.png)

## Topology Editor

**URL**: `/editors/topology`

![Topology Editor](/img/screenshots/topology-editor.png)

Edit the physical infrastructure hierarchy:
- Add/edit/delete sites, rooms, aisles, racks, devices
- Drag-and-drop rack placement
- Device U-position validation (collision detection)

## Rack Editor

**URL**: `/editors/rack`

![Rack Editor](/img/screenshots/rack-editor.png)

Edit rack layouts:
- Add/move/remove devices
- Configure U positions
- Set device templates
- Preview front/rear views

## Templates Editor

**URL**: `/editors/templates`

![Templates Editor](/img/screenshots/templates-editor.png)

Edit device and rack templates:
- Device dimensions, layout, checks, metrics
- Rack component definitions
- View YAML source with Monaco editor

## Checks Editor

**URL**: `/editors/checks`

![Checks Editor](/img/screenshots/checks-editor.png)

Edit health check definitions:
- PromQL expressions
- Severity thresholds
- Device type filters

## Settings

**URL**: `/editors/settings` (or `/settings`)

Configure application settings:
- Prometheus connection
- Feature flags (demo mode, notifications, playlist)
- Simulator scenario and overrides
- Refresh intervals
