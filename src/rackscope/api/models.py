"""
API Request/Response Models

Pydantic models for FastAPI endpoints.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel
from typing import Literal

from rackscope.model.domain import Device, Rack
from rackscope.model.catalog import DeviceTemplate


class TemplateWriteRequest(BaseModel):
    """Request model for creating/updating templates."""

    kind: Literal["device", "rack"]
    template: Dict[str, Any]


class SiteCreate(BaseModel):
    """Request model for creating a site."""

    id: Optional[str] = None
    name: str


class RoomCreate(BaseModel):
    """Request model for creating a room."""

    id: Optional[str] = None
    name: str
    description: Optional[str] = None


class RoomAislesCreate(BaseModel):
    """Request model for creating aisles in a room."""

    aisles: List[Dict[str, str]]


class AisleOrderUpdate(BaseModel):
    """Request model for updating aisle rack order."""

    room_id: str
    racks: List[str]


class RackTemplateUpdate(BaseModel):
    """Request model for updating rack template."""

    template_id: Optional[str] = None


class RackDeviceCreate(BaseModel):
    """Request model for adding a device to a rack."""

    id: str
    name: str
    template_id: str
    u_position: int
    instance: Optional[Union[Dict[int, str], str]] = None


class RackDeviceUpdate(BaseModel):
    """Request model for updating device position."""

    u_position: int


class RackDevicesUpdate(BaseModel):
    """Request model for replacing all rack devices."""

    devices: List[Device]


class RoomAislesUpdate(BaseModel):
    """Request model for updating room aisles structure."""

    aisles: Dict[str, List[str]]


class DeviceContext(BaseModel):
    """Response model with full device context (device + rack + room + site)."""

    device: Device
    template: Optional[DeviceTemplate] = None
    rack: Rack
    room: Dict[str, str]
    site: Dict[str, str]
    aisle: Optional[Dict[str, str]] = None
