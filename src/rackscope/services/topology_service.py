"""
Topology Service

Business logic for topology queries and mutations.
"""

from pathlib import Path
from typing import Optional

from rackscope.model.domain import Topology, Room, Rack, TopologyIndex, RackContext
from rackscope.model.catalog import Catalog
from rackscope.model.config import AppConfig


def find_rack_by_id(
    topology: Topology,
    rack_id: str,
    index: Optional[TopologyIndex] = None,
) -> Optional[Rack]:
    """Find rack by ID — O(1) with index, O(n) fallback without.

    Args:
        topology: The topology to search (used as fallback when index absent)
        rack_id: The rack ID to find
        index: Optional TopologyIndex for O(1) lookup

    Returns:
        The rack if found, None otherwise
    """
    if index is not None:
        ctx = index.racks.get(rack_id)
        if ctx is not None:
            return ctx.rack
        # Fall through to O(n) if not in index

    # O(n) fallback — used during startup before index is built
    for site in topology.sites:
        for room in site.rooms:
            for aisle in room.aisles:
                for rack in aisle.racks:
                    if rack.id == rack_id:
                        return rack
            for rack in room.standalone_racks:
                if rack.id == rack_id:
                    return rack
    return None


def find_room_by_id(
    topology: Topology,
    room_id: str,
    index: Optional[TopologyIndex] = None,
) -> Optional[Room]:
    """Find room by ID — O(1) with index, O(n) fallback without.

    Args:
        topology: The topology to search (fallback)
        room_id: The room ID to find
        index: Optional TopologyIndex for O(1) lookup

    Returns:
        The room if found, None otherwise
    """
    if index is not None:
        result = index.rooms.get(room_id)
        if result is not None:
            return result
        # Fall through to O(n) if not in index — handles tests with mock
        # topologies that don't rebuild the index, or temporary index staleness.

    for site in topology.sites:
        for room in site.rooms:
            if room.id == room_id:
                return room
    return None


def find_rack_location(
    rack_id: str,
    topology: Topology,
    index: Optional[TopologyIndex] = None,
) -> Optional[tuple[str, str, Optional[str], bool]]:
    """Find rack location — O(1) with index, O(n) fallback without.

    Args:
        rack_id: The rack ID to find
        topology: The topology to search (fallback)
        index: Optional TopologyIndex for O(1) lookup

    Returns:
        Tuple of (site_id, room_id, aisle_id, is_standalone) if found, None otherwise
    """
    if index is not None:
        ctx: Optional[RackContext] = index.racks.get(rack_id)
        if ctx is not None:
            return ctx.site.id, ctx.room.id, ctx.aisle_id, ctx.is_standalone
        # Fall through to O(n) if not in index

    for site in topology.sites:
        for room in site.rooms:
            for aisle in room.aisles:
                for rack in aisle.racks:
                    if rack.id == rack_id:
                        return site.id, room.id, aisle.id, False
            for rack in room.standalone_racks:
                if rack.id == rack_id:
                    return site.id, room.id, None, True
    return None


def get_aisle_path(
    room_id: str, aisle_id: str, app_config: AppConfig, topology: Topology
) -> Optional[Path]:
    """Find path to aisle YAML file.

    Args:
        room_id: The room ID
        aisle_id: The aisle ID
        app_config: The application configuration
        topology: The topology to search

    Returns:
        Path to the aisle YAML file if found, None otherwise
    """
    base_dir = Path(app_config.paths.topology)
    for site in topology.sites:
        for room in site.rooms:
            if room.id != room_id:
                continue
            for aisle in room.aisles:
                if aisle.id == aisle_id:
                    return (
                        base_dir
                        / "datacenters"
                        / site.id
                        / "rooms"
                        / room.id
                        / "aisles"
                        / aisle.id
                        / "aisle.yaml"
                    )
    return None


def get_rack_path(rack_id: str, app_config: AppConfig, topology: Topology) -> Optional[Path]:
    """Find path to rack YAML file.

    Args:
        rack_id: The rack ID
        app_config: The application configuration
        topology: The topology to search

    Returns:
        Path to the rack YAML file if found, None otherwise
    """
    base_dir = Path(app_config.paths.topology)
    location = find_rack_location(rack_id, topology)
    if not location:
        return None
    site_id, room_id, aisle_id, is_standalone = location
    if is_standalone:
        return (
            base_dir
            / "datacenters"
            / site_id
            / "rooms"
            / room_id
            / "standalone_racks"
            / f"{rack_id}.yaml"
        )
    if aisle_id is None:
        raise ValueError(f"aisle_id must not be None for non-standalone rack {rack_id}")
    return (
        base_dir
        / "datacenters"
        / site_id
        / "rooms"
        / room_id
        / "aisles"
        / aisle_id
        / "racks"
        / f"{rack_id}.yaml"
    )


def get_device_height(template_id: str, catalog: Catalog) -> int:
    """Get device template height in U.

    Args:
        template_id: The device template ID
        catalog: The catalog to search

    Returns:
        Device height in U (default: 1)
    """
    template = catalog.get_device_template(template_id)
    if template and template.u_height:
        return template.u_height
    return 1


def get_rack_height(data: dict, catalog: Catalog) -> int:
    """Get rack height in U from rack data.

    Args:
        data: The rack data dictionary
        catalog: The catalog to search

    Returns:
        Rack height in U (default: 42)
    """
    if data.get("u_height"):
        return int(data["u_height"])
    template_id = data.get("template_id")
    if template_id:
        template = catalog.get_rack_template(template_id)
        if template and template.u_height:
            return template.u_height
    return 42
