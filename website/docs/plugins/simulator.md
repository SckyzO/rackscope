---
id: simulator
title: Simulator Plugin
sidebar_position: 2
---

# Simulator Plugin

The Simulator plugin provides demo mode functionality for testing and presentations.

## Plugin ID: `simulator`

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/simulator/status` | Plugin status + active scenario |
| GET | `/api/simulator/scenarios` | Available scenarios |
| GET | `/api/simulator/overrides` | Active metric overrides |
| POST | `/api/simulator/overrides` | Add a metric override |
| DELETE | `/api/simulator/overrides` | Clear all overrides |
| GET | `/api/simulator/metrics` | Available metrics from library |

## Menu Section

Contributes a "Simulator" section (order=200) to the sidebar navigation.

## Configuration

Enabled via `config/app.yaml`:

```yaml
features:
  demo: true

simulator:
  scenario: demo-small
```

## Scenarios

Scenarios are defined in `config/plugins/simulator/scenarios.yaml`. Available:
- `demo-small`: small topology with a few failures
- `full-ok`: all nodes healthy
- `random-demo-small`: random failures (different each run)

## Implementation

`src/rackscope/plugins/simulator/plugin.py`

The plugin:
1. Reads the current scenario from config
2. Checks that the simulator service is reachable at `simulator:9000`
3. Forwards override requests to the simulator HTTP API
4. Exposes status/control endpoints
