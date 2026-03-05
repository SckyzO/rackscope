"""
Simulator Plugin Configuration
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class IncidentRates(BaseModel):
    """Incident rate configuration."""

    node_micro_failure: float = Field(default=0.001, ge=0, le=1)
    rack_macro_failure: float = Field(default=0.01, ge=0, le=1)
    aisle_cooling_failure: float = Field(default=0.005, ge=0, le=1)


class IncidentDurations(BaseModel):
    """Incident duration configuration in SECONDS.

    At update_interval=20s:
      rack=300  → 5 minutes (realistic for PDU reset / power restore)
      aisle=600 → 10 minutes (cooling unit restart + temperature stabilization)
    """

    rack: int = Field(default=300, ge=1, description="Rack macro-failure duration in seconds")
    aisle: int = Field(default=600, ge=1, description="Aisle cooling failure duration in seconds")


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
    scenario: Optional[str] = Field(default=None)
    scale_factor: float = Field(default=1.0, ge=0.0)
    incident_rates: IncidentRates = Field(default_factory=IncidentRates)
    incident_durations: IncidentDurations = Field(default_factory=IncidentDurations)

    # Paths use the new folder layout as defaults
    overrides_path: str = Field(
        default="config/plugins/simulator/overrides/overrides.yaml",
    )
    default_ttl_seconds: int = Field(default=120, ge=0)
    metrics_catalog_path: str = Field(
        default="config/plugins/simulator/metrics/metrics_full.yaml",
    )
    metrics_catalogs: List[SimulatorMetricsCatalog] = Field(default_factory=list)
