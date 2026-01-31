"""
Checks Router

Endpoints for health checks library management.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/checks", tags=["checks"])

# Endpoints will be migrated here from app.py
