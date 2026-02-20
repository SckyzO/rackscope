"""Slurm Workload Plugin - Job scheduling and monitoring."""

import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, FastAPI, HTTPException

from rackscope.plugins.base import RackscopePlugin, MenuSection, MenuItem
from rackscope.services import slurm_service, topology_service
from rackscope.model.config import AppConfig
from .config import SlurmPluginConfig

logger = logging.getLogger(__name__)


class SlurmPlugin(RackscopePlugin):
    """
    Slurm Workload Plugin

    Provides integration with Slurm workload manager for job scheduling
    and node state monitoring.
    """

    def __init__(self):
        self._router = APIRouter(tags=["slurm"])
        self.config: Optional[SlurmPluginConfig] = None
        self._setup_routes()

    @property
    def plugin_id(self) -> str:
        return "slurm"

    @property
    def plugin_name(self) -> str:
        return "Slurm Workload"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def description(self) -> str:
        return "Job scheduling and node monitoring via Slurm workload manager"

    @property
    def author(self) -> str:
        return "Rackscope Team"

    def _load_config(self, app_config: Optional[AppConfig]) -> SlurmPluginConfig:
        """
        Load Slurm configuration from app config.

        Supports both new format (plugins.slurm) and legacy format (slurm).
        """
        raw_config = {}

        if app_config:
            # Try new format first (recommended)
            if hasattr(app_config, "plugins") and "slurm" in app_config.plugins:
                slurm_cfg = app_config.plugins["slurm"]
                # Convert to dict, handling both dict and BaseModel
                if hasattr(slurm_cfg, "model_dump"):
                    raw_config = slurm_cfg.model_dump()
                elif hasattr(slurm_cfg, "dict"):
                    raw_config = slurm_cfg.dict()
                elif isinstance(slurm_cfg, dict):
                    raw_config = dict(slurm_cfg)
                else:
                    raw_config = {}
                logger.info("Loading Slurm config from plugins.slurm (new format)")
            # Fallback to legacy format
            elif hasattr(app_config, "slurm") and app_config.slurm:
                raw_config = app_config.slurm.model_dump()
                logger.warning(
                    "Loading Slurm config from legacy format. "
                    "Please migrate to plugins.slurm in app.yaml"
                )

        # Ensure status_map.info exists (for backwards compatibility)
        if "status_map" in raw_config and isinstance(raw_config["status_map"], dict):
            if "info" not in raw_config["status_map"]:
                raw_config["status_map"]["info"] = []

        # Ensure severity_colors exists with defaults
        if "severity_colors" not in raw_config or raw_config["severity_colors"] is None:
            raw_config["severity_colors"] = {
                "ok": "#22c55e",
                "warn": "#f59e0b",
                "crit": "#ef4444",
                "info": "#3b82f6",
            }

        # Validate and create config with defaults
        return SlurmPluginConfig(**raw_config)

    def _get_config(self) -> SlurmPluginConfig:
        """Get current config, loading lazily from APP_CONFIG if not yet initialized."""
        if self.config is None:
            from rackscope.api import app as app_module

            self.config = self._load_config(app_module.APP_CONFIG)
        return self.config

    async def on_startup(self) -> None:
        """Initialize Slurm plugin and load configuration."""
        from rackscope.api.app import APP_CONFIG

        self.config = self._load_config(APP_CONFIG)
        logger.info(
            f"Slurm plugin started (metric={self.config.metric}, roles={self.config.roles})"
        )

    async def on_config_reload(self, app_config: AppConfig) -> None:
        """Reload Slurm configuration when app config changes."""
        self.config = self._load_config(app_config)
        logger.info(
            f"Slurm plugin configuration reloaded (metric={self.config.metric}, "
            f"label_node={self.config.label_node}, enabled={self.config.enabled})"
        )

    def _setup_routes(self) -> None:
        """Setup all Slurm routes."""

        @self._router.get("/api/slurm/rooms/{room_id}/nodes")
        async def get_slurm_room_nodes(room_id: str):
            """Get Slurm node states for a specific room."""
            from rackscope.api import app as app_module

            APP_CONFIG = app_module.APP_CONFIG
            TOPOLOGY = app_module.TOPOLOGY

            if not APP_CONFIG or not TOPOLOGY:
                raise HTTPException(status_code=503, detail="Topology not loaded")

            room = topology_service.find_room_by_id(TOPOLOGY, room_id)
            if not room:
                raise HTTPException(status_code=404, detail="Room not found")

            room_nodes: set[str] = set()
            racks = []
            for aisle in room.aisles:
                racks.extend(aisle.racks)
            racks.extend(room.standalone_racks)
            for rack in racks:
                for device in rack.devices:
                    room_nodes.update(slurm_service.expand_device_instances(device))

            node_states: Dict[str, Dict[str, Any]] = {
                node: {
                    "status": "unknown",
                    "severity": "UNKNOWN",
                    "statuses": [],
                    "partitions": [],
                }
                for node in room_nodes
            }

            slurm_cfg = self._get_config()
            mapping = slurm_service.load_slurm_mapping(slurm_cfg)
            results = await slurm_service.fetch_slurm_results(slurm_cfg)

            if not results:
                return {"room_id": room_id, "nodes": node_states}

            for item in results:
                metric = item.get("metric", {})
                value = item.get("value", [None, "0"])[1]
                try:
                    if float(value) <= 0:
                        continue
                except (TypeError, ValueError):
                    continue
                node = metric.get(slurm_cfg.label_node)
                if node in mapping:
                    node = mapping[node]
                if not node or (room_nodes and node not in room_nodes):
                    continue
                raw_status = metric.get(slurm_cfg.label_status, "unknown")
                partition = metric.get(slurm_cfg.label_partition)
                normalized_status, has_star = slurm_service.normalize_slurm_status(str(raw_status))
                severity = slurm_service.calculate_slurm_severity(
                    normalized_status, has_star, slurm_cfg.status_map
                )

                state = node_states.setdefault(
                    node,
                    {
                        "status": normalized_status,
                        "severity": severity,
                        "statuses": [],
                        "partitions": [],
                    },
                )
                state["statuses"].append(str(raw_status))
                if partition:
                    state["partitions"].append(str(partition))
                if slurm_service.severity_rank(severity) > slurm_service.severity_rank(
                    state["severity"]
                ):
                    state["severity"] = severity
                    state["status"] = normalized_status

            for node_id, state in node_states.items():
                state["statuses"] = sorted(set(state.get("statuses", [])))
                state["partitions"] = sorted(set(state.get("partitions", [])))

            return {"room_id": room_id, "nodes": node_states}

        @self._router.get("/api/slurm/summary")
        async def get_slurm_summary(room_id: Optional[str] = None):
            """Get Slurm status summary."""
            from rackscope.api import app as app_module

            APP_CONFIG = app_module.APP_CONFIG
            TOPOLOGY = app_module.TOPOLOGY

            if not APP_CONFIG or not TOPOLOGY:
                raise HTTPException(status_code=503, detail="Topology not loaded")

            allowed_nodes: Optional[set[str]] = None
            if room_id:
                room = topology_service.find_room_by_id(TOPOLOGY, room_id)
                if not room:
                    raise HTTPException(status_code=404, detail="Room not found")
                allowed_nodes = slurm_service.collect_room_nodes(room)

            slurm_cfg = self._get_config()
            node_states = await slurm_service.build_slurm_states(slurm_cfg, allowed_nodes)
            by_status: Dict[str, int] = {}
            by_severity: Dict[str, int] = {"OK": 0, "WARN": 0, "CRIT": 0, "UNKNOWN": 0}

            for state in node_states.values():
                status = state.get("status_all") or state.get("status")
                severity = state.get("severity_all") or state.get("severity", "UNKNOWN")
                by_status[status] = by_status.get(status, 0) + 1
                by_severity[severity] = by_severity.get(severity, 0) + 1

            return {
                "room_id": room_id,
                "total_nodes": len(node_states),
                "by_status": by_status,
                "by_severity": by_severity,
            }

        @self._router.get("/api/slurm/partitions")
        async def get_slurm_partitions(room_id: Optional[str] = None):
            """Get Slurm partition statistics."""
            from rackscope.api import app as app_module

            APP_CONFIG = app_module.APP_CONFIG
            TOPOLOGY = app_module.TOPOLOGY

            if not APP_CONFIG or not TOPOLOGY:
                raise HTTPException(status_code=503, detail="Topology not loaded")

            allowed_nodes: Optional[set[str]] = None
            if room_id:
                room = topology_service.find_room_by_id(TOPOLOGY, room_id)
                if not room:
                    raise HTTPException(status_code=404, detail="Room not found")
                allowed_nodes = slurm_service.collect_room_nodes(room)

            slurm_cfg = self._get_config()
            mapping = slurm_service.load_slurm_mapping(slurm_cfg)
            results = await slurm_service.fetch_slurm_results(slurm_cfg)
            if not results:
                return {"room_id": room_id, "partitions": {}}

            partitions: Dict[str, Dict[str, int]] = {}
            for item in results:
                metric = item.get("metric", {})
                value = item.get("value", [None, "0"])[1]
                try:
                    if float(value) <= 0:
                        continue
                except (TypeError, ValueError):
                    continue
                node = metric.get(slurm_cfg.label_node)
                if node in mapping:
                    node = mapping[node]
                if not node:
                    continue
                if allowed_nodes is not None and node not in allowed_nodes:
                    continue
                partition = metric.get(slurm_cfg.label_partition, "unknown")
                raw_status = metric.get(slurm_cfg.label_status, "unknown")
                normalized_status, _ = slurm_service.normalize_slurm_status(str(raw_status))
                part = partitions.setdefault(str(partition), {})
                part[normalized_status] = part.get(normalized_status, 0) + 1

            return {"room_id": room_id, "partitions": partitions}

        @self._router.get("/api/slurm/nodes")
        async def get_slurm_nodes(room_id: Optional[str] = None):
            """Get detailed Slurm node list."""
            from rackscope.api import app as app_module

            APP_CONFIG = app_module.APP_CONFIG
            TOPOLOGY = app_module.TOPOLOGY

            if not APP_CONFIG or not TOPOLOGY:
                raise HTTPException(status_code=503, detail="Topology not loaded")

            allowed_nodes: Optional[set[str]] = None
            if room_id:
                room = topology_service.find_room_by_id(TOPOLOGY, room_id)
                if not room:
                    raise HTTPException(status_code=404, detail="Room not found")
                allowed_nodes = slurm_service.collect_room_nodes(room)

            slurm_cfg = self._get_config()
            node_states = await slurm_service.build_slurm_states(slurm_cfg, allowed_nodes)
            context = slurm_service.build_node_context(TOPOLOGY)

            payload = []
            for node_id, state in node_states.items():
                entry = {
                    "node": node_id,
                    "status": state.get("status_all") or state.get("status"),
                    "severity": state.get("severity_all") or state.get("severity", "UNKNOWN"),
                    "statuses": state.get("statuses", []),
                    "partitions": state.get("partitions", []),
                }
                entry.update(context.get(node_id, {}))
                payload.append(entry)

            return {"room_id": room_id, "nodes": payload}

    def register_routes(self, app: FastAPI) -> None:
        """Register Slurm routes."""
        app.include_router(self._router)

    def register_menu_sections(self):
        """Register Slurm menu section."""
        # Reload config from APP_CONFIG to get latest enabled state
        from rackscope.api.app import APP_CONFIG

        current_config = self._load_config(APP_CONFIG)

        # Only return menu sections if plugin is enabled
        if not current_config.enabled:
            return []

        return [
            MenuSection(
                id="workload",
                label="Workload",
                icon="Zap",
                order=50,
                items=[
                    MenuItem(
                        id="slurm-overview",
                        label="Overview",
                        path="/slurm/overview",
                        icon="Activity",
                    ),
                    MenuItem(
                        id="slurm-wallboard",
                        label="Room Wallboard",
                        path="/slurm/wallboard",
                        icon="Columns",
                    ),
                    MenuItem(
                        id="slurm-partitions",
                        label="Partitions",
                        path="/slurm/partitions",
                        icon="Server",
                    ),
                    MenuItem(
                        id="slurm-nodes",
                        label="Nodes",
                        path="/slurm/nodes",
                        icon="HardDrive",
                    ),
                    MenuItem(
                        id="slurm-alerts",
                        label="Alerts",
                        path="/slurm/alerts",
                        icon="AlertTriangle",
                    ),
                ],
            )
        ]
