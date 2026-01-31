"""
Config Router

Endpoints for application configuration management.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["config"])

# Endpoints will be migrated here from app.py
