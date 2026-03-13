"""
Base classes for Rackscope plugins.

Plugins extend Rackscope with optional features without modifying core code.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, TYPE_CHECKING
from pydantic import BaseModel
from fastapi import FastAPI

if TYPE_CHECKING:
    from rackscope.model.config import AppConfig


class MenuItem(BaseModel):
    """A single menu item in a plugin's navigation."""

    id: str  # "slurm-overview", "slurm-partitions"
    label: str  # "Overview", "Partitions"
    path: str  # "/slurm/overview", "/slurm/partitions"
    icon: Optional[str] = None  # "Activity", "Database" (Lucide icon names)


class MenuSection(BaseModel):
    """A navigation menu section contributed by a plugin."""

    id: str  # "workload", "simulator"
    label: str  # "Workload", "Simulator"
    icon: Optional[str] = None  # "Zap", "TestTube"
    items: List[MenuItem] = []
    order: int = 100  # Display order (lower = higher in menu)


class RackscopePlugin(ABC):
    """
    Base class for all Rackscope plugins.

    Plugins can:
    - Register API routes (via register_routes)
    - Contribute menu sections to the UI (via register_menu_sections)
    - React to lifecycle events (on_startup, on_shutdown)

    Example:
        class SlurmPlugin(RackscopePlugin):
            @property
            def plugin_id(self) -> str:
                return "workload-slurm"

            @property
            def plugin_name(self) -> str:
                return "Slurm Workload Manager"

            def register_routes(self, app: FastAPI) -> None:
                from .router import router
                app.include_router(router)

            def register_menu_sections(self) -> List[MenuSection]:
                return [
                    MenuSection(
                        id="workload",
                        label="Workload",
                        icon="Zap",
                        order=50,
                        items=[
                            MenuItem(id="slurm-overview", label="Overview", path="/slurm/overview"),
                            MenuItem(id="slurm-partitions", label="Partitions", path="/slurm/partitions"),
                        ],
                    )
                ]
    """

    @property
    @abstractmethod
    def plugin_id(self) -> str:
        """
        Unique plugin identifier.

        Must be unique across all plugins.
        Convention: category-name (e.g., "workload-slurm", "simulator")

        Returns:
            Plugin ID string (e.g., "workload-slurm")
        """
        pass

    @property
    @abstractmethod
    def plugin_name(self) -> str:
        """
        Human-readable plugin name.

        Displayed in the UI and plugin management.

        Returns:
            Plugin name string (e.g., "Slurm Workload Manager")
        """
        pass

    @property
    def version(self) -> str:
        """
        Plugin version.

        Returns:
            Version string (default: "1.0.0")
        """
        return "1.0.0"

    @property
    def description(self) -> Optional[str]:
        """
        Plugin description.

        Returns:
            Description string or None
        """
        return None

    @property
    def author(self) -> Optional[str]:
        """
        Plugin author.

        Returns:
            Author string or None
        """
        return None

    def register_routes(self, app: FastAPI) -> None:
        """
        Register plugin-specific API routes.

        Called during plugin initialization to add routes to FastAPI app.

        Args:
            app: FastAPI application instance

        Example:
            def register_routes(self, app: FastAPI) -> None:
                from .router import router
                app.include_router(router, prefix="/api/slurm", tags=["slurm"])
        """
        pass

    def register_menu_sections(self) -> List[MenuSection]:
        """
        Register plugin menu sections for frontend navigation.

        Called to build the dynamic navigation menu in the UI.

        Returns:
            List of MenuSection objects

        Example:
            def register_menu_sections(self) -> List[MenuSection]:
                return [
                    MenuSection(
                        id="workload",
                        label="Workload",
                        icon="Zap",
                        order=50,
                        items=[
                            MenuItem(id="overview", label="Overview", path="/slurm/overview"),
                        ],
                    )
                ]
        """
        return []

    async def on_startup(self) -> None:
        """
        Called when the plugin is loaded during application startup.

        Use this to initialize resources, connections, etc.

        Example:
            async def on_startup(self) -> None:
                self.db_connection = await connect_to_database()
        """
        pass

    async def on_shutdown(self) -> None:
        """
        Called when the plugin is unloaded during application shutdown.

        Use this to clean up resources, close connections, etc.

        Example:
            async def on_shutdown(self) -> None:
                await self.db_connection.close()
        """
        pass

    async def on_config_reload(self, app_config: "AppConfig") -> None:
        """
        Called when the application configuration is reloaded.

        Use this to update plugin state based on new configuration.
        This allows hot-reloading configuration without restarting the backend.

        Args:
            app_config: The new application configuration

        Example:
            async def on_config_reload(self, app_config: AppConfig) -> None:
                if app_config.plugins and app_config.plugins.slurm:
                    self.config = app_config.plugins.slurm
                    logger.info(f"Reloaded Slurm config: metric={self.config.metric}")
        """
        pass

    def config_file_path(self, base_dir: str = "config/plugins") -> str:
        """
        Returns the path to this plugin's dedicated config file.

        Convention: config/plugins/{plugin_id}/config.yml
        This file holds all plugin-specific settings (separate from app.yaml).
        app.yaml only contains: plugins.{id}.enabled (bool)

        Args:
            base_dir: Base directory for plugin configs (default: config/plugins)

        Returns:
            Path to the plugin's config file
        """
        return f"{base_dir}/{self.plugin_id}/config.yml"

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert plugin metadata to dictionary.

        Returns:
            Dictionary with plugin metadata
        """
        return {
            "id": self.plugin_id,
            "name": self.plugin_name,
            "version": self.version,
            "description": self.description,
            "author": self.author,
        }
