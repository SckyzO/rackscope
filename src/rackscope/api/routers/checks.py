"""
Checks Router

Endpoints for health checks library management.
"""

from pathlib import Path
from typing import Annotated, Dict, Any, Optional

import httpx
import yaml
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from pydantic import ValidationError

from rackscope.model.checks import CheckDefinition, ChecksLibrary
from rackscope.model.config import AppConfig
from rackscope.model.loader import load_checks_library, dump_yaml
from rackscope.api.dependencies import get_app_config, get_checks_library_optional


class CheckTestRequest(BaseModel):
    """Request model for testing a PromQL check expression."""

    expr: str
    variables: Dict[str, str] = {}


router = APIRouter(prefix="/api/checks", tags=["checks"])


def _validate_safe_path(name: str, base_dir: Path) -> Path:
    """Validate that a user-supplied filename stays within base_dir.

    Raises HTTPException 400 if name contains traversal sequences.
    Raises HTTPException 403 if the resolved path escapes base_dir.
    """
    if not name or ".." in name or name.startswith("/") or name.startswith("\\"):
        raise HTTPException(status_code=400, detail="Invalid filename")
    target = (base_dir / name).resolve()
    try:
        target.relative_to(base_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    return target


@router.get("")
def get_checks_library(
    checks_library: Annotated[Optional[ChecksLibrary], Depends(get_checks_library_optional)],
):
    """Get the checks library."""
    return checks_library if checks_library else {"checks": []}


@router.get("/files")
def get_checks_files(
    app_config: Annotated[AppConfig, Depends(get_app_config)],
):
    """Get list of checks YAML files."""
    base_dir = Path(app_config.paths.checks)
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
def read_checks_file(
    name: str,
    app_config: Annotated[AppConfig, Depends(get_app_config)],
):
    """Read a checks YAML file."""
    base_dir = Path(app_config.paths.checks)
    if base_dir.is_dir():
        target = _validate_safe_path(name, base_dir)
    else:
        target = base_dir
    if not target.exists():
        raise HTTPException(status_code=404, detail="Checks file not found")
    return {"name": target.name, "content": target.read_text()}


@router.put("/files/{name}")
def write_checks_file(
    name: str,
    payload: Dict[str, Any],
    app_config: Annotated[AppConfig, Depends(get_app_config)],
):
    """Write a checks YAML file."""
    # Lazy import to avoid circular dependency (only needed for mutation)
    from rackscope.api import app as app_module

    base_dir = Path(app_config.paths.checks)
    if base_dir.is_dir():
        base_dir.mkdir(parents=True, exist_ok=True)
        target = _validate_safe_path(name, base_dir)
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

    checks: list[dict] = []
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


@router.post("/test")
async def test_check_query(
    payload: CheckTestRequest,
    app_config: Annotated[AppConfig, Depends(get_app_config)],
):
    """Test a PromQL expression by substituting variables and querying Prometheus."""
    expr = payload.expr.strip()
    if not expr:
        raise HTTPException(status_code=400, detail="Expression is required")

    # Substitute $var placeholders with user-provided values
    for key, value in payload.variables.items():
        expr = expr.replace(f"${key}", value)

    prom_url = getattr(app_config.telemetry, "prometheus_url", None) or "http://localhost:9090"
    prom_url = prom_url.rstrip("/")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{prom_url}/api/v1/query",
                params={"query": expr},
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Prometheus query timed out (15s)")
    except httpx.ConnectError as exc:
        raise HTTPException(status_code=502, detail=f"Cannot reach Prometheus: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    if resp.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Prometheus returned HTTP {resp.status_code}: {resp.text[:300]}",
        )

    return {"expr": expr, "prometheus": resp.json()}
