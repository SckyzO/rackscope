"""Maintenance Router

CRUD endpoints for silence / maintenance mode.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from rackscope.model.maintenance import MaintenanceEntry, TargetType, MaintenanceEffect
from rackscope.services import maintenance_service

router = APIRouter(prefix="/api/maintenances", tags=["maintenance"])


class MaintenanceCreate(BaseModel):
    target_type: TargetType
    target_id: str
    reason: str
    effect: MaintenanceEffect = "badge"
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


def _with_status(entry: MaintenanceEntry, now: datetime) -> dict:
    return {**entry.model_dump(mode="json"), "status": entry.status(now)}


@router.get("")
def list_maintenances() -> dict:
    """List all maintenances with computed status."""
    now = datetime.now(timezone.utc)
    entries = maintenance_service.load_maintenances()
    return {"maintenances": [_with_status(e, now) for e in entries]}


@router.post("", status_code=201)
def create_maintenance(payload: MaintenanceCreate) -> dict:
    """Create a new maintenance entry."""
    if not payload.target_id.strip():
        raise HTTPException(status_code=400, detail="target_id is required")
    if not payload.reason.strip():
        raise HTTPException(status_code=400, detail="reason is required")

    entries = maintenance_service.load_maintenances()
    entry = MaintenanceEntry(
        id=uuid4().hex[:12],
        target_type=payload.target_type,
        target_id=payload.target_id.strip(),
        reason=payload.reason.strip(),
        effect=payload.effect,
        created_at=datetime.now(timezone.utc),
        starts_at=payload.starts_at,
        expires_at=payload.expires_at,
    )
    entries.append(entry)
    maintenance_service.save_maintenances(entries)

    _invalidate_alerts_cache()
    now = datetime.now(timezone.utc)
    return _with_status(entry, now)


@router.post("/{maintenance_id}/stop")
def stop_maintenance(maintenance_id: str) -> dict:
    """Manually end an active maintenance."""
    entries = maintenance_service.load_maintenances()
    for entry in entries:
        if entry.id == maintenance_id:
            if entry.ended_at:
                raise HTTPException(status_code=400, detail="Maintenance already ended")
            entry.ended_at = datetime.now(timezone.utc)
            maintenance_service.save_maintenances(entries)
            _invalidate_alerts_cache()
            now = datetime.now(timezone.utc)
            return _with_status(entry, now)
    raise HTTPException(status_code=404, detail="Maintenance not found")


@router.delete("/{maintenance_id}", status_code=204)
def delete_maintenance(maintenance_id: str) -> None:
    """Delete a maintenance entry."""
    entries = maintenance_service.load_maintenances()
    new_entries = [e for e in entries if e.id != maintenance_id]
    if len(new_entries) == len(entries):
        raise HTTPException(status_code=404, detail="Maintenance not found")
    maintenance_service.save_maintenances(new_entries)
    _invalidate_alerts_cache()


def _invalidate_alerts_cache() -> None:
    try:
        import asyncio
        from rackscope.api.app import SERVICE_CACHE

        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(SERVICE_CACHE.invalidate_prefix("alerts:active"))
    except Exception:
        pass
