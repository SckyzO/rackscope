"""
Slurm Router

Endpoints for Slurm-specific dashboards and data.
"""

from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException

from rackscope.services import slurm_service, topology_service

router = APIRouter(tags=["slurm"])


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

    room = topology_service.find_room_by_id(TOPOLOGY, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    room_nodes: set[str] = set()
    racks = []
    for aisle in room.aisles:
        racks.extend(aisle.racks)
    racks.extend(room.standalone_racks)
    for rack in racks:
        for device in rack.devices:
            room_nodes.update(slurm_service.expand_device_instances(device))

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
    mapping = slurm_service.load_slurm_mapping(slurm_cfg)
    results = await slurm_service.fetch_slurm_results(slurm_cfg)

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
        normalized_status, has_star = slurm_service.normalize_slurm_status(str(raw_status))
        severity = slurm_service.calculate_slurm_severity(
            normalized_status, has_star, slurm_cfg.status_map
        )

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
        if slurm_service.severity_rank(severity) > slurm_service.severity_rank(state["severity"]):
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
        room = topology_service.find_room_by_id(TOPOLOGY, room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        allowed_nodes = slurm_service.collect_room_nodes(room)

    slurm_cfg = APP_CONFIG.slurm
    node_states = await slurm_service.build_slurm_states(slurm_cfg, allowed_nodes)
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
        room = topology_service.find_room_by_id(TOPOLOGY, room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        allowed_nodes = slurm_service.collect_room_nodes(room)

    slurm_cfg = APP_CONFIG.slurm
    mapping = slurm_service.load_slurm_mapping(slurm_cfg)
    results = await slurm_service.fetch_slurm_results(slurm_cfg)
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
        normalized_status, _ = slurm_service.normalize_slurm_status(str(raw_status))
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
        room = topology_service.find_room_by_id(TOPOLOGY, room_id)
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        allowed_nodes = slurm_service.collect_room_nodes(room)

    slurm_cfg = APP_CONFIG.slurm
    node_states = await slurm_service.build_slurm_states(slurm_cfg, allowed_nodes)
    context = slurm_service.build_node_context(TOPOLOGY)

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
