"""
Instance Service

Business logic for device instance expansion and node pattern matching.
"""

from typing import List

from rackscope.model.domain import Device
from rackscope.telemetry.planner import _expand_nodes_pattern


def expand_device_instances(device: Device) -> List[str]:
    """Expand device instance patterns to node names.

    Handles multiple formats:
    - device.instance as string (pattern like "node[01-10]")
    - device.instance as dict (slot -> node mapping)
    - device.instance as list (list of nodes)
    - device.nodes as string/dict/list (fallback)

    Args:
        device: The device to expand

    Returns:
        List of node names
    """
    if isinstance(device.instance, str):
        return _expand_nodes_pattern(device.instance)
    if isinstance(device.instance, dict):
        expanded: List[str] = []
        for value in device.instance.values():
            if isinstance(value, str):
                expanded.extend(_expand_nodes_pattern(value))
        return expanded
    if isinstance(device.instance, list):
        expanded: List[str] = []
        for value in device.instance:
            if isinstance(value, str):
                expanded.extend(_expand_nodes_pattern(value))
        return expanded
    if isinstance(device.nodes, str):
        return _expand_nodes_pattern(device.nodes)
    if isinstance(device.nodes, dict):
        expanded: List[str] = []
        for value in device.nodes.values():
            if isinstance(value, str):
                expanded.extend(_expand_nodes_pattern(value))
        return expanded
    if isinstance(device.nodes, list):
        expanded: List[str] = []
        for value in device.nodes:
            if isinstance(value, str):
                expanded.extend(_expand_nodes_pattern(value))
        return expanded
    return []


def expand_nodes_pattern(pattern: str) -> List[str]:
    """Expand node pattern to list of node names.

    Wrapper around telemetry planner's expand function.

    Examples:
        "node[01-03]" -> ["node01", "node02", "node03"]
        "server-1" -> ["server-1"]

    Args:
        pattern: Node name pattern with optional range notation

    Returns:
        List of expanded node names
    """
    return _expand_nodes_pattern(pattern)
