"""
API Dependencies

Provides FastAPI dependency injection functions for accessing global state.
"""

from typing import Optional

from fastapi import HTTPException

from rackscope.model.domain import Topology
from rackscope.model.catalog import Catalog
from rackscope.model.checks import ChecksLibrary
from rackscope.model.config import AppConfig
from rackscope.telemetry.planner import TelemetryPlanner


async def get_topology() -> Topology:
    """Get topology state (dependency injection)."""
    from rackscope.api import app as app_module

    topology = app_module.TOPOLOGY
    if not topology:
        raise HTTPException(status_code=503, detail="Topology not loaded")
    return topology


async def get_catalog() -> Catalog:
    """Get catalog state (dependency injection)."""
    from rackscope.api import app as app_module

    catalog = app_module.CATALOG
    if not catalog:
        raise HTTPException(status_code=503, detail="Catalog not loaded")
    return catalog


async def get_checks_library() -> ChecksLibrary:
    """Get checks library state (dependency injection)."""
    from rackscope.api import app as app_module

    checks_library = app_module.CHECKS_LIBRARY
    if not checks_library:
        raise HTTPException(status_code=503, detail="Checks library not loaded")
    return checks_library


async def get_app_config() -> AppConfig:
    """Get app config state (dependency injection)."""
    from rackscope.api import app as app_module

    app_config = app_module.APP_CONFIG
    if not app_config:
        raise HTTPException(status_code=503, detail="App config not loaded")
    return app_config


async def get_planner() -> TelemetryPlanner:
    """Get telemetry planner state (dependency injection)."""
    from rackscope.api import app as app_module

    planner = app_module.PLANNER
    if not planner:
        raise HTTPException(status_code=503, detail="Telemetry planner not loaded")
    return planner


async def get_topology_optional() -> Optional[Topology]:
    """Get topology state, returns None if not loaded (no exception)."""
    from rackscope.api import app as app_module

    return app_module.TOPOLOGY


async def get_catalog_optional() -> Optional[Catalog]:
    """Get catalog state, returns None if not loaded (no exception)."""
    from rackscope.api import app as app_module

    return app_module.CATALOG


async def get_checks_library_optional() -> Optional[ChecksLibrary]:
    """Get checks library state, returns None if not loaded (no exception)."""
    from rackscope.api import app as app_module

    return app_module.CHECKS_LIBRARY


async def get_app_config_optional() -> Optional[AppConfig]:
    """Get app config state, returns None if not loaded (no exception)."""
    from rackscope.api import app as app_module

    return app_module.APP_CONFIG


async def get_planner_optional() -> Optional[TelemetryPlanner]:
    """Get telemetry planner state, returns None if not loaded (no exception)."""
    from rackscope.api import app as app_module

    return app_module.PLANNER
