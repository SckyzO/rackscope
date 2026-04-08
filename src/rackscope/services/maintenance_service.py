"""Maintenance service — load/save maintenances.yaml + propagation check."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import yaml

from rackscope.model.maintenance import MaintenanceEntry


def _maintenances_path() -> Path:
    cfg = os.getenv("RACKSCOPE_APP_CONFIG", "config/app.yaml")
    return Path(cfg).parent / "maintenances.yaml"


def load_maintenances() -> List[MaintenanceEntry]:
    path = _maintenances_path()
    if not path.exists():
        return []
    try:
        data = yaml.safe_load(path.read_text()) or {}
    except yaml.YAMLError:
        return []
    result: List[MaintenanceEntry] = []
    for raw in data.get("maintenances", []):
        try:
            result.append(MaintenanceEntry(**raw))
        except Exception:
            pass
    return result


def save_maintenances(entries: List[MaintenanceEntry]) -> None:
    path = _maintenances_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {"maintenances": [e.model_dump(mode="json") for e in entries]}
    with path.open("w") as f:
        yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True, default_flow_style=False)


def is_in_maintenance(
    target_type: str,
    target_id: str,
    *,
    site_id: Optional[str] = None,
    room_id: Optional[str] = None,
    rack_id: Optional[str] = None,
    maintenances: Optional[List[MaintenanceEntry]] = None,
    now: Optional[datetime] = None,
) -> Optional[MaintenanceEntry]:
    """Return the first active maintenance covering this target or any of its parents.

    Propagation: site → room → rack → device.
    Pass `maintenances` to avoid re-loading from disk on every call.
    """
    if maintenances is None:
        maintenances = load_maintenances()
    if now is None:
        now = datetime.now(timezone.utc)

    # Build candidate (type, id) pairs from most specific to broadest
    candidates: List[tuple[str, str]] = [(target_type, target_id)]
    if target_type == "device" and rack_id:
        candidates.append(("rack", rack_id))
    if target_type in ("device", "rack") and room_id:
        candidates.append(("room", room_id))
    if site_id:
        candidates.append(("site", site_id))

    for m in maintenances:
        if not m.is_active(now):
            continue
        for t_type, t_id in candidates:
            if m.target_type == t_type and m.target_id == t_id:
                return m
    return None
