"""
Slurm Service

Business logic for Slurm data processing.
"""

from pathlib import Path
from typing import Dict, List, Optional, Any, Set

import yaml

from rackscope.model.config import SlurmConfig
from rackscope.model.domain import Room, Rack, Device, Topology
from rackscope.telemetry.planner import _expand_nodes_pattern
from rackscope.utils.aggregation import severity_rank as _severity_rank


def normalize_slurm_status(raw_status: str) -> tuple[str, bool]:
    """Normalize Slurm status string and detect starred statuses.

    Args:
        raw_status: The raw Slurm status string

    Returns:
        Tuple of (normalized_status, has_star)
    """
    status = (raw_status or "").strip().lower()
    has_star = status.endswith("*")
    if has_star:
        status = status[:-1]
    aliases = {
        "alloc": "allocated",
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
    return aliases.get(status, status), has_star


def calculate_slurm_severity(
    status: str, has_star: bool, status_map: Any
) -> str:
    """Map Slurm status to severity level.

    Args:
        status: The normalized Slurm status
        has_star: Whether the status had a star
        status_map: The status mapping configuration

    Returns:
        Severity level (CRIT, WARN, OK, UNKNOWN)
    """
    if has_star:
        return "CRIT"
    if status in status_map.crit:
        return "CRIT"
    if status in status_map.warn:
        return "WARN"
    if status in status_map.ok:
        return "OK"
    return "UNKNOWN"


def severity_rank(severity: str) -> int:
    """Get numeric rank for severity level.

    Wrapper around aggregation.severity_rank for backward compatibility.

    Args:
        severity: The severity level

    Returns:
        Numeric rank (0-3)
    """
    return _severity_rank(severity)


def expand_device_instances(device: Device) -> List[str]:
    """Expand device instance patterns to node names.

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


def collect_room_nodes(room: Room) -> Set[str]:
    """Collect all node names in a room.

    Args:
        room: The room to collect nodes from

    Returns:
        Set of node names
    """
    nodes: Set[str] = set()
    racks: List[Rack] = []
    for aisle in room.aisles:
        racks.extend(aisle.racks)
    racks.extend(room.standalone_racks)
    for rack in racks:
        for device in rack.devices:
            nodes.update(expand_device_instances(device))
    return nodes


def build_node_context(topology: Topology) -> Dict[str, Dict[str, str]]:
    """Build context mapping for all nodes in topology.

    Args:
        topology: The topology to process

    Returns:
        Dictionary mapping node IDs to their context
    """
    context: Dict[str, Dict[str, str]] = {}
    for site in topology.sites:
        for room in site.rooms:
            for aisle in room.aisles:
                for rack in aisle.racks:
                    for device in rack.devices:
                        for node_id in expand_device_instances(device):
                            context[node_id] = {
                                "site_id": site.id,
                                "site_name": site.name,
                                "room_id": room.id,
                                "room_name": room.name,
                                "rack_id": rack.id,
                                "rack_name": rack.name,
                                "device_id": device.id,
                                "device_name": device.name,
                            }
            for rack in room.standalone_racks:
                for device in rack.devices:
                    for node_id in expand_device_instances(device):
                        context[node_id] = {
                            "site_id": site.id,
                            "site_name": site.name,
                            "room_id": room.id,
                            "room_name": room.name,
                            "rack_id": rack.id,
                            "rack_name": rack.name,
                            "device_id": device.id,
                            "device_name": device.name,
                        }
    return context


def load_slurm_mapping(slurm_cfg: SlurmConfig) -> Dict[str, str]:
    """Load Slurm node name mapping.

    Args:
        slurm_cfg: The Slurm configuration

    Returns:
        Dictionary mapping Slurm node names to instance names
    """
    mapping: Dict[str, str] = {}
    mapping_path = slurm_cfg.mapping_path
    if not mapping_path:
        return mapping
    try:
        raw_mapping = yaml.safe_load(Path(mapping_path).read_text()) or {}
    except (OSError, yaml.YAMLError) as exc:
        print(f"Failed to load Slurm mapping: {exc}")
        return mapping
    mappings = raw_mapping.get("mappings") if isinstance(raw_mapping, dict) else []
    if not isinstance(mappings, list):
        return mapping
    for item in mappings:
        if not isinstance(item, dict):
            continue
        node = item.get("node")
        instance = item.get("instance")
        if isinstance(node, str) and isinstance(instance, str):
            mapping[node] = instance
    return mapping


async def fetch_slurm_results(slurm_cfg: SlurmConfig) -> List[Dict[str, Any]]:
    """Fetch Slurm metrics from Prometheus.

    Args:
        slurm_cfg: The Slurm configuration

    Returns:
        List of Slurm metric results
    """
    from rackscope.telemetry.prometheus import client as prom_client

    query = (
        f"max by ({slurm_cfg.label_node},{slurm_cfg.label_status},{slurm_cfg.label_partition})"
        f" ({slurm_cfg.metric})"
    )
    result = await prom_client.query(query)
    if result.get("status") != "success":
        return []
    return result.get("data", {}).get("result", [])


async def build_slurm_states(
    slurm_cfg: SlurmConfig,
    allowed_nodes: Optional[Set[str]] = None,
) -> Dict[str, Dict[str, Any]]:
    """Build Slurm state map for all nodes.

    Args:
        slurm_cfg: The Slurm configuration
        allowed_nodes: Optional set of allowed node names

    Returns:
        Dictionary mapping node names to their Slurm state
    """
    mapping = load_slurm_mapping(slurm_cfg)
    results = await fetch_slurm_results(slurm_cfg)
    if not results:
        return {}

    node_states: Dict[str, Dict[str, Any]] = {}
    for item in results:
        metric = item.get("metric", {})
        value = item.get("value", [None, "0"])[1]
        try:
            if float(value) <= 0:
                continue
        except (TypeError, ValueError):
            continue
        node = metric.get(slurm_cfg.label_node)
        if node in mapping:
            node = mapping[node]
        if not node:
            continue
        if allowed_nodes is not None and node not in allowed_nodes:
            continue
        raw_status = metric.get(slurm_cfg.label_status, "unknown")
        partition = metric.get(slurm_cfg.label_partition)
        normalized_status, has_star = normalize_slurm_status(str(raw_status))
        severity = calculate_slurm_severity(normalized_status, has_star, slurm_cfg.status_map)

        state = node_states.setdefault(
            node,
            {
                "status": normalized_status,
                "severity": severity,
                "status_all": None,
                "severity_all": None,
                "statuses": [],
                "partitions": [],
            },
        )
        state["statuses"].append(str(raw_status))
        if partition:
            state["partitions"].append(str(partition))
            if str(partition) == "all":
                state["status_all"] = normalized_status
                state["severity_all"] = severity
        if severity_rank(severity) > severity_rank(state["severity"]):
            state["severity"] = severity
            state["status"] = normalized_status

    for node_id, state in node_states.items():
        state["statuses"] = sorted(set(state.get("statuses", [])))
        state["partitions"] = sorted(set(state.get("partitions", [])))
    return node_states
