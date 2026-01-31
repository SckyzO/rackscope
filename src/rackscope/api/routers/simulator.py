"""
Simulator Router

Endpoints for simulator control (demo mode).
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/simulator", tags=["simulator"])

# Endpoints will be migrated here from app.py
