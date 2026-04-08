"""Maintenance / Silence mode model."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field

TargetType = Literal["site", "room", "rack", "device"]
MaintenanceEffect = Literal["hide", "badge"]
MaintenanceStatus = Literal["ACTIVE", "SCHEDULED", "EXPIRED"]


class MaintenanceEntry(BaseModel):
    id: str
    target_type: TargetType
    target_id: str
    reason: str
    effect: MaintenanceEffect = "badge"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    def status(self, now: Optional[datetime] = None) -> MaintenanceStatus:
        if now is None:
            now = datetime.now(timezone.utc)
        if self.ended_at:
            return "EXPIRED"
        if self.expires_at and now >= self.expires_at:
            return "EXPIRED"
        if self.starts_at and now < self.starts_at:
            return "SCHEDULED"
        return "ACTIVE"

    def is_active(self, now: Optional[datetime] = None) -> bool:
        return self.status(now) == "ACTIVE"
