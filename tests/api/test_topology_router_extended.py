"""
Extended tests for Topology Router - covering uncovered CRUD endpoints.

This file extends test_topology_router.py to achieve 70%+ coverage by testing:
- Site/Room/Aisle/Rack DELETE operations
- Room aisle reorganization (PUT /api/topology/rooms/{room_id}/aisles)
- Aisle creation
- Rack creation
- Device CRUD (create, update position, delete, bulk replace)
- Error paths and edge cases
"""

import tempfile
from pathlib import Path
from unittest.mock import Mock

import pytest
import yaml
from fastapi.testclient import TestClient

from rackscope.api.app import app
from rackscope.api.dependencies import (
    get_app_config,
    get_catalog,
    get_topology,
)
from rackscope.model.catalog import Catalog, DeviceTemplate, LayoutConfig
from rackscope.model.config import AppConfig, PathsConfig
from rackscope.model.domain import Aisle, Device, Rack, Room, Site, Topology

client = TestClient(app)


@pytest.fixture
def mock_topology():
    """Create a test topology with 2 aisles."""
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
        devices=[device1],
    )
    rack2 = Rack(
        id="rack02",
        name="Rack 02",
        template_id="standard_42u",
        devices=[device2],
    )
    rack3 = Rack(
        id="rack03",
        name="Rack 03",
        template_id="standard_42u",
        devices=[],
    )

    aisle1 = Aisle(id="aisle-a", name="Aisle A", racks=[rack1])
    aisle2 = Aisle(id="aisle-b", name="Aisle B", racks=[rack2, rack3])
    room1 = Room(
        id="room1",
        name="Server Room 1",
        aisles=[aisle1, aisle2],
        standalone_racks=[],
    )
    site1 = Site(id="site1", name="Datacenter 1", rooms=[room1])

    return Topology(sites=[site1])


@pytest.fixture
def mock_catalog():
    """Create a test catalog with 2U compute nodes."""
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
    """Create a temporary segmented topology directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        base_path = Path(tmpdir)

        # Create sites.yaml
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

        # Create room.yaml
        (room_dir / "room.yaml").write_text(
            yaml.safe_dump(
                {
                    "id": "room1",
                    "name": "Server Room 1",
                    "description": "Main server room",
                    "aisles": [
                        {"id": "aisle-a", "name": "Aisle A"},
                        {"id": "aisle-b", "name": "Aisle B"},
                    ],
                    "standalone_racks": [],
                }
            )
        )

        # Create aisle-a
        aisle_a_dir = room_dir / "aisles" / "aisle-a"
        aisle_a_dir.mkdir(parents=True, exist_ok=True)
        (aisle_a_dir / "aisle.yaml").write_text(
            yaml.safe_dump(
                {
                    "id": "aisle-a",
                    "name": "Aisle A",
                    "racks": ["rack01"],
                }
            )
        )
        rack_dir_a = aisle_a_dir / "racks"
        rack_dir_a.mkdir(parents=True, exist_ok=True)
        (rack_dir_a / "rack01.yaml").write_text(
            yaml.safe_dump(
                {
                    "id": "rack01",
                    "name": "Rack 01",
                    "aisle_id": "aisle-a",
                    "u_height": 42,
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

        # Create aisle-b
        aisle_b_dir = room_dir / "aisles" / "aisle-b"
        aisle_b_dir.mkdir(parents=True, exist_ok=True)
        (aisle_b_dir / "aisle.yaml").write_text(
            yaml.safe_dump(
                {
                    "id": "aisle-b",
                    "name": "Aisle B",
                    "racks": ["rack02", "rack03"],
                }
            )
        )
        rack_dir_b = aisle_b_dir / "racks"
        rack_dir_b.mkdir(parents=True, exist_ok=True)
        (rack_dir_b / "rack02.yaml").write_text(
            yaml.safe_dump(
                {
                    "id": "rack02",
                    "name": "Rack 02",
                    "aisle_id": "aisle-b",
                    "u_height": 42,
                    "devices": [],
                }
            )
        )
        (rack_dir_b / "rack03.yaml").write_text(
            yaml.safe_dump(
                {
                    "id": "rack03",
                    "name": "Rack 03",
                    "aisle_id": "aisle-b",
                    "u_height": 42,
                    "devices": [],
                }
            )
        )

        # Create standalone_racks directory
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


def override_topology(topology: Topology):
    async def _get_topology() -> Topology:
        return topology

    return _get_topology


def override_catalog(catalog: Catalog):
    async def _get_catalog() -> Catalog:
        return catalog

    return _get_catalog


def override_app_config(config: AppConfig):
    async def _get_app_config() -> AppConfig:
        return config

    return _get_app_config


# ── Room aisle reorganization ─────────────────────────────────────────────────


def test_update_room_aisles_move_rack_between_aisles(mock_topology, mock_app_config):
    """Test moving a rack from one aisle to another."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    # Mock the app module TOPOLOGY reload
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = Mock()

    # Move rack02 from aisle-b to aisle-a
    response = client.put(
        "/api/topology/rooms/room1/aisles",
        json={
            "aisles": {
                "aisle-a": ["rack01", "rack02"],
                "aisle-b": ["rack03"],
            }
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["room_id"] == "room1"

    # Verify rack02 file was updated with new aisle_id
    rack_file = (
        Path(mock_app_config.paths.topology)
        / "datacenters"
        / "site1"
        / "rooms"
        / "room1"
        / "aisles"
        / "aisle-a"
        / "racks"
        / "rack02.yaml"
    )
    assert rack_file.exists()
    rack_data = yaml.safe_load(rack_file.read_text())
    assert rack_data["aisle_id"] == "aisle-a"

    app.dependency_overrides.clear()


def test_update_room_aisles_missing_aisle(mock_topology, mock_app_config):
    """Test error when payload doesn't include all aisles."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    # Only include aisle-a, missing aisle-b
    response = client.put(
        "/api/topology/rooms/room1/aisles",
        json={
            "aisles": {
                "aisle-a": ["rack01"],
            }
        },
    )

    assert response.status_code == 400
    assert "must include all aisles" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_update_room_aisles_unknown_rack(mock_topology, mock_app_config):
    """Test error when payload includes unknown rack ID."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.put(
        "/api/topology/rooms/room1/aisles",
        json={
            "aisles": {
                "aisle-a": ["rack01", "nonexistent"],
                "aisle-b": ["rack02", "rack03"],
            }
        },
    )

    assert response.status_code == 400
    assert "unknown rack" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_update_room_aisles_room_not_found(mock_topology, mock_app_config):
    """Test error when room doesn't exist."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.put(
        "/api/topology/rooms/nonexistent/aisles",
        json={"aisles": {}},
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


# ── Aisle creation ────────────────────────────────────────────────────────────


def test_create_room_aisles(mock_topology, mock_app_config):
    """Test creating new aisles in a room."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    import rackscope.api.app as app_module

    app_module.TOPOLOGY = Mock()

    response = client.post(
        "/api/topology/rooms/room1/aisles/create",
        json={
            "aisles": [
                {"id": "aisle-c", "name": "Aisle C"},
                {"id": "aisle-d", "name": "Aisle D"},
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["room_id"] == "room1"
    assert len(data["aisles"]) == 2
    assert data["aisles"][0]["id"] == "aisle-c"

    # Verify aisle directories were created
    aisle_c_dir = (
        Path(mock_app_config.paths.topology)
        / "datacenters"
        / "site1"
        / "rooms"
        / "room1"
        / "aisles"
        / "aisle-c"
    )
    assert aisle_c_dir.exists()
    assert (aisle_c_dir / "aisle.yaml").exists()

    app.dependency_overrides.clear()


def test_create_room_aisles_empty_name(mock_topology, mock_app_config):
    """Test error when aisle name is empty."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.post(
        "/api/topology/rooms/room1/aisles/create",
        json={"aisles": [{"id": "aisle-c", "name": "  "}]},
    )

    assert response.status_code == 400
    assert "name is required" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_create_room_aisles_duplicate_id(mock_topology, mock_app_config):
    """Test error when aisle ID already exists."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.post(
        "/api/topology/rooms/room1/aisles/create",
        json={"aisles": [{"id": "aisle-a", "name": "Duplicate"}]},
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_create_room_aisles_empty_list(mock_topology, mock_app_config):
    """Test error when aisles list is empty."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.post(
        "/api/topology/rooms/room1/aisles/create",
        json={"aisles": []},
    )

    assert response.status_code == 400
    assert "required" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


# ── Aisle rack order update ───────────────────────────────────────────────────


def test_update_aisle_racks(mock_topology, mock_app_config):
    """Test updating rack ordering in an aisle."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    import rackscope.api.app as app_module

    app_module.TOPOLOGY = Mock()

    response = client.put(
        "/api/topology/aisles/aisle-b/racks",
        json={"room_id": "room1", "racks": ["rack03", "rack02"]},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["aisle_id"] == "aisle-b"
    assert data["racks"] == ["rack03", "rack02"]

    app.dependency_overrides.clear()


def test_update_aisle_racks_empty_list(mock_topology, mock_app_config):
    """Test error when racks list is empty."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.put(
        "/api/topology/aisles/aisle-b/racks",
        json={"room_id": "room1", "racks": []},
    )

    assert response.status_code == 400
    assert "required" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


# ── Site DELETE ───────────────────────────────────────────────────────────────


def test_delete_site(mock_app_config):
    """Test deleting a site and all its rooms."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    import rackscope.api.app as app_module

    app_module.TOPOLOGY = Mock()

    response = client.delete("/api/topology/sites/site1")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "deleted"
    assert data["site_id"] == "site1"

    # Verify sites.yaml was updated
    sites_file = Path(mock_app_config.paths.topology) / "sites.yaml"
    sites_data = yaml.safe_load(sites_file.read_text())
    assert not any(s["id"] == "site1" for s in sites_data.get("sites", []))

    app.dependency_overrides.clear()


def test_delete_site_not_found(mock_app_config):
    """Test error when site doesn't exist."""
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.delete("/api/topology/sites/nonexistent")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


# ── Room DELETE ───────────────────────────────────────────────────────────────


def test_delete_room(mock_topology, mock_app_config):
    """Test deleting a room and its aisles/racks."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    import rackscope.api.app as app_module

    app_module.TOPOLOGY = Mock()

    response = client.delete("/api/topology/rooms/room1")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "deleted"
    assert data["room_id"] == "room1"

    app.dependency_overrides.clear()


def test_delete_room_not_found(mock_topology, mock_app_config):
    """Test error when room doesn't exist."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.delete("/api/topology/rooms/nonexistent")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


# ── Aisle DELETE ──────────────────────────────────────────────────────────────


def test_delete_aisle(mock_topology, mock_app_config):
    """Test deleting an aisle and its racks."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    import rackscope.api.app as app_module

    app_module.TOPOLOGY = Mock()

    response = client.delete("/api/topology/aisles/aisle-b")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "deleted"
    assert data["aisle_id"] == "aisle-b"

    app.dependency_overrides.clear()


def test_delete_aisle_not_found(mock_topology, mock_app_config):
    """Test error when aisle doesn't exist."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.delete("/api/topology/aisles/nonexistent")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


# ── Rack creation ─────────────────────────────────────────────────────────────


def test_create_rack(mock_topology, mock_app_config):
    """Test creating a new rack in an aisle."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    import rackscope.api.app as app_module

    app_module.TOPOLOGY = Mock()

    response = client.post(
        "/api/topology/aisles/aisle-a/racks",
        json={
            "name": "Rack 04",
            "id": "rack04",
            "u_height": 48,
            "template_id": "high_density",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["rack_id"] == "rack04"
    assert data["aisle_id"] == "aisle-a"

    app.dependency_overrides.clear()


def test_create_rack_duplicate_id(mock_topology, mock_app_config):
    """Test error when rack ID already exists."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.post(
        "/api/topology/aisles/aisle-a/racks",
        json={"name": "Duplicate", "id": "rack01", "u_height": 42},
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_create_rack_invalid_u_height(mock_topology, mock_app_config):
    """Test error when u_height is out of bounds."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.post(
        "/api/topology/aisles/aisle-a/racks",
        json={"name": "Bad Rack", "id": "rack99", "u_height": 0},
    )

    assert response.status_code == 400
    assert "between 1 and 100" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


# ── Device CRUD ───────────────────────────────────────────────────────────────


def test_update_rack_device(mock_topology, mock_catalog, mock_app_config):
    """Test updating device position in rack."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog] = override_catalog(mock_catalog)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    import rackscope.api.app as app_module

    app_module.TOPOLOGY = Mock()

    response = client.put(
        "/api/topology/racks/rack01/devices/node001",
        json={"u_position": 10},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["u_position"] == 10

    app.dependency_overrides.clear()


def test_update_rack_device_not_found(mock_topology, mock_catalog, mock_app_config):
    """Test error when device doesn't exist."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog] = override_catalog(mock_catalog)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.put(
        "/api/topology/racks/rack01/devices/nonexistent",
        json={"u_position": 5},
    )

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_update_rack_device_out_of_bounds(mock_topology, mock_catalog, mock_app_config):
    """Test error when new position is out of rack bounds."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog] = override_catalog(mock_catalog)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.put(
        "/api/topology/racks/rack01/devices/node001",
        json={"u_position": 42},  # device height=2 → 42+2-1=43 > 42
    )

    assert response.status_code == 400
    assert "does not fit" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_replace_rack_devices(mock_topology, mock_catalog, mock_app_config):
    """Test replacing all devices in a rack."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog] = override_catalog(mock_catalog)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    import rackscope.api.app as app_module

    app_module.TOPOLOGY = Mock()

    response = client.put(
        "/api/topology/racks/rack01/devices",
        json={
            "devices": [
                {
                    "id": "node100",
                    "name": "Node 100",
                    "template_id": "compute_node",
                    "u_position": 1,
                },
                {
                    "id": "node101",
                    "name": "Node 101",
                    "template_id": "compute_node",
                    "u_position": 5,
                },
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["devices"] == 2

    app.dependency_overrides.clear()


def test_replace_rack_devices_duplicate_id(mock_topology, mock_catalog, mock_app_config):
    """Test error when devices have duplicate IDs."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog] = override_catalog(mock_catalog)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.put(
        "/api/topology/racks/rack01/devices",
        json={
            "devices": [
                {
                    "id": "node100",
                    "name": "Node 100",
                    "template_id": "compute_node",
                    "u_position": 1,
                },
                {
                    "id": "node100",
                    "name": "Duplicate",
                    "template_id": "compute_node",
                    "u_position": 5,
                },
            ]
        },
    )

    assert response.status_code == 400
    assert "duplicate" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_replace_rack_devices_overlap(mock_topology, mock_catalog, mock_app_config):
    """Test error when devices overlap in U space."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog] = override_catalog(mock_catalog)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.put(
        "/api/topology/racks/rack01/devices",
        json={
            "devices": [
                {
                    "id": "node100",
                    "name": "Node 100",
                    "template_id": "compute_node",
                    "u_position": 1,  # occupies U1-U2
                },
                {
                    "id": "node101",
                    "name": "Node 101",
                    "template_id": "compute_node",
                    "u_position": 2,  # overlaps U2
                },
            ]
        },
    )

    assert response.status_code == 400
    assert "overlap" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_add_rack_device_invalid_template(mock_topology, mock_catalog, mock_app_config):
    """Test error when device template doesn't exist."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog] = override_catalog(mock_catalog)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.post(
        "/api/topology/racks/rack01/devices",
        json={
            "id": "node999",
            "name": "Bad Node",
            "template_id": "nonexistent",
            "u_position": 10,
        },
    )

    assert response.status_code == 400
    assert "unknown device template" in response.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_add_rack_device_out_of_bounds(mock_topology, mock_catalog, mock_app_config):
    """Test error when device position is out of rack bounds."""
    app.dependency_overrides[get_topology] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog] = override_catalog(mock_catalog)
    app.dependency_overrides[get_app_config] = override_app_config(mock_app_config)

    response = client.post(
        "/api/topology/racks/rack01/devices",
        json={
            "id": "node999",
            "name": "Bad Node",
            "template_id": "compute_node",
            "u_position": 50,  # > 42
        },
    )

    assert response.status_code == 400
    assert "out of rack bounds" in response.json()["detail"].lower()

    app.dependency_overrides.clear()
