from unittest.mock import AsyncMock, patch

import pytest

from rackscope.model.checks import CheckDefinition, CheckRule, ChecksLibrary
from rackscope.model.domain import Device, Rack, Aisle, Room, Site, Topology
from rackscope.telemetry.planner import (
    TelemetryPlanner,
    PlannerConfig,
    _expand_nodes_pattern,
)


def test_expand_nodes_pattern():
    assert _expand_nodes_pattern("compute[001-003]") == [
        "compute001",
        "compute002",
        "compute003",
    ]


def _make_topology(instance: str = "da01") -> Topology:
    device = Device(id="dev1", name="Storage", template_id="eseries", u_position=1, instance=instance)
    rack = Rack(id="rack01", name="Rack 01", devices=[device])
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack])
    room = Room(id="room1", name="Room 1", aisles=[aisle], standalone_racks=[])
    site = Site(id="site1", name="Site 1", rooms=[room])
    return Topology(sites=[site])


def _make_expand_check() -> ChecksLibrary:
    check = CheckDefinition(
        id="eseries_drive_status",
        name="E-Series drive health",
        scope="node",
        expr='eseries_drive_status{status!~"(optimal)",instance=~"$instances"}',
        output="numeric",
        expand_by_label="slot",
        rules=[CheckRule(op="==", value=1, severity="CRIT")],
    )
    return ChecksLibrary(checks=[check])


def _prom_response(metrics: list) -> dict:
    return {"status": "success", "data": {"result": metrics}}


@pytest.mark.asyncio
async def test_expand_by_label_creates_virtual_nodes():
    """Virtual nodes are created per label value when expand_by_label is set."""
    topology = _make_topology("da01")
    checks = _make_expand_check()
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    prom_result = _prom_response([
        {"metric": {"instance": "da01", "slot": "3", "status": "failed"}, "value": [0, "1"]},
        {"metric": {"instance": "da01", "slot": "7", "status": "degraded"}, "value": [0, "1"]},
    ])

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(return_value=prom_result)
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    assert snapshot.node_states.get("da01:slot3") == "CRIT"
    assert snapshot.node_states.get("da01:slot7") == "CRIT"


@pytest.mark.asyncio
async def test_expand_by_label_propagates_to_parent_instance():
    """CRIT virtual nodes propagate their state to the parent instance."""
    topology = _make_topology("da01")
    checks = _make_expand_check()
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    prom_result = _prom_response([
        {"metric": {"instance": "da01", "slot": "5", "status": "failed"}, "value": [0, "1"]},
    ])

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(return_value=prom_result)
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    # Parent instance should inherit worst virtual node state
    assert snapshot.node_states.get("da01") == "CRIT"


@pytest.mark.asyncio
async def test_expand_by_label_no_results_leaves_parent_unknown():
    """When no virtual nodes are found, parent instance stays UNKNOWN."""
    topology = _make_topology("da01")
    checks = _make_expand_check()
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(return_value=_prom_response([]))
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    # No virtual nodes created
    virtual_keys = [k for k in snapshot.node_states if ":" in k]
    assert virtual_keys == []
    # Parent instance gets UNKNOWN from _apply_unknown
    assert snapshot.node_states.get("da01") == "UNKNOWN"


@pytest.mark.asyncio
async def test_expand_by_label_stores_check_and_alert():
    """Virtual node check results and alerts are stored in the snapshot."""
    topology = _make_topology("da01")
    checks = _make_expand_check()
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    prom_result = _prom_response([
        {"metric": {"instance": "da01", "slot": "2", "status": "failed"}, "value": [0, "1"]},
    ])

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(return_value=prom_result)
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    assert snapshot.node_checks.get("da01:slot2", {}).get("eseries_drive_status") == "CRIT"
    assert snapshot.node_alerts.get("da01:slot2", {}).get("eseries_drive_status") == "CRIT"
