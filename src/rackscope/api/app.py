from __future__ import annotations

import os
import asyncio
from contextlib import asynccontextmanager, suppress
from typing import List, Optional, Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException
import yaml

from rackscope.model.domain import Room, Site, Topology, Rack
from rackscope.model.catalog import Catalog
from rackscope.model.checks import ChecksLibrary
from rackscope.model.config import AppConfig
from rackscope.model.loader import load_topology, load_catalog, load_checks_library, load_app_config
from rackscope.telemetry.prometheus import client as prom_client
from rackscope.telemetry.planner import TelemetryPlanner, PlannerConfig

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
    if APP_CONFIG.telemetry.prometheus_url:
        prom_client.base_url = APP_CONFIG.telemetry.prometheus_url.rstrip("/")
    prom_client.cache_ttl = APP_CONFIG.cache.ttl_seconds
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
            checks_path = os.getenv("RACKSCOPE_CHECKS", os.path.join(config_dir, "checks", "library.yaml"))
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
        heartbeat_seconds = max(10, APP_CONFIG.refresh.room_state_seconds)

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
        },
        "planner": {
            "unknown_state": "UNKNOWN",
            "cache_ttl_seconds": 30,
            "max_ids_per_query": 50,
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
    return prom_client.get_latency_stats()

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
        
        node_states.append(state)
        processed_nodes[node_id] = {
            "state": state,
            "temperature": temp if temp is not None else 0,
            "power": power if power is not None else 0
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
