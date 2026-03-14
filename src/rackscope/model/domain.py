"""
Physical topology domain models.

Hierarchy: Site → Room → Aisle → Rack → Device → Instance (Prometheus node).

Instance field accepts three formats:
- Pattern string: "compute[001-004]" → expands to 4 node names
- List: ["node01", "node02"]
- Slot map: {1: "node01", 2: "node02"}  (slot_number → instance_name)

The `nodes` field is a deprecated alias for `instance` — kept for backward
compatibility with older YAML configs.

TopologyIndex provides O(1) lookups for any entity after a single O(n) build.
Use build_topology_index(topology) after loading topology to get fast access.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional, Union, Dict

from pydantic import BaseModel, Field, field_validator

# Pattern shared with utils/validation.py — must start with alphanumeric to
# prevent ".." traversal and ".hidden" patterns in filesystem operations.
_TOPOLOGY_ID_PATTERN: re.Pattern = re.compile(r"^[a-z0-9][a-z0-9._-]{0,127}$")


def _validate_topology_id(v: str, field_name: str = "id") -> str:
    """Raise ValueError if v is not a safe topology ID (used as path segment)."""
    if not _TOPOLOGY_ID_PATTERN.match(v or ""):
        raise ValueError(
            f"Invalid {field_name}: {v!r}. "
            "IDs must start with a lowercase letter or digit and contain only "
            "lowercase letters, digits, dots, hyphens and underscores (max 128 chars)."
        )
    return v


class Device(BaseModel):
    id: str = Field(..., description="Unique ID of the chassis/device")
    name: str = Field(..., description="Human readable label")
    template_id: str = Field(..., description="Reference to a catalog template ID")
    u_position: int = Field(..., description="Bottom U position in the rack")

    # Prometheus identity selector for this device or its nodes.
    # Can be a dictionary {slot_num: instance_id}, a list of instances, or a string "node[1-4]".
    instance: Union[Dict[int, str], List[str], str] = Field(default_factory=dict)
    # Backward-compat: older configs used "nodes".
    nodes: Optional[Union[Dict[int, str], List[str], str]] = Field(
        default=None, description="Deprecated; use instance"
    )

    # Additional Prometheus labels for matching metrics (e.g., tray="02" for E-Series shelves)
    labels: Optional[Dict[str, str]] = Field(
        default=None,
        description="Additional Prometheus labels for metric matching (tray, enclosure_id, etc.)",
    )

    @field_validator("instance", mode="before")
    @classmethod
    def prefer_instance(cls, v, info):
        """Fall back to legacy `nodes` field if `instance` is empty.

        Allows old YAML configs with `nodes:` to work without migration.
        New configs should use `instance:` exclusively.
        """
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

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        return _validate_topology_id(v, "rack_id")


class Aisle(BaseModel):
    id: str = Field(..., description="Unique identifier for the aisle within the room")
    name: str = Field(..., description="Human-readable name (e.g., 'Aisle 4')")
    racks: List[Rack] = Field(default_factory=list)

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        return _validate_topology_id(v, "aisle_id")


class RoomLayoutSize(BaseModel):
    width: float = Field(default=24, ge=1)
    height: float = Field(default=16, ge=1)


class RoomLayoutOrientation(BaseModel):
    north: str = Field(default="top", description="top|right|bottom|left")


class RoomLayoutGrid(BaseModel):
    enabled: bool = False
    cell: float = Field(default=32, ge=4)


class RoomLayoutDoor(BaseModel):
    side: str = Field(default="west", description="north|south|east|west")
    label: Optional[str] = Field(default="Entrance")
    position: float = Field(default=0.2, ge=0.0, le=1.0)


class RoomLayout(BaseModel):
    shape: str = Field(default="rectangle", description="rectangle|polygon")
    size: RoomLayoutSize = Field(default_factory=RoomLayoutSize)
    orientation: RoomLayoutOrientation = Field(default_factory=RoomLayoutOrientation)
    grid: RoomLayoutGrid = Field(default_factory=RoomLayoutGrid)
    door: Optional[RoomLayoutDoor] = Field(default_factory=RoomLayoutDoor)


class Room(BaseModel):
    id: str = Field(..., description="Unique identifier for the room within the site")
    name: str = Field(..., description="Human-readable name")
    description: Optional[str] = None
    layout: Optional[RoomLayout] = None
    aisles: List[Aisle] = Field(default_factory=list)
    # Support for racks outside aisles if necessary
    standalone_racks: List[Rack] = Field(default_factory=list)

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        return _validate_topology_id(v, "room_id")

    @field_validator("aisles")
    @classmethod
    def ensure_unique_aisle_ids(cls, v: List[Aisle]) -> List[Aisle]:
        """Reject duplicate aisle IDs within the same room."""
        ids = [a.id for a in v]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate aisle IDs found in room")
        return v


class SiteLocation(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None


class Site(BaseModel):
    id: str = Field(..., description="Unique identifier for the site")
    name: str = Field(..., description="Human-readable name")
    description: Optional[str] = None
    location: Optional["SiteLocation"] = None
    rooms: List[Room] = Field(default_factory=list)

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        return _validate_topology_id(v, "site_id")

    @field_validator("rooms")
    @classmethod
    def ensure_unique_room_ids(cls, v: List[Room]) -> List[Room]:
        """Reject duplicate room IDs within the same site."""
        ids = [r.id for r in v]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate room IDs found in site")
        return v


class Topology(BaseModel):
    sites: List[Site] = Field(default_factory=list)

    @field_validator("sites")
    @classmethod
    def ensure_unique_site_ids(cls, v: List[Site]) -> List[Site]:
        """Reject duplicate site IDs in the topology."""
        ids = [s.id for s in v]
        if len(ids) != len(set(ids)):
            raise ValueError("Duplicate site IDs found in topology")
        return v


# ── Topology Index ─────────────────────────────────────────────────────────────


@dataclass
class RackContext:
    """Full location context for a rack — avoids repeated topology traversal."""

    rack: "Rack"
    site: "Site"
    room: "Room"
    aisle_id: Optional[str]  # None for standalone racks
    is_standalone: bool


@dataclass
class InstanceContext:
    """Full location context for a Prometheus instance name."""

    device: "Device"
    rack: "Rack"
    room: "Room"
    site: "Site"


@dataclass
class TopologyIndex:
    """O(1) lookup index built from a Topology.

    Build once after loading topology with build_topology_index().
    Rebuild on every topology reload (apply_config).

    All dicts are keyed by the entity's .id field, except instances
    which are keyed by the Prometheus instance name (string).
    """

    sites: Dict[str, "Site"] = field(default_factory=dict)
    rooms: Dict[str, "Room"] = field(default_factory=dict)
    aisles: Dict[str, "Aisle"] = field(default_factory=dict)
    racks: Dict[str, RackContext] = field(default_factory=dict)
    devices: Dict[str, "tuple[Device, str]"] = field(
        default_factory=dict
    )  # device_id → (Device, rack_id)
    instances: Dict[str, InstanceContext] = field(default_factory=dict)


_MAX_INSTANCE_RANGE = 10_000  # prevents DoS via "compute[0-999999]" patterns


def _expand_instances(device: "Device") -> List[str]:
    """Expand device.instance into a flat list of Prometheus instance names.

    Supports:
    - Pattern string: "compute[001-004]" → ["compute001", ..., "compute004"]
    - List: ["node01", "node02"] → same
    - Slot map: {1: "node01", 2: "node02"} → ["node01", "node02"]
    - Single string: "node01" → ["node01"]
    """
    inst = device.instance
    if not inst:
        return []

    if isinstance(inst, dict):
        return list(inst.values())

    if isinstance(inst, list):
        return list(inst)

    # String — check for range pattern like "compute[001-004]"
    assert isinstance(inst, str)
    match = re.match(r"^(.*?)\[(\d+)-(\d+)\](.*)$", inst)
    if match:
        prefix, start_s, end_s, suffix = match.groups()
        count = int(end_s) - int(start_s) + 1
        if count > _MAX_INSTANCE_RANGE:
            raise ValueError(
                f"Instance range too large: {count} (max {_MAX_INSTANCE_RANGE}). "
                f"Pattern: {inst!r}. Use explicit list for large device counts."
            )
        width = len(start_s)
        return [
            f"{prefix}{str(i).zfill(width)}{suffix}" for i in range(int(start_s), int(end_s) + 1)
        ]

    return [inst]


_topo_index_logger = logging.getLogger(__name__)


def build_topology_index(topology: Topology) -> TopologyIndex:
    """Build a TopologyIndex from a Topology in a single O(n) pass.

    This is the only O(n) operation — after this, all lookups are O(1).
    Call this once after loading or reloading topology.
    """
    idx = TopologyIndex()

    for site in topology.sites:
        idx.sites[site.id] = site

        for room in site.rooms:
            idx.rooms[room.id] = room

            for aisle in room.aisles:
                idx.aisles[aisle.id] = aisle

                for rack in aisle.racks:
                    ctx = RackContext(
                        rack=rack,
                        site=site,
                        room=room,
                        aisle_id=aisle.id,
                        is_standalone=False,
                    )
                    idx.racks[rack.id] = ctx

                    for device in rack.devices:
                        idx.devices[device.id] = (device, rack.id)
                        for inst_name in _expand_instances(device):
                            if inst_name in idx.instances:
                                existing = idx.instances[inst_name]
                                _topo_index_logger.warning(
                                    "Instance name collision: %r already mapped to "
                                    "device=%r rack=%r — overwriting with device=%r rack=%r",
                                    inst_name,
                                    existing.device.id,
                                    existing.rack.id,
                                    device.id,
                                    rack.id,
                                )
                            idx.instances[inst_name] = InstanceContext(
                                device=device, rack=rack, room=room, site=site
                            )

            for rack in room.standalone_racks:
                ctx = RackContext(
                    rack=rack,
                    site=site,
                    room=room,
                    aisle_id=None,
                    is_standalone=True,
                )
                idx.racks[rack.id] = ctx

                for device in rack.devices:
                    idx.devices[device.id] = (device, rack.id)
                    for inst_name in _expand_instances(device):
                        if inst_name in idx.instances:
                            existing = idx.instances[inst_name]
                            _topo_index_logger.warning(
                                "Instance name collision: %r already mapped to "
                                "device=%r rack=%r — overwriting with device=%r rack=%r",
                                inst_name,
                                existing.device.id,
                                existing.rack.id,
                                device.id,
                                rack.id,
                            )
                        idx.instances[inst_name] = InstanceContext(
                            device=device, rack=rack, room=room, site=site
                        )

    return idx
