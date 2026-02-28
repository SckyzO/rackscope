---
id: writing-plugins
title: Writing Plugins
sidebar_position: 4
---

# Writing Plugins

This guide explains how to create a custom Rackscope plugin.

## 1. Create the Plugin Class

Create `src/rackscope/plugins/{name}/plugin.py`:

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
                section_id="my-plugin",
                title="My Plugin",
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
```

## 2. Create the Router

Create `src/rackscope/plugins/{name}/router.py`:

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

In `src/rackscope/api/app.py`, add to the lifespan:

```python
from rackscope.plugins.my_plugin.plugin import MyPlugin

@asynccontextmanager
async def lifespan(app: FastAPI):
    registry = PluginRegistry()
    registry.register(SimulatorPlugin())
    registry.register(SlurmPlugin())
    registry.register(MyPlugin())   # ← add here
    await registry.initialize(app)
    yield
    await registry.shutdown()
```

## 4. Add Configuration (Optional)

Create `src/rackscope/plugins/{name}/config.py`:

```python
from pydantic import BaseModel
from typing import Optional


class MyPluginConfig(BaseModel):
    enabled: bool = True
    api_url: Optional[str] = None
    timeout_seconds: int = 30
```

Load it in the plugin:

```python
def __init__(self) -> None:
    self._config: Optional[MyPluginConfig] = None

async def on_startup(self) -> None:
    app_config = get_current_app_config()
    if hasattr(app_config, "my_plugin"):
        self._config = MyPluginConfig(**app_config.my_plugin)
```

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
```

## Menu Section Order

| Plugin | Order |
|--------|-------|
| Core navigation | 0-10 |
| Workload (Slurm) | 50 |
| Custom plugins | 100-199 |
| Simulator | 200 |

Use lower values to appear earlier in the sidebar.
