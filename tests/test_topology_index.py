"""
Tests for TopologyIndex — O(1) topology lookup index.

Verifies correctness (same results as O(n) traversal) and
that all six index dicts are populated correctly.
"""

import pytest

from rackscope.model.domain import (
    Topology,
    Site,
    Room,
    Aisle,
    Rack,
    Device,
    TopologyIndex,
    build_topology_index,
    _expand_instances,
)
from rackscope.services.topology_service import (
    find_rack_by_id,
    find_room_by_id,
    find_rack_location,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def simple_topology() -> Topology:
    """Single site, single room, two aisles, 3 racks total, plus 1 standalone."""
    device_a = Device(id="dev-a", name="Server A", template_id="t1", u_position=1, instance="node-a")
    device_b = Device(id="dev-b", name="Server B", template_id="t1", u_position=3, instance=["node-b1", "node-b2"])
    device_c = Device(id="dev-c", name="Chassis", template_id="t2", u_position=1, instance="compute[001-003]")
    device_sa = Device(id="dev-sa", name="Standalone", template_id="t1", u_position=1, instance="node-sa")

    rack1 = Rack(id="rack-01", name="Rack 01", u_height=42, devices=[device_a])
    rack2 = Rack(id="rack-02", name="Rack 02", u_height=42, devices=[device_b])
    rack3 = Rack(id="rack-03", name="Rack 03", u_height=42, devices=[device_c])
    rack_sa = Rack(id="rack-sa", name="Standalone Rack", u_height=42, devices=[device_sa])

    aisle1 = Aisle(id="aisle-01", name="Aisle 01", rack_ids=["rack-01", "rack-02"], racks=[rack1, rack2])
    aisle2 = Aisle(id="aisle-02", name="Aisle 02", rack_ids=["rack-03"], racks=[rack3])

    room = Room(
        id="room-01",
        name="Room 01",
        aisles=[aisle1, aisle2],
        standalone_racks=[rack_sa],
    )
    site = Site(id="site-01", name="Site 01", rooms=[room])
    return Topology(sites=[site])


@pytest.fixture
def topology_index(simple_topology: Topology) -> TopologyIndex:
    return build_topology_index(simple_topology)


# ── _expand_instances ─────────────────────────────────────────────────────────


def test_expand_pattern():
    d = Device(id="d", name="D", template_id="t", u_position=1, instance="compute[001-003]")
    assert _expand_instances(d) == ["compute001", "compute002", "compute003"]


def test_expand_list():
    d = Device(id="d", name="D", template_id="t", u_position=1, instance=["n1", "n2"])
    assert _expand_instances(d) == ["n1", "n2"]


def test_expand_dict():
    d = Device(id="d", name="D", template_id="t", u_position=1, instance={1: "n1", 2: "n2"})
    assert set(_expand_instances(d)) == {"n1", "n2"}


def test_expand_single_string():
    d = Device(id="d", name="D", template_id="t", u_position=1, instance="node01")
    assert _expand_instances(d) == ["node01"]


def test_expand_empty():
    d = Device(id="d", name="D", template_id="t", u_position=1, instance={})
    assert _expand_instances(d) == []


# ── Index construction ────────────────────────────────────────────────────────


def test_sites_indexed(topology_index: TopologyIndex):
    assert "site-01" in topology_index.sites
    assert topology_index.sites["site-01"].name == "Site 01"


def test_rooms_indexed(topology_index: TopologyIndex):
    assert "room-01" in topology_index.rooms
    assert topology_index.rooms["room-01"].name == "Room 01"


def test_aisles_indexed(topology_index: TopologyIndex):
    assert "aisle-01" in topology_index.aisles
    assert "aisle-02" in topology_index.aisles


def test_racks_indexed(topology_index: TopologyIndex):
    assert "rack-01" in topology_index.racks
    assert "rack-02" in topology_index.racks
    assert "rack-03" in topology_index.racks
    assert "rack-sa" in topology_index.racks


def test_standalone_rack_in_index(topology_index: TopologyIndex):
    ctx = topology_index.racks["rack-sa"]
    assert ctx.is_standalone is True
    assert ctx.aisle_id is None


def test_aisle_rack_in_index(topology_index: TopologyIndex):
    ctx = topology_index.racks["rack-01"]
    assert ctx.is_standalone is False
    assert ctx.aisle_id == "aisle-01"


def test_devices_indexed(topology_index: TopologyIndex):
    assert "dev-a" in topology_index.devices
    assert "dev-b" in topology_index.devices
    assert "dev-c" in topology_index.devices


def test_device_rack_context(topology_index: TopologyIndex):
    device, rack_id = topology_index.devices["dev-a"]
    assert device.id == "dev-a"
    assert rack_id == "rack-01"


def test_instances_indexed_single(topology_index: TopologyIndex):
    assert "node-a" in topology_index.instances
    ctx = topology_index.instances["node-a"]
    assert ctx.rack.id == "rack-01"
    assert ctx.room.id == "room-01"
    assert ctx.site.id == "site-01"


def test_instances_indexed_list(topology_index: TopologyIndex):
    assert "node-b1" in topology_index.instances
    assert "node-b2" in topology_index.instances


def test_instances_indexed_pattern(topology_index: TopologyIndex):
    for i in range(1, 4):
        key = f"compute{i:03d}"
        assert key in topology_index.instances, f"{key} missing from instances index"


def test_missing_rack_returns_none(topology_index: TopologyIndex):
    assert topology_index.racks.get("nonexistent") is None


# ── O(1) vs O(n) correctness ─────────────────────────────────────────────────


def test_find_rack_by_id_with_index(simple_topology, topology_index):
    rack = find_rack_by_id(simple_topology, "rack-02", index=topology_index)
    assert rack is not None
    assert rack.id == "rack-02"


def test_find_rack_by_id_without_index(simple_topology):
    rack = find_rack_by_id(simple_topology, "rack-02")
    assert rack is not None
    assert rack.id == "rack-02"


def test_find_rack_by_id_consistent(simple_topology, topology_index):
    """O(1) and O(n) must return identical results."""
    for rack_id in ["rack-01", "rack-02", "rack-03", "rack-sa"]:
        slow = find_rack_by_id(simple_topology, rack_id)
        fast = find_rack_by_id(simple_topology, rack_id, index=topology_index)
        assert slow is not None
        assert fast is not None
        assert slow.id == fast.id


def test_find_room_by_id_with_index(simple_topology, topology_index):
    room = find_room_by_id(simple_topology, "room-01", index=topology_index)
    assert room is not None
    assert room.id == "room-01"


def test_find_room_by_id_consistent(simple_topology, topology_index):
    slow = find_room_by_id(simple_topology, "room-01")
    fast = find_room_by_id(simple_topology, "room-01", index=topology_index)
    assert slow is not None and fast is not None
    assert slow.id == fast.id


def test_find_rack_location_aisle_rack(simple_topology, topology_index):
    slow = find_rack_location("rack-01", simple_topology)
    fast = find_rack_location("rack-01", simple_topology, index=topology_index)
    assert slow == fast == ("site-01", "room-01", "aisle-01", False)


def test_find_rack_location_standalone(simple_topology, topology_index):
    slow = find_rack_location("rack-sa", simple_topology)
    fast = find_rack_location("rack-sa", simple_topology, index=topology_index)
    assert slow == fast == ("site-01", "room-01", None, True)


def test_find_rack_missing_returns_none(simple_topology, topology_index):
    assert find_rack_by_id(simple_topology, "nope", index=topology_index) is None
    assert find_room_by_id(simple_topology, "nope", index=topology_index) is None
    assert find_rack_location("nope", simple_topology, index=topology_index) is None


# ── Empty topology ────────────────────────────────────────────────────────────


def test_empty_topology_index():
    idx = build_topology_index(Topology(sites=[]))
    assert idx.sites == {}
    assert idx.racks == {}
    assert idx.instances == {}


# ── Edge cases added from coverage audit ─────────────────────────────────────


def test_duplicate_instances_across_sites():
    """Duplicate instance name across two sites — last-write-wins, no crash."""
    d1 = Device(id="dev-1", name="D1", template_id="t", u_position=1, instance="shared-node")
    r1 = Rack(id="rack-1", name="R1", u_height=42, devices=[d1])
    a1 = Aisle(id="aisle-1", name="A1", rack_ids=["rack-1"], racks=[r1])
    room1 = Room(id="room-1", name="Room1", aisles=[a1])
    site1 = Site(id="site-1", name="Site1", rooms=[room1])

    d2 = Device(id="dev-2", name="D2", template_id="t", u_position=1, instance="shared-node")
    r2 = Rack(id="rack-2", name="R2", u_height=42, devices=[d2])
    a2 = Aisle(id="aisle-2", name="A2", rack_ids=["rack-2"], racks=[r2])
    room2 = Room(id="room-2", name="Room2", aisles=[a2])
    site2 = Site(id="site-2", name="Site2", rooms=[room2])

    topo = Topology(sites=[site1, site2])
    idx = build_topology_index(topo)

    # Only one entry for the shared instance name — no crash, no KeyError
    assert "shared-node" in idx.instances
    ctx = idx.instances["shared-node"]
    # Last site wins (site2 is iterated last) — deterministic
    assert ctx.site.id == "site-2"
    assert ctx.device.id == "dev-2"


def test_find_rack_stale_index_fallback_to_on(simple_topology):
    """When index is stale (key manually removed), falls through to O(n)."""
    idx = build_topology_index(simple_topology)

    # Simulate staleness: remove rack-sa from index
    del idx.racks["rack-sa"]
    assert "rack-sa" not in idx.racks

    # find_rack_by_id should still find it via O(n) fallback
    found = find_rack_by_id(simple_topology, "rack-sa", index=idx)
    assert found is not None
    assert found.id == "rack-sa"


def test_find_room_stale_index_fallback(simple_topology):
    """find_room_by_id falls through to O(n) when key missing from index."""
    idx = build_topology_index(simple_topology)
    del idx.rooms["room-01"]

    found = find_room_by_id(simple_topology, "room-01", index=idx)
    assert found is not None
    assert found.id == "room-01"


def test_find_rack_location_stale_index_fallback(simple_topology):
    """find_rack_location falls through to O(n) when key missing from index."""
    idx = build_topology_index(simple_topology)
    del idx.racks["rack-01"]

    result = find_rack_location("rack-01", simple_topology, index=idx)
    assert result is not None
    assert result == ("site-01", "room-01", "aisle-01", False)
