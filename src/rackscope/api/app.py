"""
FastAPI application entry point.

Manages global state (TOPOLOGY, CATALOG, CHECKS_LIBRARY, METRICS_LIBRARY,
APP_CONFIG, PLANNER), registers plugins via PluginRegistry, and wires up
all API routers.

Global state is reloaded on every PUT /api/config call — see apply_config().
"""

from __future__ import annotations

import asyncio
import os
import secrets
from contextlib import asynccontextmanager, suppress
from importlib.metadata import PackageNotFoundError, version as pkg_version
from typing import Optional, Dict, List

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
import httpx

from rackscope.model.domain import Topology, TopologyIndex, build_topology_index
from rackscope.api.cache import ServiceCache
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

# Plugin imports are deferred — see _plugin_enabled() in lifespan()
from rackscope.api.routers import (
    config,
    catalog,
    checks,
    topology,
    telemetry,
    plugins,
    metrics,
    system,
    auth as auth_router,
)
from rackscope.services.instance_service import expand_device_instances
from rackscope.services import telemetry_service
from rackscope.logging_config import setup_logging, get_logger
from rackscope.api import exceptions
from rackscope.api.middleware import AuthMiddleware, RequestLoggingMiddleware

# Setup logging
setup_logging()
logger = get_logger(__name__)

# Global state
TOPOLOGY: Optional[Topology] = None
TOPOLOGY_INDEX: Optional[TopologyIndex] = None   # O(1) lookup index — rebuilt on every reload
SERVICE_CACHE: ServiceCache = ServiceCache()          # Response-level cache — cleared on topology reload
CATALOG: Optional[Catalog] = None
CHECKS_LIBRARY: Optional[ChecksLibrary] = None
METRICS_LIBRARY: Optional[MetricsLibrary] = None
APP_CONFIG: Optional[AppConfig] = None
PLANNER: Optional[TelemetryPlanner] = None
PROMETHEUS_HEARTBEAT: Optional[asyncio.Task] = None

# Runtime JWT secret — used when auth.secret_key is empty in config
AUTH_RUNTIME_SECRET: str = secrets.token_hex(32)

# Cached result of collect_check_targets() — invalidated on every config reload.
# Avoids a full topology traversal on every HTTP request.
TARGETS_BY_CHECK: Optional[Dict[str, Dict[str, List[str]]]] = None

# Lock preventing concurrent apply_config() calls from creating inconsistent global state
# (e.g. TOPOLOGY from call A with CATALOG from call B).
_CONFIG_RELOAD_LOCK: asyncio.Lock = asyncio.Lock()  # eager init prevents lazy-init race


async def apply_config(app_config: AppConfig) -> None:
    """Reload all global state from a new AppConfig.

    Reconfigures the Prometheus client (URL, auth, TLS, cache TTLs),
    rebuilds the TelemetryPlanner, reloads topology/catalog/checks/metrics,
    and triggers on_config_reload() on all registered plugins.

    Called on startup and on every PUT /api/config request.
    """
    global \
        TOPOLOGY, \
        CATALOG, \
        CHECKS_LIBRARY, \
        METRICS_LIBRARY, \
        APP_CONFIG, \
        PLANNER, \
        TARGETS_BY_CHECK, \
        _CONFIG_RELOAD_LOCK
    if _CONFIG_RELOAD_LOCK is None:
        _CONFIG_RELOAD_LOCK = asyncio.Lock()
    async with _CONFIG_RELOAD_LOCK:
        await _do_apply_config(app_config)


async def _do_apply_config(app_config: AppConfig) -> None:
    """Internal: perform the actual config reload (called under _CONFIG_RELOAD_LOCK).

    All loads are attempted before any global is modified so that a failure
    (e.g. bad topology path) leaves the running state fully intact.
    """
    global TOPOLOGY, TOPOLOGY_INDEX, CATALOG, CHECKS_LIBRARY, METRICS_LIBRARY, APP_CONFIG, PLANNER, TARGETS_BY_CHECK
    # Load everything into locals first — if any raises, globals are untouched.
    new_topology = load_topology(app_config.paths.topology)
    new_catalog = load_catalog(app_config.paths.templates)
    new_checks = load_checks_library(app_config.paths.checks)
    new_metrics = load_metrics_library(app_config.paths.metrics)
    # All loads succeeded — update globals atomically.
    APP_CONFIG = app_config
    TOPOLOGY = new_topology
    TOPOLOGY_INDEX = build_topology_index(new_topology)
    await SERVICE_CACHE.invalidate_all()              # topology changed — all cached responses stale
    CATALOG = new_catalog
    CHECKS_LIBRARY = new_checks
    METRICS_LIBRARY = new_metrics
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
        health_checks_ttl=APP_CONFIG.cache.health_checks_ttl_seconds,
        metrics_ttl=APP_CONFIG.cache.metrics_ttl_seconds,
        timeout=APP_CONFIG.telemetry.prometheus_timeout_seconds,
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
    if app_config.auth.enabled:
        if not app_config.auth.password_hash:
            logger.warning(
                "Auth is enabled but no password_hash is configured. "
                "Set auth.password_hash in app.yaml (generate via Settings UI). "
                "Falling back to authentication disabled for safety."
            )
        if not app_config.auth.secret_key:
            logger.warning(
                "Auth is enabled but no secret_key is configured. "
                "JWT tokens will use a runtime-generated secret (invalidated on restart). "
                "Set auth.secret_key in app.yaml for persistent sessions."
            )
    # Reload plugins with new configuration
    await plugin_registry.reload_plugins(app_config)
    # Eagerly compute the check-targets cache so HTTP requests can use it
    # without triggering a full topology traversal on every call.
    TARGETS_BY_CHECK = (
        telemetry_service.collect_check_targets(TOPOLOGY, CATALOG, CHECKS_LIBRARY)
        if TOPOLOGY and CATALOG and CHECKS_LIBRARY
        else None
    )
    logger.info("Configuration applied successfully")
    return  # end of _do_apply_config


@asynccontextmanager
async def lifespan(app: FastAPI):
    global TOPOLOGY, CATALOG, CHECKS_LIBRARY, METRICS_LIBRARY, APP_CONFIG
    global PLANNER, PROMETHEUS_HEARTBEAT
    app_config_path = os.getenv("RACKSCOPE_APP_CONFIG", "config/app.yaml")

    try:
        if os.path.exists(app_config_path):
            APP_CONFIG = load_app_config(app_config_path)
            await apply_config(APP_CONFIG)
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
                "sites": len(TOPOLOGY.sites) if TOPOLOGY else 0,
                "device_templates": len(CATALOG.device_templates) if CATALOG else 0,
                "rack_templates": len(CATALOG.rack_templates) if CATALOG else 0,
                "checks": len(CHECKS_LIBRARY.checks) if CHECKS_LIBRARY else 0,
                "metrics": len(METRICS_LIBRARY.metrics) if METRICS_LIBRARY else 0,
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

    # Register plugins — conditional on plugins.<id>.enabled in app.yaml.
    # Only load a plugin if it is explicitly enabled; this keeps production
    # deployments lean and prevents unused routes from being mounted.
    def _plugin_enabled(plugin_id: str) -> bool:
        if not APP_CONFIG or not APP_CONFIG.plugins:
            return False
        cfg = APP_CONFIG.plugins.get(plugin_id, {})
        return bool(cfg.get("enabled", False)) if isinstance(cfg, dict) else False

    if _plugin_enabled("simulator"):
        try:
            from plugins.simulator.backend import SimulatorPlugin

            plugin_registry.register(SimulatorPlugin())
            logger.info("Registered Simulator plugin")
        except Exception as e:
            logger.error(f"Failed to register Simulator plugin: {e}", exc_info=True)
    else:
        logger.info("Simulator plugin disabled — skipping registration")

    if _plugin_enabled("slurm"):
        try:
            from plugins.slurm.backend import SlurmPlugin

            plugin_registry.register(SlurmPlugin())
            logger.info("Registered Slurm plugin")
        except Exception as e:
            logger.error(f"Failed to register Slurm plugin: {e}", exc_info=True)
    else:
        logger.info("Slurm plugin disabled — skipping registration")

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

    # Close Prometheus httpx client to release connections cleanly
    try:
        await prom_client.client.aclose()
    except Exception as e:
        logger.warning("Error closing Prometheus client: %s", e)


APP_VERSION = "1.0.0-beta"
try:
    _app_version = pkg_version("rackscope")
except PackageNotFoundError:
    _app_version = APP_VERSION

app = FastAPI(
    title="rackscope",
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Register middleware
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(AuthMiddleware)

# Register exception handlers
app.add_exception_handler(RequestValidationError, exceptions.validation_error_handler)  # type: ignore[arg-type]
app.add_exception_handler(ValidationError, exceptions.pydantic_validation_error_handler)  # type: ignore[arg-type]
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
app.include_router(auth_router.router)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/alerts/active")
async def get_active_alerts():
    """Return all active WARN/CRIT alerts with full topology context.

    Combines node-level alerts (from PlannerSnapshot.node_alerts) and
    rack-level alerts (from PlannerSnapshot.rack_alerts), enriched with
    site/room/rack/device context for display in the alert feed.
    """
    if not TOPOLOGY or not CATALOG or not CHECKS_LIBRARY or not PLANNER:
        return {"alerts": []}
    targets_by_check = TARGETS_BY_CHECK or telemetry_service.collect_check_targets(
        TOPOLOGY, CATALOG, CHECKS_LIBRARY
    )
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
