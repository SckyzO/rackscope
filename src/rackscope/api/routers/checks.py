"""
Checks Router

Endpoints for health checks library management.
"""

from pathlib import Path
from typing import Dict, Any

import yaml
from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from rackscope.model.checks import CheckDefinition
from rackscope.model.loader import load_checks_library, dump_yaml

router = APIRouter(prefix="/api/checks", tags=["checks"])


@router.get("")
def get_checks_library():
    """Get the checks library."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    CHECKS_LIBRARY = app_module.CHECKS_LIBRARY
    return CHECKS_LIBRARY if CHECKS_LIBRARY else {"checks": []}


@router.get("/files")
def get_checks_files():
    """Get list of checks YAML files."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    APP_CONFIG = app_module.APP_CONFIG
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    base_dir = Path(APP_CONFIG.paths.checks)
    if not base_dir.exists():
        return {"files": []}
    if base_dir.is_dir():
        files = sorted(base_dir.glob("*.yaml")) + sorted(base_dir.glob("*.yml"))
    else:
        files = [base_dir]
    return {
        "files": [
            {
                "name": f.name,
                "path": str(f),
                "relative": str(f.relative_to(base_dir)) if base_dir.is_dir() else f.name,
            }
            for f in files
        ]
    }


@router.get("/files/{name}")
def read_checks_file(name: str):
    """Read a checks YAML file."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    APP_CONFIG = app_module.APP_CONFIG
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    base_dir = Path(APP_CONFIG.paths.checks)
    if base_dir.is_dir():
        target = base_dir / name
    else:
        target = base_dir
    if not target.exists():
        raise HTTPException(status_code=404, detail="Checks file not found")
    return {"name": target.name, "content": target.read_text()}


@router.put("/files/{name}")
def write_checks_file(name: str, payload: Dict[str, Any]):
    """Write a checks YAML file."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    APP_CONFIG = app_module.APP_CONFIG
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    base_dir = Path(APP_CONFIG.paths.checks)
    if base_dir.is_dir():
        base_dir.mkdir(parents=True, exist_ok=True)
        target = base_dir / name
    else:
        target = base_dir

    content = payload.get("content")
    if not isinstance(content, str) or not content.strip():
        raise HTTPException(status_code=400, detail="Content is required")

    # Validate YAML by parsing and re-dumping to keep it consistent.
    try:
        parsed = yaml.safe_load(content)
    except yaml.YAMLError as e:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {e}")

    checks = []
    if isinstance(parsed, dict) and "checks" in parsed:
        checks.extend(parsed.get("checks") or [])

    if isinstance(parsed, dict) and "kinds" in parsed:
        kinds = parsed.get("kinds") or {}
        if isinstance(kinds, dict):
            for kind, items in kinds.items():
                if not items:
                    continue
                for item in items:
                    if isinstance(item, dict):
                        item = dict(item)
                        item.setdefault("kind", kind)
                    checks.append(item)

    errors = []
    seen_ids = set()
    for idx, check in enumerate(checks):
        try:
            parsed_check = CheckDefinition(**check)
            if not parsed_check.rules:
                errors.append(
                    {
                        "index": idx,
                        "id": parsed_check.id,
                        "errors": [{"msg": "rules must not be empty"}],
                    }
                )
            if parsed_check.id in seen_ids:
                errors.append(
                    {
                        "index": idx,
                        "id": parsed_check.id,
                        "errors": [{"msg": "duplicate id"}],
                    }
                )
            seen_ids.add(parsed_check.id)
        except ValidationError as e:
            errors.append(
                {
                    "index": idx,
                    "id": check.get("id") if isinstance(check, dict) else None,
                    "errors": e.errors(),
                }
            )

    if errors:
        raise HTTPException(
            status_code=400, detail={"message": "Validation failed", "errors": errors}
        )

    target.write_text(dump_yaml(parsed if parsed is not None else {}))
    # Reload checks library to keep in-memory state aligned.
    app_module.CHECKS_LIBRARY = load_checks_library(base_dir)
    return {"status": "ok", "name": target.name}
