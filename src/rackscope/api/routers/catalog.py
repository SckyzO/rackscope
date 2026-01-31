"""
Catalog Router

Endpoints for hardware templates (devices and racks).
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/catalog", tags=["catalog"])

# Endpoints will be migrated here from app.py
