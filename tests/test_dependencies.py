"""Tests for API Dependencies."""

import pytest

from rackscope.api import dependencies
from rackscope.api import app as app_module


@pytest.mark.asyncio
async def test_get_topology_optional_returns_none_when_not_set():
    """Test that get_topology_optional returns None when global not set."""
    # Save original
    original = app_module.TOPOLOGY
    try:
        app_module.TOPOLOGY = None
        result = await dependencies.get_topology_optional()
        assert result is None
    finally:
        # Restore
        app_module.TOPOLOGY = original


@pytest.mark.asyncio
async def test_get_catalog_optional_returns_none_when_not_set():
    """Test that get_catalog_optional returns None when global not set."""
    original = app_module.CATALOG
    try:
        app_module.CATALOG = None
        result = await dependencies.get_catalog_optional()
        assert result is None
    finally:
        app_module.CATALOG = original


@pytest.mark.asyncio
async def test_get_checks_library_optional_returns_none_when_not_set():
    """Test that get_checks_library_optional returns None when global not set."""
    original = app_module.CHECKS_LIBRARY
    try:
        app_module.CHECKS_LIBRARY = None
        result = await dependencies.get_checks_library_optional()
        assert result is None
    finally:
        app_module.CHECKS_LIBRARY = original


@pytest.mark.asyncio
async def test_get_app_config_optional_returns_none_when_not_set():
    """Test that get_app_config_optional returns None when global not set."""
    original = app_module.APP_CONFIG
    try:
        app_module.APP_CONFIG = None
        result = await dependencies.get_app_config_optional()
        assert result is None
    finally:
        app_module.APP_CONFIG = original


@pytest.mark.asyncio
async def test_get_planner_optional_returns_none_when_not_set():
    """Test that get_planner_optional returns None when global not set."""
    original = app_module.PLANNER
    try:
        app_module.PLANNER = None
        result = await dependencies.get_planner_optional()
        assert result is None
    finally:
        app_module.PLANNER = original


@pytest.mark.asyncio
async def test_get_topology_raises_when_not_set():
    """Test that get_topology raises HTTPException when global not set."""
    original = app_module.TOPOLOGY
    try:
        app_module.TOPOLOGY = None
        with pytest.raises(Exception):  # HTTPException
            await dependencies.get_topology()
    finally:
        app_module.TOPOLOGY = original


@pytest.mark.asyncio
async def test_get_catalog_raises_when_not_set():
    """Test that get_catalog raises HTTPException when global not set."""
    original = app_module.CATALOG
    try:
        app_module.CATALOG = None
        with pytest.raises(Exception):  # HTTPException
            await dependencies.get_catalog()
    finally:
        app_module.CATALOG = original


@pytest.mark.asyncio
async def test_get_checks_library_raises_when_not_set():
    """Test that get_checks_library raises HTTPException when global not set."""
    original = app_module.CHECKS_LIBRARY
    try:
        app_module.CHECKS_LIBRARY = None
        with pytest.raises(Exception):  # HTTPException
            await dependencies.get_checks_library()
    finally:
        app_module.CHECKS_LIBRARY = original


@pytest.mark.asyncio
async def test_get_app_config_raises_when_not_set():
    """Test that get_app_config raises HTTPException when global not set."""
    original = app_module.APP_CONFIG
    try:
        app_module.APP_CONFIG = None
        with pytest.raises(Exception):  # HTTPException
            await dependencies.get_app_config()
    finally:
        app_module.APP_CONFIG = original


@pytest.mark.asyncio
async def test_get_planner_raises_when_not_set():
    """Test that get_planner raises HTTPException when global not set."""
    original = app_module.PLANNER
    try:
        app_module.PLANNER = None
        with pytest.raises(Exception):  # HTTPException
            await dependencies.get_planner()
    finally:
        app_module.PLANNER = original
