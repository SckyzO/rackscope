"""
YAML configuration loaders for topology, catalog, checks, metrics, and app config.

Supports two topology layouts:
- Monolithic: single topology.yaml with all sites/rooms/racks
- Segmented: config/topology/sites.yaml → per-datacenter/room/aisle/rack files

All load_* functions return empty/default objects rather than raising on missing
paths — callers can check the returned object for emptiness.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, List, cast, Union
import logging

import yaml
from pydantic import ValidationError

from rackscope.model.domain import Topology
from rackscope.model.catalog import Catalog, DeviceTemplate, RackTemplate, RackComponentTemplate
from rackscope.model.checks import ChecksLibrary, CheckDefinition
from rackscope.model.config import AppConfig
from rackscope.model.metrics import MetricsLibrary, MetricDefinition

logger = logging.getLogger(__name__)


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
            logger.warning(f"Failed to load template file {yaml_file}: {e}")

    return catalog


def dump_yaml(data: dict) -> str:
    """Stable YAML dump for config writes with compact matrix formatting."""

    class CompactMatrixDumper(yaml.SafeDumper):
        """Custom YAML dumper that formats matrices (lists of lists) in flow style."""

        pass

    def represent_list(dumper, data):
        """Represent lists with flow style for matrices (lists of numbers)."""
        # Check if this is a list of numbers (matrix row) - use flow style [1, 2, 3]
        if data and all(isinstance(item, (int, float)) for item in data):
            return dumper.represent_sequence("tag:yaml.org,2002:seq", data, flow_style=True)
        # Otherwise use default block style
        return dumper.represent_sequence("tag:yaml.org,2002:seq", data, flow_style=False)

    CompactMatrixDumper.add_representer(list, represent_list)

    return cast(
        str,
        yaml.dump(
            data,
            Dumper=CompactMatrixDumper,
            sort_keys=False,
            default_flow_style=False,
        ),
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


def _check_duplicate_ids(topology: "Topology") -> None:
    """Log warnings for duplicate rack/room IDs across sites.

    Duplicate IDs break direct-link routes (/views/rack/:id, /api/racks/:id)
    because the first match wins. This does not raise — topology still loads —
    but operators should use unique IDs across sites.
    """
    from collections import Counter

    rack_ids: list[str] = []
    room_ids: list[str] = []

    for site in topology.sites:
        for room in site.rooms:
            room_ids.append(room.id)
            for aisle in room.aisles:
                for rack in aisle.racks:
                    rack_ids.append(rack.id)
            for rack in room.standalone_racks:
                rack_ids.append(rack.id)

    dup_racks = [rid for rid, n in Counter(rack_ids).items() if n > 1]
    dup_rooms = [rid for rid, n in Counter(room_ids).items() if n > 1]

    if dup_racks:
        logger.warning(
            "Duplicate rack IDs detected — /views/rack/:id will resolve to first match: %s",
            dup_racks,
        )
    if dup_rooms:
        logger.warning(
            "Duplicate room IDs detected across sites — consider prefixing with site ID: %s",
            dup_rooms,
        )


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
                logger.warning(f"Missing room file: {room_path}")
                continue
            room_data = yaml.safe_load(room_path.read_text()) or {}

            room_out: dict[str, Any] = {
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
                    logger.warning(f"Missing aisle file: {aisle_path}")
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
                assert isinstance(room_out["aisles"], list)
                room_out["aisles"].append(aisle_out)

            for rack_ref in room_data.get("standalone_racks", []):
                rack_data = _load_rack_ref(base_dir, site_id, room_id, None, rack_ref)
                if rack_data:
                    assert isinstance(room_out["standalone_racks"], list)
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
        topo = Topology.model_validate({"sites": sites_out})
    except ValidationError as e:
        raise InvalidFormatError(f"Validation failed for segmented topology {base_dir}:\n{e}")

    # Warn on duplicate IDs — same rack/room ID in multiple sites causes broken
    # /views/rack/:id and /api/racks/:id routes (first match wins, others unreachable)
    _check_duplicate_ids(topo)
    return topo


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
        logger.warning(f"Missing rack file: {rack_path}")
        return None
    return yaml.safe_load(rack_path.read_text()) or None


def _load_checks_file(path: Path, library: ChecksLibrary) -> None:
    try:
        with path.open("r") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        logger.warning(f"Failed to parse checks file {path}: {e}")
        return

    if not data:
        return

    checks: List[Any] = []
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
            library.checks.append(CheckDefinition.model_validate(c))
        except Exception as e:
            logger.warning(f"Failed to load check in {path}: {e}")


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


def _resolve_config_path(raw: str, config_dir: Path) -> str:
    """Resolve a path from AppConfig.paths against the config file's directory.

    Resolution order:
    1. Absolute paths → returned as-is.
    2. Relative paths that exist from the current working directory → returned as-is
       (backward-compatible with the old "config/examples/X/topology" style).
    3. Relative paths resolved against the config file's own directory → enables
       self-contained profiles where paths like "topology" resolve to
       "<profile-dir>/topology".
    4. Fallback: return the original string and let the actual loader raise.
    """
    p = Path(raw)
    if p.is_absolute():
        return raw
    if p.exists():
        return raw
    resolved = config_dir / p
    if resolved.exists():
        return str(resolved)
    return raw


def load_app_config(path: Union[str, Path]) -> AppConfig:
    """Load and validate app config from a YAML file.

    Paths inside AppConfig.paths are resolved relative to the config file's
    own directory so that self-contained profiles (config/profiles/X/app.yaml
    with topology: topology) work without absolute paths.
    """
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
        cfg = AppConfig(**data)
    except ValidationError as e:
        raise InvalidFormatError(f"Validation failed for {path}:\n{e}")

    # Resolve relative paths against the config file's directory
    config_dir = path.parent
    cfg.paths.topology = _resolve_config_path(cfg.paths.topology, config_dir)
    cfg.paths.templates = _resolve_config_path(cfg.paths.templates, config_dir)
    cfg.paths.checks = _resolve_config_path(cfg.paths.checks, config_dir)
    cfg.paths.metrics = _resolve_config_path(cfg.paths.metrics, config_dir)
    return cfg


def _load_metrics_file(path: Path, library: MetricsLibrary) -> None:
    """Load metrics from a single YAML file into library."""
    try:
        with path.open("r") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        logger.warning(f"Failed to parse metrics file {path}: {e}")
        return

    if not data:
        return

    # Support single metric or list of metrics
    metrics: List[Any] = []
    if isinstance(data, dict):
        if "metrics" in data:
            # Multiple metrics in one file
            metrics.extend(data.get("metrics") or [])
        elif "id" in data:
            # Single metric definition
            metrics.append(data)

    for m in metrics:
        try:
            library.metrics.append(MetricDefinition(**m))
        except Exception as e:
            logger.warning(f"Failed to load metric in {path}: {e}")


def load_metrics_library(path: Union[str, Path]) -> MetricsLibrary:
    """
    Load a metrics library from YAML files.

    Similar to load_checks_library(), recursively loads YAML files
    and validates them against MetricDefinition schema.

    Args:
        path: Path to metrics library directory or single file

    Returns:
        MetricsLibrary with all loaded metric definitions
    """
    path = Path(path)
    library = MetricsLibrary()

    if not path.exists():
        logger.warning(f"Metrics library path not found: {path}")
        return library

    if path.is_dir():
        # Recursively load all YAML files
        files = sorted(path.rglob("*.yaml")) + sorted(path.rglob("*.yml"))
        for file_path in files:
            _load_metrics_file(file_path, library)
        logger.info(f"Loaded {len(library.metrics)} metrics from {path}")
        return library

    # Single file
    _load_metrics_file(path, library)
    return library
