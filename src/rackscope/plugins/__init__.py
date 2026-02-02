"""
Rackscope Plugin System

This package provides the plugin architecture that allows extending Rackscope
with optional features (Slurm integration, simulator, etc.) without modifying core.
"""

from rackscope.plugins.base import RackscopePlugin, MenuSection, MenuItem
from rackscope.plugins.registry import PluginRegistry

__all__ = ["RackscopePlugin", "MenuSection", "MenuItem", "PluginRegistry"]
