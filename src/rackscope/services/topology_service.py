"""
Topology Service

Business logic for topology queries and mutations.
"""

from pathlib import Path
from typing import Optional

from rackscope.model.domain import Topology, Room, Rack
from rackscope.model.catalog import Catalog
from rackscope.model.config import AppConfig


def find_rack_by_id(topology: Topology, rack_id: str) -> Optional[Rack]:
    """Find rack by ID in topology.

    Args:
        topology: The topology to search
        rack_id: The rack ID to find

    Returns:
        The rack if found, None otherwise
    """
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


def find_room_by_id(topology: Topology, room_id: str) -> Optional[Room]:
    """Find room by ID in topology.

    Args:
        topology: The topology to search
        room_id: The room ID to find

    Returns:
        The room if found, None otherwise
    """
    for site in topology.sites:
        for room in site.rooms:
            if room.id == room_id:
                return room
    return None


def find_rack_location(
    rack_id: str, topology: Topology
) -> Optional[tuple[str, str, Optional[str], bool]]:
    """Find rack location in topology.

    Args:
        rack_id: The rack ID to find
        topology: The topology to search

    Returns:
        Tuple of (site_id, room_id, aisle_id, is_standalone) if found, None otherwise
    """
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
