from __future__ import annotations

import os
import asyncio
from contextlib import asynccontextmanager, suppress
from typing import List, Optional, Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException
import yaml
import httpx

from rackscope.model.domain import Room, Topology, Rack, Device
from rackscope.model.catalog import Catalog
from rackscope.model.checks import ChecksLibrary
from rackscope.model.config import AppConfig, SlurmConfig
from rackscope.model.loader import (
    load_topology,
    load_catalog,
    load_checks_library,
    load_app_config,
)
from rackscope.telemetry.prometheus import client as prom_client
from rackscope.telemetry.planner import _expand_nodes_pattern
from rackscope.telemetry.planner import TelemetryPlanner, PlannerConfig
from rackscope.api.routers import (
    config,
    simulator,
    catalog,
    checks,
    topology,
    telemetry,
    slurm,
)

# Global state
TOPOLOGY: Optional[Topology] = None
CATALOG: Optional[Catalog] = None
CHECKS_LIBRARY: Optional[ChecksLibrary] = None
APP_CONFIG: Optional[AppConfig] = None
PLANNER: Optional[TelemetryPlanner] = None
PROMETHEUS_HEARTBEAT: Optional[asyncio.Task] = None


def _extract_device_instances(device: Device) -> List[str]:
    if isinstance(device.instance, dict):
        return [node for node in device.instance.values() if isinstance(node, str)]
    if isinstance(device.instance, list):
        return [node for node in device.instance if isinstance(node, str)]
    if isinstance(device.instance, str):
        return _expand_nodes_pattern(device.instance)
    if isinstance(device.nodes, dict):
        return [node for node in device.nodes.values() if isinstance(node, str)]
    if isinstance(device.nodes, list):
        return [node for node in device.nodes if isinstance(node, str)]
    if isinstance(device.nodes, str):
        return _expand_nodes_pattern(device.nodes)
    return [device.id]


def _find_room(room_id: str) -> Optional[Room]:
    if not TOPOLOGY:
        return None
    for site in TOPOLOGY.sites:
        for room in site.rooms:
            if room.id == room_id:
                return room
    return None


def _normalize_slurm_status(raw_status: str) -> tuple[str, bool]:
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
    return {"UNKNOWN": 0, "OK": 1, "WARN": 2, "CRIT": 3}.get(severity, 0)


def _collect_check_targets(
    topology: Topology,
    catalog: Catalog,
    checks: ChecksLibrary,
) -> Dict[str, Dict[str, List[str]]]:
    check_by_id = {c.id: c for c in checks.checks}
    targets: Dict[str, Dict[str, set[str]]] = {}

    def add_targets(check_id: str, nodes: List[str], chassis: List[str], racks: List[str]) -> None:
        check = check_by_id.get(check_id)
        if not check:
            return
        bucket = targets.setdefault(check_id, {"node": set(), "chassis": set(), "rack": set()})
        if check.scope == "node":
            bucket["node"].update(nodes)
        elif check.scope == "chassis":
            bucket["chassis"].update(chassis)
        elif check.scope == "rack":
            bucket["rack"].update(racks)

    for site in topology.sites:
        for room in site.rooms:
            racks = []
            for aisle in room.aisles:
                racks.extend(aisle.racks)
            racks.extend(room.standalone_racks)
            for rack in racks:
                rack_nodes: List[str] = []
                rack_chassis: List[str] = []
                for device in rack.devices:
                    nodes = _extract_device_instances(device)
                    rack_nodes.extend(nodes)
                    rack_chassis.append(device.id)
                    device_template = catalog.get_device_template(device.template_id)
                    if device_template and device_template.checks:
                        for check_id in device_template.checks:
                            add_targets(check_id, nodes, [device.id], [rack.id])
                rack_template = (
                    catalog.get_rack_template(rack.template_id) if rack.template_id else None
                )
                if rack_template and rack_template.checks:
                    for check_id in rack_template.checks:
                        add_targets(check_id, rack_nodes, rack_chassis, [rack.id])
                if rack_template and rack_template.infrastructure.rack_components:
                    for component_ref in rack_template.infrastructure.rack_components:
                        component_template = catalog.get_rack_component_template(
                            component_ref.template_id
                        )
                        if not component_template or not component_template.checks:
                            continue
                        for check_id in component_template.checks:
                            add_targets(check_id, rack_nodes, rack_chassis, [rack.id])

    return {
        check_id: {
            "node": sorted(list(values.get("node", set()))),
            "chassis": sorted(list(values.get("chassis", set()))),
            "rack": sorted(list(values.get("rack", set()))),
        }
        for check_id, values in targets.items()
    }


def apply_config(app_config: AppConfig) -> None:
    global TOPOLOGY, CATALOG, CHECKS_LIBRARY, APP_CONFIG, PLANNER
    APP_CONFIG = app_config
    TOPOLOGY = load_topology(app_config.paths.topology)
    CATALOG = load_catalog(app_config.paths.templates)
    CHECKS_LIBRARY = load_checks_library(app_config.paths.checks)
    base_url = APP_CONFIG.telemetry.prometheus_url or prom_client.base_url
    auth = None
    if APP_CONFIG.telemetry.basic_auth_user:
        auth = httpx.BasicAuth(
            APP_CONFIG.telemetry.basic_auth_user,
            APP_CONFIG.telemetry.basic_auth_password or "",
        )
    verify: bool | str = True
    if not APP_CONFIG.telemetry.tls_verify:
        verify = False
    elif APP_CONFIG.telemetry.tls_ca_file:
        verify = APP_CONFIG.telemetry.tls_ca_file
    cert = None
    if APP_CONFIG.telemetry.tls_cert_file and APP_CONFIG.telemetry.tls_key_file:
        cert = (APP_CONFIG.telemetry.tls_cert_file, APP_CONFIG.telemetry.tls_key_file)
    prom_client.configure(
        base_url=base_url,
        cache_ttl=APP_CONFIG.cache.ttl_seconds,
        auth=auth,
        verify=verify,
        cert=cert,
        latency_window=APP_CONFIG.telemetry.prometheus_latency_window,
        debug_stats=APP_CONFIG.telemetry.debug_stats,
    )
    PLANNER = TelemetryPlanner(
        PlannerConfig(
            identity_label=APP_CONFIG.telemetry.identity_label,
            rack_label=APP_CONFIG.telemetry.rack_label,
            chassis_label=APP_CONFIG.telemetry.chassis_label,
            job_regex=APP_CONFIG.telemetry.job_regex,
            unknown_state=APP_CONFIG.planner.unknown_state,
            cache_ttl_seconds=APP_CONFIG.planner.cache_ttl_seconds,
            max_ids_per_query=APP_CONFIG.planner.max_ids_per_query,
        )
    )


def aggregate_states(states: List[str]) -> str:
    if not states:
        return "UNKNOWN"
    if "CRIT" in states:
        return "CRIT"
    if "WARN" in states:
        return "WARN"
    if "UNKNOWN" in states:
        return "UNKNOWN"
    return "OK"


@asynccontextmanager
async def lifespan(app: FastAPI):
    global TOPOLOGY, CATALOG, CHECKS_LIBRARY, APP_CONFIG
    global PLANNER, PROMETHEUS_HEARTBEAT
    app_config_path = os.getenv("RACKSCOPE_APP_CONFIG", "config/app.yaml")

    try:
        if os.path.exists(app_config_path):
            APP_CONFIG = load_app_config(app_config_path)
            apply_config(APP_CONFIG)
        else:
            config_dir = os.getenv("RACKSCOPE_CONFIG_DIR", "config")
            config_path = os.getenv(
                "RACKSCOPE_CONFIG", os.path.join(config_dir, "topology", "topology.yaml")
            )
            templates_dir = os.getenv("RACKSCOPE_TEMPLATES", os.path.join(config_dir, "templates"))
            checks_path = os.getenv(
                "RACKSCOPE_CHECKS", os.path.join(config_dir, "checks", "library")
            )
            TOPOLOGY = load_topology(config_path)
            CATALOG = load_catalog(templates_dir)
            CHECKS_LIBRARY = load_checks_library(checks_path)
            APP_CONFIG = None
            PLANNER = TelemetryPlanner()
        print(f"Loaded topology with {len(TOPOLOGY.sites)} sites")
        print(
            f"Loaded catalog with {len(CATALOG.device_templates)} devices and {len(CATALOG.rack_templates)} racks"
        )
        print(f"Loaded checks library with {len(CHECKS_LIBRARY.checks)} checks")
    except Exception as e:
        print(f"Failed to load configuration: {e}")
        TOPOLOGY = Topology()
        CATALOG = Catalog()
        CHECKS_LIBRARY = ChecksLibrary()
        APP_CONFIG = None
        PLANNER = TelemetryPlanner()
    heartbeat_seconds = 60
    if APP_CONFIG:
        heartbeat_seconds = max(10, APP_CONFIG.telemetry.prometheus_heartbeat_seconds)

    async def _heartbeat() -> None:
        while True:
            try:
                await prom_client.ping()
            except Exception as e:
                print(f"Prometheus heartbeat error: {e}")
            await asyncio.sleep(heartbeat_seconds)

    PROMETHEUS_HEARTBEAT = asyncio.create_task(_heartbeat())
    yield
    if PROMETHEUS_HEARTBEAT:
        PROMETHEUS_HEARTBEAT.cancel()
        with suppress(asyncio.CancelledError):
            await PROMETHEUS_HEARTBEAT


app = FastAPI(title="rackscope", version="0.0.0", lifespan=lifespan)

# Register routers
app.include_router(config.router)
app.include_router(simulator.router)
app.include_router(catalog.router)
app.include_router(checks.router)
app.include_router(topology.router)
app.include_router(telemetry.router)
app.include_router(slurm.router)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/catalog")
@app.get("/api/stats/global")
async def get_global_stats():
    rack_healths: Dict[str, str] = {}
    if TOPOLOGY and CHECKS_LIBRARY and PLANNER:
        targets_by_check = _collect_check_targets(TOPOLOGY, CATALOG, CHECKS_LIBRARY)
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


@app.get("/api/stats/prometheus")
def get_prometheus_stats():
    stats = prom_client.get_latency_stats()
    heartbeat_seconds = 60
    if APP_CONFIG:
        heartbeat_seconds = max(10, APP_CONFIG.telemetry.prometheus_heartbeat_seconds)
    stats["heartbeat_seconds"] = heartbeat_seconds
    last_ts = stats.get("last_ts")
    stats["next_ts"] = (last_ts + heartbeat_seconds * 1000) if last_ts else None
    return stats


@app.get("/api/stats/telemetry")
def get_telemetry_stats():
    return prom_client.get_telemetry_stats()


@app.get("/api/rooms/{room_id}/state")
async def get_room_state(room_id: str):
    if not TOPOLOGY or not CHECKS_LIBRARY or not PLANNER:
        return {"room_id": room_id, "state": "UNKNOWN", "racks": {}}
    targets_by_check = _collect_check_targets(TOPOLOGY, CATALOG, CHECKS_LIBRARY)
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


@app.get("/api/slurm/rooms/{room_id}/nodes")
async def get_slurm_room_nodes(room_id: str):
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
            room_nodes.update(_extract_device_instances(device))

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


def _collect_room_nodes(room: Room) -> set[str]:
    nodes: set[str] = set()
    racks: list[Rack] = []
    for aisle in room.aisles:
        racks.extend(aisle.racks)
    racks.extend(room.standalone_racks)
    for rack in racks:
        for device in rack.devices:
            nodes.update(_extract_device_instances(device))
    return nodes


async def _build_slurm_states(
    slurm_cfg: SlurmConfig,
    allowed_nodes: Optional[set[str]] = None,
) -> Dict[str, Dict[str, Any]]:
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


@app.get("/api/slurm/summary")
async def get_slurm_summary(room_id: Optional[str] = None):
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


@app.get("/api/slurm/partitions")
async def get_slurm_partitions(room_id: Optional[str] = None):
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


@app.get("/api/slurm/nodes")
async def get_slurm_nodes(room_id: Optional[str] = None):
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


@app.get("/api/racks/{rack_id}/state")
async def get_rack_state(rack_id: str):
    if not TOPOLOGY or not CHECKS_LIBRARY or not PLANNER:
        return {"rack_id": rack_id, "state": "UNKNOWN", "metrics": {}, "nodes": {}}
    targets_by_check = _collect_check_targets(TOPOLOGY, CATALOG, CHECKS_LIBRARY)
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


def _expand_device_instances(device: Device) -> List[str]:
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


def _build_node_context(topology: Topology) -> Dict[str, Dict[str, str]]:
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
    query = (
        f"max by ({slurm_cfg.label_node},{slurm_cfg.label_status},{slurm_cfg.label_partition})"
        f" ({slurm_cfg.metric})"
    )
    result = await prom_client.query(query)
    if result.get("status") != "success":
        return []
    return result.get("data", {}).get("result", [])


@app.get("/api/alerts/active")
async def get_active_alerts():
    if not TOPOLOGY or not CHECKS_LIBRARY or not PLANNER:
        return {"alerts": []}
    targets_by_check = _collect_check_targets(TOPOLOGY, CATALOG, CHECKS_LIBRARY)
    snapshot = await PLANNER.get_snapshot(TOPOLOGY, CHECKS_LIBRARY, targets_by_check)

    node_context: Dict[str, Dict[str, str]] = {}
    for site in TOPOLOGY.sites:
        for room in site.rooms:
            for aisle in room.aisles:
                for rack in aisle.racks:
                    for device in rack.devices:
                        for node_id in _expand_device_instances(device):
                            node_context[node_id] = {
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
                        node_context[node_id] = {
                            "site_id": site.id,
                            "site_name": site.name,
                            "room_id": room.id,
                            "room_name": room.name,
                            "rack_id": rack.id,
                            "rack_name": rack.name,
                            "device_id": device.id,
                            "device_name": device.name,
                        }

    alerts = []
    for node_id, node_checks in snapshot.node_alerts.items():
        context = node_context.get(node_id)
        if not context:
            continue
        alerts.append(
            {
                "node_id": node_id,
                "state": snapshot.node_states.get(node_id, "UNKNOWN"),
                "checks": [{"id": cid, "severity": sev} for cid, sev in node_checks.items()],
                **context,
            }
        )

    return {"alerts": alerts}
