"""
Catalog Router

Endpoints for hardware templates (devices and racks).
"""

import logging
import re
from pathlib import Path
from typing import Annotated, Optional


from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError

from rackscope.model.catalog import Catalog, DeviceTemplate, RackTemplate, RackComponentTemplate
from rackscope.model.config import AppConfig
from rackscope.model.loader import load_catalog, dump_yaml
from rackscope.api.dependencies import get_app_config, get_catalog_optional
from rackscope.api.models import TemplateWriteRequest

logger = logging.getLogger(__name__)

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


def _find_rack_component_path(templates_dir: Path, template_id: str) -> Optional[Path]:
    """Find path to rack component template YAML file by template ID."""
    comp_dir = templates_dir / "rack_components"
    if not comp_dir.exists():
        return None
    for yaml_file in comp_dir.rglob("*.yaml"):
        import yaml as _yaml

        try:
            data = _yaml.safe_load(yaml_file.read_text()) or {}
            for t in data.get("rack_component_templates", []):
                if t.get("id") == template_id:
                    return yaml_file
        except Exception as e:
            logger.warning("Failed to parse rack component template %s: %s", yaml_file, e)
            continue
    return None


def _safe_segment(value: str, fallback: str) -> str:
    """Convert string to safe filename segment."""
    value = (value or "").strip().lower()
    if not value:
        return fallback
    value = re.sub(r"[^a-z0-9._-]+", "-", value)
    value = value.strip("-")
    return value or fallback


@router.get("")
def get_catalog(catalog: Annotated[Optional[Catalog], Depends(get_catalog_optional)]):
    """Get all hardware templates (devices and racks)."""
    return catalog if catalog else {"device_templates": [], "rack_templates": []}


@router.post("/templates")
def write_template(
    payload: TemplateWriteRequest,
    app_config: Annotated[AppConfig, Depends(get_app_config)],
    catalog: Annotated[Optional[Catalog], Depends(get_catalog_optional)],
):
    """Create a new hardware template."""
    templates_dir = Path(app_config.paths.templates)
    templates_dir.mkdir(parents=True, exist_ok=True)
    template: DeviceTemplate | RackComponentTemplate | RackTemplate

    if payload.kind == "device":
        template = DeviceTemplate(**payload.template)
        if catalog and catalog.get_device_template(template.id):
            raise HTTPException(
                status_code=400,
                detail=f"Device template already exists: {template.id}",
            )
        type_dir = _safe_segment(template.type, "other")
        target_dir = templates_dir / "devices" / type_dir
        key = "templates"
        filename = f"{_safe_segment(template.id, 'device')}.yaml"
    elif payload.kind == "rack_component":
        template = RackComponentTemplate(**payload.template)
        target_dir = templates_dir / "rack_components"
        key = "rack_component_templates"
        filename = f"{_safe_segment(template.id, 'component')}.yaml"
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / filename
        if target_path.exists():
            raise HTTPException(
                status_code=400, detail=f"Component template already exists: {template.id}"
            )
        data = {key: [template.model_dump()]}
        target_path.write_text(dump_yaml(data))
        from rackscope.api import app as app_module

        app_module.CATALOG = load_catalog(templates_dir)
        return template
    else:
        template = RackTemplate(**payload.template)
        if catalog and catalog.get_rack_template(template.id):
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
    from rackscope.api import app as app_module

    app_module.CATALOG = load_catalog(templates_dir)

    return template


@router.put("/templates")
def update_template(
    payload: TemplateWriteRequest, app_config: Annotated[AppConfig, Depends(get_app_config)]
):
    """Update an existing hardware template."""
    templates_dir = Path(app_config.paths.templates)
    templates_dir.mkdir(parents=True, exist_ok=True)
    template: DeviceTemplate | RackComponentTemplate | RackTemplate

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
    elif payload.kind == "rack_component":
        template = RackComponentTemplate(**payload.template)
        target_dir = templates_dir / "rack_components"
        key = "rack_component_templates"
        filename = f"{_safe_segment(template.id, 'component')}.yaml"
        # Find existing file (might have different name)
        existing_path = _find_rack_component_path(templates_dir, template.id)
        target_path = target_dir / filename
        if existing_path and existing_path != target_path:
            # Update in-place to avoid duplicates
            import yaml as _yaml

            data = _yaml.safe_load(existing_path.read_text()) or {}
            comps = data.get("rack_component_templates", [])
            data["rack_component_templates"] = [
                template.model_dump() if c.get("id") == template.id else c for c in comps
            ]
            existing_path.write_text(dump_yaml(data))
            from rackscope.api import app as app_module

            app_module.CATALOG = load_catalog(templates_dir)
            return template
        target_dir.mkdir(parents=True, exist_ok=True)
        data = {key: [template.model_dump()]}
        target_path.write_text(dump_yaml(data))
        from rackscope.api import app as app_module

        app_module.CATALOG = load_catalog(templates_dir)
        return template
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
    from rackscope.api import app as app_module

    app_module.CATALOG = load_catalog(templates_dir)

    return template


@router.delete("/templates/device/{template_id}")
def delete_device_template(
    template_id: str,
    app_config: Annotated[AppConfig, Depends(get_app_config)],
):
    """Delete a device template by ID. Removes the YAML file from disk."""
    templates_dir = Path(app_config.paths.templates)
    path = _find_device_template_path(templates_dir, template_id)
    if not path:
        raise HTTPException(status_code=404, detail=f"Device template '{template_id}' not found")
    path.unlink(missing_ok=True)
    # Reload catalog to keep in-memory state aligned
    from rackscope.api import app as app_module

    app_module.CATALOG = load_catalog(templates_dir)
    return {"status": "ok", "deleted": template_id}


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
