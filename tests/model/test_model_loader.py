"""Tests for model loader — duplicate IDs, YAML errors, path resolution."""

import pytest
from pathlib import Path
import tempfile
import os

from rackscope.model.loader import (
    _check_duplicate_ids,
    _load_checks_file,
    _resolve_config_path,
    InvalidFormatError,
    load_segmented_topology,
)
from rackscope.model.checks import ChecksLibrary
from rackscope.model.domain import Aisle, Device, Rack, Room, Site, Topology


# ── _check_duplicate_ids ──────────────────────────────────────────────────────


def _make_topology_with_racks(rack_ids: list[str]) -> Topology:
    """Build a minimal topology with the given rack IDs (all in one room)."""
    racks = [Rack(id=rid, name=rid, devices=[]) for rid in rack_ids]
    aisle = Aisle(id="aisle1", name="A1", racks=racks)
    room = Room(id="room1", name="R1", aisles=[aisle], standalone_racks=[])
    site = Site(id="site1", name="S1", rooms=[room])
    return Topology(sites=[site])


def test_check_duplicate_rack_ids_logs_warning(caplog):
    """_check_duplicate_ids warns when the same rack ID appears twice."""
    import logging

    topo = _make_topology_with_racks(["rack01", "rack01", "rack02"])
    with caplog.at_level(logging.WARNING):
        _check_duplicate_ids(topo)
    assert any("rack01" in msg for msg in caplog.messages)


def test_check_duplicate_room_ids_logs_warning(caplog):
    """_check_duplicate_ids warns when the same room ID appears in two sites."""
    import logging

    room1 = Room(id="room-dup", name="R1", aisles=[], standalone_racks=[])
    room2 = Room(id="room-dup", name="R2", aisles=[], standalone_racks=[])
    site1 = Site(id="site1", name="S1", rooms=[room1])
    site2 = Site(id="site2", name="S2", rooms=[room2])
    topo = Topology(sites=[site1, site2])
    with caplog.at_level(logging.WARNING):
        _check_duplicate_ids(topo)
    assert any("room-dup" in msg for msg in caplog.messages)


def test_check_duplicate_device_ids_logs_warning(caplog):
    """_check_duplicate_ids warns when the same device ID appears twice."""
    import logging

    dev = Device(id="dev-dup", name="D", template_id="t", u_position=1)
    rack1 = Rack(id="r1", name="R1", devices=[dev])
    rack2 = Rack(
        id="r2", name="R2", devices=[Device(id="dev-dup", name="D2", template_id="t", u_position=1)]
    )
    aisle = Aisle(id="a1", name="A1", racks=[rack1, rack2])
    room = Room(id="room1", name="R", aisles=[aisle], standalone_racks=[])
    site = Site(id="site1", name="S1", rooms=[room])
    topo = Topology(sites=[site])
    with caplog.at_level(logging.WARNING):
        _check_duplicate_ids(topo)
    assert any("dev-dup" in msg for msg in caplog.messages)


def test_check_no_duplicates_no_warning(caplog):
    """_check_duplicate_ids emits no warning when all IDs are unique."""
    import logging

    topo = _make_topology_with_racks(["rack01", "rack02", "rack03"])
    with caplog.at_level(logging.WARNING):
        _check_duplicate_ids(topo)
    assert not caplog.messages


# ── load_segmented_topology — YAML error ──────────────────────────────────────


def test_load_segmented_topology_invalid_yaml():
    """load_segmented_topology raises InvalidFormatError on malformed YAML."""
    with tempfile.TemporaryDirectory() as tmpdir:
        sites_file = Path(tmpdir) / "sites.yaml"
        sites_file.write_text(": invalid: yaml: [\n")
        with pytest.raises(InvalidFormatError, match="Error parsing YAML"):
            load_segmented_topology(Path(tmpdir))


# ── _load_checks_file — YAML error ────────────────────────────────────────────


def test_load_checks_file_invalid_yaml_logs_warning(caplog):
    """_load_checks_file logs a warning and returns without raising on bad YAML."""
    import logging

    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        f.write(": invalid: [\n")
        tmp_path = Path(f.name)
    try:
        library = ChecksLibrary()
        with caplog.at_level(logging.WARNING):
            _load_checks_file(tmp_path, library)
        assert len(library.checks) == 0
        assert any("Failed to parse" in msg for msg in caplog.messages)
    finally:
        os.unlink(tmp_path)


# ── _resolve_config_path ──────────────────────────────────────────────────────


def test_resolve_config_path_absolute():
    """Absolute paths are returned as-is."""
    result = _resolve_config_path("/absolute/path/to/topology", Path("/some/config"))
    assert result == "/absolute/path/to/topology"


def test_resolve_config_path_existing_relative():
    """Relative paths that exist from CWD are returned as-is."""
    with tempfile.TemporaryDirectory() as tmpdir:
        rel = os.path.relpath(tmpdir)
        result = _resolve_config_path(rel, Path("/some/config"))
        assert result == rel


def test_resolve_config_path_resolved_via_config_dir():
    """Relative paths resolved against config_dir are returned as absolute string."""
    with tempfile.TemporaryDirectory() as tmpdir:
        subdir = Path(tmpdir) / "topology"
        subdir.mkdir()
        result = _resolve_config_path("topology", Path(tmpdir))
        assert result == str(subdir)


def test_resolve_config_path_fallback():
    """Unresolvable paths return the original string."""
    result = _resolve_config_path("nonexistent/path", Path("/nonexistent/config"))
    assert result == "nonexistent/path"
