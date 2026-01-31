"""
Telemetry Router

Endpoints for telemetry data, health states, and alerts.
"""

from typing import Dict, List

from fastapi import APIRouter

router = APIRouter(tags=["telemetry"])


def aggregate_states(states: List[str]) -> str:
    """Aggregate multiple state values into a single state."""
    if not states:
        return "UNKNOWN"
    if "CRIT" in states:
        return "CRIT"
    if "WARN" in states:
        return "WARN"
    if "UNKNOWN" in states:
        return "UNKNOWN"
    return "OK"


@router.get("/api/stats/global")
async def get_global_stats():
    """Get global system statistics."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module
    from rackscope.telemetry.prometheus import client as prom_client

    TOPOLOGY = app_module.TOPOLOGY
    CATALOG = app_module.CATALOG
    CHECKS_LIBRARY = app_module.CHECKS_LIBRARY
    PLANNER = app_module.PLANNER

    rack_healths: Dict[str, str] = {}
    if TOPOLOGY and CHECKS_LIBRARY and PLANNER:
        targets_by_check = app_module._collect_check_targets(TOPOLOGY, CATALOG, CHECKS_LIBRARY)
        snapshot = await PLANNER.get_snapshot(TOPOLOGY, CHECKS_LIBRARY, targets_by_check)
        rack_healths = snapshot.rack_states
    else:
        rack_healths = await prom_client.get_rack_health_summary()

    total_racks = 0
    crit_alerts = 0
    warn_alerts = 0

    if TOPOLOGY:
        for site in TOPOLOGY.sites:
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
        "total_rooms": len(TOPOLOGY.sites[0].rooms) if TOPOLOGY and TOPOLOGY.sites else 0,
        "total_racks": total_racks,
        "active_alerts": crit_alerts + warn_alerts,
        "crit_count": crit_alerts,
        "warn_count": warn_alerts,
        "status": global_status,
    }


@router.get("/api/stats/prometheus")
def get_prometheus_stats():
    """Get Prometheus client statistics."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module
    from rackscope.telemetry.prometheus import client as prom_client

    APP_CONFIG = app_module.APP_CONFIG
    stats = prom_client.get_latency_stats()
    heartbeat_seconds = 60
    if APP_CONFIG:
        heartbeat_seconds = max(10, APP_CONFIG.telemetry.prometheus_heartbeat_seconds)
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
async def get_room_state(room_id: str):
    """Get room health state and rack states."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    TOPOLOGY = app_module.TOPOLOGY
    CATALOG = app_module.CATALOG
    CHECKS_LIBRARY = app_module.CHECKS_LIBRARY
    PLANNER = app_module.PLANNER

    if not TOPOLOGY or not CHECKS_LIBRARY or not PLANNER:
        return {"room_id": room_id, "state": "UNKNOWN", "racks": {}}
    targets_by_check = app_module._collect_check_targets(TOPOLOGY, CATALOG, CHECKS_LIBRARY)
    snapshot = await PLANNER.get_snapshot(TOPOLOGY, CHECKS_LIBRARY, targets_by_check)
    rack_healths = snapshot.rack_states

    room_status = "OK"
    rack_ids = []
    if TOPOLOGY:
        for site in TOPOLOGY.sites:
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
async def get_rack_state(rack_id: str):
    """Get rack health state and device metrics."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module
    from rackscope.telemetry.prometheus import client as prom_client

    TOPOLOGY = app_module.TOPOLOGY
    CATALOG = app_module.CATALOG
    CHECKS_LIBRARY = app_module.CHECKS_LIBRARY
    PLANNER = app_module.PLANNER

    if not TOPOLOGY or not CHECKS_LIBRARY or not PLANNER:
        return {"rack_id": rack_id, "state": "UNKNOWN", "metrics": {}, "nodes": {}}
    targets_by_check = app_module._collect_check_targets(TOPOLOGY, CATALOG, CHECKS_LIBRARY)
    snapshot = await PLANNER.get_snapshot(TOPOLOGY, CHECKS_LIBRARY, targets_by_check)
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
