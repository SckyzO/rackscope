"""
Slurm Router

Endpoints for Slurm-specific dashboards and data.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/slurm", tags=["slurm"])

# Endpoints will be migrated here from app.py
