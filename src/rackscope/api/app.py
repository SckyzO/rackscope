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

import random

# Telemetry v0 (Stub)
@app.get("/api/rooms/{room_id}/state")
def get_room_state(room_id: str):
    # Aggregated state: if any rack is CRIT, room is CRIT
    # For now, return a random but biased state
    states = ["OK", "OK", "OK", "WARN", "OK"]
    return {"room_id": room_id, "state": random.choice(states)}

@app.get("/api/racks/{rack_id}/state")
def get_rack_state(rack_id: str):
    # Return different states to test UI colors
    # We use the rack_id to keep some consistency but add a bit of randomness
    random.seed(rack_id)
    
    # Small chance of being CRIT or WARN
    roll = random.random()
    if roll > 0.95:
        state = "CRIT"
    elif roll > 0.85:
        state = "WARN"
    elif roll > 0.80:
        state = "UNKNOWN"
    else:
        state = "OK"
        
    return {"rack_id": rack_id, "state": state}
