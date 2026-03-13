"""
Tests for Telemetry Router

Tests for telemetry data, health states, and alerts endpoints.
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi.testclient import TestClient

from rackscope.api.app import app
from rackscope.api.dependencies import (
    get_app_config_optional,
    get_catalog_optional,
    get_checks_library_optional,
    get_planner_optional,
    get_service_cache,
    get_topology_index_optional,
    get_topology_optional,
)
from rackscope.api.cache import ServiceCache
from rackscope.model.domain import build_topology_index
from rackscope.model.catalog import Catalog, DeviceTemplate, LayoutConfig
from rackscope.model.checks import CheckDefinition, CheckRule, ChecksLibrary
from rackscope.model.config import AppConfig, PathsConfig, TelemetryConfig
from rackscope.model.domain import Aisle, Device, Rack, Room, Site, Topology
from rackscope.telemetry.planner import PlannerSnapshot

client = TestClient(app)


@pytest.fixture
def mock_topology():
    """Create test topology."""
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
def mock_catalog():
    """Create test catalog."""
    device_template = DeviceTemplate(
        id="compute",
        name="Compute Node",
        type="server",
        u_height=1,
        layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
    )
    return Catalog(device_templates=[device_template])


@pytest.fixture
def mock_checks_library():
    """Create test checks library."""
    check = CheckDefinition(
        id="node_up",
        name="Node Up",
        scope="node",
        expr="up",
        rules=[CheckRule(op="==", value=1, severity="OK")],
    )
    return ChecksLibrary(checks=[check])


@pytest.fixture
def mock_app_config():
    """Create test app config."""
    return AppConfig(
        paths=PathsConfig(
            topology="config/topology",
            templates="config/templates",
            checks="config/checks",
        ),
        telemetry=TelemetryConfig(prometheus_heartbeat_seconds=30),
    )


@pytest.fixture
def mock_planner():
    """Create mock telemetry planner."""
    planner = Mock()
    planner.get_snapshot = AsyncMock(
        return_value=PlannerSnapshot(
            generated_at=1000000.0,
            rack_states={"rack01": "OK"},
            node_states={"node01": "OK", "node02": "OK"},
            node_alerts={},
        )
    )
    return planner


def override_topology(topology):
    """Override get_topology_optional dependency."""

    def _get_topology_optional():
        return topology

    return _get_topology_optional


def override_catalog(catalog):
    """Override get_catalog_optional dependency."""

    def _get_catalog_optional():
        return catalog

    return _get_catalog_optional


def override_checks_library(checks_library):
    """Override get_checks_library_optional dependency."""

    def _get_checks_library_optional():
        return checks_library

    return _get_checks_library_optional


def override_app_config(config):
    """Override get_app_config_optional dependency."""

    def _get_app_config_optional():
        return config

    return _get_app_config_optional


def override_planner(planner):
    """Override get_planner_optional dependency."""

    def _get_planner_optional():
        return planner

    return _get_planner_optional


@pytest.mark.asyncio
async def test_get_global_stats_with_planner(
    mock_topology, mock_catalog, mock_checks_library, mock_planner
):
    """Test getting global stats with planner available."""
    app.dependency_overrides[get_topology_optional] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(
        mock_checks_library
    )
    app.dependency_overrides[get_planner_optional] = override_planner(mock_planner)

    response = client.get("/api/stats/global")

    assert response.status_code == 200
    data = response.json()
    assert "total_rooms" in data
    assert "total_racks" in data
    assert "active_alerts" in data
    assert "status" in data
    assert data["total_rooms"] == 1
    assert data["total_racks"] == 1
    assert data["status"] == "OK"

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_global_stats_without_planner(mock_topology):
    """Test getting global stats without planner (fallback to Prometheus)."""
    app.dependency_overrides[get_topology_optional] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog_optional] = override_catalog(None)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(None)
    app.dependency_overrides[get_planner_optional] = override_planner(None)

    # When planner is None the router returns empty rack_healths — no Prometheus call needed
    response = client.get("/api/stats/global")

    assert response.status_code == 200
    data = response.json()
    assert data["total_racks"] == 1
    assert data["status"] == "OK"


@pytest.mark.asyncio
async def test_get_global_stats_with_alerts(mock_topology, mock_catalog, mock_checks_library):
    """Test global stats with critical and warning alerts."""
    planner = Mock()
    planner.get_snapshot = AsyncMock(
        return_value=PlannerSnapshot(
            generated_at=1000000.0,
            rack_states={"rack01": "CRIT", "rack02": "WARN", "rack03": "OK"},
            node_states={},
            node_alerts={},
        )
    )

    app.dependency_overrides[get_topology_optional] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(
        mock_checks_library
    )
    app.dependency_overrides[get_planner_optional] = override_planner(planner)

    response = client.get("/api/stats/global")

    assert response.status_code == 200
    data = response.json()
    assert data["crit_count"] >= 1
    assert data["warn_count"] >= 1
    assert data["active_alerts"] >= 2
    assert data["status"] == "CRIT"  # CRIT takes precedence

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_global_stats_no_topology():
    """Test getting global stats when no topology loaded."""
    app.dependency_overrides[get_topology_optional] = override_topology(None)
    app.dependency_overrides[get_catalog_optional] = override_catalog(None)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(None)
    app.dependency_overrides[get_planner_optional] = override_planner(None)

    response = client.get("/api/stats/global")

    assert response.status_code == 200
    data = response.json()
    assert data["total_rooms"] == 0
    assert data["total_racks"] == 0


def test_get_prometheus_stats_with_config(mock_app_config):
    """Test getting Prometheus client stats."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(mock_app_config)

    with patch("rackscope.telemetry.prometheus.client") as mock_client:
        mock_client.get_latency_stats.return_value = {
            "last_ts": 1000000,
            "mean_ms": 50.0,
            "p95_ms": 100.0,
        }

        response = client.get("/api/stats/prometheus")

    assert response.status_code == 200
    data = response.json()
    assert "heartbeat_seconds" in data
    assert "next_ts" in data
    assert data["heartbeat_seconds"] == 30
    assert data["next_ts"] == 1000000 + 30 * 1000

    app.dependency_overrides.clear()


def test_get_prometheus_stats_without_config():
    """Test getting Prometheus stats without config."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(None)

    with patch("rackscope.telemetry.prometheus.client") as mock_client:
        mock_client.get_latency_stats.return_value = {
            "last_ts": 1000000,
            "mean_ms": 50.0,
        }

        response = client.get("/api/stats/prometheus")

    assert response.status_code == 200
    data = response.json()
    assert data["heartbeat_seconds"] == 60  # Default fallback

    app.dependency_overrides.clear()


def test_get_prometheus_stats_no_last_ts():
    """Test Prometheus stats when last_ts is None."""
    app.dependency_overrides[get_app_config_optional] = override_app_config(None)

    with patch("rackscope.telemetry.prometheus.client") as mock_client:
        mock_client.get_latency_stats.return_value = {"last_ts": None}

        response = client.get("/api/stats/prometheus")

    assert response.status_code == 200
    data = response.json()
    assert data["next_ts"] is None

    app.dependency_overrides.clear()


def test_get_telemetry_stats():
    """Test getting telemetry stats."""
    with patch("rackscope.telemetry.prometheus.client") as mock_client:
        mock_client.get_telemetry_stats.return_value = {
            "total_queries": 100,
            "cache_hits": 80,
            "cache_misses": 20,
        }

        response = client.get("/api/stats/telemetry")

    assert response.status_code == 200
    data = response.json()
    assert "total_queries" in data
    assert data["total_queries"] == 100


@pytest.mark.asyncio
async def test_get_room_state_success(
    mock_topology, mock_catalog, mock_checks_library, mock_planner
):
    """Test getting room health state."""
    app.dependency_overrides[get_topology_optional] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(
        mock_checks_library
    )
    app.dependency_overrides[get_planner_optional] = override_planner(mock_planner)

    response = client.get("/api/rooms/room1/state")

    assert response.status_code == 200
    data = response.json()
    assert data["room_id"] == "room1"
    assert "state" in data
    assert "racks" in data
    assert "rack01" in data["racks"]
    assert data["state"] == "OK"

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_room_state_with_crit_rack(mock_topology, mock_catalog, mock_checks_library):
    """Test room state when one rack is critical."""
    planner = Mock()
    planner.get_snapshot = AsyncMock(
        return_value=PlannerSnapshot(
            generated_at=1000000.0,
            rack_states={"rack01": "CRIT"},
            node_states={},
            node_alerts={},
        )
    )

    app.dependency_overrides[get_topology_optional] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(
        mock_checks_library
    )
    app.dependency_overrides[get_planner_optional] = override_planner(planner)

    response = client.get("/api/rooms/room1/state")

    assert response.status_code == 200
    data = response.json()
    assert data["state"] == "CRIT"
    assert data["racks"]["rack01"]["state"] == "CRIT"

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_room_state_no_planner():
    """Test getting room state when planner not available."""
    app.dependency_overrides[get_topology_optional] = override_topology(None)
    app.dependency_overrides[get_catalog_optional] = override_catalog(None)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(None)
    app.dependency_overrides[get_planner_optional] = override_planner(None)

    response = client.get("/api/rooms/room1/state")

    assert response.status_code == 200
    data = response.json()
    assert data["room_id"] == "room1"
    assert data["state"] == "UNKNOWN"
    assert data["racks"] == {}

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_rack_state_success(
    mock_topology, mock_catalog, mock_checks_library, mock_planner
):
    """Test getting rack health state."""
    app.dependency_overrides[get_topology_optional] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(
        mock_checks_library
    )
    app.dependency_overrides[get_planner_optional] = override_planner(mock_planner)

    with (
        patch("rackscope.services.metrics_service.collect_rack_devices_metrics") as mock_devices,
        patch(
            "rackscope.services.metrics_service.collect_rack_component_metrics"
        ) as mock_components,
    ):
        mock_devices.return_value = {
            "node01": {"node_temperature_celsius": 65.0, "node_power_watts": 250.0},
            "node02": {"node_temperature_celsius": 70.0, "node_power_watts": 300.0},
        }
        mock_components.return_value = {"pdu-left": {"activepower_watt": 550.0}}

        response = client.get("/api/racks/rack01/state?include_metrics=true")

    assert response.status_code == 200
    data = response.json()
    assert data["rack_id"] == "rack01"
    assert data["state"] == "OK"
    assert "metrics" in data
    assert "nodes" in data
    assert data["metrics"]["power"] == 550.0
    assert data["metrics"]["temperature"] == 67.5  # Average of 65 and 70

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_rack_state_with_alerts(mock_topology, mock_catalog, mock_checks_library):
    """Test rack state with node alerts."""
    planner = Mock()
    planner.get_snapshot = AsyncMock(
        return_value=PlannerSnapshot(
            generated_at=1000000.0,
            rack_states={"rack01": "WARN"},
            node_states={"node01": "WARN"},
            node_alerts={"node01": {"temp_check": "WARN"}},
        )
    )

    app.dependency_overrides[get_topology_optional] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(
        mock_checks_library
    )
    app.dependency_overrides[get_planner_optional] = override_planner(planner)

    with (
        patch("rackscope.services.metrics_service.collect_rack_devices_metrics") as mock_devices,
        patch(
            "rackscope.services.metrics_service.collect_rack_component_metrics"
        ) as mock_components,
    ):
        mock_devices.return_value = {"node01": {"node_temperature_celsius": 85.0}}
        mock_components.return_value = {}

        response = client.get("/api/racks/rack01/state")

    assert response.status_code == 200
    data = response.json()
    assert data["state"] == "WARN"
    assert data["nodes"]["node01"]["state"] == "WARN"
    assert len(data["nodes"]["node01"]["alerts"]) == 1
    assert data["nodes"]["node01"]["alerts"][0]["id"] == "temp_check"

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_rack_state_no_planner():
    """Test getting rack state when planner not available."""
    app.dependency_overrides[get_topology_optional] = override_topology(None)
    app.dependency_overrides[get_catalog_optional] = override_catalog(None)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(None)
    app.dependency_overrides[get_planner_optional] = override_planner(None)

    response = client.get("/api/racks/rack01/state")

    assert response.status_code == 200
    data = response.json()
    assert data["rack_id"] == "rack01"
    assert data["state"] == "UNKNOWN"
    assert data["nodes"] == {}

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_rack_state_no_metrics(
    mock_topology, mock_catalog, mock_checks_library, mock_planner
):
    """Test rack state when nodes have no metrics."""
    app.dependency_overrides[get_topology_optional] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(
        mock_checks_library
    )
    app.dependency_overrides[get_planner_optional] = override_planner(mock_planner)

    with (
        patch("rackscope.services.metrics_service.collect_rack_devices_metrics") as mock_devices,
        patch(
            "rackscope.services.metrics_service.collect_rack_component_metrics"
        ) as mock_components,
    ):
        mock_devices.return_value = {}
        mock_components.return_value = {}

        response = client.get("/api/racks/rack01/state")

    assert response.status_code == 200
    data = response.json()
    assert data["metrics"]["power"] == 0
    assert data["metrics"]["temperature"] == 0

    app.dependency_overrides.clear()


# ── /api/alerts/active ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_active_alerts_no_state():
    """Returns empty alerts list when topology/planner not loaded."""
    app.dependency_overrides[get_topology_optional] = override_topology(None)
    app.dependency_overrides[get_catalog_optional] = override_catalog(None)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(None)
    app.dependency_overrides[get_planner_optional] = override_planner(None)

    response = client.get("/api/alerts/active")

    assert response.status_code == 200
    assert response.json() == {"alerts": []}

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_active_alerts_node_alert(mock_topology, mock_catalog, mock_checks_library):
    """Node-level alert is returned with full topology context."""
    planner = Mock()
    planner.get_snapshot = AsyncMock(
        return_value=PlannerSnapshot(
            generated_at=1000000.0,
            rack_states={"rack01": "WARN"},
            node_states={"node01": "WARN"},
            node_alerts={"node01": {"node_up": "WARN"}},
            rack_alerts={},
        )
    )

    app.dependency_overrides[get_topology_optional] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(
        mock_checks_library
    )
    app.dependency_overrides[get_planner_optional] = override_planner(planner)

    response = client.get("/api/alerts/active")

    assert response.status_code == 200
    data = response.json()
    assert "alerts" in data
    assert len(data["alerts"]) == 1

    alert = data["alerts"][0]
    assert alert["type"] == "node"
    assert alert["node_id"] == "node01"
    assert alert["state"] == "WARN"
    assert alert["site_id"] == "site1"
    assert alert["room_id"] == "room1"
    assert alert["rack_id"] == "rack01"
    assert alert["device_id"] == "dev1"
    assert len(alert["checks"]) == 1
    assert alert["checks"][0]["id"] == "node_up"
    assert alert["checks"][0]["severity"] == "WARN"

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_active_alerts_rack_alert(mock_topology, mock_catalog, mock_checks_library):
    """Rack-level alert is returned with topology context."""
    planner = Mock()
    planner.get_snapshot = AsyncMock(
        return_value=PlannerSnapshot(
            generated_at=1000000.0,
            rack_states={"rack01": "CRIT"},
            node_states={},
            node_alerts={},
            rack_alerts={"rack01": {"pdu_power": "CRIT"}},
        )
    )

    app.dependency_overrides[get_topology_optional] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(
        mock_checks_library
    )
    app.dependency_overrides[get_planner_optional] = override_planner(planner)

    response = client.get("/api/alerts/active")

    assert response.status_code == 200
    data = response.json()
    alerts = data["alerts"]
    assert len(alerts) == 1

    alert = alerts[0]
    assert alert["type"] == "rack"
    assert alert["rack_id"] == "rack01"
    assert alert["state"] == "CRIT"
    assert alert["site_id"] == "site1"
    assert alert["room_id"] == "room1"
    assert alert["rack_name"] == "Rack 01"
    assert alert["checks"][0]["id"] == "pdu_power"

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_active_alerts_unknown_node_skipped(
    mock_topology, mock_catalog, mock_checks_library
):
    """Alerts for node IDs not in topology are silently skipped."""
    planner = Mock()
    planner.get_snapshot = AsyncMock(
        return_value=PlannerSnapshot(
            generated_at=1000000.0,
            rack_states={},
            node_states={"ghost-node": "CRIT"},
            node_alerts={"ghost-node": {"node_up": "CRIT"}},
            rack_alerts={},
        )
    )

    app.dependency_overrides[get_topology_optional] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(
        mock_checks_library
    )
    app.dependency_overrides[get_planner_optional] = override_planner(planner)

    response = client.get("/api/alerts/active")

    assert response.status_code == 200
    assert response.json()["alerts"] == []

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_active_alerts_no_alerts(mock_topology, mock_catalog, mock_checks_library):
    """Returns empty list when snapshot has no alerts."""
    planner = Mock()
    planner.get_snapshot = AsyncMock(
        return_value=PlannerSnapshot(
            generated_at=1000000.0,
            rack_states={"rack01": "OK"},
            node_states={"node01": "OK"},
            node_alerts={},
            rack_alerts={},
        )
    )

    app.dependency_overrides[get_topology_optional] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(
        mock_checks_library
    )
    app.dependency_overrides[get_planner_optional] = override_planner(planner)

    response = client.get("/api/alerts/active")

    assert response.status_code == 200
    assert response.json() == {"alerts": []}

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_active_alerts_cache_hit(mock_topology, mock_catalog, mock_checks_library):
    """ServiceCache hit returns cached response without calling planner."""
    planner = Mock()
    planner.get_snapshot = AsyncMock()

    cached_result = {"alerts": [{"type": "node", "node_id": "node01", "state": "CRIT"}]}
    svc_cache = ServiceCache()
    await svc_cache.set("alerts:active", cached_result, ttl=60.0)

    app.dependency_overrides[get_topology_optional] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(
        mock_checks_library
    )
    app.dependency_overrides[get_planner_optional] = override_planner(planner)
    app.dependency_overrides[get_service_cache] = lambda: svc_cache

    response = client.get("/api/alerts/active")

    assert response.status_code == 200
    assert response.json() == cached_result
    planner.get_snapshot.assert_not_called()

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_active_alerts_with_topology_index(
    mock_topology, mock_catalog, mock_checks_library
):
    """TopologyIndex O(1) path produces the same context as the O(n) fallback."""
    planner = Mock()
    planner.get_snapshot = AsyncMock(
        return_value=PlannerSnapshot(
            generated_at=1000000.0,
            rack_states={"rack01": "WARN"},
            node_states={"node01": "WARN"},
            node_alerts={"node01": {"node_up": "WARN"}},
            rack_alerts={},
        )
    )
    topo_index = build_topology_index(mock_topology)

    app.dependency_overrides[get_topology_optional] = override_topology(mock_topology)
    app.dependency_overrides[get_catalog_optional] = override_catalog(mock_catalog)
    app.dependency_overrides[get_checks_library_optional] = override_checks_library(
        mock_checks_library
    )
    app.dependency_overrides[get_planner_optional] = override_planner(planner)
    app.dependency_overrides[get_topology_index_optional] = lambda: topo_index

    response = client.get("/api/alerts/active")

    assert response.status_code == 200
    data = response.json()
    assert len(data["alerts"]) == 1
    alert = data["alerts"][0]
    assert alert["node_id"] == "node01"
    assert alert["site_id"] == "site1"
    assert alert["room_id"] == "room1"
    assert alert["rack_id"] == "rack01"
    assert alert["device_id"] == "dev1"

    app.dependency_overrides.clear()
