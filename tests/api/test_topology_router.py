"""
Tests for Topology Router

Comprehensive tests for all topology management endpoints:
- Sites: create
- Rooms: create, get layout
- Aisles: create, update rack order
- Racks: get details, update template
- Devices: get details, add, update position, delete, replace all
"""

import tempfile
from pathlib import Path
from typing import Optional
from unittest.mock import Mock

import pytest
import yaml
from fastapi.testclient import TestClient

from rackscope.api.app import app
from rackscope.api.dependencies import (
    get_app_config,
    get_catalog,
    get_topology,
    get_topology_optional,
)
from rackscope.model.catalog import Catalog, DeviceTemplate
from rackscope.model.config import AppConfig, PathsConfig
from rackscope.model.domain import Aisle, Device, Rack, Room, Site, Topology

client = TestClient(app)


# Fixtures


@pytest.fixture
def mock_topology():
    """Create a minimal test topology."""
    device1 = Device(
        id="node001",
        name="Compute Node 1",
        template_id="compute_node",
        u_position=1,
        instance="node001",
    )
    device2 = Device(
        id="node002",
        name="Compute Node 2",
        template_id="compute_node",
        u_position=3,
        instance="node002",
    )

    rack1 = Rack(
        id="rack01",
        name="Rack 01",
        template_id="standard_42u",
        devices=[device1, device2],
    )
    rack2 = Rack(
        id="rack02",
        name="Rack 02",
        template_id="standard_42u",
        devices=[],
    )

    aisle1 = Aisle(id="aisle-a", name="Aisle A", racks=[rack1, rack2])
    room1 = Room(
        id="room1",
        name="Server Room 1",
        aisles=[aisle1],
        standalone_racks=[],
    )
    site1 = Site(id="site1", name="Datacenter 1", rooms=[room1])

    return Topology(sites=[site1])


@pytest.fixture
def mock_catalog():
    """Create a minimal test catalog."""
    from rackscope.model.catalog import LayoutConfig

    compute_template = DeviceTemplate(
        id="compute_node",
        name="Compute Node",
        type="server",
        u_height=2,
        layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
        checks=[],
    )
    return Catalog(device_templates=[compute_template], rack_templates=[])


@pytest.fixture
def temp_topology_dir():
    """Create a temporary directory for topology files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        base_path = Path(tmpdir)

        # Create directory structure
        sites_file = base_path / "sites.yaml"
        sites_file.write_text(
            yaml.safe_dump(
                {
                    "sites": [
                        {
                            "id": "site1",
                            "name": "Datacenter 1",
                            "rooms": [
                                {"id": "room1", "name": "Server Room 1"},
                            ],
                        }
                    ]
                }
            )
        )

        # Create room directory
        room_dir = base_path / "datacenters" / "site1" / "rooms" / "room1"
        room_dir.mkdir(parents=True, exist_ok=True)

        # Create room file
        (room_dir / "room.yaml").write_text(
            yaml.safe_dump(
                {
                    "id": "room1",
                    "name": "Server Room 1",
                    "description": "Main server room",
                    "aisles": [{"id": "aisle-a", "name": "Aisle A"}],
                    "standalone_racks": [],
                }
            )
        )

        # Create aisle directory and file
        aisle_dir = room_dir / "aisles" / "aisle-a"
        aisle_dir.mkdir(parents=True, exist_ok=True)
        (aisle_dir / "aisle.yaml").write_text(
            yaml.safe_dump(
                {
                    "id": "aisle-a",
                    "name": "Aisle A",
                    "racks": ["rack01", "rack02"],
                }
            )
        )

        # Create rack directory and files
        rack_dir = aisle_dir / "racks"
        rack_dir.mkdir(parents=True, exist_ok=True)
        (rack_dir / "rack01.yaml").write_text(
            yaml.safe_dump(
                {
                    "id": "rack01",
                    "name": "Rack 01",
                    "aisle_id": "aisle-a",
                    "template_id": "standard_42u",
                    "devices": [
                        {
                            "id": "node001",
                            "name": "Compute Node 1",
                            "template_id": "compute_node",
                            "u_position": 1,
                            "instance": "node001",
                        }
                    ],
                }
            )
        )
        (rack_dir / "rack02.yaml").write_text(
            yaml.safe_dump(
                {
                    "id": "rack02",
                    "name": "Rack 02",
                    "aisle_id": "aisle-a",
                    "template_id": "standard_42u",
                    "devices": [],
                }
            )
        )

        # Create standalone racks directory
        (room_dir / "standalone_racks").mkdir(parents=True, exist_ok=True)

        yield base_path


@pytest.fixture
def mock_app_config(temp_topology_dir):
    """Create a test app config."""
    return AppConfig(
        paths=PathsConfig(
            topology=str(temp_topology_dir),
            templates="config/templates",
            checks="config/checks/library",
        )
    )


# Dependency overrides


def override_topology(topology: Topology):
    """Override get_topology dependency."""

    async def _get_topology() -> Topology:
        return topology

    return _get_topology


def override_topology_optional(topology: Optional[Topology]):
    """Override get_topology_optional dependency."""

    async def _get_topology_optional() -> Optional[Topology]:
        return topology

    return _get_topology_optional


def override_catalog(catalog: Catalog):
    """Override get_catalog dependency."""

    async def _get_catalog() -> Catalog:
        return catalog

    return _get_catalog


def override_app_config(config: AppConfig):
    """Override get_app_config dependency."""

    async def _get_app_config() -> AppConfig:
        return config

    return _get_app_config


# Sites Tests


def test_get_sites_with_topology(mock_topology):
    """Test getting sites when topology is loaded."""
    app.dependency_overrides[get_topology_optional] = override_topology_optional(mock_topology)

    response = client.get("/api/sites")

    assert response.status_code == 200
    sites = response.json()
    assert len(sites) == 1
    assert sites[0]["id"] == "site1"
    assert sites[0]["name"] == "Datacenter 1"

    app.dependency_overrides.clear()


def test_get_sites_without_topology():
    """Test getting sites when topology is not loaded."""
    app.dependency_overrides[get_topology_optional] = override_topology_optional(None)

    response = client.get("/api/sites")

    assert response.status_code == 200
    assert response.json() == []

    app.dependency_overrides.clear()


def test_create_site(mock_app_config):
    """Test creating a new site."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    # Mock the app module TOPOLOGY reload
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = Mock()

    response = client.post(
        "/api/topology/sites",
        json={"name": "New Datacenter", "id": "site2"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["site"]["id"] == "site2"
    assert data["site"]["name"] == "New Datacenter"

    # Verify sites.yaml was updated
    sites_file = Path(mock_app_config.paths.topology) / "sites.yaml"
    sites_data = yaml.safe_load(sites_file.read_text())
    assert len(sites_data["sites"]) == 2
    assert any(s["id"] == "site2" for s in sites_data["sites"])

    # Verify directory was created
    site_dir = Path(mock_app_config.paths.topology) / "datacenters" / "site2"
    assert site_dir.exists()

    app.dependency_overrides.clear()


def test_create_site_duplicate_id(mock_app_config):
    """Test creating a site with duplicate ID."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.post(
        "/api/topology/sites",
        json={"name": "Duplicate Site", "id": "site1"},
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_create_site_empty_name(mock_app_config):
    """Test creating a site with empty name."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.post(
        "/api/topology/sites",
        json={"name": "  ", "id": "site3"},
    )

    assert response.status_code == 400
    assert "required" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


# Rooms Tests


def test_get_rooms(mock_topology):
    """Test getting all rooms with hierarchy."""
    app.dependency_overrides[get_topology_optional] = override_topology_optional(mock_topology)

    response = client.get("/api/rooms")

    assert response.status_code == 200
    rooms = response.json()
    assert len(rooms) == 1
    room = rooms[0]
    assert room["id"] == "room1"
    assert room["name"] == "Server Room 1"
    assert room["site_id"] == "site1"
    assert len(room["aisles"]) == 1
    assert room["aisles"][0]["id"] == "aisle-a"
    assert len(room["aisles"][0]["racks"]) == 2

    app.dependency_overrides.clear()


def test_get_rooms_empty():
    """Test getting rooms with no topology."""
    app.dependency_overrides[get_topology_optional] = override_topology_optional(None)

    response = client.get("/api/rooms")

    assert response.status_code == 200
    assert response.json() == []

    app.dependency_overrides.clear()


def test_get_room_layout(mock_topology):
    """Test getting room layout details."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)

    response = client.get("/api/rooms/room1/layout")

    assert response.status_code == 200
    room = response.json()
    assert room["id"] == "room1"
    assert room["name"] == "Server Room 1"
    assert "aisles" in room

    app.dependency_overrides.clear()


def test_get_room_layout_not_found(mock_topology):
    """Test getting non-existent room layout."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)

    response = client.get("/api/rooms/nonexistent/layout")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_create_room(mock_app_config, mock_topology):
    """Test creating a new room."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    # Mock the app module TOPOLOGY reload
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = Mock()

    response = client.post(
        "/api/topology/sites/site1/rooms",
        json={"name": "New Server Room", "id": "room2", "description": "Second room"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["room"]["id"] == "room2"
    assert data["room"]["name"] == "New Server Room"
    assert data["site_id"] == "site1"

    # Verify room directory was created
    room_dir = Path(mock_app_config.paths.topology) / "datacenters" / "site1" / "rooms" / "room2"
    assert room_dir.exists()
    assert (room_dir / "room.yaml").exists()
    assert (room_dir / "aisles").exists()
    assert (room_dir / "standalone_racks").exists()

    app.dependency_overrides.clear()


def test_create_room_duplicate_id(mock_app_config):
    """Test creating a room with duplicate ID."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.post(
        "/api/topology/sites/site1/rooms",
        json={"name": "Duplicate Room", "id": "room1"},
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_create_room_site_not_found(mock_app_config):
    """Test creating a room in non-existent site."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.post(
        "/api/topology/sites/nonexistent/rooms",
        json={"name": "New Room", "id": "room3"},
    )

    assert response.status_code == 404
    assert "site not found" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


# Racks Tests


def test_get_rack_details(mock_topology):
    """Test getting rack details."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)

    response = client.get("/api/racks/rack01")

    assert response.status_code == 200
    rack = response.json()
    assert rack["id"] == "rack01"
    assert rack["name"] == "Rack 01"
    assert len(rack["devices"]) == 2

    app.dependency_overrides.clear()


def test_get_rack_not_found(mock_topology):
    """Test getting non-existent rack."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)

    response = client.get("/api/racks/nonexistent")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_update_rack_template(mock_topology, mock_app_config):
    """Test updating rack template."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    # Mock the app module TOPOLOGY reload
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = Mock()

    response = client.put(
        "/api/topology/racks/rack01/template",
        json={"template_id": "high_density_48u"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["template_id"] == "high_density_48u"

    # Verify rack file was updated
    rack_file = (
        Path(mock_app_config.paths.topology)
        / "datacenters"
        / "site1"
        / "rooms"
        / "room1"
        / "aisles"
        / "aisle-a"
        / "racks"
        / "rack01.yaml"
    )
    rack_data = yaml.safe_load(rack_file.read_text())
    assert rack_data["template_id"] == "high_density_48u"

    app.dependency_overrides.clear()


def test_update_rack_template_remove(mock_topology, mock_app_config):
    """Test removing rack template."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    # Mock the app module TOPOLOGY reload
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = Mock()

    response = client.put(
        "/api/topology/racks/rack01/template",
        json={"template_id": None},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["template_id"] is None

    # Verify template_id was removed from file
    rack_file = (
        Path(mock_app_config.paths.topology)
        / "datacenters"
        / "site1"
        / "rooms"
        / "room1"
        / "aisles"
        / "aisle-a"
        / "racks"
        / "rack01.yaml"
    )
    rack_data = yaml.safe_load(rack_file.read_text())
    assert "template_id" not in rack_data

    app.dependency_overrides.clear()


# Devices Tests


def test_get_device_details(mock_topology, mock_catalog):
    """Test getting device details with context."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog] = override_catalog(mock_catalog)

    response = client.get("/api/racks/rack01/devices/node001")

    assert response.status_code == 200
    context = response.json()
    assert context["device"]["id"] == "node001"
    assert context["device"]["name"] == "Compute Node 1"
    assert context["rack"]["id"] == "rack01"
    assert context["room"]["id"] == "room1"
    assert context["site"]["id"] == "site1"
    assert context["aisle"]["id"] == "aisle-a"
    assert context["template"]["id"] == "compute_node"

    app.dependency_overrides.clear()


def test_get_device_not_found(mock_topology, mock_catalog):
    """Test getting non-existent device."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog] = override_catalog(mock_catalog)

    response = client.get("/api/racks/rack01/devices/nonexistent")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_add_rack_device(mock_topology, mock_catalog, mock_app_config):
    """Test adding a device to a rack."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog] = override_catalog(mock_catalog)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    # Mock the app module TOPOLOGY reload
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = Mock()

    response = client.post(
        "/api/topology/racks/rack01/devices",
        json={
            "id": "node003",
            "name": "Compute Node 3",
            "template_id": "compute_node",
            "u_position": 5,
            "instance": "node003",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["device_id"] == "node003"

    # Verify rack file was updated
    rack_file = (
        Path(mock_app_config.paths.topology)
        / "datacenters"
        / "site1"
        / "rooms"
        / "room1"
        / "aisles"
        / "aisle-a"
        / "racks"
        / "rack01.yaml"
    )
    rack_data = yaml.safe_load(rack_file.read_text())
    assert len(rack_data["devices"]) == 2  # Original + new
    assert any(d["id"] == "node003" for d in rack_data["devices"])

    app.dependency_overrides.clear()


def test_add_rack_device_duplicate_id(mock_topology, mock_catalog, mock_app_config):
    """Test adding a device with duplicate ID."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog] = override_catalog(mock_catalog)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.post(
        "/api/topology/racks/rack01/devices",
        json={
            "id": "node001",  # Already exists
            "name": "Duplicate Node",
            "template_id": "compute_node",
            "u_position": 10,
        },
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_add_rack_device_overlap(mock_topology, mock_catalog, mock_app_config):
    """Test adding a device that overlaps with existing device."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog] = override_catalog(mock_catalog)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.post(
        "/api/topology/racks/rack01/devices",
        json={
            "id": "node003",
            "name": "Overlapping Node",
            "template_id": "compute_node",
            "u_position": 2,  # Overlaps with node001 at U1 (height=2)
        },
    )

    assert response.status_code == 400
    assert "occupied" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_delete_rack_device(mock_topology, mock_app_config):
    """Test deleting a device from a rack."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    # Mock the app module TOPOLOGY reload
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = Mock()

    response = client.delete("/api/topology/racks/rack01/devices/node001")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["device_id"] == "node001"

    # Verify device was removed from rack file
    rack_file = (
        Path(mock_app_config.paths.topology)
        / "datacenters"
        / "site1"
        / "rooms"
        / "room1"
        / "aisles"
        / "aisle-a"
        / "racks"
        / "rack01.yaml"
    )
    rack_data = yaml.safe_load(rack_file.read_text())
    assert not any(d["id"] == "node001" for d in rack_data.get("devices", []))

    app.dependency_overrides.clear()


def test_delete_rack_device_not_found(mock_topology, mock_app_config):
    """Test deleting non-existent device."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.delete("/api/topology/racks/rack01/devices/nonexistent")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

    app.dependency_overrides.clear()
