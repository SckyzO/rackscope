"""
Tests for TelemetryPlanner's expand_by_label feature.

expand_by_label lets a single check cover multi-value label dimensions (e.g.
disk slots in a storage array) by creating virtual sub-nodes per label value.
These tests verify state propagation, discovery-driven absent-slot handling,
and the CRIT threshold that downgrades parent severity to WARN when too few
items fail.
"""

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


# ── Helpers ──────────────────────────────────────────────────────────────────


def _make_topology(instance: str = "da01") -> Topology:
    device = Device(
        id="dev1", name="Storage", template_id="eseries", u_position=1, instance=instance
    )
    rack = Rack(id="rack01", name="Rack 01", devices=[device])
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack])
    room = Room(id="room1", name="Room 1", aisles=[aisle], standalone_racks=[])
    site = Site(id="site1", name="Site 1", rooms=[room])
    return Topology(sites=[site])


def _make_expand_check(
    expand_discovery_expr: str | None = None,
    expand_absent_state: str | None = None,
    expand_crit_threshold: int | None = None,
) -> ChecksLibrary:
    check = CheckDefinition(
        id="eseries_drive_status",
        name="E-Series drive health",
        scope="node",
        expr='eseries_drive_status{status!~"(optimal)",instance=~"$instances"}',
        output="numeric",
        expand_by_label="slot",
        expand_discovery_expr=expand_discovery_expr,
        expand_absent_state=expand_absent_state,
        expand_crit_threshold=expand_crit_threshold,
        rules=[CheckRule(op="==", value=1, severity="CRIT")],
    )
    return ChecksLibrary(checks=[check])


def _prom_ok(metrics: list) -> dict:
    return {"status": "success", "data": {"result": metrics}}


def _metric(instance: str, slot: str, status: str = "failed", value: str = "1") -> dict:
    return {"metric": {"instance": instance, "slot": slot, "status": status}, "value": [0, value]}


# ── Basic virtual node creation ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_expand_by_label_creates_virtual_nodes():
    """Virtual nodes are created per label value when expand_by_label is set."""
    topology = _make_topology("da01")
    checks = _make_expand_check()
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(
            return_value=_prom_ok(
                [
                    _metric("da01", "3"),
                    _metric("da01", "7"),
                ]
            )
        )
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    assert snapshot.node_states.get("da01:slot3") == "CRIT"
    assert snapshot.node_states.get("da01:slot7") == "CRIT"


@pytest.mark.asyncio
async def test_expand_by_label_stores_check_and_alert():
    """Virtual node check results and alerts are stored in the snapshot."""
    topology = _make_topology("da01")
    checks = _make_expand_check()
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(return_value=_prom_ok([_metric("da01", "2")]))
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    assert snapshot.node_checks.get("da01:slot2", {}).get("eseries_drive_status") == "CRIT"
    assert snapshot.node_alerts.get("da01:slot2", {}).get("eseries_drive_status") == "CRIT"


# ── Discovery: absent slots shown as OK ──────────────────────────────────────


@pytest.mark.asyncio
async def test_discovery_populates_ok_slots():
    """Slots discovered by discovery_expr but absent from main query get expand_absent_state."""
    topology = _make_topology("da01")
    checks = _make_expand_check(
        expand_discovery_expr='eseries_drive_status{instance=~"$instances"}',
        expand_absent_state="OK",
    )
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    # Discovery finds slots 1-5; main query finds slot 3 as failed
    discovery_result = _prom_ok(
        [
            _metric("da01", "1", "optimal", "1"),
            _metric("da01", "2", "optimal", "1"),
            _metric("da01", "3", "optimal", "0"),
            _metric("da01", "3", "failed", "1"),
            _metric("da01", "4", "optimal", "1"),
            _metric("da01", "5", "optimal", "1"),
        ]
    )
    main_result = _prom_ok([_metric("da01", "3", "failed", "1")])

    call_count = 0

    async def mock_query(q, **kwargs):
        nonlocal call_count
        call_count += 1
        # First call is discovery, second is main query
        if call_count == 1:
            return discovery_result
        return main_result

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = mock_query
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    # Healthy slots discovered → OK
    assert snapshot.node_states.get("da01:slot1") == "OK"
    assert snapshot.node_states.get("da01:slot2") == "OK"
    assert snapshot.node_states.get("da01:slot4") == "OK"
    assert snapshot.node_states.get("da01:slot5") == "OK"
    # Failed slot → CRIT (main query overrides discovery)
    assert snapshot.node_states.get("da01:slot3") == "CRIT"


@pytest.mark.asyncio
async def test_no_discovery_leaves_absent_slots_as_unknown():
    """Without discovery_expr, absent slots stay UNKNOWN (no state in snapshot)."""
    topology = _make_topology("da01")
    checks = _make_expand_check()  # No discovery
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(return_value=_prom_ok([_metric("da01", "3")]))
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    # Slot 1 and 2 have no state (absent from query, no discovery)
    assert "da01:slot1" not in snapshot.node_states
    assert "da01:slot2" not in snapshot.node_states


# ── Parent propagation ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_propagation_crit_virtual_node_makes_parent_crit():
    """CRIT virtual nodes propagate their state to the parent instance."""
    topology = _make_topology("da01")
    checks = _make_expand_check()
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(return_value=_prom_ok([_metric("da01", "5")]))
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    assert snapshot.node_states.get("da01") == "CRIT"


@pytest.mark.asyncio
async def test_propagation_no_bad_nodes_parent_stays_unknown():
    """When no virtual nodes are found, parent instance stays UNKNOWN."""
    topology = _make_topology("da01")
    checks = _make_expand_check()
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(return_value=_prom_ok([]))
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    assert snapshot.node_states.get("da01") == "UNKNOWN"


# ── Threshold ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_threshold_below_limit_downgrades_to_warn():
    """With threshold=3, only 2 CRIT disks → parent is WARN not CRIT."""
    topology = _make_topology("da01")
    checks = _make_expand_check(expand_crit_threshold=3)
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(
            return_value=_prom_ok(
                [
                    _metric("da01", "1"),
                    _metric("da01", "2"),
                ]
            )
        )
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    assert snapshot.node_states.get("da01:slot1") == "CRIT"
    assert snapshot.node_states.get("da01:slot2") == "CRIT"
    # 2 < threshold(3) → parent is WARN
    assert snapshot.node_states.get("da01") == "WARN"


@pytest.mark.asyncio
async def test_threshold_at_limit_keeps_crit():
    """With threshold=3, exactly 3 CRIT disks → parent remains CRIT."""
    topology = _make_topology("da01")
    checks = _make_expand_check(expand_crit_threshold=3)
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(
            return_value=_prom_ok(
                [
                    _metric("da01", "1"),
                    _metric("da01", "2"),
                    _metric("da01", "3"),
                ]
            )
        )
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    # 3 >= threshold(3) → parent is CRIT
    assert snapshot.node_states.get("da01") == "CRIT"


@pytest.mark.asyncio
async def test_no_threshold_single_crit_makes_parent_crit():
    """Without threshold, even 1 CRIT virtual node makes parent CRIT."""
    topology = _make_topology("da01")
    checks = _make_expand_check()  # No threshold
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(return_value=_prom_ok([_metric("da01", "1")]))
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    assert snapshot.node_states.get("da01") == "CRIT"


# ── for_duration debounce tests ───────────────────────────────────────────────

import asyncio
import time as _time


def _make_for_check(check_id: str = "node_up", for_duration: str | None = None) -> ChecksLibrary:
    """Helper: create a simple bool check with optional for_duration."""
    check = CheckDefinition(
        id=check_id,
        name=check_id,
        scope="node",
        kind="server",
        expr=f'up{{instance=~"$instances"}}',
        output="bool",
        for_duration=for_duration,
        rules=[CheckRule(op="==", value=0, severity="CRIT")],
    )
    return ChecksLibrary(checks=[check])


@pytest.mark.asyncio
async def test_for_null_fires_immediately():
    """for_duration: null → CRIT fires on first failing poll."""
    topology = _make_topology("compute001")
    checks = _make_for_check(for_duration=None)
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(
            return_value=_prom_ok(
                [{"metric": {"instance": "compute001"}, "value": [0, "0"]}]  # up=0 → CRIT
            )
        )
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    # for_duration: null → immediate CRIT
    assert snapshot.node_states.get("compute001") == "CRIT"


@pytest.mark.asyncio
async def test_for_duration_pending_on_first_failure():
    """for_duration: 5m → first failure starts timer, state stays as previous (UNKNOWN)."""
    topology = _make_topology("compute001")
    checks = _make_for_check(for_duration="5m")
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(
            return_value=_prom_ok(
                [{"metric": {"instance": "compute001"}, "value": [0, "0"]}]  # up=0 → CRIT
            )
        )
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    # First failure with for_duration: 5m → NOT CRIT yet (pending timer started)
    assert snapshot.node_states.get("compute001") != "CRIT"
    # Pending state recorded
    assert "node_up:compute001" in planner._pending_states
    assert planner._pending_states["node_up:compute001"] == "CRIT"


@pytest.mark.asyncio
async def test_for_duration_fires_after_elapsed():
    """for_duration: 1s → fires after duration elapses."""
    topology = _make_topology("compute001")
    checks = _make_for_check(for_duration="1s")  # 1 second for fast test
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(
            return_value=_prom_ok(
                [{"metric": {"instance": "compute001"}, "value": [0, "0"]}]
            )
        )
        mock_client.record_planner_batch = lambda **_: None

        # First poll: starts pending timer
        snapshot1 = await planner.get_snapshot(topology, checks)
        assert snapshot1.node_states.get("compute001") != "CRIT"

        # Wait 1.5s — duration elapsed
        await asyncio.sleep(1.5)

        # Second poll: duration elapsed → CRIT fires
        snapshot2 = await planner.get_snapshot(topology, checks)

    assert snapshot2.node_states.get("compute001") == "CRIT"
    # Pending state cleared after firing
    assert "node_up:compute001" not in planner._pending_states


@pytest.mark.asyncio
async def test_for_duration_clears_on_recovery():
    """Pending state clears when check recovers before duration elapses."""
    topology = _make_topology("compute001")
    checks = _make_for_check(for_duration="5m")
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        # First poll: failing
        mock_client.query = AsyncMock(
            return_value=_prom_ok(
                [{"metric": {"instance": "compute001"}, "value": [0, "0"]}]
            )
        )
        mock_client.record_planner_batch = lambda **_: None
        await planner.get_snapshot(topology, checks)
        assert "node_up:compute001" in planner._pending_states

        # Second poll: recovered
        mock_client.query = AsyncMock(
            return_value=_prom_ok(
                [{"metric": {"instance": "compute001"}, "value": [0, "1"]}]  # up=1 → OK
            )
        )
        snapshot = await planner.get_snapshot(topology, checks)

    # Recovered → OK, pending cleared
    assert snapshot.node_states.get("compute001") == "OK"
    assert "node_up:compute001" not in planner._pending_states
