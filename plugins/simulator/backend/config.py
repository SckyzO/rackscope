"""
Simulator Plugin Configuration
"""

from enum import Enum
from typing import Optional, List, Dict

from pydantic import BaseModel, Field


class IncidentMode(str, Enum):
    """Controls the failure pattern injected by the simulator."""

    FULL_OK = "full_ok"
    LIGHT = "light"
    MEDIUM = "medium"
    HEAVY = "heavy"
    CHAOS = "chaos"
    CUSTOM = "custom"


class CustomIncidents(BaseModel):
    """Absolute incident counts used when incident_mode == 'custom'."""

    devices_crit: int = Field(default=0, ge=0)
    devices_warn: int = Field(default=0, ge=0)
    racks_crit: int = Field(default=0, ge=0)
    aisles_hot: int = Field(default=0, ge=0)


class SimulatorMetricsCatalog(BaseModel):
    """Additional metrics catalog to merge on top of the primary catalog."""

    id: str = Field(min_length=1)
    path: str = Field(min_length=1)
    enabled: bool = True


class SimulatorPluginConfig(BaseModel):
    """Configuration for the Simulator Plugin.

    New config folder layout (config/plugins/simulator/):
      config/plugin.yaml   — this file (loaded on startup + hot-reload every tick)
      metrics/             — Prometheus metric generation catalogs
      overrides/           — runtime metric override persistence
      scenarios/           — scenario + behavioral profile definitions
    """

    enabled: bool = Field(default=True)
    update_interval_seconds: int = Field(default=20, ge=1)
    seed: Optional[int] = Field(default=None)
    incident_mode: IncidentMode = Field(default=IncidentMode.LIGHT)
    changes_per_hour: int = Field(default=2, ge=1)
    custom_incidents: CustomIncidents = Field(default_factory=CustomIncidents)

    # Paths use the new folder layout as defaults
    overrides_path: str = Field(
        default="config/plugins/simulator/overrides/overrides.yaml",
    )
    default_ttl_seconds: int = Field(default=120, ge=0)
    metrics_catalog_path: str = Field(
        default="config/plugins/simulator/metrics/metrics_full.yaml",
    )
    metrics_catalogs: List[SimulatorMetricsCatalog] = Field(default_factory=list)

    # Slurm random status injection — forces specific statuses on random nodes each tick
    slurm_random_statuses: Dict[str, int] = Field(
        default_factory=lambda: {"drain": 1, "down": 1, "maint": 1},
        description="Force N nodes to a given Slurm status each reshuffle cycle.",
    )
    slurm_random_match: List[str] = Field(
        default_factory=lambda: ["compute*", "visu*"],
        description="Glob patterns selecting nodes eligible for random Slurm status injection.",
    )
