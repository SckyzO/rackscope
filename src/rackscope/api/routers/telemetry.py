"""
Telemetry Router

Endpoints for telemetry data, health states, and alerts.
"""

from typing import Dict, Optional, Annotated

from fastapi import APIRouter, Depends

from rackscope.model.domain import Topology
from rackscope.model.catalog import Catalog
from rackscope.model.checks import ChecksLibrary
from rackscope.model.config import AppConfig
from rackscope.telemetry.planner import TelemetryPlanner
from rackscope.services import topology_service
from rackscope.services.instance_service import expand_device_instances
from rackscope.api.dependencies import (
    get_topology_optional,
    get_catalog_optional,
    get_checks_library_optional,
    get_app_config_optional,
    get_planner_optional,
)
from rackscope.utils.aggregation import aggregate_states
from rackscope.services import telemetry_service

router = APIRouter(tags=["telemetry"])


@router.get("/api/stats/global")
async def get_global_stats(
    topology: Annotated[Optional[Topology], Depends(get_topology_optional)],
    catalog: Annotated[Optional[Catalog], Depends(get_catalog_optional)],
    checks_library: Annotated[Optional[ChecksLibrary], Depends(get_checks_library_optional)],
    planner: Annotated[Optional[TelemetryPlanner], Depends(get_planner_optional)],
):
    """Get global system statistics."""
    rack_healths: Dict[str, str] = {}
    if topology and catalog and checks_library and planner:
        targets_by_check = telemetry_service.collect_check_targets(
            topology, catalog, checks_library
        )
        snapshot = await planner.get_snapshot(topology, checks_library, targets_by_check)
        rack_healths = snapshot.rack_states
    else:
        # Without planner/checks, we can't evaluate health properly
        rack_healths = {}

    total_racks = 0
    crit_alerts = 0
    warn_alerts = 0

    if topology:
        for site in topology.sites:
            for room in site.rooms:
                for aisle in room.aisles:
                    total_racks += len(aisle.racks)
                total_racks += len(room.standalone_racks)

    for state in rack_healths.values():
        if state == "CRIT":
            crit_alerts += 1
        elif state == "WARN":
            warn_alerts += 1

    global_status = "OK"
    if crit_alerts > 0:
        global_status = "CRIT"
    elif warn_alerts > 0:
        global_status = "WARN"

    return {
        "total_rooms": len(topology.sites[0].rooms) if topology and topology.sites else 0,
        "total_racks": total_racks,
        "active_alerts": crit_alerts + warn_alerts,
        "crit_count": crit_alerts,
        "warn_count": warn_alerts,
        "status": global_status,
    }


@router.get("/api/stats/prometheus")
def get_prometheus_stats(
    app_config: Annotated[Optional[AppConfig], Depends(get_app_config_optional)],
):
    """Get Prometheus client statistics."""
    from rackscope.telemetry.prometheus import client as prom_client

    stats = prom_client.get_latency_stats()
    heartbeat_seconds = 60
    if app_config:
        heartbeat_seconds = max(10, app_config.telemetry.prometheus_heartbeat_seconds)
    stats["heartbeat_seconds"] = heartbeat_seconds
    last_ts = stats.get("last_ts")
    stats["next_ts"] = (last_ts + heartbeat_seconds * 1000) if last_ts else None
    return stats


@router.get("/api/stats/telemetry")
def get_telemetry_stats():
    """Get telemetry statistics."""
    from rackscope.telemetry.prometheus import client as prom_client

    return prom_client.get_telemetry_stats()


@router.get("/api/rooms/{room_id}/state")
async def get_room_state(
    room_id: str,
    topology: Annotated[Optional[Topology], Depends(get_topology_optional)],
    catalog: Annotated[Optional[Catalog], Depends(get_catalog_optional)],
    checks_library: Annotated[Optional[ChecksLibrary], Depends(get_checks_library_optional)],
    planner: Annotated[Optional[TelemetryPlanner], Depends(get_planner_optional)],
):
    """Get room health state and rack states."""
    # Lazy import to avoid circular dependency

    if not topology or not catalog or not checks_library or not planner:
        return {"room_id": room_id, "state": "UNKNOWN", "racks": {}}
    targets_by_check = telemetry_service.collect_check_targets(topology, catalog, checks_library)
    snapshot = await planner.get_snapshot(topology, checks_library, targets_by_check)
    rack_healths = snapshot.rack_states

    room_status = "OK"
    rack_ids = []
    if topology:
        for site in topology.sites:
            for room in site.rooms:
                if room.id == room_id:
                    for aisle in room.aisles:
                        rack_ids.extend([r.id for r in aisle.racks])
                    rack_ids.extend([r.id for r in room.standalone_racks])

    for rid in rack_ids:
        h = rack_healths.get(rid, "OK")
        if h == "CRIT":
            room_status = "CRIT"
            break
        if h == "WARN" and room_status != "CRIT":
            room_status = "WARN"

    # Build rack → node instances mapping for the room
    rack_to_nodes: Dict[str, list] = {}
    for site in topology.sites:
        for room in site.rooms:
            if room.id == room_id:
                all_racks = [r for aisle in room.aisles for r in aisle.racks]
                all_racks.extend(room.standalone_racks)
                for rack in all_racks:
                    nodes: list = []
                    for device in rack.devices:
                        instances = expand_device_instances(device)
                        nodes.extend(instances if instances else [device.id])
                    rack_to_nodes[rack.id] = nodes

    # Build enriched rack states with per-rack node counts
    racks_out = {}
    node_states = snapshot.node_states
    for rid in rack_ids:
        nodes = rack_to_nodes.get(rid, [])
        total = len(nodes)
        crit = sum(1 for n in nodes if node_states.get(n) == "CRIT")
        warn = sum(1 for n in nodes if node_states.get(n) == "WARN")
        racks_out[rid] = {
            "state": rack_healths.get(rid, "UNKNOWN"),
            "node_total": total,
            "node_crit": crit,
            "node_warn": warn,
        }

    return {"room_id": room_id, "state": room_status, "racks": racks_out}


@router.get("/api/racks/{rack_id}/state")
async def get_rack_state(
    rack_id: str,
    topology: Annotated[Optional[Topology], Depends(get_topology_optional)],
    catalog: Annotated[Optional[Catalog], Depends(get_catalog_optional)],
    checks_library: Annotated[Optional[ChecksLibrary], Depends(get_checks_library_optional)],
    planner: Annotated[Optional[TelemetryPlanner], Depends(get_planner_optional)],
    include_metrics: bool = False,
):
    """Get rack health state and device metrics.

    Args:
        rack_id: Rack identifier
        include_metrics: Include detailed metrics (CPU, RAM, etc.). Default: False for faster response.
    """
    # Lazy import to avoid circular dependency
    from rackscope.services import metrics_service
    from rackscope.telemetry.prometheus import client as prom_client
    from rackscope.api.app import METRICS_LIBRARY

    if not topology or not catalog or not checks_library or not planner:
        return {"rack_id": rack_id, "state": "UNKNOWN", "metrics": {}, "nodes": {}}

    # Find the rack in topology
    rack = topology_service.find_rack_by_id(topology, rack_id)

    targets_by_check = telemetry_service.collect_check_targets(topology, catalog, checks_library)
    snapshot = await planner.get_snapshot(topology, checks_library, targets_by_check)

    # Collect metrics only if requested (to avoid performance impact)
    nodes_metrics = {}
    component_metrics = {}
    if include_metrics and rack and catalog:
        # Collect device metrics (nodes)
        nodes_metrics = await metrics_service.collect_rack_devices_metrics(
            rack=rack, catalog=catalog, prom_client=prom_client
        )
        # Collect component metrics (PDU, switches, etc.)
        # Pass METRICS_LIBRARY so the service resolves library IDs (e.g. 'pdu_active_power')
        # to actual PromQL expressions (e.g. 'raritan_pdu_activepower_watt{rack_id="..."}').
        component_metrics = await metrics_service.collect_rack_component_metrics(
            rack=rack, catalog=catalog, prom_client=prom_client, library=METRICS_LIBRARY
        )

    # Calculate Node States and Aggregate Rack State
    processed_nodes = {}

    total_power = 0.0
    total_temp = 0.0
    temp_count = 0

    node_states = []

    # Get all nodes from this rack (from snapshot or metrics)
    all_node_ids = set(nodes_metrics.keys()) | set(snapshot.node_states.keys())

    # Filter to only nodes that belong to this rack
    rack_node_ids = set()
    if rack:
        for device in rack.devices:
            rack_node_ids.update(expand_device_instances(device))

    # Only process nodes that belong to this rack.
    # Virtual nodes use the format "instance:labelvalue" — match on the base instance part.
    if rack_node_ids:
        relevant_nodes = set()
        for node_id in all_node_ids:
            base = node_id.split(":")[0] if ":" in node_id else node_id
            if base in rack_node_ids:
                relevant_nodes.add(node_id)
    else:
        relevant_nodes = all_node_ids

    for node_id in relevant_nodes:
        m = nodes_metrics.get(node_id, {})

        # Support various metric naming conventions
        temp = (
            m.get("temperature")
            or m.get("node_temperature_celsius")
            or m.get("ipmi_temperature_celsius")
        )
        power = m.get("power") or m.get("node_power_watts") or m.get("ipmi_power_watts")

        if power is not None:
            total_power += power
        if temp is not None and temp > 0:
            total_temp += temp
            temp_count += 1

        state = snapshot.node_states.get(node_id, "UNKNOWN")
        checks = snapshot.node_checks.get(node_id, {})
        alerts = snapshot.node_alerts.get(node_id, {})

        node_states.append(state)
        processed_nodes[node_id] = {
            "state": state,
            "temperature": temp if temp is not None else 0,
            "power": power if power is not None else 0,
            "checks": [{"id": cid, "severity": sev} for cid, sev in checks.items()],
            "alerts": [{"id": cid, "severity": sev} for cid, sev in alerts.items()],
        }

    rack_state = snapshot.rack_states.get(rack_id, aggregate_states(node_states))
    rack_checks_dict = snapshot.rack_checks.get(rack_id, {})
    rack_alerts = snapshot.rack_alerts.get(rack_id, {})

    avg_temp = total_temp / temp_count if temp_count > 0 else 0

    return {
        "rack_id": rack_id,
        "state": rack_state,
        "checks": [{"id": cid, "severity": sev} for cid, sev in rack_checks_dict.items()],
        "alerts": [{"id": cid, "severity": sev} for cid, sev in rack_alerts.items()],
        "metrics": {"temperature": avg_temp, "power": total_power},
        "infra_metrics": {"components": component_metrics},
        "nodes": processed_nodes,
    }


@router.get("/api/devices/{rack_id}/{device_id}/metrics")
async def get_device_metrics(
    rack_id: str,
    device_id: str,
    topology: Annotated[Optional[Topology], Depends(get_topology_optional)],
    catalog: Annotated[Optional[Catalog], Depends(get_catalog_optional)],
):
    """Get detailed metrics for a specific device.

    This endpoint loads only the metrics for the specified device,
    making it much faster than loading all rack metrics.

    Args:
        rack_id: Rack identifier
        device_id: Device identifier within the rack

    Returns:
        Dictionary with device metrics per instance
    """
    # Lazy import to avoid circular dependency
    from rackscope.services import metrics_service
    from rackscope.telemetry.prometheus import client as prom_client

    if not topology or not catalog:
        return {"device_id": device_id, "rack_id": rack_id, "metrics": {}}

    # Find the rack and device in topology
    rack = topology_service.find_rack_by_id(topology, rack_id)
    if not rack:
        return {"device_id": device_id, "rack_id": rack_id, "metrics": {}}

    device = next((d for d in rack.devices if d.id == device_id), None)
    if not device:
        return {"device_id": device_id, "rack_id": rack_id, "metrics": {}}

    # Get device template
    template = catalog.get_device_template(device.template_id)
    if not template or not template.metrics:
        return {"device_id": device_id, "rack_id": rack_id, "metrics": {}}

    # Collect metrics for this device only
    device_metrics = await metrics_service.collect_device_metrics(
        device=device,
        rack_id=rack_id,
        template=template,
        prom_client=prom_client,
    )

    return {"device_id": device_id, "rack_id": rack_id, "metrics": device_metrics}
