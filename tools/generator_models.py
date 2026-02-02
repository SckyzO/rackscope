"""Pydantic models for topology generator configuration."""

from typing import Optional
from pydantic import BaseModel, Field


class DevicePlacementConfig(BaseModel):
    """Configuration for device placement in a rack."""

    template_id: str = Field(..., description="Device template ID")
    count: int = Field(1, ge=1, description="Number of devices to place")
    u_start: int = Field(1, ge=1, description="Starting U position")
    u_step: Optional[int] = Field(
        None, description="Step between devices (auto-calculated if None)"
    )
    name_pattern: str = Field(..., description="Name pattern (e.g., 'Compute Encl {i:02d}')")
    id_pattern: str = Field(..., description="ID pattern (e.g., '{rack_id}-c{i:02d}')")
    nodes_pattern: Optional[str] = Field(
        None, description="Nodes pattern (e.g., 'compute[{start:03d}-{end:03d}]')"
    )
    nodes_per_device: int = Field(1, ge=1, description="Number of nodes per device")
    node_counter_start: Optional[int] = Field(
        None, description="Starting node counter (global if None)"
    )


class RackConfig(BaseModel):
    """Configuration for rack generation."""

    count: int = Field(1, ge=1, description="Number of racks to generate")
    id_pattern: str = Field(
        ..., description="Rack ID pattern (e.g., 'r{aisle_num:02d}-{rack_num:02d}')"
    )
    name_pattern: str = Field(
        ..., description="Rack name pattern (e.g., 'Rack CPU {rack_num:02d}')"
    )
    template_id: str = Field("standard-42u-air", description="Rack template ID")
    u_height: int = Field(42, ge=1, le=48, description="Rack height in U")
    devices: list[DevicePlacementConfig] = Field(
        default_factory=list, description="Device placement configs"
    )


class AisleConfig(BaseModel):
    """Configuration for aisle generation."""

    id: str = Field(..., description="Aisle ID")
    name: str = Field(..., description="Aisle name")
    racks: list[RackConfig] = Field(default_factory=list, description="Rack configurations")


class RoomConfig(BaseModel):
    """Configuration for room generation."""

    id: str = Field(..., description="Room ID")
    name: str = Field(..., description="Room name")
    aisles: list[AisleConfig] = Field(default_factory=list, description="Aisle configurations")
    standalone_racks: list[RackConfig] = Field(
        default_factory=list, description="Standalone rack configurations"
    )


class LocationConfig(BaseModel):
    """Configuration for site location."""

    generate: bool = Field(False, description="Generate fake location")
    latitude: Optional[float] = Field(None, description="Manual latitude")
    longitude: Optional[float] = Field(None, description="Manual longitude")
    address: Optional[str] = Field(None, description="Manual address")
    country: Optional[str] = Field(None, description="Country for fake location generation")


class SiteConfig(BaseModel):
    """Configuration for site generation."""

    id: str = Field(..., description="Site ID")
    name: str = Field(..., description="Site name")
    location: Optional[LocationConfig] = Field(None, description="Location configuration")
    rooms: list[RoomConfig] = Field(default_factory=list, description="Room configurations")


class NodeCounterConfig(BaseModel):
    """Configuration for global node counters."""

    compute: int = Field(1, description="Starting compute node counter")
    gpu: int = Field(1, description="Starting GPU node counter")
    visu: int = Field(1, description="Starting visu node counter")
    storage: int = Field(1, description="Starting storage node counter")
    io: int = Field(1, description="Starting I/O node counter")
    login: int = Field(1, description="Starting login node counter")
    mgmt: int = Field(1, description="Starting mgmt node counter")


class GeneratorConfig(BaseModel):
    """Main topology generator configuration."""

    version: str = Field("1.0", description="Configuration version")
    description: Optional[str] = Field(None, description="Configuration description")
    node_counters: NodeCounterConfig = Field(
        default_factory=NodeCounterConfig, description="Global node counters"
    )
    sites: list[SiteConfig] = Field(default_factory=list, description="Site configurations")

    class Config:
        extra = "forbid"  # Raise error on unknown fields
