"""
Slurm Service

Business logic for Slurm data processing.
"""

from pathlib import Path
from typing import Dict, List, Optional, Any, Set, Protocol, runtime_checkable, cast
import logging
import re

import yaml

from rackscope.model.domain import Room, Rack, Device, Topology
from rackscope.utils.aggregation import severity_rank as _severity_rank
from rackscope.services.instance_service import expand_device_instances as _expand_device_instances


@runtime_checkable
class SlurmConfigLike(Protocol):
    """Protocol satisfied by both SlurmConfig and SlurmPluginConfig."""

    metric: str
    label_node: str
    label_status: str
    label_partition: str
    mapping_path: Optional[str]
    status_map: Any


logger = logging.getLogger(__name__)


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


def calculate_slurm_severity(status: str, has_star: bool, status_map: Any) -> str:
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

    Wrapper around instance_service.expand_device_instances for backward compatibility.

    Args:
        device: The device to expand

    Returns:
        List of node names
    """
    return _expand_device_instances(device)


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


def load_slurm_mapping_raw(mapping_path: Optional[str]) -> List[Dict[str, str]]:
    """Load raw mapping entries from YAML file.

    Returns:
        List of raw mapping dicts with 'node' and 'instance' keys.
    """
    if not mapping_path:
        return []
    try:
        raw = yaml.safe_load(Path(mapping_path).read_text()) or {}
    except (OSError, yaml.YAMLError) as exc:
        logger.warning(f"Failed to load Slurm mapping from {mapping_path}: {exc}")
        return []
    mappings = raw.get("mappings") if isinstance(raw, dict) else []
    if not isinstance(mappings, list):
        return []
    return [
        m
        for m in mappings
        if isinstance(m, dict)
        and isinstance(m.get("node"), str)
        and isinstance(m.get("instance"), str)
    ]


def save_slurm_mapping(mapping_path: str, entries: List[Dict[str, str]]) -> None:
    """Save mapping entries to YAML file."""
    Path(mapping_path).write_text(
        yaml.dump({"mappings": entries}, default_flow_style=False, allow_unicode=True)
    )


def resolve_slurm_node(node: str, entries: List[Dict[str, str]]) -> str:
    """Resolve a Slurm node name using mapping entries.

    Supports two modes:
    - Exact:   node="n001"  instance="compute001"
    - Pattern: node="n*"    instance="compute*"
               The '*' is a wildcard — matched suffix is substituted in instance.

    Returns:
        Resolved instance name, or original node name if no mapping found.
    """
    for entry in entries:
        node_pat = entry.get("node", "")
        inst_tpl = entry.get("instance", "")
        if not node_pat or not inst_tpl:
            continue
        if "*" in node_pat:
            # Convert glob pattern to regex (only * supported)
            regex = "^" + re.escape(node_pat).replace(r"\*", "(.+)") + "$"
            m = re.match(regex, node)
            if m:
                matched = m.group(1)
                return inst_tpl.replace("*", matched, 1) if "*" in inst_tpl else inst_tpl
        elif node_pat == node:
            return inst_tpl
    return node


def load_slurm_mapping(slurm_cfg: SlurmConfigLike) -> Dict[str, str]:
    """Build exact mapping dict (for backward-compat lookup).

    Pattern entries are kept verbatim in the dict so resolve_slurm_node
    can handle them. Direct lookup still works for exact entries.
    """
    entries = load_slurm_mapping_raw(slurm_cfg.mapping_path)
    return {e["node"]: e["instance"] for e in entries if "node" in e and "instance" in e}


async def fetch_slurm_results(slurm_cfg: SlurmConfigLike) -> List[Dict[str, Any]]:
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
    result = await prom_client.query(query, cache_type="health")
    if result.get("status") != "success":
        return []
    return cast(List[Dict[str, Any]], result.get("data", {}).get("result", []))


async def build_slurm_states(
    slurm_cfg: SlurmConfigLike,
    allowed_nodes: Optional[Set[str]] = None,
) -> Dict[str, Dict[str, Any]]:
    """Build Slurm state map for all nodes.

    Args:
        slurm_cfg: The Slurm configuration
        allowed_nodes: Optional set of allowed node names

    Returns:
        Dictionary mapping node names to their Slurm state
    """
    mapping_entries = load_slurm_mapping_raw(slurm_cfg.mapping_path)
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
        # Resolve via mapping (supports wildcards: n* → compute*)
        node = resolve_slurm_node(str(node), mapping_entries) if node else node
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
