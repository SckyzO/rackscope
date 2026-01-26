from __future__ import annotations

import os
import asyncio
import time
from contextlib import asynccontextmanager, suppress
from typing import List, Optional, Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException
import yaml
import httpx

from rackscope.model.domain import Room, Site, Topology, Rack
from rackscope.model.catalog import Catalog, DeviceTemplate, RackTemplate
from rackscope.model.checks import ChecksLibrary
from rackscope.model.config import AppConfig
from rackscope.model.loader import load_topology, load_catalog, load_checks_library, load_app_config
from rackscope.telemetry.prometheus import client as prom_client
from rackscope.telemetry.planner import _expand_nodes_pattern
from rackscope.telemetry.planner import TelemetryPlanner, PlannerConfig
from pydantic import BaseModel
from typing import Literal

# Global state
TOPOLOGY: Optional[Topology] = None
CATALOG: Optional[Catalog] = None
CHECKS_LIBRARY: Optional[ChecksLibrary] = None
APP_CONFIG: Optional[AppConfig] = None
PLANNER: Optional[TelemetryPlanner] = None
PROMETHEUS_HEARTBEAT: Optional[asyncio.Task] = None


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
            config_path = os.getenv("RACKSCOPE_CONFIG", os.path.join(config_dir, "topology", "topology.yaml"))
            templates_dir = os.getenv("RACKSCOPE_TEMPLATES", os.path.join(config_dir, "templates"))
            checks_path = os.getenv("RACKSCOPE_CHECKS", os.path.join(config_dir, "checks", "library"))
            TOPOLOGY = load_topology(config_path)
            CATALOG = load_catalog(templates_dir)
            CHECKS_LIBRARY = load_checks_library(checks_path)
            APP_CONFIG = None
            PLANNER = TelemetryPlanner()
        print(f"Loaded topology with {len(TOPOLOGY.sites)} sites")
        print(f"Loaded catalog with {len(CATALOG.device_templates)} devices and {len(CATALOG.rack_templates)} racks")
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


class TemplateWriteRequest(BaseModel):
    kind: Literal["device", "rack"]
    template: Dict[str, Any]

@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/api/catalog")
def get_catalog():
    return CATALOG if CATALOG else {"device_templates": [], "rack_templates": []}

@app.get("/api/checks")
def get_checks_library():
    return CHECKS_LIBRARY if CHECKS_LIBRARY else {"checks": []}

@app.get("/api/config")
def get_app_config():
    if APP_CONFIG:
        return APP_CONFIG
    return {
        "paths": {},
        "refresh": {"room_state_seconds": 30, "rack_state_seconds": 30},
        "cache": {"ttl_seconds": 30},
        "telemetry": {
            "prometheus_url": None,
            "identity_label": "instance",
            "rack_label": "rack_id",
            "chassis_label": "chassis_id",
            "job_regex": ".*",
            "prometheus_heartbeat_seconds": 30,
            "prometheus_latency_window": 20,
            "basic_auth_user": None,
            "basic_auth_password": None,
            "tls_verify": True,
            "tls_ca_file": None,
            "tls_cert_file": None,
            "tls_key_file": None,
        },
        "planner": {
            "unknown_state": "UNKNOWN",
            "cache_ttl_seconds": 30,
            "max_ids_per_query": 50,
        },
        "features": {
            "notifications": False,
            "playlist": False,
            "offline": False,
            "demo": False,
        },
        "simulator": {
            "update_interval_seconds": 20,
            "seed": None,
            "scenario": None,
            "scale_factor": 1.0,
            "default_ttl_seconds": 120,
            "metrics_catalog_path": "config/simulator_metrics_full.yaml",
            "incident_rates": {
                "node_micro_failure": 0.001,
                "rack_macro_failure": 0.01,
                "aisle_cooling_failure": 0.005,
            },
            "incident_durations": {
                "rack": 3,
                "aisle": 5,
            },
            "overrides_path": "config/simulator_overrides.yaml",
        },
    }


@app.put("/api/config")
def update_app_config(payload: AppConfig):
    config_path = Path(os.getenv("RACKSCOPE_APP_CONFIG", "config/app.yaml"))
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with config_path.open("w") as f:
        yaml.safe_dump(payload.model_dump(), f, sort_keys=False)
    apply_config(payload)
    return payload


@app.get("/api/env")
def get_env() -> Dict[str, Any]:
    keys = [
        "RACKSCOPE_APP_CONFIG",
        "RACKSCOPE_CONFIG_DIR",
        "RACKSCOPE_CONFIG",
        "RACKSCOPE_TEMPLATES",
        "RACKSCOPE_CHECKS",
        "PROMETHEUS_URL",
        "PROMETHEUS_CACHE_TTL",
    ]
    return {key: os.getenv(key) for key in keys}


def _overrides_path() -> Path:
    if APP_CONFIG and getattr(APP_CONFIG, "simulator", None):
        return Path(APP_CONFIG.simulator.overrides_path)
    return Path("config/simulator_overrides.yaml")


def _load_overrides() -> list[dict[str, Any]]:
    path = _overrides_path()
    if not path.exists():
        return []
    try:
        data = yaml.safe_load(path.read_text()) or {}
    except yaml.YAMLError as exc:
        print(f"Failed to load overrides: {exc}")
        return []
    return data.get("overrides", []) if isinstance(data, dict) else []


def _save_overrides(overrides: list[dict[str, Any]]) -> None:
    path = _overrides_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"overrides": overrides}
    with path.open("w") as f:
        yaml.safe_dump(payload, f, sort_keys=False)


@app.get("/api/simulator/overrides")
def get_simulator_overrides():
    return {"overrides": _load_overrides()}


@app.get("/api/simulator/scenarios")
def get_simulator_scenarios():
    sim_path = Path("config/simulator.yaml")
    if not sim_path.exists():
        return {"scenarios": []}
    try:
        data = yaml.safe_load(sim_path.read_text()) or {}
    except yaml.YAMLError as exc:
        print(f"Failed to load simulator scenarios: {exc}")
        return {"scenarios": []}
    scenarios = data.get("scenarios") if isinstance(data, dict) else {}
    if not isinstance(scenarios, dict):
        return {"scenarios": []}
    payload = []
    for name in sorted(scenarios.keys()):
        entry = scenarios.get(name) if isinstance(scenarios.get(name), dict) else {}
        payload.append({
            "name": name,
            "description": entry.get("description") if isinstance(entry, dict) else None,
        })
    return {"scenarios": payload}


@app.post("/api/simulator/overrides")
def add_simulator_override(payload: dict):
    valid_metrics = {
        "up",
        "node_temperature_celsius",
        "node_power_watts",
        "node_load_percent",
        "node_health_status",
        "rack_down",
    }
    instance = payload.get("instance")
    rack_id = payload.get("rack_id")
    metric = payload.get("metric")
    value = payload.get("value")
    ttl = payload.get("ttl_seconds")
    if not metric:
        raise HTTPException(status_code=400, detail="metric is required")
    if metric not in valid_metrics:
        raise HTTPException(status_code=400, detail="metric is not supported")
    if not instance and not rack_id:
        raise HTTPException(status_code=400, detail="instance or rack_id is required")
    if rack_id and metric != "rack_down":
        raise HTTPException(status_code=400, detail="rack overrides only support rack_down")
    if instance and metric == "rack_down":
        raise HTTPException(status_code=400, detail="rack_down requires rack_id")
    try:
        value = float(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="value must be numeric")
    if metric == "node_health_status" and value not in (0, 1, 2):
        raise HTTPException(status_code=400, detail="node_health_status must be 0, 1, or 2")
    if metric == "up" and value not in (0, 1):
        raise HTTPException(status_code=400, detail="up must be 0 or 1")
    override_id = payload.get("id") or f"{(instance or rack_id)}-{metric}-{int(time.time())}"
    override = {
        "id": override_id,
        "instance": instance,
        "rack_id": rack_id,
        "metric": metric,
        "value": value,
    }
    default_ttl = None
    if APP_CONFIG and getattr(APP_CONFIG, "simulator", None):
        default_ttl = getattr(APP_CONFIG.simulator, "default_ttl_seconds", None)
    ttl_val = ttl if ttl is not None else default_ttl
    if ttl_val is not None:
        try:
            ttl_val = int(ttl_val)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="ttl_seconds must be int")
        if ttl_val < 0:
            raise HTTPException(status_code=400, detail="ttl_seconds must be >= 0")
        if ttl_val > 0:
            override["expires_at"] = int(time.time()) + ttl_val
    overrides = _load_overrides()
    overrides.append(override)
    _save_overrides(overrides)
    return {"overrides": overrides}


@app.delete("/api/simulator/overrides")
def clear_simulator_overrides():
    _save_overrides([])
    return {"overrides": []}


@app.delete("/api/simulator/overrides/{override_id}")
def delete_simulator_override(override_id: str):
    overrides = _load_overrides()
    next_overrides = [o for o in overrides if o.get("id") != override_id]
    _save_overrides(next_overrides)
    return {"overrides": next_overrides}

@app.get("/api/sites", response_model=List[Site])
def get_sites():
    return TOPOLOGY.sites if TOPOLOGY else []

@app.get("/api/rooms", response_model=List[dict])
def get_rooms():
    rooms = []
    if TOPOLOGY:
        for site in TOPOLOGY.sites:
            for room in site.rooms:
                # Build hierarchy for sidebar
                aisles_summary = []
                for aisle in room.aisles:
                    aisles_summary.append({
                        "id": aisle.id,
                        "name": aisle.name,
                        "racks": [{"id": r.id, "name": r.name} for r in aisle.racks]
                    })
                
                # Include standalone racks as a virtual aisle if needed
                if room.standalone_racks:
                    aisles_summary.append({
                        "id": f"{room.id}-standalone",
                        "name": "Standalone",
                        "racks": [{"id": r.id, "name": r.name} for r in room.standalone_racks]
                    })

                rooms.append({
                    "id": room.id,
                    "name": room.name,
                    "site_id": site.id,
                    "aisles": aisles_summary
                })
    return rooms

@app.get("/api/rooms/{room_id}/layout", response_model=Room)
def get_room_layout(room_id: str):
    if not TOPOLOGY:
        raise HTTPException(status_code=500, detail="Topology not loaded")
    
    for site in TOPOLOGY.sites:
        for room in site.rooms:
            if room.id == room_id:
                return room
    
    raise HTTPException(status_code=404, detail=f"Room {room_id} not found")

@app.get("/api/racks/{rack_id}", response_model=Rack)
def get_rack_details(rack_id: str):
    if not TOPOLOGY:
        raise HTTPException(status_code=500, detail="Topology not loaded")
    
    # Linear search (slow but ok for MVP)
    # In production, we would index racks by ID on load
    for site in TOPOLOGY.sites:
        for room in site.rooms:
            # Check aisles
            for aisle in room.aisles:
                for rack in aisle.racks:
                    if rack.id == rack_id:
                        return rack
            # Check standalone
            for rack in room.standalone_racks:
                if rack.id == rack_id:
                    return rack
    
    raise HTTPException(status_code=404, detail=f"Rack {rack_id} not found")

@app.post("/api/catalog/templates")
def write_template(payload: TemplateWriteRequest):
    global CATALOG
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    templates_dir = Path(APP_CONFIG.paths.templates)
    templates_dir.mkdir(parents=True, exist_ok=True)

    if payload.kind == "device":
        template = DeviceTemplate(**payload.template)
        if CATALOG and CATALOG.get_device_template(template.id):
            raise HTTPException(status_code=400, detail=f"Device template already exists: {template.id}")
        target_dir = templates_dir / "devices"
        key = "templates"
        filename = "custom.yaml"
    else:
        template = RackTemplate(**payload.template)
        if CATALOG and CATALOG.get_rack_template(template.id):
            raise HTTPException(status_code=400, detail=f"Rack template already exists: {template.id}")
        target_dir = templates_dir / "racks"
        key = "rack_templates"
        filename = "custom.yaml"

    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / filename
    data = {}
    if target_path.exists():
        data = yaml.safe_load(target_path.read_text()) or {}
    items = data.get(key) or []
    items.append(template.model_dump())
    data[key] = items
    target_path.write_text(yaml.safe_dump(data, sort_keys=False))

    # Reload catalog to keep in-memory state aligned.
    CATALOG = load_catalog(templates_dir)

    return template

@app.get("/api/stats/global")
async def get_global_stats():
    # 1. Fetch all health summaries in one go
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
    if crit_alerts > 0: global_status = "CRIT"
    elif warn_alerts > 0: global_status = "WARN"

    return {
        "total_rooms": len(TOPOLOGY.sites[0].rooms) if TOPOLOGY and TOPOLOGY.sites else 0,
        "total_racks": total_racks,
        "active_alerts": crit_alerts + warn_alerts,
        "crit_count": crit_alerts,
        "warn_count": warn_alerts,
        "status": global_status
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
    snapshot = await PLANNER.get_snapshot(TOPOLOGY, CHECKS_LIBRARY)
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

@app.get("/api/racks/{rack_id}/state")
async def get_rack_state(rack_id: str):
    if not TOPOLOGY or not CHECKS_LIBRARY or not PLANNER:
        return {"rack_id": rack_id, "state": "UNKNOWN", "metrics": {}, "nodes": {}}
    snapshot = await PLANNER.get_snapshot(TOPOLOGY, CHECKS_LIBRARY)
    nodes_metrics = await prom_client.get_node_metrics(rack_id)
    
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
        "metrics": {
            "temperature": avg_temp,
            "power": total_power
        },
        "nodes": processed_nodes
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
    if isinstance(device.nodes, str):
        return _expand_nodes_pattern(device.nodes)
    if isinstance(device.nodes, dict):
        expanded: List[str] = []
        for value in device.nodes.values():
            if isinstance(value, str):
                expanded.extend(_expand_nodes_pattern(value))
        return expanded
    return []


@app.get("/api/alerts/active")
async def get_active_alerts():
    if not TOPOLOGY or not CHECKS_LIBRARY or not PLANNER:
        return {"alerts": []}
    snapshot = await PLANNER.get_snapshot(TOPOLOGY, CHECKS_LIBRARY)

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
    for node_id, checks in snapshot.node_alerts.items():
        context = node_context.get(node_id)
        if not context:
            continue
        alerts.append({
            "node_id": node_id,
            "state": snapshot.node_states.get(node_id, "UNKNOWN"),
            "checks": [{"id": cid, "severity": sev} for cid, sev in checks.items()],
            **context,
        })

    return {"alerts": alerts}
