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
    """Incident duration configuration."""

    rack: int = Field(default=3, ge=1)
    aisle: int = Field(default=5, ge=1)


class SimulatorMetricsCatalog(BaseModel):
    """Metrics catalog configuration."""

    id: str = Field(min_length=1)
    path: str = Field(min_length=1)
    enabled: bool = True


class SimulatorPluginConfig(BaseModel):
    """Configuration for Simulator Plugin."""

    enabled: bool = Field(default=True, description="Enable simulator plugin")
    update_interval_seconds: int = Field(default=20, ge=1, description="Update interval in seconds")
    seed: Optional[int] = Field(
        default=None, description="Random seed for deterministic simulation"
    )
    scenario: Optional[str] = Field(default=None, description="Scenario name to load")
    scale_factor: float = Field(default=1.0, ge=0.0, description="Scale factor for incidents")
    incident_rates: IncidentRates = Field(
        default_factory=IncidentRates, description="Incident rate configuration"
    )
    incident_durations: IncidentDurations = Field(
        default_factory=IncidentDurations, description="Incident duration configuration"
    )
    overrides_path: str = Field(
        default="config/plugins/simulator/overrides.yaml",
        min_length=1,
        description="Path to overrides file",
    )
    default_ttl_seconds: int = Field(
        default=120, ge=0, description="Default TTL for overrides in seconds"
    )
    metrics_catalog_path: str = Field(
        default="config/plugins/simulator/metrics_full.yaml",
        min_length=1,
        description="Path to metrics catalog",
    )
    metrics_catalogs: List[SimulatorMetricsCatalog] = Field(
        default_factory=list, description="List of metrics catalogs"
    )
