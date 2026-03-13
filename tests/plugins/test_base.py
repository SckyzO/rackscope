"""Tests for plugin base classes."""

import pytest
from fastapi import FastAPI

from rackscope.plugins.base import RackscopePlugin, MenuSection, MenuItem


class MockPlugin(RackscopePlugin):
    """Mock plugin for testing."""

    @property
    def plugin_id(self) -> str:
        return "test-plugin"

    @property
    def plugin_name(self) -> str:
        return "Test Plugin"

    @property
    def version(self) -> str:
        return "1.2.3"

    @property
    def description(self) -> str:
        return "A test plugin"

    @property
    def author(self) -> str:
        return "Test Author"


class TestMenuItem:
    """Test MenuItem model."""

    def test_create_menu_item(self):
        """Test creating a menu item."""
        item = MenuItem(
            id="test-item",
            label="Test Item",
            path="/test/item",
            icon="TestIcon",
        )

        assert item.id == "test-item"
        assert item.label == "Test Item"
        assert item.path == "/test/item"
        assert item.icon == "TestIcon"

    def test_menu_item_without_icon(self):
        """Test creating menu item without icon."""
        item = MenuItem(
            id="test-item",
            label="Test Item",
            path="/test/item",
        )

        assert item.id == "test-item"
        assert item.icon is None


class TestMenuSection:
    """Test MenuSection model."""

    def test_create_menu_section(self):
        """Test creating a menu section."""
        section = MenuSection(
            id="test-section",
            label="Test Section",
            icon="TestIcon",
            order=50,
            items=[
                MenuItem(id="item1", label="Item 1", path="/test/item1"),
                MenuItem(id="item2", label="Item 2", path="/test/item2"),
            ],
        )

        assert section.id == "test-section"
        assert section.label == "Test Section"
        assert section.icon == "TestIcon"
        assert section.order == 50
        assert len(section.items) == 2

    def test_menu_section_default_order(self):
        """Test menu section with default order."""
        section = MenuSection(
            id="test-section",
            label="Test Section",
        )

        assert section.order == 100  # Default order

    def test_menu_section_empty_items(self):
        """Test menu section with no items."""
        section = MenuSection(
            id="test-section",
            label="Test Section",
        )

        assert section.items == []


class TestRackscopePlugin:
    """Test RackscopePlugin base class."""

    def test_plugin_properties(self):
        """Test plugin basic properties."""
        plugin = MockPlugin()

        assert plugin.plugin_id == "test-plugin"
        assert plugin.plugin_name == "Test Plugin"
        assert plugin.version == "1.2.3"
        assert plugin.description == "A test plugin"
        assert plugin.author == "Test Author"

    def test_plugin_default_version(self):
        """Test plugin with default version."""

        class MinimalPlugin(RackscopePlugin):
            @property
            def plugin_id(self) -> str:
                return "minimal-plugin"

            @property
            def plugin_name(self) -> str:
                return "Minimal Plugin"

        plugin = MinimalPlugin()
        assert plugin.version == "1.0.0"  # Default version

    def test_plugin_optional_properties(self):
        """Test plugin with optional properties."""

        class MinimalPlugin(RackscopePlugin):
            @property
            def plugin_id(self) -> str:
                return "minimal-plugin"

            @property
            def plugin_name(self) -> str:
                return "Minimal Plugin"

        plugin = MinimalPlugin()
        assert plugin.description is None
        assert plugin.author is None

    def test_plugin_register_routes_default(self):
        """Test default register_routes does nothing."""
        plugin = MockPlugin()
        app = FastAPI()

        # Should not raise error
        plugin.register_routes(app)

    def test_plugin_register_menu_sections_default(self):
        """Test default register_menu_sections returns empty list."""
        plugin = MockPlugin()

        sections = plugin.register_menu_sections()
        assert sections == []

    @pytest.mark.asyncio
    async def test_plugin_on_startup_default(self):
        """Test default on_startup does nothing."""
        plugin = MockPlugin()

        # Should not raise error
        await plugin.on_startup()

    @pytest.mark.asyncio
    async def test_plugin_on_shutdown_default(self):
        """Test default on_shutdown does nothing."""
        plugin = MockPlugin()

        # Should not raise error
        await plugin.on_shutdown()

    def test_plugin_to_dict(self):
        """Test converting plugin to dictionary."""
        plugin = MockPlugin()

        data = plugin.to_dict()

        assert data["id"] == "test-plugin"
        assert data["name"] == "Test Plugin"
        assert data["version"] == "1.2.3"
        assert data["description"] == "A test plugin"
        assert data["author"] == "Test Author"

    def test_plugin_with_menu_sections(self):
        """Test plugin that registers menu sections."""

        class PluginWithMenu(MockPlugin):
            def register_menu_sections(self):
                return [
                    MenuSection(
                        id="test-section",
                        label="Test Section",
                        icon="TestIcon",
                        order=50,
                        items=[
                            MenuItem(id="item1", label="Item 1", path="/test/1"),
                        ],
                    )
                ]

        plugin = PluginWithMenu()
        sections = plugin.register_menu_sections()

        assert len(sections) == 1
        assert sections[0].id == "test-section"
        assert len(sections[0].items) == 1
