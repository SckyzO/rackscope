"""
Catalog Router

Endpoints for hardware templates (devices and racks).
"""

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from rackscope.model.catalog import DeviceTemplate, RackTemplate
from rackscope.model.loader import load_catalog, dump_yaml
from rackscope.api.models import TemplateWriteRequest

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


def _find_device_template_path(templates_dir: Path, template_id: str) -> Optional[Path]:
    """Find path to device template YAML file by template ID."""
    devices_dir = templates_dir / "devices"
    if not devices_dir.exists():
        return None
    matches = list(devices_dir.rglob(f"{template_id}.yaml"))
    if not matches:
        return None
    return matches[0]


def _safe_segment(value: str, fallback: str) -> str:
    """Convert string to safe filename segment."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    return app_module._safe_segment(value, fallback)


@router.get("")
def get_catalog():
    """Get all hardware templates (devices and racks)."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    CATALOG = app_module.CATALOG
    return CATALOG if CATALOG else {"device_templates": [], "rack_templates": []}


@router.post("/templates")
def write_template(payload: TemplateWriteRequest):
    """Create a new hardware template."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    APP_CONFIG = app_module.APP_CONFIG
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")

    templates_dir = Path(APP_CONFIG.paths.templates)
    templates_dir.mkdir(parents=True, exist_ok=True)

    if payload.kind == "device":
        template = DeviceTemplate(**payload.template)
        if app_module.CATALOG and app_module.CATALOG.get_device_template(template.id):
            raise HTTPException(
                status_code=400,
                detail=f"Device template already exists: {template.id}",
            )
        type_dir = _safe_segment(template.type, "other")
        target_dir = templates_dir / "devices" / type_dir
        key = "templates"
        filename = f"{_safe_segment(template.id, 'device')}.yaml"
    else:
        template = RackTemplate(**payload.template)
        if app_module.CATALOG and app_module.CATALOG.get_rack_template(template.id):
            raise HTTPException(
                status_code=400, detail=f"Rack template already exists: {template.id}"
            )
        target_dir = templates_dir / "racks"
        key = "rack_templates"
        filename = f"{_safe_segment(template.id, 'rack')}.yaml"

    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / filename
    if target_path.exists():
        raise HTTPException(status_code=400, detail=f"Template file already exists: {target_path}")
    data = {key: [template.model_dump()]}
    target_path.write_text(dump_yaml(data))

    # Reload catalog to keep in-memory state aligned.
    app_module.CATALOG = load_catalog(templates_dir)

    return template


@router.put("/templates")
def update_template(payload: TemplateWriteRequest):
    """Update an existing hardware template."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    APP_CONFIG = app_module.APP_CONFIG
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")

    templates_dir = Path(APP_CONFIG.paths.templates)
    templates_dir.mkdir(parents=True, exist_ok=True)

    if payload.kind == "device":
        template = DeviceTemplate(**payload.template)
        type_dir = _safe_segment(template.type, "other")
        target_dir = templates_dir / "devices" / type_dir
        key = "templates"
        filename = f"{_safe_segment(template.id, 'device')}.yaml"
        existing_path = _find_device_template_path(templates_dir, template.id)
        target_path = target_dir / filename
        if existing_path and existing_path != target_path:
            existing_path.unlink(missing_ok=True)
    else:
        template = RackTemplate(**payload.template)
        target_dir = templates_dir / "racks"
        key = "rack_templates"
        filename = f"{_safe_segment(template.id, 'rack')}.yaml"
        target_path = target_dir / filename

    target_dir.mkdir(parents=True, exist_ok=True)
    data = {key: [template.model_dump()]}
    target_path.write_text(dump_yaml(data))

    # Reload catalog to keep in-memory state aligned.
    app_module.CATALOG = load_catalog(templates_dir)

    return template


@router.post("/templates/validate")
def validate_template(payload: TemplateWriteRequest):
    """Validate a hardware template without saving."""
    try:
        if payload.kind == "device":
            DeviceTemplate(**payload.template)
        else:
            RackTemplate(**payload.template)
    except ValidationError as e:
        raise HTTPException(
            status_code=400,
            detail={"message": "Template validation failed", "errors": e.errors()},
        )
    return {"status": "ok"}
