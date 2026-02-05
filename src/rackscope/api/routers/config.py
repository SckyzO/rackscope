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

        if registry and hasattr(registry, '_plugins'):
            for plugin_id, plugin in registry._plugins.items():
                if hasattr(plugin, 'config') and plugin.config:
                    # Replace the raw dict with the actual config from the plugin
                    enriched_config['plugins'][plugin_id] = plugin.config.model_dump()

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
            "demo": False,
        },
        "simulator": {
            "update_interval_seconds": 20,
            "seed": None,
            "scenario": None,
            "scale_factor": 1.0,
            "default_ttl_seconds": 120,
            "metrics_catalog_path": "config/simulator_metrics_full.yaml",
            "metrics_catalogs": [
                {
                    "id": "core",
                    "path": "config/simulator_metrics_full.yaml",
                    "enabled": True,
                },
                {
                    "id": "slurm",
                    "path": "config/simulator_metrics_slurm.yaml",
                    "enabled": True,
                },
            ],
            "incident_rates": {
                "node_micro_failure": 0.001,
                "rack_macro_failure": 0.01,
                "aisle_cooling_failure": 0.005,
            },
            "incident_durations": {
                "rack": 3,
                "aisle": 5,
            },
            "overrides_path": "config/simulator_overrides.yaml",
        },
    }


@router.put("/config")
async def update_app_config(payload: AppConfig):
    """Update application configuration."""
    from rackscope.api.app import apply_config

    config_path = Path(os.getenv("RACKSCOPE_APP_CONFIG", "config/app.yaml"))
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with config_path.open("w") as f:
        yaml.safe_dump(payload.model_dump(), f, sort_keys=False)
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
