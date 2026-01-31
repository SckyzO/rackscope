"""
Slurm Router

Endpoints for Slurm-specific dashboards and data.
"""

from pathlib import Path
from typing import Optional, Dict, Any, List

import yaml
from fastapi import APIRouter, HTTPException

from rackscope.model.domain import Room, Rack, Device, Topology
from rackscope.model.config import SlurmConfig
from rackscope.telemetry.planner import _expand_nodes_pattern

router = APIRouter(tags=["slurm"])


# Helper functions


def _find_room(room_id: str) -> Optional[Room]:
    """Find room by ID in topology."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    TOPOLOGY = app_module.TOPOLOGY
    if not TOPOLOGY:
        return None
    for site in TOPOLOGY.sites:
        for room in site.rooms:
            if room.id == room_id:
                return room
    return None


def _normalize_slurm_status(raw_status: str) -> tuple[str, bool]:
    """Normalize Slurm status string and detect starred statuses."""
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


def _slurm_severity(status: str, has_star: bool) -> str:
    """Map Slurm status to severity level."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    APP_CONFIG = app_module.APP_CONFIG
    if not APP_CONFIG:
        return "UNKNOWN"
    if has_star:
        return "CRIT"
    status_map = APP_CONFIG.slurm.status_map
    if status in status_map.crit:
        return "CRIT"
    if status in status_map.warn:
        return "WARN"
    if status in status_map.ok:
        return "OK"
    return "UNKNOWN"


def _severity_rank(severity: str) -> int:
    """Get numeric rank for severity level."""
    return {"UNKNOWN": 0, "OK": 1, "WARN": 2, "CRIT": 3}.get(severity, 0)


def _expand_device_instances(device: Device) -> List[str]:
    """Expand device instance patterns to node names."""
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


def _collect_room_nodes(room: Room) -> set[str]:
    """Collect all node names in a room."""
    nodes: set[str] = set()
    racks: list[Rack] = []
    for aisle in room.aisles:
        racks.extend(aisle.racks)
    racks.extend(room.standalone_racks)
    for rack in racks:
        for device in rack.devices:
            nodes.update(_expand_device_instances(device))
    return nodes


def _build_node_context(topology: Topology) -> Dict[str, Dict[str, str]]:
    """Build context mapping for all nodes in topology."""
    context: Dict[str, Dict[str, str]] = {}
    for site in topology.sites:
        for room in site.rooms:
            for aisle in room.aisles:
                for rack in aisle.racks:
                    for device in rack.devices:
                        for node_id in _expand_device_instances(device):
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
                    for node_id in _expand_device_instances(device):
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


def _load_slurm_mapping(slurm_cfg: SlurmConfig) -> Dict[str, str]:
    """Load Slurm node name mapping."""
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


async def _fetch_slurm_results(slurm_cfg: SlurmConfig) -> list[dict[str, Any]]:
    """Fetch Slurm metrics from Prometheus."""
    from rackscope.telemetry.prometheus import client as prom_client

    query = (
        f"max by ({slurm_cfg.label_node},{slurm_cfg.label_status},{slurm_cfg.label_partition})"
        f" ({slurm_cfg.metric})"
    )
    result = await prom_client.query(query)
    if result.get("status") != "success":
        return []
    return result.get("data", {}).get("result", [])


async def _build_slurm_states(
    slurm_cfg: SlurmConfig,
    allowed_nodes: Optional[set[str]] = None,
) -> Dict[str, Dict[str, Any]]:
    """Build Slurm state map for all nodes."""
    mapping = _load_slurm_mapping(slurm_cfg)
    results = await _fetch_slurm_results(slurm_cfg)
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
        normalized_status, has_star = _normalize_slurm_status(str(raw_status))
        severity = _slurm_severity(normalized_status, has_star)

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
        if _severity_rank(severity) > _severity_rank(state["severity"]):
            state["severity"] = severity
            state["status"] = normalized_status

    for node_id, state in node_states.items():
        state["statuses"] = sorted(set(state.get("statuses", [])))
        state["partitions"] = sorted(set(state.get("partitions", [])))
    return node_states


# Slurm endpoints


@router.get("/api/slurm/rooms/{room_id}/nodes")
async def get_slurm_room_nodes(room_id: str):
    """Get Slurm node states for a specific room."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    APP_CONFIG = app_module.APP_CONFIG
    TOPOLOGY = app_module.TOPOLOGY

    if not APP_CONFIG or not TOPOLOGY:
        raise HTTPException(status_code=503, detail="Topology not loaded")

    room = _find_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    room_nodes: set[str] = set()
    racks = []
    for aisle in room.aisles:
        racks.extend(aisle.racks)
    racks.extend(room.standalone_racks)
    for rack in racks:
        for device in rack.devices:
            room_nodes.update(_expand_device_instances(device))

    node_states: Dict[str, Dict[str, Any]] = {
        node: {
            "status": "unknown",
            "severity": "UNKNOWN",
            "statuses": [],
            "partitions": [],
        }
        for node in room_nodes
    }

    slurm_cfg = APP_CONFIG.slurm
    mapping = _load_slurm_mapping(slurm_cfg)
    results = await _fetch_slurm_results(slurm_cfg)

    if not results:
        return {"room_id": room_id, "nodes": node_states}

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
        if not node or (room_nodes and node not in room_nodes):
            continue
        raw_status = metric.get(slurm_cfg.label_status, "unknown")
        partition = metric.get(slurm_cfg.label_partition)
        normalized_status, has_star = _normalize_slurm_status(str(raw_status))
        severity = _slurm_severity(normalized_status, has_star)

        state = node_states.setdefault(
            node,
            {
                "status": normalized_status,
                "severity": severity,
                "statuses": [],
                "partitions": [],
            },
        )
        state["statuses"].append(str(raw_status))
        if partition:
            state["partitions"].append(str(partition))
        if _severity_rank(severity) > _severity_rank(state["severity"]):
            state["severity"] = severity
            state["status"] = normalized_status

    for node_id, state in node_states.items():
        state["statuses"] = sorted(set(state.get("statuses", [])))
        state["partitions"] = sorted(set(state.get("partitions", [])))

    return {"room_id": room_id, "nodes": node_states}


@router.get("/api/slurm/summary")
async def get_slurm_summary(room_id: Optional[str] = None):
    """Get Slurm status summary."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    APP_CONFIG = app_module.APP_CONFIG
    TOPOLOGY = app_module.TOPOLOGY

    if not APP_CONFIG or not TOPOLOGY:
        raise HTTPException(status_code=503, detail="Topology not loaded")

    allowed_nodes: Optional[set[str]] = None
    if room_id:
        room = _find_room(room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        allowed_nodes = _collect_room_nodes(room)

    slurm_cfg = APP_CONFIG.slurm
    node_states = await _build_slurm_states(slurm_cfg, allowed_nodes)
    by_status: Dict[str, int] = {}
    by_severity: Dict[str, int] = {"OK": 0, "WARN": 0, "CRIT": 0, "UNKNOWN": 0}

    for state in node_states.values():
        status = state.get("status_all") or state.get("status")
        severity = state.get("severity_all") or state.get("severity", "UNKNOWN")
        by_status[status] = by_status.get(status, 0) + 1
        by_severity[severity] = by_severity.get(severity, 0) + 1

    return {
        "room_id": room_id,
        "total_nodes": len(node_states),
        "by_status": by_status,
        "by_severity": by_severity,
    }


@router.get("/api/slurm/partitions")
async def get_slurm_partitions(room_id: Optional[str] = None):
    """Get Slurm partition statistics."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    APP_CONFIG = app_module.APP_CONFIG
    TOPOLOGY = app_module.TOPOLOGY

    if not APP_CONFIG or not TOPOLOGY:
        raise HTTPException(status_code=503, detail="Topology not loaded")

    allowed_nodes: Optional[set[str]] = None
    if room_id:
        room = _find_room(room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        allowed_nodes = _collect_room_nodes(room)

    slurm_cfg = APP_CONFIG.slurm
    mapping = _load_slurm_mapping(slurm_cfg)
    results = await _fetch_slurm_results(slurm_cfg)
    if not results:
        return {"room_id": room_id, "partitions": {}}

    partitions: Dict[str, Dict[str, int]] = {}
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
        partition = metric.get(slurm_cfg.label_partition, "unknown")
        raw_status = metric.get(slurm_cfg.label_status, "unknown")
        normalized_status, _ = _normalize_slurm_status(str(raw_status))
        part = partitions.setdefault(str(partition), {})
        part[normalized_status] = part.get(normalized_status, 0) + 1

    return {"room_id": room_id, "partitions": partitions}


@router.get("/api/slurm/nodes")
async def get_slurm_nodes(room_id: Optional[str] = None):
    """Get detailed Slurm node list."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    APP_CONFIG = app_module.APP_CONFIG
    TOPOLOGY = app_module.TOPOLOGY

    if not APP_CONFIG or not TOPOLOGY:
        raise HTTPException(status_code=503, detail="Topology not loaded")

    allowed_nodes: Optional[set[str]] = None
    if room_id:
        room = _find_room(room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        allowed_nodes = _collect_room_nodes(room)

    slurm_cfg = APP_CONFIG.slurm
    node_states = await _build_slurm_states(slurm_cfg, allowed_nodes)
    context = _build_node_context(TOPOLOGY)

    payload = []
    for node_id, state in node_states.items():
        entry = {
            "node": node_id,
            "status": state.get("status_all") or state.get("status"),
            "severity": state.get("severity_all") or state.get("severity", "UNKNOWN"),
            "statuses": state.get("statuses", []),
            "partitions": state.get("partitions", []),
        }
        entry.update(context.get(node_id, {}))
        payload.append(entry)

    return {"room_id": room_id, "nodes": payload}
