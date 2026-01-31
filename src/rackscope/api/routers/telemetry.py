"""
Telemetry Router

Endpoints for telemetry data, health states, and alerts.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["telemetry"])

# Endpoints will be migrated here from app.py
