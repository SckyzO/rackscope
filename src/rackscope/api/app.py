from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException

from rackscope.model.domain import Room, Site, Topology, Rack
from rackscope.model.catalog import Catalog
from rackscope.model.checks import ChecksLibrary
from rackscope.model.loader import load_topology, load_catalog, load_checks_library
from rackscope.telemetry.prometheus import client as prom_client

# Global state
TOPOLOGY: Optional[Topology] = None
CATALOG: Optional[Catalog] = None
CHECKS_LIBRARY: Optional[ChecksLibrary] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global TOPOLOGY, CATALOG, CHECKS_LIBRARY
    config_path = os.getenv("RACKSCOPE_CONFIG", "config-examples/topology.yaml")
    templates_dir = os.path.dirname(config_path) + "/templates"
    default_checks_path = os.path.join(os.path.dirname(config_path), "checks", "library.yaml")
    checks_path = os.getenv("RACKSCOPE_CHECKS", default_checks_path)
    
    try:
        TOPOLOGY = load_topology(config_path)
        CATALOG = load_catalog(templates_dir)
        CHECKS_LIBRARY = load_checks_library(checks_path)
        print(f"Loaded topology with {len(TOPOLOGY.sites)} sites")
        print(f"Loaded catalog with {len(CATALOG.device_templates)} devices and {len(CATALOG.rack_templates)} racks")
        print(f"Loaded checks library with {len(CHECKS_LIBRARY.checks)} checks")
    except Exception as e:
        print(f"Failed to load configuration: {e}")
        TOPOLOGY = Topology()
        CATALOG = Catalog()
        CHECKS_LIBRARY = ChecksLibrary()
    yield

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

@app.get("/api/rooms/{room_id}/state")
async def get_room_state(room_id: str):
    # Get aggregated health for all racks (efficient query)
    rack_healths = await prom_client.get_rack_health_summary()
    
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

    return {"room_id": room_id, "state": room_status}

@app.get("/api/racks/{rack_id}/state")
async def get_rack_state(rack_id: str):
    # Fetch all node metrics for this rack
    nodes_metrics = await prom_client.get_node_metrics(rack_id)
    
    # Calculate Node States and Aggregate Rack State
    processed_nodes = {}
    
    total_power = 0.0
    total_temp = 0.0
    temp_count = 0
    
    node_states = []
    
    for node_id, m in nodes_metrics.items():
        temp = m.get("temperature", 0)
        power = m.get("power", 0)
        
        total_power += power
        if temp > 0:
            total_temp += temp
            temp_count += 1
        
        state = "OK"
        if temp > 35:
            state = "CRIT"
        elif temp > 30:
            state = "WARN"
        
        node_states.append(state)
        processed_nodes[node_id] = {
            "state": state,
            "temperature": temp,
            "power": power
        }
    
    # Aggregation Logic:
    # - CRIT only if 100% nodes are CRIT
    # - WARN if > 0 nodes are NOT OK
    rack_state = "OK"
    if node_states:
        crit_count = node_states.count("CRIT")
        warn_count = node_states.count("WARN")
        
        if crit_count == len(node_states):
            rack_state = "CRIT"
        elif crit_count > 0 or warn_count > 0:
            rack_state = "WARN"
    
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
