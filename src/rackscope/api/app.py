from __future__ import annotations

import os
import asyncio
from contextlib import asynccontextmanager, suppress
from typing import Optional, Dict

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
import httpx

from rackscope.model.domain import Topology
from rackscope.model.catalog import Catalog
from rackscope.model.checks import ChecksLibrary
from rackscope.model.metrics import MetricsLibrary
from rackscope.model.config import AppConfig
from rackscope.model.loader import (
    load_topology,
    load_catalog,
    load_checks_library,
    load_metrics_library,
    load_app_config,
)
from rackscope.telemetry.prometheus import client as prom_client
from rackscope.telemetry.planner import TelemetryPlanner, PlannerConfig
from rackscope.plugins.registry import registry as plugin_registry
from rackscope.plugins.simulator import SimulatorPlugin
from rackscope.plugins.slurm import SlurmPlugin
from rackscope.api.routers import (
    config,
    catalog,
    checks,
    topology,
    telemetry,
    plugins,
    metrics,
    system,
)
from rackscope.services.instance_service import expand_device_instances
from rackscope.services import telemetry_service
from rackscope.logging_config import setup_logging, get_logger
from rackscope.api import exceptions
from rackscope.api.middleware import RequestLoggingMiddleware

# Setup logging
setup_logging()
logger = get_logger(__name__)

# Global state
TOPOLOGY: Optional[Topology] = None
CATALOG: Optional[Catalog] = None
CHECKS_LIBRARY: Optional[ChecksLibrary] = None
METRICS_LIBRARY: Optional[MetricsLibrary] = None
APP_CONFIG: Optional[AppConfig] = None
PLANNER: Optional[TelemetryPlanner] = None
PROMETHEUS_HEARTBEAT: Optional[asyncio.Task] = None


# Telemetry helper functions now in telemetry_service


def apply_config(app_config: AppConfig) -> None:
    global TOPOLOGY, CATALOG, CHECKS_LIBRARY, METRICS_LIBRARY, APP_CONFIG, PLANNER
    APP_CONFIG = app_config
    TOPOLOGY = load_topology(app_config.paths.topology)
    CATALOG = load_catalog(app_config.paths.templates)
    CHECKS_LIBRARY = load_checks_library(app_config.paths.checks)
    METRICS_LIBRARY = load_metrics_library(app_config.paths.metrics)
    base_url = APP_CONFIG.telemetry.prometheus_url or prom_client.base_url
    auth = None
    if APP_CONFIG.telemetry.basic_auth_user:
        auth = httpx.BasicAuth(
            APP_CONFIG.telemetry.basic_auth_user,
            APP_CONFIG.telemetry.basic_auth_password or "",
        )
    verify: bool | str = True
    if not APP_CONFIG.telemetry.tls_verify:
        verify = False
    elif APP_CONFIG.telemetry.tls_ca_file:
        verify = APP_CONFIG.telemetry.tls_ca_file
    cert = None
    if APP_CONFIG.telemetry.tls_cert_file and APP_CONFIG.telemetry.tls_key_file:
        cert = (APP_CONFIG.telemetry.tls_cert_file, APP_CONFIG.telemetry.tls_key_file)
    prom_client.configure(
        base_url=base_url,
        cache_ttl=APP_CONFIG.cache.ttl_seconds,
        auth=auth,
        verify=verify,
        cert=cert,
        latency_window=APP_CONFIG.telemetry.prometheus_latency_window,
        debug_stats=APP_CONFIG.telemetry.debug_stats,
    )
    PLANNER = TelemetryPlanner(
        PlannerConfig(
            identity_label=APP_CONFIG.telemetry.identity_label,
            rack_label=APP_CONFIG.telemetry.rack_label,
            chassis_label=APP_CONFIG.telemetry.chassis_label,
            job_regex=APP_CONFIG.telemetry.job_regex,
            unknown_state=APP_CONFIG.planner.unknown_state,
            cache_ttl_seconds=APP_CONFIG.planner.cache_ttl_seconds,
            max_ids_per_query=APP_CONFIG.planner.max_ids_per_query,
        )
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global TOPOLOGY, CATALOG, CHECKS_LIBRARY, METRICS_LIBRARY, APP_CONFIG
    global PLANNER, PROMETHEUS_HEARTBEAT
    app_config_path = os.getenv("RACKSCOPE_APP_CONFIG", "config/app.yaml")

    try:
        if os.path.exists(app_config_path):
            APP_CONFIG = load_app_config(app_config_path)
            apply_config(APP_CONFIG)
        else:
            config_dir = os.getenv("RACKSCOPE_CONFIG_DIR", "config")
            config_path = os.getenv(
                "RACKSCOPE_CONFIG", os.path.join(config_dir, "topology", "topology.yaml")
            )
            templates_dir = os.getenv("RACKSCOPE_TEMPLATES", os.path.join(config_dir, "templates"))
            checks_path = os.getenv(
                "RACKSCOPE_CHECKS", os.path.join(config_dir, "checks", "library")
            )
            metrics_path = os.getenv(
                "RACKSCOPE_METRICS", os.path.join(config_dir, "metrics", "library")
            )
            TOPOLOGY = load_topology(config_path)
            CATALOG = load_catalog(templates_dir)
            CHECKS_LIBRARY = load_checks_library(checks_path)
            METRICS_LIBRARY = load_metrics_library(metrics_path)
            APP_CONFIG = None
            PLANNER = TelemetryPlanner()
        logger.info(
            "Configuration loaded successfully",
            extra={
                "sites": len(TOPOLOGY.sites),
                "device_templates": len(CATALOG.device_templates),
                "rack_templates": len(CATALOG.rack_templates),
                "checks": len(CHECKS_LIBRARY.checks),
                "metrics": len(METRICS_LIBRARY.metrics),
            },
        )
    except Exception as e:
        logger.error(f"Failed to load configuration: {e}", exc_info=True)
        TOPOLOGY = Topology()
        CATALOG = Catalog()
        CHECKS_LIBRARY = ChecksLibrary()
        METRICS_LIBRARY = MetricsLibrary()
        APP_CONFIG = None
        PLANNER = TelemetryPlanner()
    heartbeat_seconds = 60
    if APP_CONFIG:
        heartbeat_seconds = max(10, APP_CONFIG.telemetry.prometheus_heartbeat_seconds)

    async def _heartbeat() -> None:
        while True:
            try:
                await prom_client.ping()
            except Exception as e:
                logger.warning(f"Prometheus heartbeat error: {e}")
            await asyncio.sleep(heartbeat_seconds)

    PROMETHEUS_HEARTBEAT = asyncio.create_task(_heartbeat())

    # Register plugins
    try:
        simulator_plugin = SimulatorPlugin()
        plugin_registry.register(simulator_plugin)
        logger.info("Registered Simulator plugin")
    except Exception as e:
        logger.error(f"Failed to register Simulator plugin: {e}", exc_info=True)

    try:
        slurm_plugin = SlurmPlugin()
        plugin_registry.register(slurm_plugin)
        logger.info("Registered Slurm plugin")
    except Exception as e:
        logger.error(f"Failed to register Slurm plugin: {e}", exc_info=True)

    # Initialize plugin system
    try:
        await plugin_registry.initialize(app)
        logger.info(f"Plugin system initialized with {plugin_registry.count()} plugin(s)")
    except Exception as e:
        logger.error(f"Failed to initialize plugin system: {e}", exc_info=True)

    yield

    # Shutdown plugin system
    try:
        await plugin_registry.shutdown()
        logger.info("Plugin system shutdown complete")
    except Exception as e:
        logger.error(f"Error during plugin system shutdown: {e}", exc_info=True)

    if PROMETHEUS_HEARTBEAT:
        PROMETHEUS_HEARTBEAT.cancel()
        with suppress(asyncio.CancelledError):
            await PROMETHEUS_HEARTBEAT


app = FastAPI(title="rackscope", version="0.0.0", lifespan=lifespan)

# Register middleware
app.add_middleware(RequestLoggingMiddleware)

# Register exception handlers
app.add_exception_handler(RequestValidationError, exceptions.validation_error_handler)
app.add_exception_handler(ValidationError, exceptions.pydantic_validation_error_handler)
app.add_exception_handler(Exception, exceptions.generic_exception_handler)

# Register routers
app.include_router(config.router)
app.include_router(system.router)
# Simulator router now registered as plugin
# Slurm router now registered as plugin
app.include_router(catalog.router)
app.include_router(checks.router)
app.include_router(topology.router)
app.include_router(telemetry.router)
app.include_router(metrics.router)
app.include_router(plugins.router)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/alerts/active")
async def get_active_alerts():
    if not TOPOLOGY or not CHECKS_LIBRARY or not PLANNER:
        return {"alerts": []}
    targets_by_check = telemetry_service.collect_check_targets(TOPOLOGY, CATALOG, CHECKS_LIBRARY)
    snapshot = await PLANNER.get_snapshot(TOPOLOGY, CHECKS_LIBRARY, targets_by_check)

    node_context: Dict[str, Dict[str, str]] = {}
    for site in TOPOLOGY.sites:
        for room in site.rooms:
            for aisle in room.aisles:
                for rack in aisle.racks:
                    for device in rack.devices:
                        for node_id in expand_device_instances(device):
                            node_context[node_id] = {
                                "site_id": site.id,
                                "site_name": site.name,
                                "room_id": room.id,
                                "room_name": room.name,
                                "rack_id": rack.id,
                                "rack_name": rack.name,
                                "device_id": device.id,
                                "device_name": device.name,
                            }
            for rack in room.standalone_racks:
                for device in rack.devices:
                    for node_id in expand_device_instances(device):
                        node_context[node_id] = {
                            "site_id": site.id,
                            "site_name": site.name,
                            "room_id": room.id,
                            "room_name": room.name,
                            "rack_id": rack.id,
                            "rack_name": rack.name,
                            "device_id": device.id,
                            "device_name": device.name,
                        }

    # Build rack context
    rack_context: Dict[str, Dict[str, str]] = {}
    for site in TOPOLOGY.sites:
        for room in site.rooms:
            for aisle in room.aisles:
                for rack in aisle.racks:
                    rack_context[rack.id] = {
                        "site_id": site.id,
                        "site_name": site.name,
                        "room_id": room.id,
                        "room_name": room.name,
                        "rack_name": rack.name,
                    }
            for rack in room.standalone_racks:
                rack_context[rack.id] = {
                    "site_id": site.id,
                    "site_name": site.name,
                    "room_id": room.id,
                    "room_name": room.name,
                    "rack_name": rack.name,
                }

    alerts = []

    # Node-level alerts
    for node_id, node_checks in snapshot.node_alerts.items():
        context = node_context.get(node_id)
        if not context:
            continue
        alerts.append(
            {
                "type": "node",
                "node_id": node_id,
                "state": snapshot.node_states.get(node_id, "UNKNOWN"),
                "checks": [{"id": cid, "severity": sev} for cid, sev in node_checks.items()],
                **context,
            }
        )

    # Rack-level alerts
    for rack_id, rack_checks in snapshot.rack_alerts.items():
        context = rack_context.get(rack_id)
        if not context:
            continue
        alerts.append(
            {
                "type": "rack",
                "rack_id": rack_id,
                "state": snapshot.rack_states.get(rack_id, "UNKNOWN"),
                "checks": [{"id": cid, "severity": sev} for cid, sev in rack_checks.items()],
                **context,
            }
        )

    return {"alerts": alerts}
