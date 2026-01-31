"""
Simulator Router

Endpoints for simulator control (demo mode).
"""

import time
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/simulator", tags=["simulator"])


def _overrides_path() -> Path:
    """Get path to simulator overrides file."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    APP_CONFIG = app_module.APP_CONFIG
    if APP_CONFIG and getattr(APP_CONFIG, "simulator", None):
        return Path(APP_CONFIG.simulator.overrides_path)
    return Path("config/simulator_overrides.yaml")


def _load_overrides() -> list[dict[str, Any]]:
    """Load simulator overrides from YAML file."""
    path = _overrides_path()
    if not path.exists():
        return []
    try:
        data = yaml.safe_load(path.read_text()) or {}
    except yaml.YAMLError as exc:
        print(f"Failed to load overrides: {exc}")
        return []
    return data.get("overrides", []) if isinstance(data, dict) else []


def _save_overrides(overrides: list[dict[str, Any]]) -> None:
    """Save simulator overrides to YAML file."""
    path = _overrides_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"overrides": overrides}
    with path.open("w") as f:
        yaml.safe_dump(payload, f, sort_keys=False)


@router.get("/overrides")
def get_simulator_overrides():
    """Get all active simulator overrides."""
    return {"overrides": _load_overrides()}


@router.get("/scenarios")
def get_simulator_scenarios():
    """Get available simulator scenarios."""
    sim_path = Path("config/simulator.yaml")
    if not sim_path.exists():
        return {"scenarios": []}
    try:
        data = yaml.safe_load(sim_path.read_text()) or {}
    except yaml.YAMLError as exc:
        print(f"Failed to load simulator scenarios: {exc}")
        return {"scenarios": []}
    scenarios = data.get("scenarios") if isinstance(data, dict) else {}
    if not isinstance(scenarios, dict):
        return {"scenarios": []}
    payload = []
    for name in sorted(scenarios.keys()):
        entry = scenarios.get(name) if isinstance(scenarios.get(name), dict) else {}
        payload.append(
            {
                "name": name,
                "description": entry.get("description") if isinstance(entry, dict) else None,
            }
        )
    return {"scenarios": payload}


@router.post("/overrides")
def add_simulator_override(payload: dict):
    """Add a new simulator override."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    APP_CONFIG = app_module.APP_CONFIG

    valid_metrics = {
        "up",
        "node_temperature_celsius",
        "node_power_watts",
        "node_load_percent",
        "node_health_status",
        "rack_down",
    }
    instance = payload.get("instance")
    rack_id = payload.get("rack_id")
    metric = payload.get("metric")
    value = payload.get("value")
    ttl = payload.get("ttl_seconds")
    if not metric:
        raise HTTPException(status_code=400, detail="metric is required")
    if metric not in valid_metrics:
        raise HTTPException(status_code=400, detail="metric is not supported")
    if not instance and not rack_id:
        raise HTTPException(status_code=400, detail="instance or rack_id is required")
    if rack_id and metric != "rack_down":
        raise HTTPException(status_code=400, detail="rack overrides only support rack_down")
    if instance and metric == "rack_down":
        raise HTTPException(status_code=400, detail="rack_down requires rack_id")
    try:
        value = float(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="value must be numeric")
    if metric == "node_health_status" and value not in (0, 1, 2):
        raise HTTPException(status_code=400, detail="node_health_status must be 0, 1, or 2")
    if metric == "up" and value not in (0, 1):
        raise HTTPException(status_code=400, detail="up must be 0 or 1")
    override_id = payload.get("id") or f"{(instance or rack_id)}-{metric}-{int(time.time())}"
    override = {
        "id": override_id,
        "instance": instance,
        "rack_id": rack_id,
        "metric": metric,
        "value": value,
    }
    default_ttl = None
    if APP_CONFIG and getattr(APP_CONFIG, "simulator", None):
        default_ttl = getattr(APP_CONFIG.simulator, "default_ttl_seconds", None)
    ttl_val = ttl if ttl is not None else default_ttl
    if ttl_val is not None:
        try:
            ttl_val = int(ttl_val)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="ttl_seconds must be int")
        if ttl_val < 0:
            raise HTTPException(status_code=400, detail="ttl_seconds must be >= 0")
        if ttl_val > 0:
            override["expires_at"] = int(time.time()) + ttl_val
    overrides = _load_overrides()
    overrides.append(override)
    _save_overrides(overrides)
    return {"overrides": overrides}


@router.delete("/overrides")
def clear_simulator_overrides():
    """Clear all simulator overrides."""
    _save_overrides([])
    return {"overrides": []}


@router.delete("/overrides/{override_id}")
def delete_simulator_override(override_id: str):
    """Delete a specific simulator override."""
    overrides = _load_overrides()
    next_overrides = [o for o in overrides if o.get("id") != override_id]
    _save_overrides(next_overrides)
    return {"overrides": next_overrides}
