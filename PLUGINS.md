# Rackscope Plugin System

## Overview

Rackscope uses a plugin architecture to separate optional features from the core system.
Each plugin is independently enabled/disabled and manages its own configuration.

## Plugin Configuration Architecture

Plugin configuration is split into two levels:

### 1. `app.yaml` — Toggle only

```yaml
plugins:
  slurm:
    enabled: true     # Enable/disable the plugin
  simulator:
    enabled: true
```

The `app.yaml` only controls whether a plugin is active.

### 2. `config/plugins/{name}/config.yml` — Plugin settings

Each plugin has its own dedicated config file:

```
config/plugins/
  slurm/
    config.yml          ← Slurm-specific settings (metric, labels, status_map...)
    node_mapping.yaml   ← Optional node name mapping
  simulator/
    config.yml          ← Simulator settings (scenario, rates, paths...)
    overrides.yaml      ← Runtime metric overrides
    metrics_full.yaml   ← Full metrics catalog
```

### Loading priority

When a plugin loads its configuration, it follows this chain:

1. **`config/plugins/{name}/config.yml`** — Dedicated file (recommended)
2. **`app.yaml plugins.{name}`** — Embedded in app.yaml (legacy)
3. **`app.yaml {name}`** — Top-level legacy format (deprecated)
4. **Pydantic defaults** — Built-in defaults if no config found

## Available Plugins

### Slurm (`slurm`)

Integrates with Slurm workload manager for HPC cluster monitoring.

**Config file**: `config/plugins/slurm/config.yml`

Key settings:
- `metric` — Prometheus metric name (default: `slurm_node_status`)
- `label_node` — Label identifying the node name
- `roles` — Device template roles to show in Wallboard (e.g., `[compute, visu]`)
- `status_map` — Map Slurm status strings to OK/WARN/CRIT severity
- `severity_colors` — Hex colors for each severity level
- `mapping_path` — Optional YAML mapping Slurm node names → topology instances

### Simulator (`simulator`)

Generates realistic Prometheus metrics for testing without real hardware.

**Config file**: `config/plugins/simulator/config.yml`

Key settings:
- `scenario` — Named scenario (`demo-stable`, `demo-small`, `full-ok`, `random-demo-small`)
- `update_interval_seconds` — How often to regenerate metrics
- `seed` — Random seed for reproducible demos (null = random)
- `incident_rates` — Probability of failures per update cycle
- `metrics_catalog_path` — Path to the metrics catalog YAML

## API Endpoints

### List plugins
```
GET /api/plugins
```

### Get plugin config
```
GET /api/plugins/{plugin_id}/config
```
Returns the plugin's config from its dedicated file.

### Update plugin config
```
POST /api/plugins/{plugin_id}/config
{ "config": { ... } }
```
Writes to `config/plugins/{id}/config.yml` and hot-reloads the plugin.

### Toggle plugin enabled
Update `app.yaml` via:
```
POST /api/config
{ "plugins": { "slurm": { "enabled": false } } }
```
Then restart the backend for the change to take effect.

## Creating a New Plugin

1. Create `src/rackscope/plugins/{name}/plugin.py` extending `RackscopePlugin`
2. Register in `src/rackscope/api/app.py`: `registry.register(MyPlugin())`
3. Create `config/plugins/{name}/config.yml` with default settings
4. Add to `app.yaml`: `plugins.{name}.enabled: true`

```python
class MyPlugin(RackscopePlugin):
    @property
    def plugin_id(self) -> str:
        return "my-plugin"

    def _load_config(self, app_config):
        # Load from self.config_file_path() first, then fallbacks
        ...

    async def on_startup(self) -> None:
        self.config = self._load_config(APP_CONFIG)

    async def on_config_reload(self, app_config) -> None:
        self.config = self._load_config(app_config)
```

## Feature Flags

Beyond plugins, page visibility is controlled by `features` in `app.yaml`:

```yaml
features:
  notifications: true    # Show Notifications page and sidebar link
  worldmap: true         # Show World Map page
  dev_tools: false       # Show UI Library, showcase pages (disable in prod)
  playlist: false        # Enable NOC playlist mode (auto-rotate views)
```
