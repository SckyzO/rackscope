---
id: editors
title: Visual Editors
sidebar_position: 3
---

# Visual Editors

Rackscope provides visual editors for all configuration. Changes are saved via the API and take effect immediately (no restart required for most changes).

## Topology Editor

**URL**: `/editors/topology`

Edit the physical infrastructure hierarchy:
- Add/edit/delete sites, rooms, aisles, racks, devices
- Drag-and-drop rack placement
- Device U-position validation (collision detection)

## Rack Editor

**URL**: `/editors/rack`

Edit rack layouts:
- Add/move/remove devices
- Configure U positions
- Set device templates
- Preview front/rear views

## Templates Editor

**URL**: `/editors/templates`

Edit device and rack templates:
- Device dimensions, layout, checks, metrics
- Rack component definitions
- View YAML source with Monaco editor

## Checks Editor

**URL**: `/editors/checks`

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
