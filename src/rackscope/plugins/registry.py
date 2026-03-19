"""
Plugin registry and lifecycle management.

The PluginRegistry maintains the list of loaded plugins and handles their lifecycle.
"""

import logging
from typing import Dict, List, Optional, TYPE_CHECKING

from fastapi import FastAPI

from rackscope.plugins.base import RackscopePlugin, MenuSection

if TYPE_CHECKING:
    from rackscope.model.config import AppConfig

logger = logging.getLogger(__name__)


class PluginRegistry:
    """
    Central registry for managing plugins.

    The registry:
    - Maintains the list of loaded plugins
    - Handles plugin lifecycle (startup, shutdown)
    - Registers plugin routes with FastAPI
    - Aggregates menu sections from all plugins

    Example:
        registry = PluginRegistry()
        registry.register(SlurmPlugin())
        await registry.initialize(app)
    """

    def __init__(self):
        """Initialize empty plugin registry."""
        self._plugins: Dict[str, RackscopePlugin] = {}
        self._initialized: bool = False

    def register(self, plugin: RackscopePlugin) -> None:
        """
        Register a plugin with the registry.

        Args:
            plugin: Plugin instance to register

        Raises:
            ValueError: If plugin ID is already registered
        """
        plugin_id = plugin.plugin_id

        if plugin_id in self._plugins:
            raise ValueError(f"Plugin '{plugin_id}' is already registered")

        logger.info(f"Registering plugin: {plugin.plugin_name} ({plugin_id})")
        self._plugins[plugin_id] = plugin

    def unregister(self, plugin_id: str) -> None:
        """
        Unregister a plugin from the registry.

        Args:
            plugin_id: ID of the plugin to unregister

        Raises:
            KeyError: If plugin ID is not registered
        """
        if plugin_id not in self._plugins:
            raise KeyError(f"Plugin '{plugin_id}' is not registered")

        logger.info(f"Unregistering plugin: {plugin_id}")
        del self._plugins[plugin_id]

    def get_plugin(self, plugin_id: str) -> Optional[RackscopePlugin]:
        """
        Get a plugin by ID.

        Args:
            plugin_id: ID of the plugin to retrieve

        Returns:
            Plugin instance or None if not found
        """
        return self._plugins.get(plugin_id)

    def get_all_plugins(self) -> List[RackscopePlugin]:
        """
        Get all registered plugins.

        Returns:
            List of all plugin instances
        """
        return list(self._plugins.values())

    def get_plugin_ids(self) -> List[str]:
        """
        Get all registered plugin IDs.

        Returns:
            List of plugin IDs
        """
        return list(self._plugins.keys())

    async def initialize(self, app: FastAPI) -> None:
        """
        Initialize all registered plugins.

        This method:
        1. Registers plugin routes with FastAPI
        2. Calls on_startup() for each plugin

        Args:
            app: FastAPI application instance

        Raises:
            RuntimeError: If already initialized
        """
        if self._initialized:
            raise RuntimeError("PluginRegistry is already initialized")

        logger.info(f"Initializing {len(self._plugins)} plugin(s)")

        # Register routes for each plugin
        for plugin_id, plugin in self._plugins.items():
            try:
                logger.info(f"Registering routes for plugin: {plugin_id}")
                plugin.register_routes(app)
            except Exception as e:
                logger.error(f"Failed to register routes for plugin {plugin_id}: {e}")
                # Continue with other plugins even if one fails

        # Call on_startup for each plugin
        for plugin_id, plugin in self._plugins.items():
            try:
                logger.info(f"Starting plugin: {plugin_id}")
                await plugin.on_startup()
            except Exception as e:
                logger.error(f"Failed to start plugin {plugin_id}: {e}")
                # Continue with other plugins even if one fails

        self._initialized = True
        logger.info("Plugin registry initialization complete")

    async def shutdown(self) -> None:
        """
        Shutdown all registered plugins.

        Calls on_shutdown() for each plugin in reverse registration order.
        """
        if not self._initialized:
            logger.warning("PluginRegistry is not initialized, skipping shutdown")
            return

        logger.info(f"Shutting down {len(self._plugins)} plugin(s)")

        # Shutdown plugins in reverse order
        for plugin_id, plugin in reversed(list(self._plugins.items())):
            try:
                logger.info(f"Shutting down plugin: {plugin_id}")
                await plugin.on_shutdown()
            except Exception as e:
                logger.error(f"Error shutting down plugin {plugin_id}: {e}")
                # Continue with other plugins even if one fails

        self._initialized = False
        logger.info("Plugin registry shutdown complete")

    def get_menu_sections(self) -> List[MenuSection]:
        """
        Get aggregated menu sections from all plugins.

        Returns:
            List of MenuSection objects, sorted by order
        """
        all_sections: List[MenuSection] = []

        for plugin_id, plugin in self._plugins.items():
            try:
                sections = plugin.register_menu_sections()
                all_sections.extend(sections)
            except Exception as e:
                logger.error(f"Error getting menu sections from plugin {plugin_id}: {e}")
                # Continue with other plugins even if one fails

        # Sort by order (lower = higher in menu)
        all_sections.sort(key=lambda s: s.order)

        return all_sections

    def is_initialized(self) -> bool:
        """
        Check if the registry is initialized.

        Returns:
            True if initialized, False otherwise
        """
        return self._initialized

    def count(self) -> int:
        """
        Get the number of registered plugins.

        Returns:
            Number of registered plugins
        """
        return len(self._plugins)

    async def reload_plugins(self, app_config: "AppConfig") -> None:
        """
        Reload all plugins with new configuration.

        Calls on_config_reload() for each plugin to allow them to update their
        state based on the new configuration. This enables hot-reloading without
        restarting the backend.

        Args:
            app_config: The new application configuration
        """
        logger.info(f"Reloading {len(self._plugins)} plugin(s) with new configuration")

        for plugin_id, plugin in self._plugins.items():
            try:
                logger.debug(f"Reloading plugin: {plugin_id}")
                await plugin.on_config_reload(app_config)
            except Exception as e:
                logger.error(f"Error reloading plugin {plugin_id}: {e}", exc_info=True)
                # Continue with other plugins even if one fails

        logger.info("Plugin configuration reload complete")


# Global plugin registry instance
registry = PluginRegistry()
