"""
Plugins Router

Endpoints for plugin management and discovery.
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException

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
