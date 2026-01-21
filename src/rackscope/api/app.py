from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException

from rackscope.model.domain import Room, Site, Topology
from rackscope.model.loader import load_topology

# Global state for Phase 1
TOPOLOGY: Optional[Topology] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global TOPOLOGY
    # Use config-examples/topology.yaml as default for now if not specified
    config_path = os.getenv("RACKSCOPE_CONFIG", "config-examples/topology.yaml")
    try:
        TOPOLOGY = load_topology(config_path)
    except Exception as e:
        # In production, we might want to crash or log and continue
        print(f"Failed to load topology: {e}")
        TOPOLOGY = Topology()
    yield
    # Clean up if needed

app = FastAPI(title="rackscope", version="0.0.0", lifespan=lifespan)

@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}

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

# Telemetry v0 (Stub)
@app.get("/api/rooms/{room_id}/state")
def get_room_state(room_id: str):
    # Dummy implementation: OK/WARN/CRIT/UNKNOWN
    # For now, return OK for everything to satisfy the vertical slice
    return {"room_id": room_id, "state": "OK"}

@app.get("/api/racks/{rack_id}/state")
def get_rack_state(rack_id: str):
    # Dummy implementation: return different states based on ID for testing
    state = "OK"
    if "crit" in rack_id.lower():
        state = "CRIT"
    elif "warn" in rack_id.lower():
        state = "WARN"
    elif "unknown" in rack_id.lower():
        state = "UNKNOWN"
    
    return {"rack_id": rack_id, "state": state}
