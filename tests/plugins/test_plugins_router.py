"""Tests for plugins router."""

from fastapi.testclient import TestClient

from rackscope.api.app import app
from rackscope.plugins.base import RackscopePlugin, MenuSection, MenuItem
from rackscope.plugins.registry import registry

# Create test client
client = TestClient(app)


class MockTestPlugin(RackscopePlugin):
    """Mock plugin for router testing."""

    def __init__(self, plugin_id: str):
        self._plugin_id = plugin_id

    @property
    def plugin_id(self) -> str:
        return self._plugin_id

    @property
    def plugin_name(self) -> str:
        return f"Test Plugin {self._plugin_id}"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def description(self) -> str:
        return f"Description for {self._plugin_id}"

    def register_menu_sections(self):
        return [
            MenuSection(
                id=f"{self._plugin_id}-menu",
                label=f"{self._plugin_id} Menu",
                icon="TestIcon",
                order=50,
                items=[
                    MenuItem(
                        id=f"{self._plugin_id}-item",
                        label=f"{self._plugin_id} Item",
                        path=f"/{self._plugin_id}/test",
                    )
                ],
            )
        ]


class TestPluginsRouter:
    """Test plugins router endpoints."""

    def setup_method(self):
        """Clear registry before each test."""
        # Clear any existing plugins
        for plugin_id in list(registry.get_plugin_ids()):
            registry.unregister(plugin_id)

    def test_list_plugins_empty(self):
        """Test listing plugins when none registered."""
        response = client.get("/api/plugins")

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0
        assert data["plugins"] == []

    def test_list_plugins_with_registered_plugins(self):
        """Test listing plugins with registered plugins."""
        plugin1 = MockTestPlugin("plugin1")
        plugin2 = MockTestPlugin("plugin2")

        registry.register(plugin1)
        registry.register(plugin2)

        response = client.get("/api/plugins")

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 2
        assert len(data["plugins"]) == 2

        plugin_ids = {p["id"] for p in data["plugins"]}
        assert plugin_ids == {"plugin1", "plugin2"}

    def test_get_plugin_by_id(self):
        """Test getting a specific plugin by ID."""
        plugin = MockTestPlugin("test-plugin")
        registry.register(plugin)

        response = client.get("/api/plugins/test-plugin")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "test-plugin"
        assert data["name"] == "Test Plugin test-plugin"
        assert data["version"] == "1.0.0"
        assert data["description"] == "Description for test-plugin"

    def test_get_nonexistent_plugin(self):
        """Test getting nonexistent plugin returns 404."""
        response = client.get("/api/plugins/nonexistent")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_get_plugin_menu_empty(self):
        """Test getting plugin menu when no plugins registered."""
        response = client.get("/api/plugins/menu")

        assert response.status_code == 200
        data = response.json()
        assert data["sections"] == []

    def test_get_plugin_menu_with_plugins(self):
        """Test getting plugin menu with registered plugins."""
        plugin1 = MockTestPlugin("plugin1")
        plugin2 = MockTestPlugin("plugin2")

        registry.register(plugin1)
        registry.register(plugin2)

        response = client.get("/api/plugins/menu")

        assert response.status_code == 200
        data = response.json()
        assert len(data["sections"]) == 2

        section_ids = {s["id"] for s in data["sections"]}
        assert section_ids == {"plugin1-menu", "plugin2-menu"}

        # Check first section structure
        section = data["sections"][0]
        assert "id" in section
        assert "label" in section
        assert "icon" in section
        assert "order" in section
        assert "items" in section
        assert len(section["items"]) == 1

        # Check menu item structure
        item = section["items"][0]
        assert "id" in item
        assert "label" in item
        assert "path" in item

    def test_get_plugin_menu_sorted_by_order(self):
        """Test plugin menu sections are sorted by order."""

        class OrderedPlugin(MockTestPlugin):
            def __init__(self, plugin_id: str, order: int):
                super().__init__(plugin_id)
                self._order = order

            def register_menu_sections(self):
                return [
                    MenuSection(
                        id=f"{self._plugin_id}-menu",
                        label=f"{self._plugin_id} Menu",
                        order=self._order,
                    )
                ]

        plugin_low = OrderedPlugin("low", order=10)
        plugin_high = OrderedPlugin("high", order=100)
        plugin_mid = OrderedPlugin("mid", order=50)

        registry.register(plugin_high)  # Register out of order
        registry.register(plugin_low)
        registry.register(plugin_mid)

        response = client.get("/api/plugins/menu")

        assert response.status_code == 200
        data = response.json()

        # Should be sorted by order
        assert data["sections"][0]["id"] == "low-menu"
        assert data["sections"][1]["id"] == "mid-menu"
        assert data["sections"][2]["id"] == "high-menu"

    def test_get_plugin_config_not_found(self):
        """Test getting config for nonexistent plugin returns 404."""
        response = client.get("/api/plugins/nonexistent-xyz/config")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_get_plugin_config_registered_plugin(self):
        """Test getting config for registered plugin."""
        plugin = MockTestPlugin("test-plugin")
        registry.register(plugin)

        response = client.get("/api/plugins/test-plugin/config")
        # Should return 200 with config structure
        assert response.status_code == 200
        data = response.json()
        assert "config" in data
        assert "source" in data
        assert "path" in data

    def test_update_plugin_config_not_found(self):
        """Test updating config for nonexistent plugin returns 404."""
        response = client.post(
            "/api/plugins/nonexistent-xyz/config",
            json={"config": {"key": "value"}},
        )
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
