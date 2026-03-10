"""
Config Router

Endpoints for application configuration management.
"""

import os
from pathlib import Path
from typing import Annotated, Dict, Any

import yaml
from fastapi import APIRouter, Depends

from rackscope.api.dependencies import get_app_config_optional
from rackscope.model.config import AppConfig

router = APIRouter(prefix="/api", tags=["config"])


@router.get("/config")
def get_app_config(
    app_config: Annotated[AppConfig | None, Depends(get_app_config_optional)] = None,
):
    """Get current application configuration."""
    if app_config:
        # Enrich plugins config with actual plugin configurations
        from rackscope.plugins.registry import registry

        enriched_config = app_config.model_dump()

        if registry and hasattr(registry, "_plugins"):
            for plugin_id, plugin in registry._plugins.items():
                if hasattr(plugin, "config") and plugin.config:
                    # Replace the raw dict with the actual config from the plugin
                    enriched_config["plugins"][plugin_id] = plugin.config.model_dump()

        return enriched_config
    return {
        "paths": {},
        "refresh": {"room_state_seconds": 30, "rack_state_seconds": 30},
        "cache": {"ttl_seconds": 30},
        "telemetry": {
            "prometheus_url": None,
            "identity_label": "instance",
            "rack_label": "rack_id",
            "chassis_label": "chassis_id",
            "job_regex": ".*",
            "prometheus_heartbeat_seconds": 30,
            "prometheus_latency_window": 20,
            "basic_auth_user": None,
            "basic_auth_password": None,
            "tls_verify": True,
            "tls_ca_file": None,
            "tls_cert_file": None,
            "tls_key_file": None,
        },
        "planner": {
            "unknown_state": "UNKNOWN",
            "cache_ttl_seconds": 30,
            "max_ids_per_query": 50,
        },
        "features": {
            "notifications": False,
            "playlist": False,
            "offline": False,
        },
        "simulator": {
            "update_interval_seconds": 20,
            "seed": None,
            "default_ttl_seconds": 120,
            "overrides_path": "config/plugins/simulator/overrides/overrides.yaml",
            "metrics_catalog_path": "config/plugins/simulator/metrics/metrics_full.yaml",
            "metrics_catalogs": [],
        },
    }


@router.put("/config")
async def update_app_config(
    payload: AppConfig,
    current: Annotated[AppConfig | None, Depends(get_app_config_optional)] = None,
):
    """Update application configuration.

    Auth credentials (password_hash, secret_key) are managed exclusively via
    /api/auth/* endpoints. If the payload arrives with empty values for those
    fields, we preserve the existing ones to avoid accidental credential loss.
    """
    from rackscope.api.app import apply_config

    if current:
        # Preserve credentials that the Settings UI never edits
        if not payload.auth.password_hash and current.auth.password_hash:
            payload = payload.model_copy(
                update={
                    "auth": payload.auth.model_copy(
                        update={"password_hash": current.auth.password_hash}
                    )
                }
            )
        if not payload.auth.secret_key and current.auth.secret_key:
            payload = payload.model_copy(
                update={
                    "auth": payload.auth.model_copy(update={"secret_key": current.auth.secret_key})
                }
            )

    config_path = Path(os.getenv("RACKSCOPE_APP_CONFIG", "config/app.yaml"))
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with config_path.open("w") as f:
        yaml.safe_dump(payload.model_dump(), f, sort_keys=False)

    # Sync simulator plugin config to its dedicated file so that
    # SimulatorPlugin._load_config() picks up the new settings immediately.
    # plugin.yaml has priority over app.yaml for the backend plugin.
    sim_plugin_cfg = payload.plugins.get("simulator") if payload.plugins else None
    if sim_plugin_cfg:
        sim_cfg_path = Path("config/plugins/simulator/config/plugin.yaml")
        sim_cfg_path.parent.mkdir(parents=True, exist_ok=True)
        # Read existing plugin.yaml to preserve process-only fields
        # (profiles, slurm_random_statuses, etc.) that are not exposed in the UI.
        existing: dict = {}
        if sim_cfg_path.exists():
            try:
                existing = yaml.safe_load(sim_cfg_path.read_text()) or {}
            except yaml.YAMLError:
                existing = {}
        sim_data = (
            sim_plugin_cfg.model_dump()
            if hasattr(sim_plugin_cfg, "model_dump")
            else dict(sim_plugin_cfg)
        )
        # Strip the 'enabled' flag — the dedicated file must not own it
        sim_data.pop("enabled", None)
        # Merge: process-only keys from existing file, UI settings on top
        merged = {**existing, **sim_data}
        with sim_cfg_path.open("w") as f:
            f.write("# Simulator Plugin Configuration — managed by Settings UI\n\n")
            yaml.safe_dump(merged, f, sort_keys=False)

    # Sync Slurm plugin config to its dedicated file so that
    # SlurmPlugin._load_config() picks up the new settings immediately.
    # config.yml has priority over app.yaml for the Slurm plugin.
    slurm_plugin_cfg = payload.plugins.get("slurm") if payload.plugins else None
    if slurm_plugin_cfg:
        slurm_cfg_path = Path("config/plugins/slurm/config.yml")
        slurm_cfg_path.parent.mkdir(parents=True, exist_ok=True)
        existing_slurm: dict = {}
        if slurm_cfg_path.exists():
            try:
                existing_slurm = yaml.safe_load(slurm_cfg_path.read_text()) or {}
            except yaml.YAMLError:
                existing_slurm = {}
        slurm_data = (
            slurm_plugin_cfg.model_dump()
            if hasattr(slurm_plugin_cfg, "model_dump")
            else dict(slurm_plugin_cfg)
        )
        # Strip the 'enabled' flag — it belongs to app.yaml only
        slurm_data.pop("enabled", None)
        # Merge: preserve any extra keys in config.yml, UI settings win on conflicts
        merged_slurm = {**existing_slurm, **slurm_data}
        with slurm_cfg_path.open("w") as f:
            f.write("# Slurm Plugin Configuration — managed by Settings UI\n\n")
            yaml.safe_dump(merged_slurm, f, sort_keys=False)

    await apply_config(payload)
    return payload


@router.get("/env")
def get_env() -> Dict[str, Any]:
    """Get environment variables."""
    keys = [
        "RACKSCOPE_APP_CONFIG",
        "RACKSCOPE_CONFIG_DIR",
        "RACKSCOPE_CONFIG",
        "RACKSCOPE_TEMPLATES",
        "RACKSCOPE_CHECKS",
        "PROMETHEUS_URL",
        "PROMETHEUS_CACHE_TTL",
    ]
    return {key: os.getenv(key) for key in keys}


@router.post("/setup/wizard/disable")
async def disable_setup_wizard(
    app_config: Annotated[AppConfig | None, Depends(get_app_config_optional)] = None,
) -> dict:
    """Permanently disable the setup wizard by writing features.wizard=false to app.yaml."""
    import copy

    from rackscope.api.app import apply_config

    if not app_config:
        return {"error": "No app config loaded", "wizard": True}

    updated = copy.deepcopy(app_config)
    updated.features.wizard = False

    config_path = Path(os.getenv("RACKSCOPE_APP_CONFIG", "config/app.yaml"))
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with config_path.open("w") as f:
        yaml.safe_dump(updated.model_dump(), f, sort_keys=False)

    await apply_config(updated)
    return {"wizard": False, "status": "disabled"}


@router.get("/config/profiles")
def list_config_profiles() -> dict:
    """List available config profiles from config/profiles/ and config/examples/.

    Returns all directories that contain an app.yaml file, grouped by type.
    Used by the Settings UI to populate the profile switcher dropdown.
    """
    config_base = Path(os.getenv("RACKSCOPE_CONFIG_DIR", "config"))
    active_cfg = os.getenv("RACKSCOPE_APP_CONFIG", "config/app.yaml")
    profiles = []

    for category in ["profiles", "examples"]:
        base = config_base / category
        if not base.exists():
            continue
        for entry in sorted(base.iterdir()):
            if not entry.is_dir():
                continue
            app_yaml = entry / "app.yaml"
            if not app_yaml.exists():
                continue
            rel_path = f"{category}/{entry.name}/app.yaml"
            profiles.append({
                "name": entry.name,
                "type": category[:-1],  # "profile" or "example"
                "path": rel_path,
                "active": active_cfg.endswith(rel_path) or active_cfg.endswith(f"config/{rel_path}"),
            })

    return {"profiles": profiles, "active": active_cfg}
