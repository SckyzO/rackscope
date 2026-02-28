"""
Plugins Router

Endpoints for plugin management and discovery.
Plugin-specific config is stored in config/plugins/{id}/config.yml (separate from app.yaml).
app.yaml only controls enabled: true/false per plugin.
"""

import os
from typing import Dict, Any

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from rackscope.plugins.registry import registry

router = APIRouter()


@router.get("/api/plugins")
async def list_plugins() -> Dict[str, Any]:
    """
    List all registered plugins.

    Returns:
        Dictionary with plugin count and list of plugins with metadata
    """
    plugins = registry.get_all_plugins()

    return {
        "count": len(plugins),
        "plugins": [plugin.to_dict() for plugin in plugins],
    }


@router.get("/api/plugins/menu")
async def get_plugin_menu() -> Dict[str, Any]:
    """
    Get aggregated menu sections from all plugins.

    This endpoint is called by the frontend to build the dynamic navigation menu.

    Returns:
        Dictionary with menu sections

    Example response:
        {
            "sections": [
                {
                    "id": "workload",
                    "label": "Workload",
                    "icon": "Zap",
                    "order": 50,
                    "items": [
                        {
                            "id": "slurm-overview",
                            "label": "Overview",
                            "path": "/slurm/overview",
                            "icon": "Activity"
                        }
                    ]
                }
            ]
        }
    """
    sections = registry.get_menu_sections()

    return {
        "sections": [section.model_dump() for section in sections],
    }


@router.get("/api/plugins/{plugin_id}")
async def get_plugin(plugin_id: str) -> Dict[str, Any]:
    """
    Get details about a specific plugin.

    Args:
        plugin_id: ID of the plugin to retrieve

    Returns:
        Plugin metadata

    Raises:
        HTTPException: 404 if plugin not found
    """
    plugin = registry.get_plugin(plugin_id)

    if not plugin:
        raise HTTPException(status_code=404, detail=f"Plugin '{plugin_id}' not found")

    return plugin.to_dict()


class PluginConfigUpdate(BaseModel):
    config: Dict[str, Any]


@router.get("/api/plugins/{plugin_id}/config")
async def get_plugin_config(plugin_id: str) -> Dict[str, Any]:
    """
    Get the configuration for a specific plugin from its dedicated config file.

    Plugin config lives in config/plugins/{id}/config.yml (separate from app.yaml).

    Args:
        plugin_id: ID of the plugin

    Returns:
        Plugin configuration dict

    Raises:
        HTTPException: 404 if plugin not found
    """
    plugin = registry.get_plugin(plugin_id)
    if not plugin:
        raise HTTPException(status_code=404, detail=f"Plugin '{plugin_id}' not found")

    config_path = plugin.config_file_path()
    if not os.path.exists(config_path):
        return {"config": {}, "source": "defaults", "path": config_path}

    try:
        with open(config_path, encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}
        return {"config": config, "source": "file", "path": config_path}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read plugin config: {exc}") from exc


@router.post("/api/plugins/{plugin_id}/config")
async def update_plugin_config(plugin_id: str, body: PluginConfigUpdate) -> Dict[str, Any]:
    """
    Update the configuration for a specific plugin.

    Writes to config/plugins/{id}/config.yml and hot-reloads the plugin.

    Args:
        plugin_id: ID of the plugin
        body: New configuration

    Returns:
        Updated plugin configuration

    Raises:
        HTTPException: 404 if plugin not found, 500 on write error
    """

    plugin = registry.get_plugin(plugin_id)
    if not plugin:
        raise HTTPException(status_code=404, detail=f"Plugin '{plugin_id}' not found")

    config_path = plugin.config_file_path()

    try:
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        with open(config_path, "w", encoding="utf-8") as f:
            yaml.dump(body.config, f, default_flow_style=False, allow_unicode=True)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to write plugin config: {exc}"
        ) from exc

    # Hot-reload the plugin with the new config
    try:
        from rackscope.api.app import APP_CONFIG

        if APP_CONFIG:
            await plugin.on_config_reload(APP_CONFIG)
    except Exception:
        pass  # Non-critical — config is saved, plugin will reload on next restart

    return {"config": body.config, "source": "file", "path": config_path, "status": "saved"}
