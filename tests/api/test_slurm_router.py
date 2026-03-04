"""
Tests for Slurm Router

Tests for Slurm-specific endpoints and dashboards.
"""

from unittest.mock import AsyncMock, patch

import pytest
import yaml
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


def test_slurm_plugin_config_loading():
    """Test that SlurmPlugin loads configuration correctly."""
    plugin = registry.get_plugin("slurm")
    assert plugin is not None
    assert plugin.plugin_id == "slurm"
    assert plugin.plugin_name == "Slurm Workload"
    assert plugin.version == "1.0.0"


def test_slurm_plugin_metrics_catalog_loading(tmp_path):
    """Test that SlurmPlugin can load metrics catalog files."""
    plugin = registry.get_plugin("slurm")
    assert plugin is not None

    # Test with non-existent directory
    plugin.config = SlurmPluginConfig(metrics_catalog_dir=str(tmp_path / "nonexistent"))
    metrics = plugin._load_metrics_catalog()
    assert metrics == []

    # Test with empty directory
    catalog_dir = tmp_path / "metrics"
    catalog_dir.mkdir()
    plugin.config = SlurmPluginConfig(
        metrics_catalog_dir=str(catalog_dir),
        metrics_catalogs=[]
    )
    metrics = plugin._load_metrics_catalog()
    assert metrics == []


def test_slurm_plugin_list_catalog_files(tmp_path):
    """Test that SlurmPlugin can list catalog files."""
    plugin = registry.get_plugin("slurm")
    assert plugin is not None

    # Test with non-existent directory
    plugin.config = SlurmPluginConfig(metrics_catalog_dir=str(tmp_path / "nonexistent"))
    files = plugin._list_catalog_files()
    assert files == []

    # Test with directory containing YAML files
    catalog_dir = tmp_path / "metrics"
    catalog_dir.mkdir()
    (catalog_dir / "test1.yaml").write_text("metrics: []")
    (catalog_dir / "test2.yaml").write_text("metrics: []")

    plugin.config = SlurmPluginConfig(metrics_catalog_dir=str(catalog_dir))
    files = plugin._list_catalog_files()
    assert len(files) == 2
    assert "test1.yaml" in files
    assert "test2.yaml" in files


def test_slurm_plugin_menu_sections():
    """Test that SlurmPlugin registers menu sections."""
    plugin = registry.get_plugin("slurm")
    assert plugin is not None

    sections = plugin.register_menu_sections()

    # May be empty if plugin is disabled
    if len(sections) == 0:
        return

    # Should have a Workload section
    workload_section = next((s for s in sections if s.id == "workload"), None)
    assert workload_section is not None
    assert workload_section.label == "Workload"
    assert len(workload_section.items) > 0


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


def test_get_slurm_nodes_room_not_found(mock_topology, mock_app_config):
    """Test error when room filter doesn't exist for nodes endpoint."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = mock_topology
    app_module.APP_CONFIG = mock_app_config

    response = client.get("/api/slurm/nodes?room_id=nonexistent")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_slurm_partitions_room_not_found(mock_topology, mock_app_config):
    """Test error when room filter doesn't exist for partitions endpoint."""
    import rackscope.api.app as app_module

    app_module.TOPOLOGY = mock_topology
    app_module.APP_CONFIG = mock_app_config

    response = client.get("/api/slurm/partitions?room_id=nonexistent")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_slurm_mapping_success(tmp_path):
    """Test getting node mapping."""
    plugin = registry.get_plugin("slurm")
    assert plugin is not None

    mapping_path = tmp_path / "node_mapping.yaml"
    mapping_content = {
        "mappings": [  # Note: plural form
            {"node": "n001", "instance": "compute001"},
            {"node": "n002", "instance": "compute002"},
        ]
    }
    mapping_path.write_text(yaml.safe_dump(mapping_content))

    plugin.config = SlurmPluginConfig(mapping_path=str(mapping_path))

    response = client.get("/api/slurm/mapping")

    assert response.status_code == 200
    data = response.json()
    assert "entries" in data
    assert len(data["entries"]) == 2
    # Check that entries were loaded correctly
    assert data["entries"][0]["node"] == "n001"
    assert data["entries"][0]["instance"] == "compute001"
    assert data["mapping_path"] == str(mapping_path)


def test_get_slurm_mapping_no_file():
    """Test getting mapping when file doesn't exist."""
    plugin = registry.get_plugin("slurm")
    assert plugin is not None

    plugin.config = SlurmPluginConfig(mapping_path="/nonexistent/mapping.yaml")

    response = client.get("/api/slurm/mapping")

    assert response.status_code == 200
    data = response.json()
    assert data["entries"] == []


def test_save_slurm_mapping_success(tmp_path):
    """Test saving node mapping."""
    plugin = registry.get_plugin("slurm")
    assert plugin is not None

    mapping_path = tmp_path / "node_mapping.yaml"
    # Create parent directory
    mapping_path.parent.mkdir(parents=True, exist_ok=True)
    plugin.config = SlurmPluginConfig(mapping_path=str(mapping_path))

    response = client.post(
        "/api/slurm/mapping",
        json={
            "entries": [
                {"node": "n001", "instance": "compute001"},
                {"node": "n*", "instance": "compute*"},
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["saved"] == 2

    # Verify file was written
    assert mapping_path.exists()
    content = yaml.safe_load(mapping_path.read_text())
    # The service saves to "mappings" key (plural)
    assert "mappings" in content
    assert len(content["mappings"]) == 2


def test_save_slurm_mapping_no_path():
    """Test error when mapping_path is not configured."""
    plugin = registry.get_plugin("slurm")
    assert plugin is not None

    plugin.config = SlurmPluginConfig(mapping_path=None)

    response = client.post(
        "/api/slurm/mapping",
        json={"entries": [{"node": "n001", "instance": "compute001"}]},
    )

    assert response.status_code == 400
    assert "not configured" in response.json()["detail"]


def test_get_slurm_metrics_catalog(tmp_path):
    """Test getting Slurm metrics catalog."""
    plugin = registry.get_plugin("slurm")
    assert plugin is not None

    catalog_dir = tmp_path / "metrics"
    catalog_dir.mkdir()

    (catalog_dir / "metrics1.yaml").write_text(
        yaml.safe_dump(
            {
                "metrics": [
                    {"id": "slurm_nodes", "name": "Slurm Nodes", "metric": "slurm_node_status"},
                    {"id": "slurm_jobs", "name": "Slurm Jobs", "metric": "slurm_job_count"},
                ]
            }
        )
    )

    plugin.config = SlurmPluginConfig(
        metrics_catalog_dir=str(catalog_dir), metrics_catalogs=["metrics1.yaml"]
    )

    response = client.get("/api/slurm/metrics/catalog")

    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert len(data["metrics"]) == 2
    assert "loaded_files" in data
    assert "available_files" in data


def test_get_slurm_metrics_catalog_file_not_found(tmp_path):
    """Test metrics catalog when file doesn't exist."""
    plugin = registry.get_plugin("slurm")
    assert plugin is not None

    catalog_dir = tmp_path / "metrics"
    catalog_dir.mkdir()

    plugin.config = SlurmPluginConfig(
        metrics_catalog_dir=str(catalog_dir), metrics_catalogs=["nonexistent.yaml"]
    )

    response = client.get("/api/slurm/metrics/catalog")

    assert response.status_code == 200
    data = response.json()
    assert data["metrics"] == []


def test_update_metrics_catalog_config(tmp_path):
    """Test updating metrics catalog configuration."""
    plugin = registry.get_plugin("slurm")
    assert plugin is not None

    config_file = tmp_path / "config.yaml"
    config_file.write_text(yaml.safe_dump({"metrics_catalogs": ["old.yaml"]}))

    with patch.object(plugin, "config_file_path", return_value=str(config_file)):
        plugin.config = SlurmPluginConfig(metrics_catalogs=["old.yaml"])

        response = client.post(
            "/api/slurm/metrics/catalog/config",
            json={"metrics_catalogs": ["new1.yaml", "new2.yaml"]},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["metrics_catalogs"] == ["new1.yaml", "new2.yaml"]

    # Verify file was updated
    content = yaml.safe_load(config_file.read_text())
    assert content["metrics_catalogs"] == ["new1.yaml", "new2.yaml"]


def test_update_metrics_catalog_config_error(tmp_path):
    """Test error handling when updating catalog config fails."""
    plugin = registry.get_plugin("slurm")
    assert plugin is not None

    plugin.config = SlurmPluginConfig()

    with patch.object(plugin, "config_file_path", return_value="/nonexistent/config.yaml"):
        response = client.post(
            "/api/slurm/metrics/catalog/config", json={"metrics_catalogs": ["new.yaml"]}
        )

    assert response.status_code == 500


def test_get_slurm_metric_data_success():
    """Test querying Slurm metric data."""
    plugin = registry.get_plugin("slurm")
    assert plugin is not None

    plugin._metrics_catalog = [
        {
            "id": "slurm_nodes",
            "name": "Slurm Node Count",
            "metric": "slurm_node_status",
            "display": {"unit": "count"},
            "scope": "global",
        }
    ]

    with patch("rackscope.telemetry.prometheus.client.query", AsyncMock(return_value={
        "status": "success",
        "data": {"result": [{"metric": {"node": "n001"}, "value": [1234, "1"]}]},
    })):
        response = client.get("/api/slurm/metrics/data?metric_id=slurm_nodes")

    assert response.status_code == 200
    data = response.json()
    assert data["metric_id"] == "slurm_nodes"
    assert data["name"] == "Slurm Node Count"
    assert data["unit"] == "count"
    assert len(data["data"]) == 1


def test_get_slurm_metric_data_not_found():
    """Test error when metric not in catalog."""
    plugin = registry.get_plugin("slurm")
    assert plugin is not None

    plugin._metrics_catalog = []

    response = client.get("/api/slurm/metrics/data?metric_id=nonexistent")

    assert response.status_code == 404
    assert "not found" in response.json()["detail"]


def test_get_slurm_metric_data_prometheus_error():
    """Test handling Prometheus query failure."""
    plugin = registry.get_plugin("slurm")
    assert plugin is not None

    plugin._metrics_catalog = [
        {"id": "slurm_nodes", "name": "Slurm Nodes", "metric": "slurm_node_status"}
    ]

    with patch("rackscope.telemetry.prometheus.client.query", AsyncMock(return_value={
        "status": "error",
        "error": "Query timeout",
    })):
        response = client.get("/api/slurm/metrics/data?metric_id=slurm_nodes")

    assert response.status_code == 200
    data = response.json()
    assert "error" in data
