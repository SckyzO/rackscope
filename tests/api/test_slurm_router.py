"""
Tests for Slurm Router

Tests for Slurm-specific endpoints and dashboards.
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from rackscope.api.app import app
from rackscope.model.config import AppConfig, PathsConfig, SlurmConfig
from rackscope.model.domain import Aisle, Device, Rack, Room, Site, Topology
from rackscope.plugins.registry import registry
from rackscope.plugins.slurm import SlurmPlugin
from rackscope.plugins.slurm.config import SlurmPluginConfig

# Register Slurm plugin for tests
if not registry.get_plugin("slurm"):
    slurm_plugin = SlurmPlugin()
    registry.register(slurm_plugin)
    slurm_plugin.register_routes(app)

client = TestClient(app)


@pytest.fixture
def mock_topology():
    """Create a test topology with nodes."""
    device = Device(
        id="dev1",
        name="Compute Node",
        template_id="compute",
        u_position=1,
        instance="node[01-02]",
    )
    rack = Rack(id="rack01", name="Rack 01", devices=[device])
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack])
    room = Room(id="room1", name="Server Room 1", aisles=[aisle], standalone_racks=[])
    site = Site(id="site1", name="Datacenter 1", rooms=[room])
    return Topology(sites=[site])


@pytest.fixture
def mock_app_config():
    """Create a test app config."""
    return AppConfig(
        paths=PathsConfig(
            topology="config/topology",
            templates="config/templates",
            checks="config/checks",
        ),
        slurm=SlurmConfig(),
    )


@pytest.fixture
def mock_slurm_plugin_config():
    """Patch SlurmPlugin._get_config to return a predictable test config.

    The real config.yml uses label_node='node_id', but mock Prometheus
    results use label 'node'. This fixture ensures the plugin uses the
    same label names as the mock data.
    """
    test_cfg = SlurmPluginConfig(
        label_node="node",
        label_status="status",
        label_partition="partition",
    )
    with patch.object(SlurmPlugin, "_get_config", return_value=test_cfg):
        yield test_cfg


@pytest.fixture
def mock_slurm_results():
    """Create mock Slurm results."""
    return [
        {
            "metric": {"node": "node01", "status": "idle", "partition": "all"},
            "value": [1234567890, "1"],
        },
        {
            "metric": {"node": "node02", "status": "allocated", "partition": "compute"},
            "value": [1234567890, "1"],
        },
    ]


def test_get_slurm_room_nodes_success(
    mock_topology, mock_app_config, mock_slurm_results, mock_slurm_plugin_config
):
    """Test getting Slurm node states for a room."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = mock_topology
    app_module.APP_CONFIG = mock_app_config

    with patch("rackscope.services.slurm_service.load_slurm_mapping", return_value={}):
        with patch(
            "rackscope.services.slurm_service.fetch_slurm_results",
            AsyncMock(return_value=mock_slurm_results),
        ):
            response = client.get("/api/slurm/rooms/room1/nodes")

    assert response.status_code == 200
    data = response.json()
    assert data["room_id"] == "room1"
    assert "nodes" in data
    assert "node01" in data["nodes"]
    assert "node02" in data["nodes"]
    assert data["nodes"]["node01"]["status"] == "idle"
    assert data["nodes"]["node02"]["status"] == "allocated"


def test_get_slurm_room_nodes_no_topology():
    """Test error when topology not loaded."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = None
    app_module.APP_CONFIG = None

    response = client.get("/api/slurm/rooms/room1/nodes")

    assert response.status_code == 503
    assert "not loaded" in response.json()["detail"].lower()


def test_get_slurm_room_nodes_room_not_found(mock_topology, mock_app_config):
    """Test error when room doesn't exist."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = mock_topology
    app_module.APP_CONFIG = mock_app_config

    response = client.get("/api/slurm/rooms/nonexistent/nodes")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_slurm_room_nodes_no_results(mock_topology, mock_app_config):
    """Test getting nodes when Slurm returns no results."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = mock_topology
    app_module.APP_CONFIG = mock_app_config

    with patch("rackscope.services.slurm_service.load_slurm_mapping", return_value={}):
        with patch(
            "rackscope.services.slurm_service.fetch_slurm_results", AsyncMock(return_value=[])
        ):
            response = client.get("/api/slurm/rooms/room1/nodes")

    assert response.status_code == 200
    data = response.json()
    # Should have nodes with unknown status
    assert "node01" in data["nodes"]
    assert data["nodes"]["node01"]["status"] == "unknown"
    assert data["nodes"]["node01"]["severity"] == "UNKNOWN"


def test_get_slurm_summary_success(mock_topology, mock_app_config):
    """Test getting Slurm summary."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = mock_topology
    app_module.APP_CONFIG = mock_app_config

    mock_states = {
        "node01": {
            "status": "idle",
            "severity": "OK",
            "status_all": "idle",
            "severity_all": "OK",
        },
        "node02": {
            "status": "allocated",
            "severity": "OK",
            "status_all": "allocated",
            "severity_all": "OK",
        },
    }

    with patch(
        "rackscope.services.slurm_service.build_slurm_states", AsyncMock(return_value=mock_states)
    ):
        response = client.get("/api/slurm/summary")

    assert response.status_code == 200
    data = response.json()
    assert data["total_nodes"] == 2
    assert data["by_severity"]["OK"] == 2
    assert data["by_status"]["idle"] == 1
    assert data["by_status"]["allocated"] == 1


def test_get_slurm_summary_with_room_filter(mock_topology, mock_app_config):
    """Test getting Slurm summary filtered by room."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = mock_topology
    app_module.APP_CONFIG = mock_app_config

    mock_states = {
        "node01": {"status": "idle", "severity": "OK", "status_all": "idle", "severity_all": "OK"}
    }

    with patch(
        "rackscope.services.slurm_service.build_slurm_states", AsyncMock(return_value=mock_states)
    ):
        response = client.get("/api/slurm/summary?room_id=room1")

    assert response.status_code == 200
    data = response.json()
    assert data["room_id"] == "room1"
    assert data["total_nodes"] == 1


def test_get_slurm_summary_room_not_found(mock_topology, mock_app_config):
    """Test error when room filter doesn't exist."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = mock_topology
    app_module.APP_CONFIG = mock_app_config

    response = client.get("/api/slurm/summary?room_id=nonexistent")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_slurm_summary_no_topology():
    """Test error when topology not loaded."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = None
    app_module.APP_CONFIG = None

    response = client.get("/api/slurm/summary")

    assert response.status_code == 503


def test_get_slurm_partitions_success(
    mock_topology, mock_app_config, mock_slurm_results, mock_slurm_plugin_config
):
    """Test getting Slurm partition statistics."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = mock_topology
    app_module.APP_CONFIG = mock_app_config

    with patch("rackscope.services.slurm_service.load_slurm_mapping", return_value={}):
        with patch(
            "rackscope.services.slurm_service.fetch_slurm_results",
            AsyncMock(return_value=mock_slurm_results),
        ):
            response = client.get("/api/slurm/partitions")

    assert response.status_code == 200
    data = response.json()
    assert "partitions" in data
    assert "all" in data["partitions"]
    assert "compute" in data["partitions"]
    assert data["partitions"]["all"]["idle"] == 1
    assert data["partitions"]["compute"]["allocated"] == 1


def test_get_slurm_partitions_with_room_filter(mock_topology, mock_app_config, mock_slurm_results):
    """Test getting partitions filtered by room."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = mock_topology
    app_module.APP_CONFIG = mock_app_config

    with patch("rackscope.services.slurm_service.load_slurm_mapping", return_value={}):
        with patch(
            "rackscope.services.slurm_service.fetch_slurm_results",
            AsyncMock(return_value=mock_slurm_results),
        ):
            response = client.get("/api/slurm/partitions?room_id=room1")

    assert response.status_code == 200
    data = response.json()
    assert data["room_id"] == "room1"
    assert "partitions" in data


def test_get_slurm_partitions_no_results(mock_topology, mock_app_config):
    """Test getting partitions when Slurm returns no results."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = mock_topology
    app_module.APP_CONFIG = mock_app_config

    with patch("rackscope.services.slurm_service.load_slurm_mapping", return_value={}):
        with patch(
            "rackscope.services.slurm_service.fetch_slurm_results", AsyncMock(return_value=[])
        ):
            response = client.get("/api/slurm/partitions")

    assert response.status_code == 200
    data = response.json()
    assert data["partitions"] == {}


def test_get_slurm_partitions_no_topology():
    """Test error when topology not loaded."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = None
    app_module.APP_CONFIG = None

    response = client.get("/api/slurm/partitions")

    assert response.status_code == 503


def test_get_slurm_nodes_success(mock_topology, mock_app_config):
    """Test getting detailed Slurm node list."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = mock_topology
    app_module.APP_CONFIG = mock_app_config

    mock_states = {
        "node01": {
            "status": "idle",
            "severity": "OK",
            "status_all": "idle",
            "severity_all": "OK",
            "statuses": ["idle"],
            "partitions": ["all"],
        }
    }

    mock_context = {
        "node01": {
            "site_id": "site1",
            "site_name": "Datacenter 1",
            "room_id": "room1",
            "room_name": "Server Room 1",
            "rack_id": "rack01",
            "rack_name": "Rack 01",
            "device_id": "dev1",
            "device_name": "Compute Node",
        }
    }

    with patch(
        "rackscope.services.slurm_service.build_slurm_states", AsyncMock(return_value=mock_states)
    ):
        with patch(
            "rackscope.services.slurm_service.build_node_context", return_value=mock_context
        ):
            response = client.get("/api/slurm/nodes")

    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert len(data["nodes"]) == 1
    node = data["nodes"][0]
    assert node["node"] == "node01"
    assert node["status"] == "idle"
    assert node["severity"] == "OK"
    assert node["site_id"] == "site1"
    assert node["rack_id"] == "rack01"


def test_get_slurm_nodes_with_room_filter(mock_topology, mock_app_config):
    """Test getting nodes filtered by room."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = mock_topology
    app_module.APP_CONFIG = mock_app_config

    mock_states = {
        "node01": {
            "status": "idle",
            "severity": "OK",
            "status_all": "idle",
            "severity_all": "OK",
            "statuses": ["idle"],
            "partitions": ["all"],
        }
    }

    with patch(
        "rackscope.services.slurm_service.build_slurm_states", AsyncMock(return_value=mock_states)
    ):
        with patch("rackscope.services.slurm_service.build_node_context", return_value={}):
            response = client.get("/api/slurm/nodes?room_id=room1")

    assert response.status_code == 200
    data = response.json()
    assert data["room_id"] == "room1"


def test_get_slurm_nodes_no_topology():
    """Test error when topology not loaded."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = None
    app_module.APP_CONFIG = None

    response = client.get("/api/slurm/nodes")

    assert response.status_code == 503


def test_get_slurm_nodes_empty(mock_topology, mock_app_config):
    """Test getting nodes when no Slurm data available."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = mock_topology
    app_module.APP_CONFIG = mock_app_config

    with patch("rackscope.services.slurm_service.build_slurm_states", AsyncMock(return_value={})):
        with patch("rackscope.services.slurm_service.build_node_context", return_value={}):
            response = client.get("/api/slurm/nodes")

    assert response.status_code == 200
    data = response.json()
    assert data["nodes"] == []
