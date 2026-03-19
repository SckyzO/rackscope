"""
Tests for Slurm Service

Tests for Slurm data processing and mapping.
"""

import tempfile
from pathlib import Path
from typing import Set
from unittest.mock import AsyncMock, patch

import pytest
import yaml

from rackscope.model.config import SlurmConfig, SlurmStatusMap
from rackscope.model.domain import Aisle, Device, Rack, Room, Site, Topology
from rackscope.services.slurm_service import (
    build_node_context,
    build_slurm_states,
    calculate_slurm_severity,
    collect_room_nodes,
    expand_device_instances,
    fetch_slurm_results,
    load_slurm_mapping,
    normalize_slurm_status,
    severity_rank,
)


def test_normalize_slurm_status_simple():
    """Test normalizing simple status."""
    status, has_star = normalize_slurm_status("idle")
    assert status == "idle"
    assert has_star is False


def test_normalize_slurm_status_with_star():
    """Test normalizing status with star."""
    status, has_star = normalize_slurm_status("idle*")
    assert status == "idle"
    assert has_star is True


def test_normalize_slurm_status_alias():
    """Test normalizing aliased status."""
    status, has_star = normalize_slurm_status("alloc")
    assert status == "allocated"
    assert has_star is False


def test_normalize_slurm_status_alias_with_star():
    """Test normalizing aliased status with star."""
    status, has_star = normalize_slurm_status("alloc*")
    assert status == "allocated"
    assert has_star is True


def test_normalize_slurm_status_uppercase():
    """Test normalizing uppercase status."""
    status, has_star = normalize_slurm_status("IDLE")
    assert status == "idle"
    assert has_star is False


def test_normalize_slurm_status_mixed_case():
    """Test normalizing mixed case status."""
    status, has_star = normalize_slurm_status("AlLoC*")
    assert status == "allocated"
    assert has_star is True


def test_normalize_slurm_status_whitespace():
    """Test normalizing status with whitespace."""
    status, has_star = normalize_slurm_status("  idle  ")
    assert status == "idle"
    assert has_star is False


def test_normalize_slurm_status_empty():
    """Test normalizing empty status."""
    status, has_star = normalize_slurm_status("")
    assert status == ""
    assert has_star is False


def test_normalize_slurm_status_none():
    """Test normalizing None status."""
    status, has_star = normalize_slurm_status(None)
    assert status == ""
    assert has_star is False


def test_normalize_slurm_status_all_aliases():
    """Test all known status aliases."""
    aliases = {
        "comp": "completing",
        "drng": "draining",
        "failg": "failing",
        "futr": "future",
        "mix": "mixed",
        "plnd": "planned",
        "pow_dn": "power_down",
        "pow_up": "power_up",
        "resv": "reserved",
        "unk": "unknown",
        "block": "blocked",
        "maint": "maint",
    }
    for alias, expected in aliases.items():
        status, _ = normalize_slurm_status(alias)
        assert status == expected, f"Failed for alias: {alias}"


@pytest.fixture
def default_status_map():
    """Create a default status map."""
    # Use actual defaults (idle/allocated are OK by default)
    return SlurmStatusMap()


def test_calculate_slurm_severity_star_always_crit(default_status_map):
    """Test that starred status is always CRIT."""
    # Even if status is OK, star makes it CRIT
    severity = calculate_slurm_severity("idle", True, default_status_map)
    assert severity == "CRIT"


def test_calculate_slurm_severity_crit(default_status_map):
    """Test CRIT severity."""
    severity = calculate_slurm_severity("down", False, default_status_map)
    assert severity == "CRIT"


def test_calculate_slurm_severity_warn(default_status_map):
    """Test WARN severity."""
    # Use 'mixed' which is in default WARN list
    severity = calculate_slurm_severity("mixed", False, default_status_map)
    assert severity == "WARN"


def test_calculate_slurm_severity_ok(default_status_map):
    """Test OK severity."""
    severity = calculate_slurm_severity("idle", False, default_status_map)
    assert severity == "OK"


def test_calculate_slurm_severity_unknown(default_status_map):
    """Test UNKNOWN severity for unmapped status."""
    severity = calculate_slurm_severity("custom_status", False, default_status_map)
    assert severity == "UNKNOWN"


def test_severity_rank_wrapper():
    """Test severity_rank is a wrapper."""
    # Should match aggregation.severity_rank
    assert severity_rank("UNKNOWN") == 0
    assert severity_rank("OK") == 1
    assert severity_rank("WARN") == 2
    assert severity_rank("CRIT") == 3


def test_expand_device_instances_wrapper():
    """Test expand_device_instances is a wrapper."""
    device = Device(
        id="dev1",
        name="Device",
        template_id="compute",
        u_position=1,
        instance="node[01-03]",
    )
    result = expand_device_instances(device)
    assert result == ["node01", "node02", "node03"]


def test_collect_room_nodes_simple():
    """Test collecting nodes from a simple room."""
    device1 = Device(
        id="dev1", name="Device 1", template_id="compute", u_position=1, instance="node01"
    )
    device2 = Device(
        id="dev2", name="Device 2", template_id="compute", u_position=3, instance="node02"
    )
    rack = Rack(id="rack01", name="Rack 01", devices=[device1, device2])
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack])
    room = Room(id="room1", name="Room 1", aisles=[aisle], standalone_racks=[])

    nodes = collect_room_nodes(room)
    assert nodes == {"node01", "node02"}


def test_collect_room_nodes_with_standalone():
    """Test collecting nodes including standalone racks."""
    device1 = Device(
        id="dev1", name="Device 1", template_id="compute", u_position=1, instance="node01"
    )
    device2 = Device(
        id="dev2", name="Device 2", template_id="compute", u_position=1, instance="node02"
    )
    rack_aisle = Rack(id="rack01", name="Rack 01", devices=[device1])
    rack_standalone = Rack(id="rack02", name="Rack 02", devices=[device2])
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack_aisle])
    room = Room(id="room1", name="Room 1", aisles=[aisle], standalone_racks=[rack_standalone])

    nodes = collect_room_nodes(room)
    assert nodes == {"node01", "node02"}


def test_collect_room_nodes_with_patterns():
    """Test collecting nodes with range patterns."""
    device = Device(
        id="dev1",
        name="Device 1",
        template_id="compute",
        u_position=1,
        instance="node[01-03]",
    )
    rack = Rack(id="rack01", name="Rack 01", devices=[device])
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack])
    room = Room(id="room1", name="Room 1", aisles=[aisle], standalone_racks=[])

    nodes = collect_room_nodes(room)
    assert nodes == {"node01", "node02", "node03"}


def test_collect_room_nodes_empty():
    """Test collecting nodes from empty room."""
    room = Room(id="room1", name="Room 1", aisles=[], standalone_racks=[])
    nodes = collect_room_nodes(room)
    assert nodes == set()


def test_build_node_context():
    """Test building node context map."""
    device = Device(
        id="dev1", name="Device 1", template_id="compute", u_position=1, instance="node01"
    )
    rack = Rack(id="rack01", name="Rack 01", devices=[device])
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack])
    room = Room(id="room1", name="Room 1", aisles=[aisle], standalone_racks=[])
    site = Site(id="site1", name="Site 1", rooms=[room])
    topology = Topology(sites=[site])

    context = build_node_context(topology)

    assert "node01" in context
    assert context["node01"]["site_id"] == "site1"
    assert context["node01"]["site_name"] == "Site 1"
    assert context["node01"]["room_id"] == "room1"
    assert context["node01"]["room_name"] == "Room 1"
    assert context["node01"]["rack_id"] == "rack01"
    assert context["node01"]["rack_name"] == "Rack 01"
    assert context["node01"]["device_id"] == "dev1"
    assert context["node01"]["device_name"] == "Device 1"


def test_build_node_context_multiple_nodes():
    """Test building context for multiple nodes."""
    device1 = Device(
        id="dev1", name="Device 1", template_id="compute", u_position=1, instance="node01"
    )
    device2 = Device(
        id="dev2",
        name="Device 2",
        template_id="compute",
        u_position=3,
        instance="node[02-03]",
    )
    rack = Rack(id="rack01", name="Rack 01", devices=[device1, device2])
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack])
    room = Room(id="room1", name="Room 1", aisles=[aisle], standalone_racks=[])
    site = Site(id="site1", name="Site 1", rooms=[room])
    topology = Topology(sites=[site])

    context = build_node_context(topology)

    assert len(context) == 3
    assert "node01" in context
    assert "node02" in context
    assert "node03" in context


def test_load_slurm_mapping_success():
    """Test loading Slurm mapping from YAML."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        yaml.safe_dump(
            {
                "mappings": [
                    {"node": "slurm-node-01", "instance": "node01"},
                    {"node": "slurm-node-02", "instance": "node02"},
                ]
            },
            f,
        )
        mapping_path = f.name

    try:
        slurm_cfg = SlurmConfig(mapping_path=mapping_path)
        mapping = load_slurm_mapping(slurm_cfg)

        assert mapping == {"slurm-node-01": "node01", "slurm-node-02": "node02"}
    finally:
        Path(mapping_path).unlink(missing_ok=True)


def test_load_slurm_mapping_no_path():
    """Test loading mapping with no path configured."""
    slurm_cfg = SlurmConfig(mapping_path=None)
    mapping = load_slurm_mapping(slurm_cfg)
    assert mapping == {}


def test_load_slurm_mapping_file_not_found():
    """Test loading mapping when file doesn't exist."""
    slurm_cfg = SlurmConfig(mapping_path="/nonexistent/path.yaml")
    mapping = load_slurm_mapping(slurm_cfg)
    assert mapping == {}


def test_load_slurm_mapping_invalid_yaml():
    """Test loading mapping with invalid YAML."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        f.write("{ invalid yaml ][")
        mapping_path = f.name

    try:
        slurm_cfg = SlurmConfig(mapping_path=mapping_path)
        mapping = load_slurm_mapping(slurm_cfg)
        assert mapping == {}
    finally:
        Path(mapping_path).unlink(missing_ok=True)


def test_load_slurm_mapping_empty_file():
    """Test loading mapping from empty file."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        f.write("")
        mapping_path = f.name

    try:
        slurm_cfg = SlurmConfig(mapping_path=mapping_path)
        mapping = load_slurm_mapping(slurm_cfg)
        assert mapping == {}
    finally:
        Path(mapping_path).unlink(missing_ok=True)


def test_load_slurm_mapping_no_mappings_key():
    """Test loading mapping with no mappings key."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        yaml.safe_dump({"other_key": "value"}, f)
        mapping_path = f.name

    try:
        slurm_cfg = SlurmConfig(mapping_path=mapping_path)
        mapping = load_slurm_mapping(slurm_cfg)
        assert mapping == {}
    finally:
        Path(mapping_path).unlink(missing_ok=True)


def test_load_slurm_mapping_invalid_mappings_type():
    """Test loading mapping with invalid mappings type."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        yaml.safe_dump({"mappings": "not_a_list"}, f)
        mapping_path = f.name

    try:
        slurm_cfg = SlurmConfig(mapping_path=mapping_path)
        mapping = load_slurm_mapping(slurm_cfg)
        assert mapping == {}
    finally:
        Path(mapping_path).unlink(missing_ok=True)


def test_load_slurm_mapping_skip_invalid_items():
    """Test that invalid mapping items are skipped."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        yaml.safe_dump(
            {
                "mappings": [
                    {"node": "node01", "instance": "inst01"},  # Valid
                    "invalid_item",  # Invalid (string instead of dict)
                    {"node": "node02"},  # Invalid (missing instance)
                    {"instance": "inst03"},  # Invalid (missing node)
                    {"node": 123, "instance": "inst04"},  # Invalid (node not string)
                    {"node": "node05", "instance": 456},  # Invalid (instance not string)
                ]
            },
            f,
        )
        mapping_path = f.name

    try:
        slurm_cfg = SlurmConfig(mapping_path=mapping_path)
        mapping = load_slurm_mapping(slurm_cfg)
        # Only valid mapping should be loaded
        assert mapping == {"node01": "inst01"}
    finally:
        Path(mapping_path).unlink(missing_ok=True)


@pytest.mark.asyncio
async def test_fetch_slurm_results_success():
    """Test fetching Slurm results successfully."""
    mock_response = {
        "status": "success",
        "data": {
            "result": [
                {
                    "metric": {
                        "node": "node01",
                        "status": "idle",
                        "partition": "all",
                    },
                    "value": [1234567890, "1"],
                }
            ]
        },
    }

    slurm_cfg = SlurmConfig()

    with patch("rackscope.telemetry.prometheus.client") as mock_client:
        mock_client.query = AsyncMock(return_value=mock_response)
        results = await fetch_slurm_results(slurm_cfg)

    assert len(results) == 1
    assert results[0]["metric"]["node"] == "node01"


@pytest.mark.asyncio
async def test_fetch_slurm_results_error():
    """Test fetching Slurm results with error response."""
    mock_response = {"status": "error", "error": "query failed"}

    slurm_cfg = SlurmConfig()

    with patch("rackscope.telemetry.prometheus.client") as mock_client:
        mock_client.query = AsyncMock(return_value=mock_response)
        results = await fetch_slurm_results(slurm_cfg)

    assert results == []


@pytest.mark.asyncio
async def test_fetch_slurm_results_no_data():
    """Test fetching Slurm results with no data."""
    mock_response = {"status": "success", "data": {}}

    slurm_cfg = SlurmConfig()

    with patch("rackscope.telemetry.prometheus.client") as mock_client:
        mock_client.query = AsyncMock(return_value=mock_response)
        results = await fetch_slurm_results(slurm_cfg)

    assert results == []


@pytest.mark.asyncio
async def test_build_slurm_states_simple():
    """Test building Slurm states."""
    mock_results = [
        {
            "metric": {"node": "node01", "status": "idle", "partition": "all"},
            "value": [1234567890, "1"],
        }
    ]

    slurm_cfg = SlurmConfig()

    with patch("rackscope.services.slurm_service.load_slurm_mapping", return_value={}):
        with patch(
            "rackscope.services.slurm_service.fetch_slurm_results",
            AsyncMock(return_value=mock_results),
        ):
            states = await build_slurm_states(slurm_cfg)

    assert "node01" in states
    assert states["node01"]["status"] == "idle"
    assert states["node01"]["severity"] == "OK"
    assert states["node01"]["status_all"] == "idle"
    assert states["node01"]["severity_all"] == "OK"


@pytest.mark.asyncio
async def test_build_slurm_states_with_mapping():
    """Test building states with node mapping."""
    mock_results = [
        {
            "metric": {"node": "slurm-node-01", "status": "idle", "partition": "all"},
            "value": [1234567890, "1"],
        }
    ]

    slurm_cfg = SlurmConfig()
    # load_slurm_mapping_raw now returns list of dicts
    mapping_entries = [{"node": "slurm-node-01", "instance": "node01"}]

    with patch(
        "rackscope.services.slurm_service.load_slurm_mapping_raw",
        return_value=mapping_entries,
    ):
        with patch(
            "rackscope.services.slurm_service.fetch_slurm_results",
            AsyncMock(return_value=mock_results),
        ):
            states = await build_slurm_states(slurm_cfg)

    # Should use mapped name
    assert "node01" in states
    assert "slurm-node-01" not in states


@pytest.mark.asyncio
async def test_build_slurm_states_with_allowed_nodes():
    """Test building states with allowed nodes filter."""
    mock_results = [
        {
            "metric": {"node": "node01", "status": "idle", "partition": "all"},
            "value": [1234567890, "1"],
        },
        {
            "metric": {"node": "node02", "status": "idle", "partition": "all"},
            "value": [1234567890, "1"],
        },
    ]

    slurm_cfg = SlurmConfig()
    allowed: Set[str] = {"node01"}

    with patch("rackscope.services.slurm_service.load_slurm_mapping", return_value={}):
        with patch(
            "rackscope.services.slurm_service.fetch_slurm_results",
            AsyncMock(return_value=mock_results),
        ):
            states = await build_slurm_states(slurm_cfg, allowed_nodes=allowed)

    # Only allowed node should be included
    assert "node01" in states
    assert "node02" not in states


@pytest.mark.asyncio
async def test_build_slurm_states_skip_zero_values():
    """Test that zero values are skipped."""
    mock_results = [
        {
            "metric": {"node": "node01", "status": "idle", "partition": "all"},
            "value": [1234567890, "0"],  # Zero value
        }
    ]

    slurm_cfg = SlurmConfig()

    with patch("rackscope.services.slurm_service.load_slurm_mapping", return_value={}):
        with patch(
            "rackscope.services.slurm_service.fetch_slurm_results",
            AsyncMock(return_value=mock_results),
        ):
            states = await build_slurm_states(slurm_cfg)

    # Zero value should be skipped
    assert states == {}


@pytest.mark.asyncio
async def test_build_slurm_states_highest_severity():
    """Test that highest severity is kept."""
    mock_results = [
        {
            "metric": {"node": "node01", "status": "idle", "partition": "compute"},
            "value": [1234567890, "1"],
        },
        {
            "metric": {"node": "node01", "status": "down", "partition": "all"},
            "value": [1234567890, "1"],
        },
    ]

    slurm_cfg = SlurmConfig()

    with patch("rackscope.services.slurm_service.load_slurm_mapping", return_value={}):
        with patch(
            "rackscope.services.slurm_service.fetch_slurm_results",
            AsyncMock(return_value=mock_results),
        ):
            states = await build_slurm_states(slurm_cfg)

    # Highest severity (CRIT from down) should be kept
    assert states["node01"]["status"] == "down"
    assert states["node01"]["severity"] == "CRIT"


@pytest.mark.asyncio
async def test_build_slurm_states_no_results():
    """Test building states with no results."""
    slurm_cfg = SlurmConfig()

    with patch("rackscope.services.slurm_service.load_slurm_mapping", return_value={}):
        with patch(
            "rackscope.services.slurm_service.fetch_slurm_results", AsyncMock(return_value=[])
        ):
            states = await build_slurm_states(slurm_cfg)

    assert states == {}
