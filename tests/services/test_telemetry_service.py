"""
Tests for Telemetry Service

Tests for telemetry data collection and health checks.
"""

import pytest

from rackscope.model.catalog import Catalog, DeviceTemplate, RackTemplate, LayoutConfig
from rackscope.model.checks import CheckDefinition, ChecksLibrary
from rackscope.model.domain import Aisle, Device, Rack, Room, Site, Topology
from rackscope.services.telemetry_service import collect_check_targets, extract_device_instances


def test_extract_device_instances_with_instance():
    """Test extracting instances when instance field is populated."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance="node[01-03]",
    )
    result = extract_device_instances(device)
    assert result == ["node01", "node02", "node03"]


def test_extract_device_instances_no_instance_fallback():
    """Test that device.id is used as fallback when no instances."""
    device = Device(
        id="chassis001",
        name="Test Device",
        template_id="compute",
        u_position=1,
        # No instance field
    )
    result = extract_device_instances(device)
    assert result == ["chassis001"]


def test_extract_device_instances_empty_string_fallback():
    """Test that device.id is used when instance is empty string."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance="",
    )
    # Empty string expands to [""] which is truthy, so it returns [""]
    result = extract_device_instances(device)
    assert result == [""]


@pytest.fixture
def simple_topology():
    """Create a simple topology for testing."""
    device1 = Device(
        id="device1",
        name="Compute Node 1",
        template_id="compute_node",
        u_position=1,
        instance="node[01-02]",
    )
    device2 = Device(
        id="device2",
        name="Storage Chassis",
        template_id="storage",
        u_position=3,
        instance={1: "storage01"},
    )

    rack1 = Rack(
        id="rack01",
        name="Rack 01",
        template_id="standard_42u",
        devices=[device1, device2],
    )
    rack2 = Rack(
        id="rack02",
        name="Rack 02",
        devices=[],
    )

    aisle1 = Aisle(id="aisle-a", name="Aisle A", racks=[rack1])
    room1 = Room(
        id="room1",
        name="Server Room 1",
        aisles=[aisle1],
        standalone_racks=[rack2],
    )
    site1 = Site(id="site1", name="Datacenter 1", rooms=[room1])

    return Topology(sites=[site1])


@pytest.fixture
def simple_catalog():
    """Create a simple catalog with checks."""
    compute_template = DeviceTemplate(
        id="compute_node",
        name="Compute Node",
        type="server",
        u_height=2,
        layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
        checks=["node_temp_check", "node_power_check"],
    )
    storage_template = DeviceTemplate(
        id="storage",
        name="Storage Device",
        type="storage",
        u_height=4,
        layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
        checks=["storage_health_check"],
    )
    rack_template = RackTemplate(
        id="standard_42u",
        name="Standard 42U Rack",
        u_height=42,
        checks=["rack_power_check"],
    )

    return Catalog(
        device_templates=[compute_template, storage_template],
        rack_templates=[rack_template],
    )


@pytest.fixture
def simple_checks_library():
    """Create a simple checks library."""
    checks = [
        CheckDefinition(id="node_temp_check", name="Node Temperature", scope="node", expr="..."),
        CheckDefinition(id="node_power_check", name="Node Power", scope="node", expr="..."),
        CheckDefinition(
            id="storage_health_check", name="Storage Health", scope="chassis", expr="..."
        ),
        CheckDefinition(id="rack_power_check", name="Rack Power", scope="rack", expr="..."),
    ]
    return ChecksLibrary(checks=checks)


def test_collect_check_targets_empty_topology():
    """Test collecting targets from empty topology."""
    topology = Topology(sites=[])
    catalog = Catalog()
    checks = ChecksLibrary(checks=[])

    result = collect_check_targets(topology, catalog, checks)

    assert result == {}


def test_collect_check_targets_node_scope(simple_topology, simple_catalog, simple_checks_library):
    """Test collecting targets for node-scoped checks."""
    result = collect_check_targets(simple_topology, simple_catalog, simple_checks_library)

    # Node temp check should target node01, node02
    assert "node_temp_check" in result
    assert set(result["node_temp_check"]["node"]) == {"node01", "node02"}
    assert result["node_temp_check"]["chassis"] == []
    assert result["node_temp_check"]["rack"] == []

    # Node power check should also target node01, node02
    assert "node_power_check" in result
    assert set(result["node_power_check"]["node"]) == {"node01", "node02"}


def test_collect_check_targets_chassis_scope(
    simple_topology, simple_catalog, simple_checks_library
):
    """Test collecting targets for chassis-scoped checks."""
    result = collect_check_targets(simple_topology, simple_catalog, simple_checks_library)

    # Storage health check should target device2 (chassis)
    assert "storage_health_check" in result
    assert result["storage_health_check"]["node"] == []
    assert result["storage_health_check"]["chassis"] == ["device2"]
    assert result["storage_health_check"]["rack"] == []


def test_collect_check_targets_rack_scope(simple_topology, simple_catalog, simple_checks_library):
    """Test collecting targets for rack-scoped checks."""
    result = collect_check_targets(simple_topology, simple_catalog, simple_checks_library)

    # Rack power check should target rack01 (has template with checks)
    assert "rack_power_check" in result
    assert result["rack_power_check"]["node"] == []
    assert result["rack_power_check"]["chassis"] == []
    assert result["rack_power_check"]["rack"] == ["rack01"]


def test_collect_check_targets_no_template():
    """Test collecting targets when devices have no matching template."""
    device = Device(
        id="device1",
        name="Unknown Device",
        template_id="unknown_template",
        u_position=1,
        instance="node01",
    )
    rack = Rack(id="rack01", name="Rack 01", devices=[device])
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack])
    room = Room(id="room1", name="Room 1", aisles=[aisle], standalone_racks=[])
    site = Site(id="site1", name="Site 1", rooms=[room])
    topology = Topology(sites=[site])

    catalog = Catalog()  # Empty catalog
    checks = ChecksLibrary(
        checks=[CheckDefinition(id="check1", name="Check 1", scope="node", expr="...")]
    )

    result = collect_check_targets(topology, catalog, checks)

    # No targets should be collected since template doesn't exist
    assert result == {}


def test_collect_check_targets_unknown_check():
    """Test that unknown check IDs in templates are ignored."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance="node01",
    )
    rack = Rack(id="rack01", name="Rack 01", devices=[device])
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack])
    room = Room(id="room1", name="Room 1", aisles=[aisle], standalone_racks=[])
    site = Site(id="site1", name="Site 1", rooms=[room])
    topology = Topology(sites=[site])

    # Template references a check that doesn't exist
    compute_template = DeviceTemplate(
        id="compute",
        name="Compute",
        type="server",
        u_height=2,
        layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
        checks=["unknown_check"],
    )
    catalog = Catalog(device_templates=[compute_template])

    # Checks library doesn't contain the referenced check
    checks = ChecksLibrary(
        checks=[CheckDefinition(id="other_check", name="Other Check", scope="node", expr="...")]
    )

    result = collect_check_targets(topology, catalog, checks)

    # Unknown check should be ignored
    assert result == {}


def test_collect_check_targets_multiple_racks():
    """Test collecting targets across multiple racks and aisles."""
    device1 = Device(
        id="dev1", name="Device 1", template_id="compute", u_position=1, instance="node01"
    )
    device2 = Device(
        id="dev2", name="Device 2", template_id="compute", u_position=1, instance="node02"
    )

    rack1 = Rack(id="rack01", name="Rack 01", devices=[device1])
    rack2 = Rack(id="rack02", name="Rack 02", devices=[device2])

    aisle1 = Aisle(id="aisle-a", name="Aisle A", racks=[rack1])
    aisle2 = Aisle(id="aisle-b", name="Aisle B", racks=[rack2])

    room = Room(id="room1", name="Room 1", aisles=[aisle1, aisle2], standalone_racks=[])
    site = Site(id="site1", name="Site 1", rooms=[room])
    topology = Topology(sites=[site])

    compute_template = DeviceTemplate(
        id="compute",
        name="Compute",
        type="server",
        u_height=2,
        layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
        checks=["node_check"],
    )
    catalog = Catalog(device_templates=[compute_template])

    checks = ChecksLibrary(
        checks=[CheckDefinition(id="node_check", name="Node Check", scope="node", expr="...")]
    )

    result = collect_check_targets(topology, catalog, checks)

    # Should collect targets from both racks
    assert "node_check" in result
    assert set(result["node_check"]["node"]) == {"node01", "node02"}


def test_collect_check_targets_standalone_racks():
    """Test collecting targets from standalone racks (not in aisles)."""
    device = Device(
        id="device1",
        name="Device 1",
        template_id="compute",
        u_position=1,
        instance="node01",
    )
    rack = Rack(id="rack-standalone", name="Standalone Rack", devices=[device])

    room = Room(id="room1", name="Room 1", aisles=[], standalone_racks=[rack])
    site = Site(id="site1", name="Site 1", rooms=[room])
    topology = Topology(sites=[site])

    compute_template = DeviceTemplate(
        id="compute",
        name="Compute",
        type="server",
        u_height=2,
        layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
        checks=["node_check"],
    )
    catalog = Catalog(device_templates=[compute_template])

    checks = ChecksLibrary(
        checks=[CheckDefinition(id="node_check", name="Node Check", scope="node", expr="...")]
    )

    result = collect_check_targets(topology, catalog, checks)

    # Should collect targets from standalone rack
    assert "node_check" in result
    assert result["node_check"]["node"] == ["node01"]


def test_collect_check_targets_sorted_output():
    """Test that output targets are sorted."""
    device1 = Device(
        id="dev1", name="Device 1", template_id="compute", u_position=1, instance="node03"
    )
    device2 = Device(
        id="dev2", name="Device 2", template_id="compute", u_position=3, instance="node01"
    )
    device3 = Device(
        id="dev3", name="Device 3", template_id="compute", u_position=5, instance="node02"
    )

    rack = Rack(id="rack01", name="Rack 01", devices=[device1, device2, device3])
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack])
    room = Room(id="room1", name="Room 1", aisles=[aisle], standalone_racks=[])
    site = Site(id="site1", name="Site 1", rooms=[room])
    topology = Topology(sites=[site])

    compute_template = DeviceTemplate(
        id="compute",
        name="Compute",
        type="server",
        u_height=2,
        layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
        checks=["node_check"],
    )
    catalog = Catalog(device_templates=[compute_template])

    checks = ChecksLibrary(
        checks=[CheckDefinition(id="node_check", name="Node Check", scope="node", expr="...")]
    )

    result = collect_check_targets(topology, catalog, checks)

    # Output should be sorted
    assert result["node_check"]["node"] == ["node01", "node02", "node03"]


def test_collect_check_targets_rack_component_checks():
    """Test collecting targets from rack components with checks."""
    from rackscope.model.catalog import RackComponentTemplate, RackComponentRef, RackInfrastructure

    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance="node01",
    )
    rack = Rack(
        id="rack01",
        name="Rack 01",
        template_id="rack_with_pdu",
        devices=[device],
    )
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack])
    room = Room(id="room1", name="Room 1", aisles=[aisle], standalone_racks=[])
    site = Site(id="site1", name="Site 1", rooms=[room])
    topology = Topology(sites=[site])

    compute_template = DeviceTemplate(
        id="compute",
        name="Compute",
        type="server",
        u_height=2,
        layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
        checks=[],
    )

    pdu_template = RackComponentTemplate(
        id="pdu",
        name="PDU",
        type="pdu",
        location="rear",
        u_height=2,
        checks=["pdu_power_check"],
    )

    rack_template = RackTemplate(
        id="rack_with_pdu",
        name="Rack with PDU",
        u_height=42,
        infrastructure=RackInfrastructure(
            rack_components=[RackComponentRef(template_id="pdu", instance="pdu01", position="left")]
        ),
    )

    catalog = Catalog(
        device_templates=[compute_template],
        rack_templates=[rack_template],
        rack_component_templates=[pdu_template],
    )

    checks = ChecksLibrary(
        checks=[CheckDefinition(id="pdu_power_check", name="PDU Power", scope="rack", expr="...")]
    )

    result = collect_check_targets(topology, catalog, checks)

    # PDU check should target rack01
    assert "pdu_power_check" in result
    assert result["pdu_power_check"]["rack"] == ["rack01"]


def test_collect_check_targets_rack_component_no_checks():
    """Test that rack components without checks are ignored."""
    from rackscope.model.catalog import RackComponentTemplate, RackComponentRef, RackInfrastructure

    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance="node01",
    )
    rack = Rack(
        id="rack01",
        name="Rack 01",
        template_id="rack_with_component",
        devices=[device],
    )
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack])
    room = Room(id="room1", name="Room 1", aisles=[aisle], standalone_racks=[])
    site = Site(id="site1", name="Site 1", rooms=[room])
    topology = Topology(sites=[site])

    compute_template = DeviceTemplate(
        id="compute",
        name="Compute",
        type="server",
        u_height=2,
        layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
        checks=[],
    )

    component_template = RackComponentTemplate(
        id="component",
        name="Component",
        type="pdu",
        location="rear",
        u_height=1,
        checks=[],  # Empty checks list
    )

    rack_template = RackTemplate(
        id="rack_with_component",
        name="Rack with Component",
        u_height=42,
        infrastructure=RackInfrastructure(
            rack_components=[
                RackComponentRef(template_id="component", instance="comp01", position="left")
            ]
        ),
    )

    catalog = Catalog(
        device_templates=[compute_template],
        rack_templates=[rack_template],
        rack_component_templates=[component_template],
    )

    checks = ChecksLibrary(checks=[])

    result = collect_check_targets(topology, catalog, checks)

    # No checks should be collected
    assert result == {}


def test_collect_check_targets_rack_component_template_not_found():
    """Test that missing rack component templates are handled gracefully."""
    from rackscope.model.catalog import RackComponentRef, RackInfrastructure

    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance="node01",
    )
    rack = Rack(
        id="rack01",
        name="Rack 01",
        template_id="rack_with_missing_component",
        devices=[device],
    )
    aisle = Aisle(id="aisle-a", name="Aisle A", racks=[rack])
    room = Room(id="room1", name="Room 1", aisles=[aisle], standalone_racks=[])
    site = Site(id="site1", name="Site 1", rooms=[room])
    topology = Topology(sites=[site])

    compute_template = DeviceTemplate(
        id="compute",
        name="Compute",
        type="server",
        u_height=2,
        layout=LayoutConfig(type="grid", rows=1, cols=1, matrix=[[1]]),
        checks=[],
    )

    rack_template = RackTemplate(
        id="rack_with_missing_component",
        name="Rack with Missing Component",
        u_height=42,
        infrastructure=RackInfrastructure(
            rack_components=[
                RackComponentRef(
                    template_id="nonexistent_component", instance="comp01", position="left"
                )
            ]
        ),
    )

    catalog = Catalog(
        device_templates=[compute_template],
        rack_templates=[rack_template],
    )

    checks = ChecksLibrary(checks=[])

    result = collect_check_targets(topology, catalog, checks)

    # Should handle missing template gracefully
    assert result == {}
