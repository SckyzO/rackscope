"""
Topology Router

Endpoints for topology management (sites, rooms, aisles, racks, devices).
"""

from pathlib import Path
from typing import List, Optional, Dict, Annotated

import shutil
import yaml
from fastapi import APIRouter, HTTPException, Depends

from rackscope.model.domain import Site, Room, Rack, Topology
from rackscope.model.catalog import Catalog
from rackscope.model.config import AppConfig
from rackscope.model.loader import load_topology, dump_yaml
from rackscope.api.dependencies import (
    get_topology,
    get_catalog,
    get_app_config,
    get_topology_optional,
)
from rackscope.services import topology_service
from rackscope.utils.validation import safe_segment
from rackscope.api.models import (
    SiteCreate,
    RoomCreate,
    RoomAislesCreate,
    AisleOrderUpdate,
    RackTemplateUpdate,
    RackDeviceCreate,
    RackDeviceUpdate,
    RackDevicesUpdate,
    RoomAislesUpdate,
    DeviceContext,
)

router = APIRouter(tags=["topology"])


# Sites endpoints


@router.get("/api/sites", response_model=List[Site])
async def get_sites(topology: Annotated[Optional[Topology], Depends(get_topology_optional)]):
    """Get all sites."""
    return topology.sites if topology else []


@router.post("/api/topology/sites")
async def create_site(
    payload: SiteCreate, app_config: Annotated[AppConfig, Depends(get_app_config)]
):
    """Create a new site."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Site name is required")

    base_dir = Path(app_config.paths.topology)
    sites_path = base_dir / "sites.yaml"
    if not sites_path.exists():
        raise HTTPException(status_code=404, detail="Topology sites file not found")

    data = yaml.safe_load(sites_path.read_text()) or {}
    sites = data.get("sites") or []
    site_id = safe_segment(payload.id or name, "site")

    if any(site.get("id") == site_id for site in sites):
        raise HTTPException(status_code=400, detail="Site id already exists")

    site_entry = {"id": site_id, "name": name, "rooms": []}
    sites.append(site_entry)
    data["sites"] = sites
    sites_path.write_text(dump_yaml(data))

    (base_dir / "datacenters" / site_id / "rooms").mkdir(parents=True, exist_ok=True)

    app_module.TOPOLOGY = load_topology(app_config.paths.topology)
    return {"site": site_entry}


# Rooms endpoints


@router.post("/api/topology/sites/{site_id}/rooms")
async def create_room(
    site_id: str, payload: RoomCreate, app_config: Annotated[AppConfig, Depends(get_app_config)]
):
    """Create a new room under a site."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Room name is required")

    base_dir = Path(app_config.paths.topology)
    sites_path = base_dir / "sites.yaml"
    if not sites_path.exists():
        raise HTTPException(status_code=404, detail="Topology sites file not found")

    data = yaml.safe_load(sites_path.read_text()) or {}
    sites = data.get("sites") or []
    site_entry = next((site for site in sites if site.get("id") == site_id), None)
    if not site_entry:
        raise HTTPException(status_code=404, detail="Site not found")

    room_id = safe_segment(payload.id or name, "room")
    rooms = site_entry.get("rooms") or []
    if any(room.get("id") == room_id for room in rooms):
        raise HTTPException(status_code=400, detail="Room id already exists in site")

    room_entry = {"id": room_id, "name": name}
    rooms.append(room_entry)
    site_entry["rooms"] = rooms
    sites_path.write_text(dump_yaml(data))

    room_dir = base_dir / "datacenters" / site_id / "rooms" / room_id
    room_dir.mkdir(parents=True, exist_ok=True)
    (room_dir / "aisles").mkdir(parents=True, exist_ok=True)
    (room_dir / "standalone_racks").mkdir(parents=True, exist_ok=True)
    room_payload = {
        "id": room_id,
        "name": name,
        "description": payload.description,
        "aisles": [],
        "standalone_racks": [],
    }
    (room_dir / "room.yaml").write_text(dump_yaml(room_payload))

    app_module.TOPOLOGY = load_topology(app_config.paths.topology)
    return {"room": room_payload, "site_id": site_id}


@router.get("/api/rooms", response_model=List[dict])
async def get_rooms(topology: Annotated[Optional[Topology], Depends(get_topology_optional)]):
    """Get all rooms with hierarchy."""
    rooms = []
    if topology:
        for site in topology.sites:
            for room in site.rooms:
                # Build hierarchy for sidebar
                aisles_summary = []
                for aisle in room.aisles:
                    aisles_summary.append(
                        {
                            "id": aisle.id,
                            "name": aisle.name,
                            "racks": [{"id": r.id, "name": r.name} for r in aisle.racks],
                        }
                    )

                # Include standalone racks as a virtual aisle if needed
                if room.standalone_racks:
                    aisles_summary.append(
                        {
                            "id": f"{room.id}-standalone",
                            "name": "Standalone",
                            "racks": [{"id": r.id, "name": r.name} for r in room.standalone_racks],
                        }
                    )

                rooms.append(
                    {"id": room.id, "name": room.name, "site_id": site.id, "aisles": aisles_summary}
                )
    return rooms


@router.get("/api/rooms/{room_id}/layout", response_model=Room)
async def get_room_layout(room_id: str, topology: Annotated[Topology, Depends(get_topology)]):
    """Get room layout details."""
    for site in topology.sites:
        for room in site.rooms:
            if room.id == room_id:
                return room

    raise HTTPException(status_code=404, detail=f"Room {room_id} not found")


@router.put("/api/topology/rooms/{room_id}/aisles")
async def update_room_aisles(
    room_id: str,
    payload: RoomAislesUpdate,
    app_config: Annotated[AppConfig, Depends(get_app_config)],
    topology: Annotated[Topology, Depends(get_topology)],
):
    """Reorganize aisles and racks in a room."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    target_room = None
    target_site_id = None
    for site in topology.sites:
        for room in site.rooms:
            if room.id == room_id:
                target_room = room
                target_site_id = site.id
                break
        if target_room:
            break
    if not target_room or not target_site_id:
        raise HTTPException(status_code=404, detail="Room not found")

    current_map: Dict[str, str] = {}
    for aisle in target_room.aisles:
        for rack in aisle.racks:
            current_map[rack.id] = aisle.id

    requested_aisles = payload.aisles or {}
    if set(requested_aisles.keys()) != {a.id for a in target_room.aisles}:
        raise HTTPException(status_code=400, detail="Payload must include all aisles for the room")

    for aisle_id, racks in requested_aisles.items():
        for rack_id in racks:
            if rack_id not in current_map:
                raise HTTPException(
                    status_code=400, detail=f"Unknown rack id in payload: {rack_id}"
                )

    base_dir = Path(app_config.paths.topology)
    for rack_id, current_aisle in current_map.items():
        target_aisle = None
        for aisle_id, racks in requested_aisles.items():
            if rack_id in racks:
                target_aisle = aisle_id
                break
        if not target_aisle or target_aisle == current_aisle:
            continue
        source_path = (
            base_dir
            / "datacenters"
            / target_site_id
            / "rooms"
            / room_id
            / "aisles"
            / current_aisle
            / "racks"
            / f"{rack_id}.yaml"
        )
        if not source_path.exists():
            raise HTTPException(status_code=404, detail=f"Rack file not found for move: {rack_id}")
        data = yaml.safe_load(source_path.read_text()) or {}
        data["aisle_id"] = target_aisle
        target_dir = (
            base_dir
            / "datacenters"
            / target_site_id
            / "rooms"
            / room_id
            / "aisles"
            / target_aisle
            / "racks"
        )
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / source_path.name
        target_path.write_text(dump_yaml(data))
        source_path.unlink(missing_ok=True)

    for aisle in target_room.aisles:
        aisle_path = topology_service.get_aisle_path(room_id, aisle.id, app_config, topology)
        if not aisle_path or not aisle_path.exists():
            raise HTTPException(status_code=404, detail=f"Aisle file not found: {aisle.id}")
        data = yaml.safe_load(aisle_path.read_text()) or {}
        data["racks"] = requested_aisles.get(aisle.id, [])
        aisle_path.write_text(dump_yaml(data))

    app_module.TOPOLOGY = load_topology(app_config.paths.topology)
    return {"status": "ok", "room_id": room_id}


# Aisles endpoints


@router.post("/api/topology/rooms/{room_id}/aisles/create")
async def create_room_aisles(
    room_id: str,
    payload: RoomAislesCreate,
    app_config: Annotated[AppConfig, Depends(get_app_config)],
    topology: Annotated[Topology, Depends(get_topology)],
):
    """Create new aisles in a room."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    target_site_id = None
    for site in topology.sites:
        if any(room.id == room_id for room in site.rooms):
            target_site_id = site.id
            break
    if not target_site_id:
        raise HTTPException(status_code=404, detail="Room not found")

    base_dir = Path(app_config.paths.topology)
    room_dir = base_dir / "datacenters" / target_site_id / "rooms" / room_id
    room_path = room_dir / "room.yaml"
    if not room_path.exists():
        raise HTTPException(status_code=404, detail="Room file not found")

    room_data = yaml.safe_load(room_path.read_text()) or {}
    existing = room_data.get("aisles") or []
    existing_ids = {a.get("id") for a in existing if a.get("id")}

    aisles_in = payload.aisles or []
    if not aisles_in:
        raise HTTPException(status_code=400, detail="aisles list is required")

    new_aisles = []
    for aisle in aisles_in:
        name = (aisle.get("name") or "").strip()
        raw_id = aisle.get("id") or name
        if not name:
            raise HTTPException(status_code=400, detail="Aisle name is required")
        aisle_id = safe_segment(raw_id, "aisle")
        if aisle_id in existing_ids or any(a.get("id") == aisle_id for a in new_aisles):
            raise HTTPException(status_code=400, detail=f"Aisle id already exists: {aisle_id}")
        new_aisles.append({"id": aisle_id, "name": name})

    room_data["aisles"] = existing + new_aisles
    room_path.write_text(dump_yaml(room_data))

    for aisle in new_aisles:
        aisle_dir = room_dir / "aisles" / aisle["id"]
        (aisle_dir / "racks").mkdir(parents=True, exist_ok=True)
        (aisle_dir / "aisle.yaml").write_text(
            dump_yaml({"id": aisle["id"], "name": aisle["name"], "racks": []})
        )

    app_module.TOPOLOGY = load_topology(app_config.paths.topology)
    return {"room_id": room_id, "aisles": new_aisles}


@router.put("/api/topology/aisles/{aisle_id}/racks")
async def update_aisle_racks(
    aisle_id: str,
    payload: AisleOrderUpdate,
    app_config: Annotated[AppConfig, Depends(get_app_config)],
    topology: Annotated[Topology, Depends(get_topology)],
):
    """Update rack ordering in an aisle."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    if not payload.racks:
        raise HTTPException(status_code=400, detail="racks list is required")

    aisle_path = topology_service.get_aisle_path(payload.room_id, aisle_id, app_config, topology)
    if not aisle_path or not aisle_path.exists():
        raise HTTPException(status_code=404, detail="Aisle file not found")

    data = yaml.safe_load(aisle_path.read_text()) or {}
    data["racks"] = payload.racks
    aisle_path.write_text(dump_yaml(data))

    # Reload topology to keep in-memory state aligned.
    app_module.TOPOLOGY = load_topology(app_config.paths.topology)
    return {"status": "ok", "aisle_id": aisle_id, "racks": payload.racks}


@router.delete("/api/topology/sites/{site_id}")
async def delete_site(
    site_id: str,
    app_config: Annotated[AppConfig, Depends(get_app_config)],
):
    """Delete a site and all its rooms/aisles/racks."""
    from rackscope.api import app as app_module

    base_dir = Path(app_config.paths.topology)
    sites_path = base_dir / "sites.yaml"
    if not sites_path.exists():
        raise HTTPException(status_code=404, detail="Sites file not found")

    data = yaml.safe_load(sites_path.read_text()) or {}
    sites = data.get("sites") or []
    updated = [s for s in sites if s.get("id") != site_id]
    if len(updated) == len(sites):
        raise HTTPException(status_code=404, detail=f"Site {site_id!r} not found")

    data["sites"] = updated
    sites_path.write_text(dump_yaml(data))

    site_dir = base_dir / "datacenters" / site_id
    if site_dir.exists():
        shutil.rmtree(site_dir)

    app_module.TOPOLOGY = load_topology(app_config.paths.topology)
    return {"status": "deleted", "site_id": site_id}


@router.delete("/api/topology/rooms/{room_id}")
async def delete_room(
    room_id: str,
    app_config: Annotated[AppConfig, Depends(get_app_config)],
    topology: Annotated[Topology, Depends(get_topology)],
):
    """Delete a room and its aisles/racks."""
    from rackscope.api import app as app_module

    target_site_id = None
    for site in topology.sites:
        if any(room.id == room_id for room in site.rooms):
            target_site_id = site.id
            break
    if not target_site_id:
        raise HTTPException(status_code=404, detail=f"Room {room_id!r} not found")

    base_dir = Path(app_config.paths.topology)
    sites_path = base_dir / "sites.yaml"
    data = yaml.safe_load(sites_path.read_text()) or {}
    for site_entry in data.get("sites") or []:
        if site_entry.get("id") == target_site_id:
            site_entry["rooms"] = [
                r for r in (site_entry.get("rooms") or []) if r.get("id") != room_id
            ]
            break
    sites_path.write_text(dump_yaml(data))

    room_dir = base_dir / "datacenters" / target_site_id / "rooms" / room_id
    if room_dir.exists():
        shutil.rmtree(room_dir)

    app_module.TOPOLOGY = load_topology(app_config.paths.topology)
    return {"status": "deleted", "room_id": room_id}


@router.delete("/api/topology/aisles/{aisle_id}")
async def delete_aisle(
    aisle_id: str,
    app_config: Annotated[AppConfig, Depends(get_app_config)],
    topology: Annotated[Topology, Depends(get_topology)],
):
    """Delete an aisle and its racks."""
    from rackscope.api import app as app_module

    target_site_id = None
    target_room_id = None
    for site in topology.sites:
        for room in site.rooms:
            if any(a.id == aisle_id for a in room.aisles):
                target_site_id = site.id
                target_room_id = room.id
                break
        if target_room_id:
            break
    if not target_room_id:
        raise HTTPException(status_code=404, detail=f"Aisle {aisle_id!r} not found")

    base_dir = Path(app_config.paths.topology)
    room_path = base_dir / "datacenters" / target_site_id / "rooms" / target_room_id / "room.yaml"
    if room_path.exists():
        room_data = yaml.safe_load(room_path.read_text()) or {}
        room_data["aisles"] = [
            a for a in (room_data.get("aisles") or []) if a.get("id") != aisle_id
        ]
        room_path.write_text(dump_yaml(room_data))

    aisle_dir = (
        base_dir / "datacenters" / target_site_id / "rooms" / target_room_id / "aisles" / aisle_id
    )
    if aisle_dir.exists():
        shutil.rmtree(aisle_dir)

    app_module.TOPOLOGY = load_topology(app_config.paths.topology)
    return {"status": "deleted", "aisle_id": aisle_id}


# Racks endpoints


@router.get("/api/racks/{rack_id}", response_model=Rack)
async def get_rack_details(rack_id: str, topology: Annotated[Topology, Depends(get_topology)]):
    """Get rack details and devices."""
    # Linear search (slow but ok for MVP)
    # In production, we would index racks by ID on load
    for site in topology.sites:
        for room in site.rooms:
            # Check aisles
            for aisle in room.aisles:
                for rack in aisle.racks:
                    if rack.id == rack_id:
                        return rack
            # Check standalone
            for rack in room.standalone_racks:
                if rack.id == rack_id:
                    return rack

    raise HTTPException(status_code=404, detail=f"Rack {rack_id} not found")


@router.put("/api/topology/racks/{rack_id}/template")
async def update_rack_template(
    rack_id: str,
    payload: RackTemplateUpdate,
    app_config: Annotated[AppConfig, Depends(get_app_config)],
    topology: Annotated[Topology, Depends(get_topology)],
):
    """Update rack template."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    rack_path = topology_service.get_rack_path(rack_id, app_config, topology)
    if not rack_path or not rack_path.exists():
        raise HTTPException(status_code=404, detail="Rack file not found")

    data = yaml.safe_load(rack_path.read_text()) or {}
    if payload.template_id:
        data["template_id"] = payload.template_id
    else:
        data.pop("template_id", None)
    rack_path.write_text(dump_yaml(data))

    app_module.TOPOLOGY = load_topology(app_config.paths.topology)
    return {"status": "ok", "rack_id": rack_id, "template_id": payload.template_id}


# Devices endpoints


@router.get("/api/racks/{rack_id}/devices/{device_id}", response_model=DeviceContext)
async def get_device_details(
    rack_id: str,
    device_id: str,
    topology: Annotated[Topology, Depends(get_topology)],
    catalog: Annotated[Catalog, Depends(get_catalog)],
):
    """Get device details with context."""
    for site in topology.sites:
        for room in site.rooms:
            for aisle in room.aisles:
                for rack in aisle.racks:
                    if rack.id != rack_id:
                        continue
                    device = next((d for d in rack.devices if d.id == device_id), None)
                    if device:
                        return DeviceContext(
                            device=device,
                            template=catalog.get_device_template(device.template_id),
                            rack=rack,
                            room={"id": room.id, "name": room.name},
                            site={
                                "id": site.id,
                                "name": site.name,
                                "description": site.description or "",
                            },
                            aisle={"id": aisle.id, "name": aisle.name},
                        )
            for rack in room.standalone_racks:
                if rack.id != rack_id:
                    continue
                device = next((d for d in rack.devices if d.id == device_id), None)
                if device:
                    return DeviceContext(
                        device=device,
                        template=catalog.get_device_template(device.template_id),
                        rack=rack,
                        room={"id": room.id, "name": room.name},
                        site={
                            "id": site.id,
                            "name": site.name,
                            "description": site.description or "",
                        },
                        aisle=None,
                    )

    raise HTTPException(status_code=404, detail=f"Device {device_id} not found in rack {rack_id}")


@router.post("/api/topology/racks/{rack_id}/devices")
async def add_rack_device(
    rack_id: str,
    payload: RackDeviceCreate,
    app_config: Annotated[AppConfig, Depends(get_app_config)],
    catalog: Annotated[Catalog, Depends(get_catalog)],
    topology: Annotated[Topology, Depends(get_topology)],
):
    """Add a device to a rack."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    rack_path = topology_service.get_rack_path(rack_id, app_config, topology)
    if not rack_path or not rack_path.exists():
        raise HTTPException(status_code=404, detail="Rack file not found")

    if not catalog.get_device_template(payload.template_id):
        raise HTTPException(
            status_code=400, detail=f"Unknown device template: {payload.template_id}"
        )

    data = yaml.safe_load(rack_path.read_text()) or {}
    devices = data.get("devices") or []
    if any(d.get("id") == payload.id for d in devices):
        raise HTTPException(status_code=400, detail=f"Device id already exists: {payload.id}")

    rack_height = topology_service.get_rack_height(data, catalog)
    if payload.u_position < 1 or payload.u_position > rack_height:
        raise HTTPException(status_code=400, detail="u_position out of rack bounds")

    new_height = topology_service.get_device_height(payload.template_id, catalog)
    if payload.u_position + new_height - 1 > rack_height:
        raise HTTPException(status_code=400, detail="Device does not fit in rack height")

    occupied: set[int] = set()
    for device in devices:
        template_id = device.get("template_id")
        if not template_id:
            continue
        start = int(device.get("u_position", 0))
        height = topology_service.get_device_height(template_id, catalog)
        if start < 1:
            continue
        for u in range(start, start + height):
            occupied.add(u)

    for u in range(payload.u_position, payload.u_position + new_height):
        if u in occupied:
            raise HTTPException(status_code=400, detail="Target U range is already occupied")

    device_data = {
        "id": payload.id,
        "name": payload.name,
        "template_id": payload.template_id,
        "u_position": payload.u_position,
    }
    if payload.instance not in (None, "", {}):
        device_data["instance"] = payload.instance

    devices.append(device_data)
    data["devices"] = devices
    rack_path.write_text(dump_yaml(data))

    app_module.TOPOLOGY = load_topology(app_config.paths.topology)
    return {"status": "ok", "rack_id": rack_id, "device_id": payload.id}


@router.put("/api/topology/racks/{rack_id}/devices/{device_id}")
async def update_rack_device(
    rack_id: str,
    device_id: str,
    payload: RackDeviceUpdate,
    app_config: Annotated[AppConfig, Depends(get_app_config)],
    catalog: Annotated[Catalog, Depends(get_catalog)],
    topology: Annotated[Topology, Depends(get_topology)],
):
    """Update device position in rack."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    rack_path = topology_service.get_rack_path(rack_id, app_config, topology)
    if not rack_path or not rack_path.exists():
        raise HTTPException(status_code=404, detail="Rack file not found")

    data = yaml.safe_load(rack_path.read_text()) or {}
    devices = data.get("devices") or []
    device = next((d for d in devices if d.get("id") == device_id), None)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    rack_height = topology_service.get_rack_height(data, catalog)
    template_id = device.get("template_id")
    if not template_id:
        raise HTTPException(status_code=400, detail="Device template_id missing")
    height = topology_service.get_device_height(template_id, catalog)
    if payload.u_position < 1 or payload.u_position + height - 1 > rack_height:
        raise HTTPException(status_code=400, detail="Device does not fit in rack height")

    occupied: set[int] = set()
    for other in devices:
        if other.get("id") == device_id:
            continue
        other_template_id = other.get("template_id")
        if not other_template_id:
            continue
        start = int(other.get("u_position", 0))
        other_height = topology_service.get_device_height(other_template_id, catalog)
        if start < 1:
            continue
        for u in range(start, start + other_height):
            occupied.add(u)

    for u in range(payload.u_position, payload.u_position + height):
        if u in occupied:
            raise HTTPException(status_code=400, detail="Target U range is already occupied")

    device["u_position"] = payload.u_position
    data["devices"] = devices
    rack_path.write_text(dump_yaml(data))

    app_module.TOPOLOGY = load_topology(app_config.paths.topology)
    return {
        "status": "ok",
        "rack_id": rack_id,
        "device_id": device_id,
        "u_position": payload.u_position,
    }


@router.delete("/api/topology/racks/{rack_id}/devices/{device_id}")
async def delete_rack_device(
    rack_id: str,
    device_id: str,
    app_config: Annotated[AppConfig, Depends(get_app_config)],
    topology: Annotated[Topology, Depends(get_topology)],
):
    """Remove device from rack."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    rack_path = topology_service.get_rack_path(rack_id, app_config, topology)
    if not rack_path or not rack_path.exists():
        raise HTTPException(status_code=404, detail="Rack file not found")

    data = yaml.safe_load(rack_path.read_text()) or {}
    devices = data.get("devices") or []
    next_devices = [d for d in devices if d.get("id") != device_id]
    if len(next_devices) == len(devices):
        raise HTTPException(status_code=404, detail="Device not found")

    data["devices"] = next_devices
    rack_path.write_text(dump_yaml(data))

    app_module.TOPOLOGY = load_topology(app_config.paths.topology)
    return {"status": "ok", "rack_id": rack_id, "device_id": device_id}


@router.put("/api/topology/racks/{rack_id}/devices")
async def replace_rack_devices(
    rack_id: str,
    payload: RackDevicesUpdate,
    app_config: Annotated[AppConfig, Depends(get_app_config)],
    catalog: Annotated[Catalog, Depends(get_catalog)],
    topology: Annotated[Topology, Depends(get_topology)],
):
    """Replace all devices in a rack."""
    # Lazy import to avoid circular dependency
    from rackscope.api import app as app_module

    rack_path = topology_service.get_rack_path(rack_id, app_config, topology)
    if not rack_path or not rack_path.exists():
        raise HTTPException(status_code=404, detail="Rack file not found")

    data = yaml.safe_load(rack_path.read_text()) or {}
    rack_height = topology_service.get_rack_height(data, catalog)

    seen_ids: set[str] = set()
    occupied: set[int] = set()

    for device in payload.devices:
        if device.id in seen_ids:
            raise HTTPException(status_code=400, detail=f"Duplicate device id: {device.id}")
        seen_ids.add(device.id)
        if not catalog.get_device_template(device.template_id):
            raise HTTPException(
                status_code=400, detail=f"Unknown device template: {device.template_id}"
            )
        height = topology_service.get_device_height(device.template_id, catalog)
        if device.u_position < 1 or device.u_position + height - 1 > rack_height:
            raise HTTPException(status_code=400, detail=f"Device {device.id} does not fit in rack")
        for u in range(device.u_position, device.u_position + height):
            if u in occupied:
                raise HTTPException(
                    status_code=400, detail=f"Device {device.id} overlaps existing device"
                )
            occupied.add(u)

    data["devices"] = [d.model_dump() for d in payload.devices]
    rack_path.write_text(dump_yaml(data))
    app_module.TOPOLOGY = load_topology(app_config.paths.topology)
    return {"status": "ok", "rack_id": rack_id, "devices": len(payload.devices)}
