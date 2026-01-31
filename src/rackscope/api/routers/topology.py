"""
Topology Router

Endpoints for topology management (sites, rooms, aisles, racks, devices).
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/topology", tags=["topology"])

# Endpoints will be migrated here from app.py
