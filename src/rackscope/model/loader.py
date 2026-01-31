from __future__ import annotations

from pathlib import Path
from typing import Union

import yaml
from pydantic import ValidationError

from rackscope.model.domain import Topology
from rackscope.model.catalog import Catalog, DeviceTemplate, RackTemplate, RackComponentTemplate
from rackscope.model.checks import ChecksLibrary, CheckDefinition
from rackscope.model.config import AppConfig


class InvalidFormatError(ValueError):
    pass


def load_catalog(templates_dir: Union[str, Path]) -> Catalog:
    """Load all template files from a directory recursively into a single Catalog."""
    path = Path(templates_dir)
    catalog = Catalog()

    if not path.exists() or not path.is_dir():
        return catalog

    # Recursive glob to catch subdirectories like devices/ and racks/
    for yaml_file in path.rglob("*.yaml"):
        try:
            with yaml_file.open("r") as f:
                data = yaml.safe_load(f)
                if not data:
                    continue

                # Load Device Templates
                if "templates" in data:
                    for t_data in data["templates"]:
                        catalog.device_templates.append(DeviceTemplate(**t_data))

                # Load Rack Templates
                if "rack_templates" in data:
                    for t_data in data["rack_templates"]:
                        catalog.rack_templates.append(RackTemplate(**t_data))

                # Load Rack Component Templates
                if "rack_component_templates" in data:
                    for t_data in data["rack_component_templates"]:
                        catalog.rack_component_templates.append(RackComponentTemplate(**t_data))

        except Exception as e:
            print(f"Warning: Failed to load template file {yaml_file}: {e}")

    return catalog


def dump_yaml(data: dict) -> str:
    """Stable YAML dump for config writes."""
    return yaml.safe_dump(
        data,
        sort_keys=False,
        default_flow_style=False,
    )


def load_topology(path: Union[str, Path]) -> Topology:
    """Load and validate topology from a YAML file or segmented directory."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Topology file not found: {path}")

    if path.is_dir():
        return load_segmented_topology(path)

    try:
        with path.open("r") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        raise InvalidFormatError(f"Error parsing YAML file {path}: {e}")

    if data is None:
        return Topology()

    try:
        return Topology(**data)
    except ValidationError as e:
        # Pydantic errors are quite detailed, we wrap them for consistency
        raise InvalidFormatError(f"Validation failed for {path}:\n{e}")


def load_segmented_topology(base_dir: Path) -> Topology:
    """Load topology from segmented files (sites/rooms/aisles/racks)."""
    sites_path = base_dir / "sites.yaml"
    if not sites_path.exists():
        raise FileNotFoundError(f"Topology sites file not found: {sites_path}")

    try:
        sites_data = yaml.safe_load(sites_path.read_text()) or {}
    except yaml.YAMLError as e:
        raise InvalidFormatError(f"Error parsing YAML file {sites_path}: {e}")

    sites_out = []
    for site in sites_data.get("sites", []):
        site_id = site.get("id")
        if not site_id:
            continue
        site_name = site.get("name", site_id)
        site_description = site.get("description")
        site_location = site.get("location")
        rooms_out = []

        room_entries = site.get("rooms") or []
        if not room_entries:
            rooms_dir = base_dir / "datacenters" / site_id / "rooms"
            room_entries = [{"id": p.name} for p in sorted(rooms_dir.glob("*")) if p.is_dir()]

        for room_entry in room_entries:
            room_id = room_entry.get("id") if isinstance(room_entry, dict) else room_entry
            if not room_id:
                continue
            room_path = base_dir / "datacenters" / site_id / "rooms" / room_id / "room.yaml"
            if not room_path.exists():
                print(f"Warning: Missing room file {room_path}")
                continue
            room_data = yaml.safe_load(room_path.read_text()) or {}

            room_out = {
                "id": room_data.get("id", room_id),
                "name": room_data.get("name", room_id),
                "description": room_data.get("description"),
                "layout": room_data.get("layout"),
                "aisles": [],
                "standalone_racks": [],
            }

            for aisle in room_data.get("aisles", []):
                aisle_id = aisle.get("id")
                if not aisle_id:
                    continue
                aisle_name = aisle.get("name", aisle_id)
                aisle_path = (
                    base_dir
                    / "datacenters"
                    / site_id
                    / "rooms"
                    / room_id
                    / "aisles"
                    / aisle_id
                    / "aisle.yaml"
                )
                if not aisle_path.exists():
                    print(f"Warning: Missing aisle file {aisle_path}")
                    continue
                aisle_data = yaml.safe_load(aisle_path.read_text()) or {}
                aisle_out = {
                    "id": aisle_id,
                    "name": aisle_name,
                    "racks": [],
                }
                for rack_ref in aisle_data.get("racks", []):
                    rack_data = _load_rack_ref(base_dir, site_id, room_id, aisle_id, rack_ref)
                    if rack_data:
                        aisle_out["racks"].append(rack_data)
                room_out["aisles"].append(aisle_out)

            for rack_ref in room_data.get("standalone_racks", []):
                rack_data = _load_rack_ref(base_dir, site_id, room_id, None, rack_ref)
                if rack_data:
                    room_out["standalone_racks"].append(rack_data)

            rooms_out.append(room_out)

        sites_out.append(
            {
                "id": site_id,
                "name": site_name,
                "description": site_description,
                "location": site_location,
                "rooms": rooms_out,
            }
        )

    try:
        return Topology(**{"sites": sites_out})
    except ValidationError as e:
        raise InvalidFormatError(f"Validation failed for segmented topology {base_dir}:\n{e}")


def _load_rack_ref(
    base_dir: Path, site_id: str, room_id: str, aisle_id: str | None, rack_ref: object
) -> dict | None:
    if isinstance(rack_ref, dict):
        rack_id = rack_ref.get("id")
        if rack_id and len(rack_ref.keys()) > 1:
            return rack_ref
        rack_ref = rack_id

    if not isinstance(rack_ref, str) or not rack_ref:
        return None

    if aisle_id:
        rack_path = (
            base_dir
            / "datacenters"
            / site_id
            / "rooms"
            / room_id
            / "aisles"
            / aisle_id
            / "racks"
            / f"{rack_ref}.yaml"
        )
    else:
        rack_path = (
            base_dir
            / "datacenters"
            / site_id
            / "rooms"
            / room_id
            / "standalone_racks"
            / f"{rack_ref}.yaml"
        )
    if not rack_path.exists():
        print(f"Warning: Missing rack file {rack_path}")
        return None
    return yaml.safe_load(rack_path.read_text()) or None


def _load_checks_file(path: Path, library: ChecksLibrary) -> None:
    try:
        with path.open("r") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        print(f"Warning: Failed to parse checks file {path}: {e}")
        return

    if not data:
        return

    checks = []
    if isinstance(data, dict) and "checks" in data:
        checks.extend(data.get("checks") or [])

    if isinstance(data, dict) and "kinds" in data:
        kinds = data.get("kinds") or {}
        if isinstance(kinds, dict):
            for kind, items in kinds.items():
                if not items:
                    continue
                for item in items:
                    if isinstance(item, dict):
                        item = dict(item)
                        item.setdefault("kind", kind)
                    checks.append(item)

    for c in checks:
        try:
            library.checks.append(CheckDefinition(**c))
        except Exception as e:
            print(f"Warning: Failed to load check in {path}: {e}")


def load_checks_library(path: Union[str, Path]) -> ChecksLibrary:
    """Load a checks library from YAML files."""
    path = Path(path)
    library = ChecksLibrary()
    if not path.exists():
        return library

    if path.is_dir():
        files = sorted(path.glob("*.yaml")) + sorted(path.glob("*.yml"))
        for file_path in files:
            _load_checks_file(file_path, library)
        return library

    _load_checks_file(path, library)
    return library


def load_app_config(path: Union[str, Path]) -> AppConfig:
    """Load and validate app config from a YAML file."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")

    try:
        with path.open("r") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        raise InvalidFormatError(f"Error parsing YAML file {path}: {e}")

    if data is None:
        raise InvalidFormatError(f"Config file is empty: {path}")

    try:
        return AppConfig(**data)
    except ValidationError as e:
        raise InvalidFormatError(f"Validation failed for {path}:\n{e}")
