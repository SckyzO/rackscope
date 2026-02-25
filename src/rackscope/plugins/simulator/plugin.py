"""Simulator Plugin - Demo mode for rackscope."""

import time
from pathlib import Path
from typing import Annotated, Any, Optional
import logging

import yaml
from fastapi import APIRouter, Depends, FastAPI, HTTPException

from rackscope.plugins.base import RackscopePlugin, MenuSection, MenuItem
from rackscope.api.dependencies import get_app_config_optional
from rackscope.model.config import AppConfig
from .config import SimulatorPluginConfig

logger = logging.getLogger(__name__)


class SimulatorPlugin(RackscopePlugin):
    """
    Simulator Plugin

    Provides demo/testing capabilities with metric overrides and scenarios.
    """

    def __init__(self):
        self._router = APIRouter(prefix="/api/simulator", tags=["simulator"])
        self.config: Optional[SimulatorPluginConfig] = None
        self._setup_routes()

    @property
    def plugin_id(self) -> str:
        return "simulator"

    @property
    def plugin_name(self) -> str:
        return "Simulator"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def description(self) -> str:
        return "Demo mode with metric overrides and test scenarios"

    @property
    def author(self) -> str:
        return "Rackscope Team"

    def _load_config(self, app_config: Optional[AppConfig]) -> SimulatorPluginConfig:
        """
        Load simulator configuration with priority chain:
          1. config/plugins/simulator/config.yml  (dedicated file — recommended)
          2. app.yaml plugins.simulator           (legacy embedded format)
          3. app.yaml simulator                   (legacy top-level format)
          4. Pydantic defaults
        """
        import os
        raw_config: dict = {}

        # 1. Try dedicated config file first (new architecture)
        config_file = self.config_file_path()
        if os.path.exists(config_file):
            try:
                with open(config_file, encoding="utf-8") as f:
                    file_cfg = yaml.safe_load(f) or {}
                if isinstance(file_cfg, dict):
                    raw_config = file_cfg
                    logger.info("Simulator: loaded config from %s", config_file)
            except Exception as exc:
                logger.warning("Simulator: failed to read %s: %s", config_file, exc)

        # 2. Fallback: app.yaml plugins.simulator
        if not raw_config and app_config:
            if hasattr(app_config, "plugins") and "simulator" in app_config.plugins:
                cfg = app_config.plugins["simulator"]
                raw_config = {k: v for k, v in cfg.items() if k != "enabled"} if isinstance(cfg, dict) else {}
                logger.info("Simulator: loaded config from app.yaml plugins.simulator")
            # 3. Fallback: legacy top-level
            elif hasattr(app_config, "simulator") and app_config.simulator:
                raw_config = app_config.simulator.model_dump()
                logger.warning("Simulator: legacy config format — migrate to %s", config_file)

        # Validate and create config with defaults
        return SimulatorPluginConfig(**raw_config)

    async def on_startup(self) -> None:
        """Initialize simulator plugin and load configuration."""
        from rackscope.api.app import APP_CONFIG

        self.config = self._load_config(APP_CONFIG)
        logger.info(
            f"Simulator plugin started (scenario={self.config.scenario}, "
            f"interval={self.config.update_interval_seconds}s)"
        )

    async def on_config_reload(self, app_config: AppConfig) -> None:
        """Reload simulator configuration when app config changes."""
        self.config = self._load_config(app_config)
        logger.info(
            f"Simulator plugin configuration reloaded (scenario={self.config.scenario}, "
            f"enabled={self.config.enabled})"
        )

    def _setup_routes(self) -> None:
        """Setup all simulator routes."""

        @self._router.get("/status")
        async def get_simulator_status():
            """Get simulator status and configuration."""
            sim_path = Path("config/plugins/simulator/scenarios.yaml")

            # Check if simulator is running by trying to reach port 9000
            running = False
            try:
                import httpx

                async with httpx.AsyncClient() as client:
                    response = await client.get("http://localhost:9000/metrics", timeout=1.0)
                    running = response.status_code == 200
            except Exception:
                running = False

            # Load config
            config = {}
            if sim_path.exists():
                try:
                    config = yaml.safe_load(sim_path.read_text()) or {}
                except yaml.YAMLError:
                    pass

            return {
                "running": running,
                "endpoint": "http://localhost:9000/metrics",
                "update_interval": config.get("update_interval_seconds", 20),
                "scenario": config.get("scenario"),
                "overrides_count": len(self._load_overrides(None)),
            }

        @self._router.get("/metrics")
        async def get_available_metrics():
            """Get list of metrics available for override from metrics library."""
            from rackscope.api import app as app_module

            metrics_library = app_module.METRICS_LIBRARY
            if not metrics_library:
                # Fallback to hardcoded metrics if library not loaded
                return {
                    "metrics": [
                        {"id": "up", "name": "Node Up", "unit": "bool", "category": "health"},
                        {
                            "id": "node_temperature_celsius",
                            "name": "Node Temperature",
                            "unit": "°C",
                            "category": "temperature",
                        },
                        {
                            "id": "node_power_watts",
                            "name": "Node Power",
                            "unit": "W",
                            "category": "power",
                        },
                        {
                            "id": "node_load_percent",
                            "name": "Node Load",
                            "unit": "%",
                            "category": "performance",
                        },
                        {
                            "id": "node_health_status",
                            "name": "Node Health Status",
                            "unit": "enum",
                            "category": "health",
                        },
                    ]
                }

            # Return metrics from library
            return {
                "metrics": [
                    {
                        "id": m.id,
                        "name": m.name,
                        "unit": m.display.unit,
                        "category": m.category,
                    }
                    for m in metrics_library.metrics
                ]
            }

        @self._router.post("/incidents")
        async def trigger_incident(
            payload: dict,
            app_config: Annotated[Optional[AppConfig], Depends(get_app_config_optional)],
        ):
            """
            Trigger a simulated incident (rack down, aisle cooling failure).

            Payload:
            - type: "rack_down" or "aisle_cooling"
            - target_id: rack_id or aisle_id
            - duration: Duration in seconds (default: 300)
            """
            incident_type = payload.get("type")
            target_id = payload.get("target_id")
            duration = payload.get("duration", 300)

            if not incident_type or not target_id:
                raise HTTPException(status_code=400, detail="type and target_id are required")

            if incident_type not in ["rack_down", "aisle_cooling"]:
                raise HTTPException(
                    status_code=400,
                    detail="type must be 'rack_down' or 'aisle_cooling'",
                )

            try:
                duration = int(duration)
            except (TypeError, ValueError):
                raise HTTPException(status_code=400, detail="duration must be integer")

            if duration < 0:
                raise HTTPException(status_code=400, detail="duration must be non-negative")

            # Create override for rack_down
            if incident_type == "rack_down":
                override = {
                    "id": f"{target_id}-rack_down-{int(time.time())}",
                    "rack_id": target_id,
                    "metric": "rack_down",
                    "value": 1,
                }
            else:
                # For aisle cooling, we can't directly trigger it via overrides
                # This would need to be implemented in the simulator
                return {
                    "status": "not_implemented",
                    "message": "Aisle cooling incidents not yet supported via API",
                }

            if duration > 0:
                override["expires_at"] = int(time.time()) + duration

            overrides = self._load_overrides(app_config)
            overrides.append(override)
            self._save_overrides(overrides, app_config)

            return {
                "status": "triggered",
                "incident_type": incident_type,
                "target_id": target_id,
                "duration": duration,
                "expires_at": override.get("expires_at"),
            }

        @self._router.get("/overrides")
        def get_simulator_overrides(
            app_config: Annotated[Optional[AppConfig], Depends(get_app_config_optional)],
        ):
            """Get all active simulator overrides."""
            return {"overrides": self._load_overrides(app_config)}

        @self._router.get("/scenarios")
        def get_simulator_scenarios():
            """Get available simulator scenarios."""
            sim_path = Path("config/plugins/simulator/scenarios.yaml")
            if not sim_path.exists():
                return {"scenarios": []}
            try:
                data = yaml.safe_load(sim_path.read_text()) or {}
            except yaml.YAMLError as exc:
                logger.warning(f"Failed to load simulator scenarios: {exc}")
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
                        "description": entry.get("description")
                        if isinstance(entry, dict)
                        else None,
                    }
                )
            return {"scenarios": payload}

        @self._router.post("/overrides")
        def add_simulator_override(
            payload: dict,
            app_config: Annotated[Optional[AppConfig], Depends(get_app_config_optional)],
        ):
            """Add a new simulator override."""
            from rackscope.api import app as app_module

            # Get valid metrics from library if available
            valid_metrics = set()
            metrics_library = app_module.METRICS_LIBRARY
            if metrics_library:
                # Use metric.metric field (Prometheus metric name) not metric.id
                valid_metrics = {m.metric for m in metrics_library.metrics}

            # Fallback to hardcoded metrics if library not loaded
            if not valid_metrics:
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
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported metric. Available: {sorted(valid_metrics)}",
                )
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
            override_id = (
                payload.get("id") or f"{(instance or rack_id)}-{metric}-{int(time.time())}"
            )
            override = {
                "id": override_id,
                "instance": instance,
                "rack_id": rack_id,
                "metric": metric,
                "value": value,
            }
            default_ttl = None
            if app_config and getattr(app_config, "simulator", None):
                default_ttl = getattr(app_config.simulator, "default_ttl_seconds", None)
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
            overrides = self._load_overrides(app_config)
            overrides.append(override)
            self._save_overrides(overrides, app_config)
            return {"overrides": overrides}

        @self._router.delete("/overrides")
        def clear_simulator_overrides(
            app_config: Annotated[Optional[AppConfig], Depends(get_app_config_optional)],
        ):
            """Clear all simulator overrides."""
            self._save_overrides([], app_config)
            return {"overrides": []}

        @self._router.delete("/overrides/{override_id}")
        def delete_simulator_override(
            override_id: str,
            app_config: Annotated[Optional[AppConfig], Depends(get_app_config_optional)],
        ):
            """Delete a specific simulator override."""
            overrides = self._load_overrides(app_config)
            next_overrides = [o for o in overrides if o.get("id") != override_id]
            self._save_overrides(next_overrides, app_config)
            return {"overrides": next_overrides}

    def _overrides_path(self, app_config: Optional[AppConfig]) -> Path:
        """Get path to simulator overrides file."""
        if app_config and getattr(app_config, "simulator", None):
            return Path(app_config.simulator.overrides_path)
        return Path("config/simulator_overrides.yaml")

    def _load_overrides(self, app_config: Optional[AppConfig]) -> list[dict[str, Any]]:
        """Load simulator overrides from YAML file."""
        path = self._overrides_path(app_config)
        if not path.exists():
            return []
        try:
            data = yaml.safe_load(path.read_text()) or {}
        except yaml.YAMLError as exc:
            logger.warning(f"Failed to load overrides: {exc}")
            return []
        return data.get("overrides", []) if isinstance(data, dict) else []

    def _save_overrides(
        self, overrides: list[dict[str, Any]], app_config: Optional[AppConfig]
    ) -> None:
        """Save simulator overrides to YAML file."""
        path = self._overrides_path(app_config)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"overrides": overrides}
        with path.open("w") as f:
            yaml.safe_dump(payload, f, sort_keys=False)

    def register_routes(self, app: FastAPI) -> None:
        """Register simulator routes."""
        app.include_router(self._router)

    def register_menu_sections(self):
        """Register simulator menu section."""
        # Reload config from APP_CONFIG to get latest enabled state
        from rackscope.api.app import APP_CONFIG

        current_config = self._load_config(APP_CONFIG)

        # Only return menu sections if plugin is enabled
        if not current_config.enabled:
            return []

        return [
            MenuSection(
                id="simulator",
                label="Simulator",
                icon="Sparkles",
                order=200,
                items=[
                    MenuItem(
                        id="simulator-control",
                        label="Control Panel",
                        path="/simulator",
                        icon="Sliders",
                    ),
                ],
            )
        ]
