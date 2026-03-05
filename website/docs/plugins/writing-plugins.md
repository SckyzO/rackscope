---
id: writing-plugins
title: Writing Plugins
sidebar_position: 4
---

# Writing Plugins

This guide explains how to create a custom Rackscope plugin.

## Plugin Directory Layout

Each plugin lives in a self-contained directory under `plugins/`:

```
plugins/
└── {name}/
    ├── __init__.py
    ├── backend/                  # Python code (FastAPI plugin)
    │   ├── __init__.py           # Exports the plugin class
    │   ├── plugin.py             # Plugin class (RackscopePlugin subclass)
    │   └── config.py             # Pydantic config model
    ├── frontend/                 # React/TypeScript code
    │   └── widgets/              # Dashboard widgets (optional)
    │       ├── index.ts          # Side-effect imports
    │       └── MyWidget.tsx
    └── process/                  # Standalone service (optional)
        ├── Dockerfile
        └── ...
```

The framework code (`base.py`, `registry.py`) stays in
`src/rackscope/plugins/` and is unchanged.

## 1. Create the Plugin Class

Create `plugins/{name}/backend/plugin.py`:

```python
from fastapi import FastAPI
from rackscope.plugins.base import RackscopePlugin, MenuSection, MenuItem


class MyPlugin(RackscopePlugin):
    """My custom Rackscope plugin."""

    @property
    def plugin_id(self) -> str:
        return "my-plugin"

    @property
    def plugin_name(self) -> str:
        return "My Plugin"

    def register_routes(self, app: FastAPI) -> None:
        from .router import router
        app.include_router(router, prefix="/api/my-plugin", tags=["my-plugin"])

    def register_menu_sections(self) -> list[MenuSection]:
        return [
            MenuSection(
                id="my-plugin",
                label="My Plugin",
                order=100,   # lower = appears first
                items=[
                    MenuItem(
                        id="my-plugin-home",
                        label="Home",
                        path="/my-plugin",
                        icon="Home",
                    ),
                ],
            )
        ]

    async def on_startup(self) -> None:
        # Initialize resources (connections, caches, etc.)
        pass

    async def on_shutdown(self) -> None:
        # Clean up resources
        pass

    async def on_config_reload(self, app_config: AppConfig) -> None:
        # Called when app config is reloaded
        pass
```

### Hot-reload: `on_config_reload`

The `on_config_reload` hook is called whenever the application configuration is reloaded (e.g., after saving settings in the UI). Use it to pick up config changes without restarting the container.

```python
async def on_config_reload(self, app_config: AppConfig) -> None:
    """Called when app config is reloaded. Refresh plugin config here."""
    self.config = self._load_config(app_config)
    logger.info(f"[{self.plugin_id}] Config reloaded")
```

## 2. Create the Router

Create `plugins/{name}/backend/router.py`:

```python
from fastapi import APIRouter, Depends
from rackscope.api.dependencies import get_topology, get_app_config
from rackscope.model.domain import Topology
from rackscope.model.config import AppConfig

router = APIRouter()


@router.get("/status")
async def get_status(
    topology: Topology = Depends(get_topology),
    config: AppConfig = Depends(get_app_config),
):
    return {"status": "ok", "nodes": len(topology.all_instances())}
```

## 3. Register the Plugin

Create `plugins/{name}/backend/__init__.py` to export the class:

```python
from plugins.my_plugin.backend.plugin import MyPlugin
__all__ = ["MyPlugin"]
```

In `src/rackscope/api/app.py`, add a **conditional** registration block inside `lifespan()`, after `APP_CONFIG` is loaded:

```python
if _plugin_enabled("my-plugin"):   # same id as plugin_id property
    try:
        from plugins.my_plugin.backend import MyPlugin
        plugin_registry.register(MyPlugin())
        logger.info("Registered My Plugin")
    except Exception as e:
        logger.error(f"Failed to register My Plugin: {e}", exc_info=True)
else:
    logger.info("My Plugin disabled — skipping registration")
```

:::info Why conditional imports?
The `_plugin_enabled()` helper returns `True` only when `plugins.my-plugin.enabled: true` is set in `app.yaml`. This means:

- **Disabled plugin** → module not imported, no routes mounted, zero memory/CPU overhead, nothing exposed in the API
- **Enabled plugin** → identical behaviour to a static import

This makes plugins truly autonomous: a production deployment without the plugin's container can set `enabled: false` and have no trace of the plugin in the running process.

**Never use a top-level import** (`from plugins.X import ...` at module level in `app.py`) for a plugin — this loads the code unconditionally regardless of configuration.
:::

The `_plugin_enabled()` helper is already defined in `app.py`:

```python
def _plugin_enabled(plugin_id: str) -> bool:
    """True only if plugins.<id>.enabled: true in app.yaml."""
    if not APP_CONFIG or not APP_CONFIG.plugins:
        return False
    cfg = APP_CONFIG.plugins.get(plugin_id, {})
    return bool(cfg.get("enabled", False)) if isinstance(cfg, dict) else False
```

## 4. Plugin Configuration

### The `enabled` flag

The **only** `app.yaml` key that controls whether a plugin is loaded is `plugins.<id>.enabled`. Everything else lives in the plugin's own config file.

```yaml
# config/app.yaml
plugins:
  my-plugin:
    enabled: true   # false = plugin not loaded at all
```

When `enabled: false` (or the key is absent), `_plugin_enabled()` returns `False` and the plugin is never instantiated. Set `enabled: false` in production for any plugin whose companion service (container, external API) is not available.

### Dedicated config file

Plugins should load their settings from a dedicated file: `config/plugins/{plugin_id}/config/plugin.yaml`.

**Step 1: Create a config model**

```python
# plugins/myplugin/backend/config.py
from pydantic import BaseModel

class MyPluginConfig(BaseModel):
    enabled: bool = True
    my_setting: str = "default"
    interval_seconds: int = 60
```

**Step 2: Priority chain loading**

Load config from three sources in priority order (highest to lowest):

```python
import os, yaml
from rackscope.model.config import AppConfig
from plugins.myplugin.backend.config import MyPluginConfig

def _load_config(self, app_config=None) -> MyPluginConfig:
    raw: dict = {}
    # 1. Dedicated file (recommended — overrides everything)
    path = self.config_file_path()  # "config/plugins/myplugin/config.yml"
    if os.path.exists(path):
        raw = yaml.safe_load(open(path)) or {}
    # 2. app.yaml → plugins.myplugin section
    elif app_config and hasattr(app_config, "plugins"):
        raw = app_config.plugins.get("myplugin", {})
    # 3. app.yaml → myplugin top-level (legacy fallback)
    elif app_config and hasattr(app_config, "myplugin"):
        raw = app_config.myplugin.model_dump()
    return MyPluginConfig(**raw)
```

**Step 3: Use `config_file_path()`**

```python
def config_file_path(self, base_dir: str = "config/plugins") -> str:
    # Returns "config/plugins/myplugin/config.yml"
    return super().config_file_path(base_dir)
```

### Conditional Menu Sections

Hide menu items when the plugin is disabled:

```python
def register_menu_sections(self) -> list[MenuSection]:
    from rackscope.api.app import APP_CONFIG
    config = self._load_config(APP_CONFIG)
    if not config.enabled:
        return []   # ← plugin hidden from sidebar
    return [
        MenuSection(
            id="myplugin",
            label="My Plugin",
            icon="Puzzle",
            order=100,
            items=[
                MenuItem(id="overview", label="Overview", path="/myplugin/overview", icon="BarChart2"),
            ],
        )
    ]
```

## 5. Testing Plugins

Because plugins are conditionally registered at runtime, tests must **manually register** the plugin and mount its routes on the shared `app` instance. This makes tests independent of `app.yaml` configuration.

```python
# tests/api/test_my_plugin.py
from fastapi.testclient import TestClient
from rackscope.api.app import app
from rackscope.plugins.registry import registry
from plugins.my_plugin.backend import MyPlugin

# Register once per test session (idempotent guard)
if not registry.get_plugin("my-plugin"):
    _plugin = MyPlugin()
    registry.register(_plugin)
    _plugin.register_routes(app)

client = TestClient(app)

def test_plugin_status():
    """Plugin status endpoint is reachable."""
    response = client.get("/api/myplugin/status")
    assert response.status_code == 200

def test_plugin_in_registry():
    """Plugin is correctly registered."""
    plugin = registry.get_plugin("my-plugin")
    assert plugin is not None
    assert plugin.plugin_id == "my-plugin"
```

:::tip Contract tests
Add a dedicated `tests/my_plugin/test_contracts.py` file that verifies:
- New config fields **exist** on the config model
- Old/removed config fields **do not exist**
- API response shapes match the documented schema

This prevents silent regressions when config models are refactored. See `tests/simulator/test_contracts.py` for a reference implementation.
:::

Real-world plugin implementations:
- **Slurm plugin**: `plugins/slurm/backend/plugin.py` — 8 API endpoints, metrics catalog, node mapping
- **Simulator plugin**: `plugins/simulator/backend/plugin.py` — 7 API endpoints, overrides, incident mode control, container restart

## Plugin Base Class Reference

```python
class RackscopePlugin(ABC):
    @property
    @abstractmethod
    def plugin_id(self) -> str: ...

    @property
    @abstractmethod
    def plugin_name(self) -> str: ...

    def register_routes(self, app: FastAPI) -> None: ...
    def register_menu_sections(self) -> list[MenuSection]: ...
    async def on_startup(self) -> None: ...
    async def on_shutdown(self) -> None: ...
    async def on_config_reload(self, app_config: AppConfig) -> None: ...
```

## Menu Section Order

| Plugin | Order |
|--------|-------|
| Core navigation | 0-10 |
| Workload (Slurm) | 50 |
| Custom plugins | 100-199 |
| Simulator | 200 |

Use lower values to appear earlier in the sidebar.
