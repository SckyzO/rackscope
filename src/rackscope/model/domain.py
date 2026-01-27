from __future__ import annotations

from typing import List, Optional, Union, Dict

from pydantic import BaseModel, Field, field_validator

# --- Device & Hardware Models ---


class Device(BaseModel):
    id: str = Field(..., description="Unique ID of the chassis/device")
    name: str = Field(..., description="Human readable label")
    template_id: str = Field(..., description="Reference to a catalog template ID")
    u_position: int = Field(..., description="Bottom U position in the rack")

    # Prometheus identity selector for this device or its nodes.
    # Can be a dictionary {slot_num: instance_id} or a string "node[1-4]" (parsed later).
    instance: Union[Dict[int, str], str] = Field(default_factory=dict)
    # Backward-compat: older configs used "nodes".
    nodes: Optional[Union[Dict[int, str], str]] = Field(
        default=None, description="Deprecated; use instance"
    )

    @field_validator("instance", mode="before")
    @classmethod
    def prefer_instance(cls, v, info):
        if v is not None and v != {}:
            return v
        data = info.data or {}
        legacy = data.get("nodes")
        if legacy is not None:
            return legacy
        return v


class Rack(BaseModel):
    id: str = Field(..., description="Unique technical identifier for the rack")
    name: str = Field(..., description="Human-readable name (e.g., 'Rack 11')")
    template_id: Optional[str] = Field(
        None, description="Reference to a rack template (defines infrastructure)"
    )
    u_height: int = Field(42, ge=1, le=60, description="Height in rack units")
    aisle_id: Optional[str] = Field(None, description="ID of the aisle this rack belongs to")

    devices: List[Device] = Field(default_factory=list)


class Aisle(BaseModel):
    id: str = Field(..., description="Unique identifier for the aisle within the room")
    name: str = Field(..., description="Human-readable name (e.g., 'Aisle 4')")
    racks: List[Rack] = Field(default_factory=list)


class Room(BaseModel):
    id: str = Field(..., description="Unique identifier for the room within the site")
    name: str = Field(..., description="Human-readable name")
    description: Optional[str] = None
    aisles: List[Aisle] = Field(default_factory=list)
    # Support for racks outside aisles if necessary
    standalone_racks: List[Rack] = Field(default_factory=list)

    @field_validator("aisles")
    @classmethod
    def ensure_unique_aisle_ids(cls, v: List[Aisle]) -> List[Aisle]:
        ids = [a.id for a in v]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate aisle IDs found in room")
        return v


class Site(BaseModel):
    id: str = Field(..., description="Unique identifier for the site")
    name: str = Field(..., description="Human-readable name")
    rooms: List[Room] = Field(default_factory=list)

    @field_validator("rooms")
    @classmethod
    def ensure_unique_room_ids(cls, v: List[Room]) -> List[Room]:
        ids = [r.id for r in v]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate room IDs found in site")
        return v


class Topology(BaseModel):
    sites: List[Site] = Field(default_factory=list)

    @field_validator("sites")
    @classmethod
    def ensure_unique_site_ids(cls, v: List[Site]) -> List[Site]:
        ids = [s.id for s in v]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate site IDs found in topology")
        return v
