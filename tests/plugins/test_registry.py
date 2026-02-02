"""Tests for plugin registry."""

import pytest
from fastapi import FastAPI

from rackscope.plugins.base import RackscopePlugin, MenuSection
from rackscope.plugins.registry import PluginRegistry


class MockPlugin(RackscopePlugin):
    """Mock plugin for testing."""

    def __init__(self, plugin_id: str = "mock-plugin"):
        self._plugin_id = plugin_id
        self.startup_called = False
        self.shutdown_called = False
        self.routes_registered = False

    @property
    def plugin_id(self) -> str:
        return self._plugin_id

    @property
    def plugin_name(self) -> str:
        return f"Mock Plugin ({self._plugin_id})"

    def register_routes(self, app: FastAPI) -> None:
        self.routes_registered = True

    async def on_startup(self) -> None:
        self.startup_called = True

    async def on_shutdown(self) -> None:
        self.shutdown_called = True

    def register_menu_sections(self):
        return [
            MenuSection(
                id=f"{self._plugin_id}-section",
                label=f"{self._plugin_id} Section",
                order=100,
            )
        ]


class TestPluginRegistry:
    """Test PluginRegistry class."""

    def test_create_empty_registry(self):
        """Test creating an empty plugin registry."""
        registry = PluginRegistry()

        assert registry.count() == 0
        assert registry.get_all_plugins() == []
        assert registry.get_plugin_ids() == []
        assert not registry.is_initialized()

    def test_register_plugin(self):
        """Test registering a plugin."""
        registry = PluginRegistry()
        plugin = MockPlugin("test-plugin")

        registry.register(plugin)

        assert registry.count() == 1
        assert len(registry.get_all_plugins()) == 1
        assert registry.get_plugin_ids() == ["test-plugin"]
        assert registry.get_plugin("test-plugin") == plugin

    def test_register_duplicate_plugin_id(self):
        """Test registering plugin with duplicate ID raises error."""
        registry = PluginRegistry()
        plugin1 = MockPlugin("test-plugin")
        plugin2 = MockPlugin("test-plugin")  # Same ID

        registry.register(plugin1)

        with pytest.raises(ValueError, match="already registered"):
            registry.register(plugin2)

    def test_register_multiple_plugins(self):
        """Test registering multiple plugins."""
        registry = PluginRegistry()
        plugin1 = MockPlugin("plugin1")
        plugin2 = MockPlugin("plugin2")
        plugin3 = MockPlugin("plugin3")

        registry.register(plugin1)
        registry.register(plugin2)
        registry.register(plugin3)

        assert registry.count() == 3
        assert set(registry.get_plugin_ids()) == {"plugin1", "plugin2", "plugin3"}

    def test_unregister_plugin(self):
        """Test unregistering a plugin."""
        registry = PluginRegistry()
        plugin = MockPlugin("test-plugin")

        registry.register(plugin)
        assert registry.count() == 1

        registry.unregister("test-plugin")
        assert registry.count() == 0
        assert registry.get_plugin("test-plugin") is None

    def test_unregister_nonexistent_plugin(self):
        """Test unregistering nonexistent plugin raises error."""
        registry = PluginRegistry()

        with pytest.raises(KeyError, match="not registered"):
            registry.unregister("nonexistent-plugin")

    def test_get_plugin(self):
        """Test getting a plugin by ID."""
        registry = PluginRegistry()
        plugin = MockPlugin("test-plugin")

        registry.register(plugin)

        retrieved = registry.get_plugin("test-plugin")
        assert retrieved == plugin

    def test_get_nonexistent_plugin(self):
        """Test getting nonexistent plugin returns None."""
        registry = PluginRegistry()

        assert registry.get_plugin("nonexistent") is None

    @pytest.mark.asyncio
    async def test_initialize_plugins(self):
        """Test initializing plugins."""
        registry = PluginRegistry()
        plugin1 = MockPlugin("plugin1")
        plugin2 = MockPlugin("plugin2")

        registry.register(plugin1)
        registry.register(plugin2)

        app = FastAPI()
        await registry.initialize(app)

        assert registry.is_initialized()
        assert plugin1.startup_called
        assert plugin2.startup_called
        assert plugin1.routes_registered
        assert plugin2.routes_registered

    @pytest.mark.asyncio
    async def test_initialize_already_initialized(self):
        """Test initializing already initialized registry raises error."""
        registry = PluginRegistry()
        app = FastAPI()

        await registry.initialize(app)

        with pytest.raises(RuntimeError, match="already initialized"):
            await registry.initialize(app)

    @pytest.mark.asyncio
    async def test_shutdown_plugins(self):
        """Test shutting down plugins."""
        registry = PluginRegistry()
        plugin1 = MockPlugin("plugin1")
        plugin2 = MockPlugin("plugin2")

        registry.register(plugin1)
        registry.register(plugin2)

        app = FastAPI()
        await registry.initialize(app)
        await registry.shutdown()

        assert not registry.is_initialized()
        assert plugin1.shutdown_called
        assert plugin2.shutdown_called

    @pytest.mark.asyncio
    async def test_shutdown_not_initialized(self):
        """Test shutting down non-initialized registry does nothing."""
        registry = PluginRegistry()

        # Should not raise error
        await registry.shutdown()

    @pytest.mark.asyncio
    async def test_plugin_startup_error_continues(self):
        """Test plugin startup error doesn't stop other plugins."""

        class FailingPlugin(MockPlugin):
            async def on_startup(self) -> None:
                raise Exception("Startup failed")

        registry = PluginRegistry()
        failing_plugin = FailingPlugin("failing-plugin")
        good_plugin = MockPlugin("good-plugin")

        registry.register(failing_plugin)
        registry.register(good_plugin)

        app = FastAPI()
        await registry.initialize(app)

        # Good plugin should still be initialized
        assert good_plugin.startup_called

    def test_get_menu_sections(self):
        """Test getting aggregated menu sections."""
        registry = PluginRegistry()
        plugin1 = MockPlugin("plugin1")
        plugin2 = MockPlugin("plugin2")

        registry.register(plugin1)
        registry.register(plugin2)

        sections = registry.get_menu_sections()

        assert len(sections) == 2
        section_ids = {s.id for s in sections}
        assert section_ids == {"plugin1-section", "plugin2-section"}

    def test_get_menu_sections_sorted_by_order(self):
        """Test menu sections are sorted by order."""

        class OrderedPlugin(MockPlugin):
            def __init__(self, plugin_id: str, order: int):
                super().__init__(plugin_id)
                self._order = order

            def register_menu_sections(self):
                return [
                    MenuSection(
                        id=f"{self.plugin_id}-section",
                        label=f"{self.plugin_id}",
                        order=self._order,
                    )
                ]

        registry = PluginRegistry()
        plugin1 = OrderedPlugin("plugin1", order=100)
        plugin2 = OrderedPlugin("plugin2", order=50)
        plugin3 = OrderedPlugin("plugin3", order=75)

        registry.register(plugin1)
        registry.register(plugin2)
        registry.register(plugin3)

        sections = registry.get_menu_sections()

        # Should be sorted by order: 50, 75, 100
        assert sections[0].id == "plugin2-section"
        assert sections[1].id == "plugin3-section"
        assert sections[2].id == "plugin1-section"

    def test_get_menu_sections_error_continues(self):
        """Test menu section error doesn't stop other plugins."""

        class FailingMenuPlugin(MockPlugin):
            def register_menu_sections(self):
                raise Exception("Menu failed")

        registry = PluginRegistry()
        failing_plugin = FailingMenuPlugin("failing-plugin")
        good_plugin = MockPlugin("good-plugin")

        registry.register(failing_plugin)
        registry.register(good_plugin)

        sections = registry.get_menu_sections()

        # Should still get sections from good plugin
        assert len(sections) == 1
        assert sections[0].id == "good-plugin-section"
