"""
Telemetry Router

Endpoints for telemetry data, health states, and alerts.
"""

from typing import Dict, List, Optional, Annotated

from fastapi import APIRouter, Depends

from rackscope.model.domain import Topology
from rackscope.model.catalog import Catalog
from rackscope.model.checks import ChecksLibrary
from rackscope.model.config import AppConfig
from rackscope.telemetry.planner import TelemetryPlanner
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
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module
    from rackscope.telemetry.prometheus import client as prom_client

    rack_healths: Dict[str, str] = {}
    if topology and checks_library and planner:
        targets_by_check = telemetry_service.collect_check_targets(topology, catalog, checks_library)
        snapshot = await planner.get_snapshot(topology, checks_library, targets_by_check)
        rack_healths = snapshot.rack_states
    else:
        rack_healths = await prom_client.get_rack_health_summary()

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
    from rackscope.api import app as app_module

    if not topology or not checks_library or not planner:
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

    racks_out = {rid: {"state": rack_healths.get(rid, "UNKNOWN")} for rid in rack_ids}
    return {"room_id": room_id, "state": room_status, "racks": racks_out}


@router.get("/api/racks/{rack_id}/state")
async def get_rack_state(
    rack_id: str,
    topology: Annotated[Optional[Topology], Depends(get_topology_optional)],
    catalog: Annotated[Optional[Catalog], Depends(get_catalog_optional)],
    checks_library: Annotated[Optional[ChecksLibrary], Depends(get_checks_library_optional)],
    planner: Annotated[Optional[TelemetryPlanner], Depends(get_planner_optional)],
):
    """Get rack health state and device metrics."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module
    from rackscope.telemetry.prometheus import client as prom_client

    if not topology or not checks_library or not planner:
        return {"rack_id": rack_id, "state": "UNKNOWN", "metrics": {}, "nodes": {}}
    targets_by_check = telemetry_service.collect_check_targets(topology, catalog, checks_library)
    snapshot = await planner.get_snapshot(topology, checks_library, targets_by_check)
    nodes_metrics = await prom_client.get_node_metrics(rack_id)
    pdu_metrics = await prom_client.get_pdu_metrics(rack_id)

    # Calculate Node States and Aggregate Rack State
    processed_nodes = {}

    total_power = 0.0
    total_temp = 0.0
    temp_count = 0

    node_states = []

    for node_id, m in nodes_metrics.items():
        temp = m.get("temperature")
        power = m.get("power")

        if power is not None:
            total_power += power
        if temp is not None and temp > 0:
            total_temp += temp
            temp_count += 1

        state = snapshot.node_states.get(node_id, "UNKNOWN")
        alerts = snapshot.node_alerts.get(node_id, {})

        node_states.append(state)
        processed_nodes[node_id] = {
            "state": state,
            "temperature": temp if temp is not None else 0,
            "power": power if power is not None else 0,
            "alerts": [{"id": cid, "severity": sev} for cid, sev in alerts.items()],
        }

    rack_state = snapshot.rack_states.get(rack_id, aggregate_states(node_states))

    avg_temp = total_temp / temp_count if temp_count > 0 else 0

    return {
        "rack_id": rack_id,
        "state": rack_state,
        "metrics": {"temperature": avg_temp, "power": total_power},
        "infra_metrics": {"pdu": pdu_metrics},
        "nodes": processed_nodes,
    }
