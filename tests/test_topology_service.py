"""
Tests for Topology Service

Unit tests for topology business logic.
"""

import pytest
from pathlib import Path

from rackscope.model.domain import Topology, Site, Room, Aisle, Rack, Device
from rackscope.model.catalog import (
    Catalog,
    DeviceTemplate,
    RackTemplate,
    LayoutConfig,
)
from rackscope.model.config import AppConfig, PathsConfig
from rackscope.services import topology_service


@pytest.fixture
def sample_topology():
    """Create a sample topology for testing."""
    return Topology(
        sites=[
            Site(
                id="site1",
                name="Site 1",
                rooms=[
                    Room(
                        id="room1",
                        name="Room 1",
                        aisles=[
                            Aisle(
                                id="aisle1",
                                name="Aisle 1",
                                racks=[
                                    Rack(id="rack1", name="Rack 1", u_height=42, devices=[]),
                                    Rack(id="rack2", name="Rack 2", u_height=48, devices=[]),
                                ],
                            ),
                        ],
                        standalone_racks=[
                            Rack(id="rack3", name="Standalone Rack", u_height=42, devices=[]),
                        ],
                    ),
                ],
            ),
        ]
    )


@pytest.fixture
def sample_catalog():
    """Create a sample catalog for testing."""
    return Catalog(
        device_templates=[
            DeviceTemplate(
                id="device1",
                name="Device 1",
                u_height=2,
                layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
            ),
            DeviceTemplate(
                id="device2",
                name="Device 2",
                u_height=4,
                layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
            ),
        ],
        rack_templates=[
            RackTemplate(id="rack1", name="Rack Template 1", u_height=42),
            RackTemplate(id="rack2", name="Rack Template 2", u_height=48),
        ],
    )


@pytest.fixture
def sample_app_config():
    """Create a sample app config for testing."""
    return AppConfig(
        paths=PathsConfig(
            topology="config/topology",
            templates="config/templates",
            checks="config/checks/library",
        )
    )


def test_find_rack_by_id_found(sample_topology):
    """Test finding a rack by ID when it exists."""
    rack = topology_service.find_rack_by_id(sample_topology, "rack1")
    assert rack is not None
    assert rack.id == "rack1"
    assert rack.name == "Rack 1"


def test_find_rack_by_id_standalone(sample_topology):
    """Test finding a standalone rack by ID."""
    rack = topology_service.find_rack_by_id(sample_topology, "rack3")
    assert rack is not None
    assert rack.id == "rack3"
    assert rack.name == "Standalone Rack"


def test_find_rack_by_id_not_found(sample_topology):
    """Test finding a rack by ID when it doesn't exist."""
    rack = topology_service.find_rack_by_id(sample_topology, "nonexistent")
    assert rack is None


def test_find_room_by_id_found(sample_topology):
    """Test finding a room by ID when it exists."""
    room = topology_service.find_room_by_id(sample_topology, "room1")
    assert room is not None
    assert room.id == "room1"
    assert room.name == "Room 1"


def test_find_room_by_id_not_found(sample_topology):
    """Test finding a room by ID when it doesn't exist."""
    room = topology_service.find_room_by_id(sample_topology, "nonexistent")
    assert room is None


def test_find_rack_location_aisle_rack(sample_topology):
    """Test finding location of a rack in an aisle."""
    location = topology_service.find_rack_location("rack1", sample_topology)
    assert location is not None
    site_id, room_id, aisle_id, is_standalone = location
    assert site_id == "site1"
    assert room_id == "room1"
    assert aisle_id == "aisle1"
    assert is_standalone is False


def test_find_rack_location_standalone(sample_topology):
    """Test finding location of a standalone rack."""
    location = topology_service.find_rack_location("rack3", sample_topology)
    assert location is not None
    site_id, room_id, aisle_id, is_standalone = location
    assert site_id == "site1"
    assert room_id == "room1"
    assert aisle_id is None
    assert is_standalone is True


def test_find_rack_location_not_found(sample_topology):
    """Test finding location when rack doesn't exist."""
    location = topology_service.find_rack_location("nonexistent", sample_topology)
    assert location is None


def test_get_aisle_path_found(sample_app_config, sample_topology):
    """Test getting path to aisle YAML file."""
    path = topology_service.get_aisle_path(
        "room1", "aisle1", sample_app_config, sample_topology
    )
    assert path is not None
    expected = Path(
        "config/topology/datacenters/site1/rooms/room1/aisles/aisle1/aisle.yaml"
    )
    assert path == expected


def test_get_aisle_path_not_found(sample_app_config, sample_topology):
    """Test getting path when aisle doesn't exist."""
    path = topology_service.get_aisle_path(
        "room1", "nonexistent", sample_app_config, sample_topology
    )
    assert path is None


def test_get_rack_path_aisle_rack(sample_app_config, sample_topology):
    """Test getting path to rack YAML file for aisle rack."""
    path = topology_service.get_rack_path("rack1", sample_app_config, sample_topology)
    assert path is not None
    expected = Path(
        "config/topology/datacenters/site1/rooms/room1/aisles/aisle1/racks/rack1.yaml"
    )
    assert path == expected


def test_get_rack_path_standalone(sample_app_config, sample_topology):
    """Test getting path to rack YAML file for standalone rack."""
    path = topology_service.get_rack_path("rack3", sample_app_config, sample_topology)
    assert path is not None
    expected = Path(
        "config/topology/datacenters/site1/rooms/room1/standalone_racks/rack3.yaml"
    )
    assert path == expected


def test_get_rack_path_not_found(sample_app_config, sample_topology):
    """Test getting path when rack doesn't exist."""
    path = topology_service.get_rack_path("nonexistent", sample_app_config, sample_topology)
    assert path is None


def test_get_device_height_found(sample_catalog):
    """Test getting device height when template exists."""
    height = topology_service.get_device_height("device1", sample_catalog)
    assert height == 2


def test_get_device_height_not_found(sample_catalog):
    """Test getting device height when template doesn't exist."""
    height = topology_service.get_device_height("nonexistent", sample_catalog)
    assert height == 1  # Default value


def test_get_rack_height_from_data():
    """Test getting rack height from rack data dictionary."""
    data = {"u_height": 48}
    catalog = Catalog()
    height = topology_service.get_rack_height(data, catalog)
    assert height == 48


def test_get_rack_height_from_template(sample_catalog):
    """Test getting rack height from template."""
    data = {"template_id": "rack1"}
    height = topology_service.get_rack_height(data, sample_catalog)
    assert height == 42


def test_get_rack_height_default(sample_catalog):
    """Test getting default rack height when no data available."""
    data = {}
    height = topology_service.get_rack_height(data, sample_catalog)
    assert height == 42  # Default value
