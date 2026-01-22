from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException

from rackscope.model.domain import Room, Site, Topology
from rackscope.model.catalog import Catalog
from rackscope.model.loader import load_topology, load_catalog
from rackscope.telemetry.prometheus import client as prom_client

# Global state
TOPOLOGY: Optional[Topology] = None
CATALOG: Optional[Catalog] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global TOPOLOGY, CATALOG
    config_path = os.getenv("RACKSCOPE_CONFIG", "config-examples/topology.yaml")
    templates_dir = os.path.dirname(config_path) + "/templates"
    
    try:
        TOPOLOGY = load_topology(config_path)
        CATALOG = load_catalog(templates_dir)
        print(f"Loaded topology with {len(TOPOLOGY.sites)} sites")
        print(f"Loaded catalog with {len(CATALOG.templates)} templates")
    except Exception as e:
        print(f"Failed to load configuration: {e}")
        TOPOLOGY = Topology()
        CATALOG = Catalog()
    yield

app = FastAPI(title="rackscope", version="0.0.0", lifespan=lifespan)

@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/api/catalog")
def get_catalog():
    return CATALOG.templates if CATALOG else []

@app.get("/api/sites", response_model=List[Site])
def get_sites():
    return TOPOLOGY.sites if TOPOLOGY else []

@app.get("/api/rooms", response_model=List[dict])
def get_rooms():
    rooms = []
    if TOPOLOGY:
        for site in TOPOLOGY.sites:
            for room in site.rooms:
                rooms.append({
                    "id": room.id,
                    "name": room.name,
                    "site_id": site.id
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

@app.get("/api/rooms/{room_id}/state")
async def get_room_state(room_id: str):
    # Retrieve all rack temps to aggregate room health
    # This is naive (N queries) but okay for MVP. 
    # Better approach: fetch vector once and map in memory.
    temps = await prom_client.get_rack_temperatures()
    
    # Filter for this room (we assume we know rack IDs for this room)
    # Since we don't have a quick reverse map yet, we'll iterate
    room_status = "OK"
    
    # In a real app, we would cache the list of racks per room
    rack_ids = []
    if TOPOLOGY:
        for site in TOPOLOGY.sites:
            for room in site.rooms:
                if room.id == room_id:
                    for aisle in room.aisles:
                        rack_ids.extend([r.id for r in aisle.racks])
                    rack_ids.extend([r.id for r in room.standalone_racks])
    
    for rid in rack_ids:
        temp = temps.get(rid, 0)
        if temp > 35:
            room_status = "CRIT"
            break # Worst case wins
        if temp > 30 and room_status != "CRIT":
            room_status = "WARN"

    return {"room_id": room_id, "state": room_status}

@app.get("/api/racks/{rack_id}/state")
async def get_rack_state(rack_id: str):
    temps = await prom_client.get_rack_temperatures()
    power = await prom_client.get_rack_power()
    
    temp = temps.get(rack_id)
    pwr = power.get(rack_id)
    
    state = "UNKNOWN"
    if temp is not None:
        if temp > 35:
            state = "CRIT"
        elif temp > 30:
            state = "WARN"
        else:
            state = "OK"
            
    return {
        "rack_id": rack_id, 
        "state": state,
        "metrics": {
            "temperature": temp,
            "power": pwr
        }
    }