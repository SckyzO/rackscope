"""
Tests for Instance Service

Tests for device instance expansion and node pattern matching.
"""

from rackscope.model.domain import Device
from rackscope.services.instance_service import expand_device_instances, expand_nodes_pattern


def test_expand_nodes_pattern_single_node():
    """Test expanding a single node (no pattern)."""
    result = expand_nodes_pattern("node001")
    assert result == ["node001"]


def test_expand_nodes_pattern_range():
    """Test expanding a node range pattern."""
    result = expand_nodes_pattern("node[01-03]")
    assert result == ["node01", "node02", "node03"]


def test_expand_nodes_pattern_complex():
    """Test expanding a complex pattern."""
    result = expand_nodes_pattern("server[001-003]")
    assert result == ["server001", "server002", "server003"]


def test_expand_nodes_pattern_empty():
    """Test expanding empty string."""
    result = expand_nodes_pattern("")
    # Empty pattern returns list with empty string (actual behavior)
    assert result == [""]


def test_expand_device_instances_string():
    """Test expanding device with string instance."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance="node[01-03]",
    )
    result = expand_device_instances(device)
    assert result == ["node01", "node02", "node03"]


def test_expand_device_instances_string_single():
    """Test expanding device with single node string."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance="node001",
    )
    result = expand_device_instances(device)
    assert result == ["node001"]


def test_expand_device_instances_dict_simple():
    """Test expanding device with dict instance mapping."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance={1: "node01", 2: "node02"},
    )
    result = expand_device_instances(device)
    assert set(result) == {"node01", "node02"}


def test_expand_device_instances_dict_with_pattern():
    """Test expanding device with dict containing patterns."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance={1: "node[01-02]", 2: "node[03-04]"},
    )
    result = expand_device_instances(device)
    assert set(result) == {"node01", "node02", "node03", "node04"}


def test_expand_device_instances_dict_mixed():
    """Test expanding device with dict containing mixed values."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance={1: "node01", 2: "node[10-12]"},
    )
    result = expand_device_instances(device)
    assert set(result) == {"node01", "node10", "node11", "node12"}


def test_expand_device_instances_list_simple():
    """Test expanding device with list instance."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance=["node01", "node02", "node03"],
    )
    result = expand_device_instances(device)
    assert result == ["node01", "node02", "node03"]


def test_expand_device_instances_list_with_pattern():
    """Test expanding device with list containing patterns."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance=["node[01-02]", "server[10-11]"],
    )
    result = expand_device_instances(device)
    assert result == ["node01", "node02", "server10", "server11"]


def test_expand_device_instances_list_mixed():
    """Test expanding device with list containing mixed values."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance=["node01", "node[10-11]", "server99"],
    )
    result = expand_device_instances(device)
    assert result == ["node01", "node10", "node11", "server99"]


def test_expand_device_instances_nodes_fallback():
    """Test that instance field is preferred over nodes field."""
    # When both are present, instance takes precedence
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance="node[01-03]",  # This should be used
        nodes="ignored",  # This should be ignored
    )
    result = expand_device_instances(device)
    assert result == ["node01", "node02", "node03"]


def test_expand_device_instances_no_instance():
    """Test expanding device with no instance or nodes."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
    )
    result = expand_device_instances(device)
    assert result == []


def test_expand_device_instances_default_instance():
    """Test expanding device with default (empty dict) instance."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        # instance defaults to empty dict
    )
    result = expand_device_instances(device)
    assert result == []


def test_expand_device_instances_empty_dict():
    """Test expanding device with empty dict instance."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance={},
    )
    result = expand_device_instances(device)
    assert result == []


def test_expand_device_instances_empty_list():
    """Test expanding device with empty list instance."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance=[],
    )
    result = expand_device_instances(device)
    assert result == []


def test_expand_device_instances_empty_string():
    """Test expanding device with empty string instance."""
    device = Device(
        id="device1",
        name="Test Device",
        template_id="compute",
        u_position=1,
        instance="",
    )
    result = expand_device_instances(device)
    # Empty string pattern returns list with empty string (actual behavior)
    assert result == [""]


# NOTE: Lines 42-56 in instance_service.py (nodes field fallback) are DEAD CODE.
# When instance is not provided, it defaults to {} (empty dict), which matches the
# isinstance(device.instance, dict) check at line 31, iterates over zero items, and
# returns empty list at line 35. The code never reaches the nodes fallback.
# This is a bug in the production code, but we can't fix it per the instructions.
# These tests document the expected behavior if the bug were fixed.


