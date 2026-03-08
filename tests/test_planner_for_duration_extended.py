"""
Extended tests for TelemetryPlanner for_duration debounce logic.

Covers:
- for_duration with CHASSIS scope
- for_duration with RACK scope
- Severity downgrade (CRIT→WARN) resetting pending timer
- _parse_duration helper function edge cases
"""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from rackscope.model.checks import CheckDefinition, CheckRule, ChecksLibrary
from rackscope.model.domain import Device, Rack, Aisle, Room, Site, Topology
from rackscope.telemetry.planner import (
    TelemetryPlanner,
    PlannerConfig,
    _parse_duration,
)


def _make_topology_chassis(chassis_id: str = "blade01") -> Topology:
    """Create a topology with a chassis device."""
    device = Device(
        id=chassis_id,
        name="Blade Chassis",
        template_id="blade_chassis",
        u_position=1,
        instance=chassis_id,
    )
    rack = Rack(id="rack01", name="Rack 01", devices=[device])
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack])
    room = Room(id="room1", name="Room 1", aisles=[aisle], standalone_racks=[])
    site = Site(id="site1", name="Site 1", rooms=[room])
    return Topology(sites=[site])


def _make_topology_rack(rack_id: str = "rack01") -> Topology:
    """Create a topology with a single rack."""
    rack = Rack(id=rack_id, name="Rack 01", devices=[])
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack])
    room = Room(id="room1", name="Room 1", aisles=[aisle], standalone_racks=[])
    site = Site(id="site1", name="Site 1", rooms=[room])
    return Topology(sites=[site])


def _make_check_chassis(
    check_id: str = "chassis_temp", for_duration: str | None = None
) -> ChecksLibrary:
    """Helper: create a chassis-scoped check with optional for_duration."""
    check = CheckDefinition(
        id=check_id,
        name=check_id,
        scope="chassis",
        kind="server",
        expr='chassis_temp{chassis_id=~"$chassis"}',
        output="numeric",
        for_duration=for_duration,
        rules=[CheckRule(op=">", value=80, severity="CRIT")],
    )
    return ChecksLibrary(checks=[check])


def _make_check_rack(
    check_id: str = "rack_power", for_duration: str | None = None
) -> ChecksLibrary:
    """Helper: create a rack-scoped check with optional for_duration."""
    check = CheckDefinition(
        id=check_id,
        name=check_id,
        scope="rack",
        kind="infrastructure",
        expr='rack_power{rack_id=~"$racks"}',
        output="numeric",
        for_duration=for_duration,
        rules=[CheckRule(op=">", value=15000, severity="CRIT")],
    )
    return ChecksLibrary(checks=[check])


def _prom_ok(metrics: list) -> dict:
    return {"status": "success", "data": {"result": metrics}}


# ── for_duration with CHASSIS scope ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_for_duration_chassis_scope_pending():
    """for_duration with CHASSIS scope: first failure starts pending timer."""
    topology = _make_topology_chassis("blade01")
    checks = _make_check_chassis(for_duration="5m")
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0, chassis_label="chassis_id"))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(
            return_value=_prom_ok(
                [{"metric": {"chassis_id": "blade01"}, "value": [0, "85"]}]  # > 80 → CRIT
            )
        )
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    # First failure with for_duration: 5m → NOT CRIT yet (pending)
    assert snapshot.chassis_states.get("blade01") != "CRIT"
    # Pending state recorded
    assert "chassis_temp:blade01" in planner._pending_states
    assert planner._pending_states["chassis_temp:blade01"] == "CRIT"


@pytest.mark.asyncio
async def test_for_duration_chassis_scope_fires_after_elapsed():
    """for_duration with CHASSIS scope: fires after duration elapses."""
    topology = _make_topology_chassis("blade01")
    checks = _make_check_chassis(for_duration="1s")  # 1 second for fast test
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0, chassis_label="chassis_id"))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(
            return_value=_prom_ok([{"metric": {"chassis_id": "blade01"}, "value": [0, "85"]}])
        )
        mock_client.record_planner_batch = lambda **_: None

        # First poll: starts pending timer
        snapshot1 = await planner.get_snapshot(topology, checks)
        assert snapshot1.chassis_states.get("blade01") != "CRIT"

        # Wait 1.5s — duration elapsed
        await asyncio.sleep(1.5)

        # Second poll: duration elapsed → CRIT fires
        snapshot2 = await planner.get_snapshot(topology, checks)

    assert snapshot2.chassis_states.get("blade01") == "CRIT"
    # Pending state cleared after firing
    assert "chassis_temp:blade01" not in planner._pending_states


@pytest.mark.asyncio
async def test_for_duration_chassis_scope_clears_on_recovery():
    """for_duration with CHASSIS scope: pending clears when check recovers."""
    topology = _make_topology_chassis("blade01")
    checks = _make_check_chassis(for_duration="5m")
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0, chassis_label="chassis_id"))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        # First poll: failing
        mock_client.query = AsyncMock(
            return_value=_prom_ok([{"metric": {"chassis_id": "blade01"}, "value": [0, "85"]}])
        )
        mock_client.record_planner_batch = lambda **_: None
        await planner.get_snapshot(topology, checks)
        assert "chassis_temp:blade01" in planner._pending_states

        # Second poll: recovered
        mock_client.query = AsyncMock(
            return_value=_prom_ok(
                [{"metric": {"chassis_id": "blade01"}, "value": [0, "70"]}]  # < 80 → OK
            )
        )
        snapshot = await planner.get_snapshot(topology, checks)

    # Recovered → OK, pending cleared
    assert snapshot.chassis_states.get("blade01") == "OK"
    assert "chassis_temp:blade01" not in planner._pending_states


# ── for_duration with RACK scope ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_for_duration_rack_scope_pending():
    """for_duration with RACK scope: first failure starts pending timer."""
    topology = _make_topology_rack("rack01")
    checks = _make_check_rack(for_duration="5m")
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0, rack_label="rack_id"))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(
            return_value=_prom_ok(
                [{"metric": {"rack_id": "rack01"}, "value": [0, "16000"]}]  # > 15000 → CRIT
            )
        )
        mock_client.record_planner_batch = lambda **_: None
        snapshot = await planner.get_snapshot(topology, checks)

    # First failure with for_duration: 5m → NOT CRIT yet (pending)
    assert snapshot.rack_states.get("rack01") != "CRIT"
    # Pending state recorded
    assert "rack_power:rack01" in planner._pending_states
    assert planner._pending_states["rack_power:rack01"] == "CRIT"


@pytest.mark.asyncio
async def test_for_duration_rack_scope_fires_after_elapsed():
    """for_duration with RACK scope: fires after duration elapses."""
    topology = _make_topology_rack("rack01")
    checks = _make_check_rack(for_duration="1s")
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0, rack_label="rack_id"))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        mock_client.query = AsyncMock(
            return_value=_prom_ok([{"metric": {"rack_id": "rack01"}, "value": [0, "16000"]}])
        )
        mock_client.record_planner_batch = lambda **_: None

        # First poll: starts pending timer
        snapshot1 = await planner.get_snapshot(topology, checks)
        assert snapshot1.rack_states.get("rack01") != "CRIT"

        # Wait 1.5s — duration elapsed
        await asyncio.sleep(1.5)

        # Second poll: duration elapsed → CRIT fires
        snapshot2 = await planner.get_snapshot(topology, checks)

    assert snapshot2.rack_states.get("rack01") == "CRIT"
    # Pending state cleared after firing
    assert "rack_power:rack01" not in planner._pending_states


@pytest.mark.asyncio
async def test_for_duration_rack_scope_clears_on_recovery():
    """for_duration with RACK scope: pending clears when check recovers."""
    topology = _make_topology_rack("rack01")
    checks = _make_check_rack(for_duration="5m")
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0, rack_label="rack_id"))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        # First poll: failing
        mock_client.query = AsyncMock(
            return_value=_prom_ok([{"metric": {"rack_id": "rack01"}, "value": [0, "16000"]}])
        )
        mock_client.record_planner_batch = lambda **_: None
        await planner.get_snapshot(topology, checks)
        assert "rack_power:rack01" in planner._pending_states

        # Second poll: recovered
        mock_client.query = AsyncMock(
            return_value=_prom_ok(
                [{"metric": {"rack_id": "rack01"}, "value": [0, "12000"]}]  # < 15000 → OK
            )
        )
        snapshot = await planner.get_snapshot(topology, checks)

    # Recovered → OK, pending cleared
    assert snapshot.rack_states.get("rack01") == "OK"
    assert "rack_power:rack01" not in planner._pending_states


# ── Severity downgrade resets pending timer ───────────────────────────────────


@pytest.mark.asyncio
async def test_for_duration_severity_change_resets_timer():
    """Severity change (CRIT→WARN or WARN→CRIT) resets pending timer."""
    topology = _make_topology_chassis("blade01")

    # Check with both WARN and CRIT thresholds
    check = CheckDefinition(
        id="chassis_temp",
        name="Chassis Temp",
        scope="chassis",
        kind="server",
        expr='chassis_temp{chassis_id=~"$chassis"}',
        output="numeric",
        for_duration="5m",
        rules=[
            CheckRule(op=">", value=70, severity="WARN"),
            CheckRule(op=">", value=80, severity="CRIT"),
        ],
    )
    checks = ChecksLibrary(checks=[check])
    planner = TelemetryPlanner(PlannerConfig(cache_ttl_seconds=0, chassis_label="chassis_id"))

    with patch("rackscope.telemetry.planner.prom_client") as mock_client:
        # First poll: WARN (75°C)
        mock_client.query = AsyncMock(
            return_value=_prom_ok([{"metric": {"chassis_id": "blade01"}, "value": [0, "75"]}])
        )
        mock_client.record_planner_batch = lambda **_: None
        await planner.get_snapshot(topology, checks)
        assert "chassis_temp:blade01" in planner._pending_states
        assert planner._pending_states["chassis_temp:blade01"] == "WARN"
        initial_start_time = planner._pending_since["chassis_temp:blade01"]

        # Small delay
        await asyncio.sleep(0.1)

        # Second poll: CRIT (85°C) — severity changed → timer resets
        mock_client.query = AsyncMock(
            return_value=_prom_ok([{"metric": {"chassis_id": "blade01"}, "value": [0, "85"]}])
        )
        await planner.get_snapshot(topology, checks)
        assert planner._pending_states["chassis_temp:blade01"] == "CRIT"
        new_start_time = planner._pending_since["chassis_temp:blade01"]

        # Timer should have been reset (new start time > initial)
        assert new_start_time > initial_start_time


# ── _parse_duration helper tests ──────────────────────────────────────────────


def test_parse_duration_seconds():
    """Test _parse_duration with seconds."""
    assert _parse_duration("30s") == 30.0
    assert _parse_duration("1s") == 1.0


def test_parse_duration_minutes():
    """Test _parse_duration with minutes."""
    assert _parse_duration("5m") == 300.0
    assert _parse_duration("1m") == 60.0


def test_parse_duration_hours():
    """Test _parse_duration with hours."""
    assert _parse_duration("1h") == 3600.0
    assert _parse_duration("2h") == 7200.0


def test_parse_duration_days():
    """Test _parse_duration with days."""
    assert _parse_duration("1d") == 86400.0
    assert _parse_duration("7d") == 604800.0


def test_parse_duration_weeks():
    """Test _parse_duration with weeks."""
    assert _parse_duration("1w") == 604800.0
    assert _parse_duration("2w") == 1209600.0


def test_parse_duration_years():
    """Test _parse_duration with years."""
    assert _parse_duration("1y") == 31536000.0


def test_parse_duration_invalid():
    """Test _parse_duration with invalid formats returns 0.0."""
    assert _parse_duration("") == 0.0
    assert _parse_duration("invalid") == 0.0
    assert _parse_duration("5min") == 0.0
    assert _parse_duration("1 m") == 0.0
    assert _parse_duration("5M") == 0.0


def test_parse_duration_no_unit():
    """Test _parse_duration with no unit returns 0.0."""
    assert _parse_duration("30") == 0.0
