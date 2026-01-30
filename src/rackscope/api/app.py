from __future__ import annotations

import os
import asyncio
import time
import re
from contextlib import asynccontextmanager, suppress
from typing import List, Optional, Dict, Any, Union
from pathlib import Path

from fastapi import FastAPI, HTTPException
import yaml
import httpx

from rackscope.model.domain import Room, Site, Topology, Rack, Device
from rackscope.model.catalog import Catalog, DeviceTemplate, RackTemplate
from rackscope.model.checks import ChecksLibrary, CheckDefinition
from rackscope.model.config import AppConfig
from rackscope.model.loader import (
    load_topology,
    load_catalog,
    load_checks_library,
    load_app_config,
    dump_yaml,
)
from rackscope.telemetry.prometheus import client as prom_client
from rackscope.telemetry.planner import _expand_nodes_pattern
from rackscope.telemetry.planner import TelemetryPlanner, PlannerConfig
from pydantic import BaseModel, ValidationError
from typing import Literal

# Global state
TOPOLOGY: Optional[Topology] = None
CATALOG: Optional[Catalog] = None
CHECKS_LIBRARY: Optional[ChecksLibrary] = None
APP_CONFIG: Optional[AppConfig] = None
PLANNER: Optional[TelemetryPlanner] = None
PROMETHEUS_HEARTBEAT: Optional[asyncio.Task] = None


def _safe_segment(value: str, fallback: str) -> str:
    value = (value or "").strip().lower()
    if not value:
        return fallback
    value = re.sub(r"[^a-z0-9._-]+", "-", value)
    value = value.strip("-")
    return value or fallback


def _find_rack_location(rack_id: str) -> Optional[tuple[str, str, Optional[str], bool]]:
    if not TOPOLOGY:
        return None
    for site in TOPOLOGY.sites:
        for room in site.rooms:
            for aisle in room.aisles:
                for rack in aisle.racks:
                    if rack.id == rack_id:
                        return site.id, room.id, aisle.id, False
            for rack in room.standalone_racks:
                if rack.id == rack_id:
                    return site.id, room.id, None, True
    return None


def _find_aisle_path(room_id: str, aisle_id: str) -> Optional[Path]:
    if not APP_CONFIG or not TOPOLOGY:
        return None
    base_dir = Path(APP_CONFIG.paths.topology)
    for site in TOPOLOGY.sites:
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


def _find_rack_path(rack_id: str) -> Optional[Path]:
    if not APP_CONFIG:
        return None
    base_dir = Path(APP_CONFIG.paths.topology)
    location = _find_rack_location(rack_id)
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


def _find_device_template_path(templates_dir: Path, template_id: str) -> Optional[Path]:
    devices_dir = templates_dir / "devices"
    if not devices_dir.exists():
        return None
    matches = list(devices_dir.rglob(f"{template_id}.yaml"))
    if not matches:
        return None
    return matches[0]


def _get_device_height(template_id: str) -> int:
    if CATALOG:
        template = CATALOG.get_device_template(template_id)
        if template and template.u_height:
            return template.u_height
    return 1


def _get_rack_height(data: dict) -> int:
    if data.get("u_height"):
        return int(data["u_height"])
    template_id = data.get("template_id")
    if template_id and CATALOG:
        template = CATALOG.get_rack_template(template_id)
        if template and template.u_height:
            return template.u_height
    return 42


def _extract_device_instances(device: Device) -> List[str]:
    if isinstance(device.instance, dict):
        return [node for node in device.instance.values() if isinstance(node, str)]
    if isinstance(device.instance, str):
        return _expand_nodes_pattern(device.instance)
    if isinstance(device.nodes, dict):
        return [node for node in device.nodes.values() if isinstance(node, str)]
    if isinstance(device.nodes, str):
        return _expand_nodes_pattern(device.nodes)
    return [device.id]


def _find_room(room_id: str) -> Optional[Room]:
    if not TOPOLOGY:
        return None
    for site in TOPOLOGY.sites:
        for room in site.rooms:
            if room.id == room_id:
                return room
    return None


def _normalize_slurm_status(raw_status: str) -> tuple[str, bool]:
    status = (raw_status or "").strip().lower()
    has_star = status.endswith("*")
    if has_star:
        status = status[:-1]
    aliases = {
        "alloc": "allocated",
        "comp": "completing",
        "drng": "draining",
        "failg": "failing",
        "futr": "future",
        "mix": "mixed",
        "plnd": "planned",
        "pow_dn": "power_down",
        "pow_up": "power_up",
        "resv": "reserved",
        "unk": "unknown",
        "block": "blocked",
        "maint": "maint",
    }
    return aliases.get(status, status), has_star


def _slurm_severity(status: str, has_star: bool) -> str:
    if not APP_CONFIG:
        return "UNKNOWN"
    if has_star:
        return "CRIT"
    status_map = APP_CONFIG.slurm.status_map
    if status in status_map.crit:
        return "CRIT"
    if status in status_map.warn:
        return "WARN"
    if status in status_map.ok:
        return "OK"
    return "UNKNOWN"


def _severity_rank(severity: str) -> int:
    return {"UNKNOWN": 0, "OK": 1, "WARN": 2, "CRIT": 3}.get(severity, 0)


def _collect_check_targets(
    topology: Topology,
    catalog: Catalog,
    checks: ChecksLibrary,
) -> Dict[str, Dict[str, List[str]]]:
    check_by_id = {c.id: c for c in checks.checks}
    targets: Dict[str, Dict[str, set[str]]] = {}

    def add_targets(check_id: str, nodes: List[str], chassis: List[str], racks: List[str]) -> None:
        check = check_by_id.get(check_id)
        if not check:
            return
        bucket = targets.setdefault(check_id, {"node": set(), "chassis": set(), "rack": set()})
        if check.scope == "node":
            bucket["node"].update(nodes)
        elif check.scope == "chassis":
            bucket["chassis"].update(chassis)
        elif check.scope == "rack":
            bucket["rack"].update(racks)

    for site in topology.sites:
        for room in site.rooms:
            racks = []
            for aisle in room.aisles:
                racks.extend(aisle.racks)
            racks.extend(room.standalone_racks)
            for rack in racks:
                rack_nodes: List[str] = []
                rack_chassis: List[str] = []
                for device in rack.devices:
                    nodes = _extract_device_instances(device)
                    rack_nodes.extend(nodes)
                    rack_chassis.append(device.id)
                    device_template = catalog.get_device_template(device.template_id)
                    if device_template and device_template.checks:
                        for check_id in device_template.checks:
                            add_targets(check_id, nodes, [device.id], [rack.id])
                rack_template = (
                    catalog.get_rack_template(rack.template_id) if rack.template_id else None
                )
                if rack_template and rack_template.checks:
                    for check_id in rack_template.checks:
                        add_targets(check_id, rack_nodes, rack_chassis, [rack.id])

    return {
        check_id: {
            "node": sorted(list(values.get("node", set()))),
            "chassis": sorted(list(values.get("chassis", set()))),
            "rack": sorted(list(values.get("rack", set()))),
        }
        for check_id, values in targets.items()
    }


def apply_config(app_config: AppConfig) -> None:
    global TOPOLOGY, CATALOG, CHECKS_LIBRARY, APP_CONFIG, PLANNER
    APP_CONFIG = app_config
    TOPOLOGY = load_topology(app_config.paths.topology)
    CATALOG = load_catalog(app_config.paths.templates)
    CHECKS_LIBRARY = load_checks_library(app_config.paths.checks)
    base_url = APP_CONFIG.telemetry.prometheus_url or prom_client.base_url
    auth = None
    if APP_CONFIG.telemetry.basic_auth_user:
        auth = httpx.BasicAuth(
            APP_CONFIG.telemetry.basic_auth_user,
            APP_CONFIG.telemetry.basic_auth_password or "",
        )
    verify: bool | str = True
    if not APP_CONFIG.telemetry.tls_verify:
        verify = False
    elif APP_CONFIG.telemetry.tls_ca_file:
        verify = APP_CONFIG.telemetry.tls_ca_file
    cert = None
    if APP_CONFIG.telemetry.tls_cert_file and APP_CONFIG.telemetry.tls_key_file:
        cert = (APP_CONFIG.telemetry.tls_cert_file, APP_CONFIG.telemetry.tls_key_file)
    prom_client.configure(
        base_url=base_url,
        cache_ttl=APP_CONFIG.cache.ttl_seconds,
        auth=auth,
        verify=verify,
        cert=cert,
        latency_window=APP_CONFIG.telemetry.prometheus_latency_window,
        debug_stats=APP_CONFIG.telemetry.debug_stats,
    )
    PLANNER = TelemetryPlanner(
        PlannerConfig(
            identity_label=APP_CONFIG.telemetry.identity_label,
            rack_label=APP_CONFIG.telemetry.rack_label,
            chassis_label=APP_CONFIG.telemetry.chassis_label,
            job_regex=APP_CONFIG.telemetry.job_regex,
            unknown_state=APP_CONFIG.planner.unknown_state,
            cache_ttl_seconds=APP_CONFIG.planner.cache_ttl_seconds,
            max_ids_per_query=APP_CONFIG.planner.max_ids_per_query,
        )
    )


def aggregate_states(states: List[str]) -> str:
    if not states:
        return "UNKNOWN"
    if "CRIT" in states:
        return "CRIT"
    if "WARN" in states:
        return "WARN"
    if "UNKNOWN" in states:
        return "UNKNOWN"
    return "OK"


@asynccontextmanager
async def lifespan(app: FastAPI):
    global TOPOLOGY, CATALOG, CHECKS_LIBRARY, APP_CONFIG
    global PLANNER, PROMETHEUS_HEARTBEAT
    app_config_path = os.getenv("RACKSCOPE_APP_CONFIG", "config/app.yaml")

    try:
        if os.path.exists(app_config_path):
            APP_CONFIG = load_app_config(app_config_path)
            apply_config(APP_CONFIG)
        else:
            config_dir = os.getenv("RACKSCOPE_CONFIG_DIR", "config")
            config_path = os.getenv(
                "RACKSCOPE_CONFIG", os.path.join(config_dir, "topology", "topology.yaml")
            )
            templates_dir = os.getenv("RACKSCOPE_TEMPLATES", os.path.join(config_dir, "templates"))
            checks_path = os.getenv(
                "RACKSCOPE_CHECKS", os.path.join(config_dir, "checks", "library")
            )
            TOPOLOGY = load_topology(config_path)
            CATALOG = load_catalog(templates_dir)
            CHECKS_LIBRARY = load_checks_library(checks_path)
            APP_CONFIG = None
            PLANNER = TelemetryPlanner()
        print(f"Loaded topology with {len(TOPOLOGY.sites)} sites")
        print(
            f"Loaded catalog with {len(CATALOG.device_templates)} devices and {len(CATALOG.rack_templates)} racks"
        )
        print(f"Loaded checks library with {len(CHECKS_LIBRARY.checks)} checks")
    except Exception as e:
        print(f"Failed to load configuration: {e}")
        TOPOLOGY = Topology()
        CATALOG = Catalog()
        CHECKS_LIBRARY = ChecksLibrary()
        APP_CONFIG = None
        PLANNER = TelemetryPlanner()
    heartbeat_seconds = 60
    if APP_CONFIG:
        heartbeat_seconds = max(10, APP_CONFIG.telemetry.prometheus_heartbeat_seconds)

    async def _heartbeat() -> None:
        while True:
            try:
                await prom_client.ping()
            except Exception as e:
                print(f"Prometheus heartbeat error: {e}")
            await asyncio.sleep(heartbeat_seconds)

    PROMETHEUS_HEARTBEAT = asyncio.create_task(_heartbeat())
    yield
    if PROMETHEUS_HEARTBEAT:
        PROMETHEUS_HEARTBEAT.cancel()
        with suppress(asyncio.CancelledError):
            await PROMETHEUS_HEARTBEAT


app = FastAPI(title="rackscope", version="0.0.0", lifespan=lifespan)


class TemplateWriteRequest(BaseModel):
    kind: Literal["device", "rack"]
    template: Dict[str, Any]


class SiteCreate(BaseModel):
    id: Optional[str] = None
    name: str


class RoomCreate(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None


class RoomAislesCreate(BaseModel):
    aisles: List[Dict[str, str]]


class AisleOrderUpdate(BaseModel):
    room_id: str
    racks: List[str]


class RackTemplateUpdate(BaseModel):
    template_id: Optional[str] = None


class RackDeviceCreate(BaseModel):
    id: str
    name: str
    template_id: str
    u_position: int
    instance: Optional[Union[Dict[int, str], str]] = None


class RackDeviceUpdate(BaseModel):
    u_position: int


class RackDevicesUpdate(BaseModel):
    devices: List[Device]


class RoomAislesUpdate(BaseModel):
    aisles: Dict[str, List[str]]


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/catalog")
def get_catalog():
    return CATALOG if CATALOG else {"device_templates": [], "rack_templates": []}


@app.get("/api/checks")
def get_checks_library():
    return CHECKS_LIBRARY if CHECKS_LIBRARY else {"checks": []}


@app.get("/api/checks/files")
def get_checks_files():
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    base_dir = Path(APP_CONFIG.paths.checks)
    if not base_dir.exists():
        return {"files": []}
    if base_dir.is_dir():
        files = sorted(base_dir.glob("*.yaml")) + sorted(base_dir.glob("*.yml"))
    else:
        files = [base_dir]
    return {
        "files": [
            {
                "name": f.name,
                "path": str(f),
                "relative": str(f.relative_to(base_dir)) if base_dir.is_dir() else f.name,
            }
            for f in files
        ]
    }


@app.get("/api/checks/files/{name}")
def read_checks_file(name: str):
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    base_dir = Path(APP_CONFIG.paths.checks)
    if base_dir.is_dir():
        target = base_dir / name
    else:
        target = base_dir
    if not target.exists():
        raise HTTPException(status_code=404, detail="Checks file not found")
    return {"name": target.name, "content": target.read_text()}


@app.put("/api/checks/files/{name}")
def write_checks_file(name: str, payload: Dict[str, Any]):
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    base_dir = Path(APP_CONFIG.paths.checks)
    if base_dir.is_dir():
        base_dir.mkdir(parents=True, exist_ok=True)
        target = base_dir / name
    else:
        target = base_dir

    content = payload.get("content")
    if not isinstance(content, str) or not content.strip():
        raise HTTPException(status_code=400, detail="Content is required")

    # Validate YAML by parsing and re-dumping to keep it consistent.
    try:
        parsed = yaml.safe_load(content)
    except yaml.YAMLError as e:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {e}")

    checks = []
    if isinstance(parsed, dict) and "checks" in parsed:
        checks.extend(parsed.get("checks") or [])

    if isinstance(parsed, dict) and "kinds" in parsed:
        kinds = parsed.get("kinds") or {}
        if isinstance(kinds, dict):
            for kind, items in kinds.items():
                if not items:
                    continue
                for item in items:
                    if isinstance(item, dict):
                        item = dict(item)
                        item.setdefault("kind", kind)
                    checks.append(item)

    errors = []
    seen_ids = set()
    for idx, check in enumerate(checks):
        try:
            parsed_check = CheckDefinition(**check)
            if not parsed_check.rules:
                errors.append(
                    {
                        "index": idx,
                        "id": parsed_check.id,
                        "errors": [{"msg": "rules must not be empty"}],
                    }
                )
            if parsed_check.id in seen_ids:
                errors.append(
                    {
                        "index": idx,
                        "id": parsed_check.id,
                        "errors": [{"msg": "duplicate id"}],
                    }
                )
            seen_ids.add(parsed_check.id)
        except ValidationError as e:
            errors.append(
                {
                    "index": idx,
                    "id": check.get("id") if isinstance(check, dict) else None,
                    "errors": e.errors(),
                }
            )

    if errors:
        raise HTTPException(
            status_code=400, detail={"message": "Validation failed", "errors": errors}
        )

    target.write_text(dump_yaml(parsed if parsed is not None else {}))
    # Reload checks library to keep in-memory state aligned.
    global CHECKS_LIBRARY
    CHECKS_LIBRARY = load_checks_library(base_dir)
    return {"status": "ok", "name": target.name}


@app.get("/api/config")
def get_app_config():
    if APP_CONFIG:
        return APP_CONFIG
    return {
        "paths": {},
        "refresh": {"room_state_seconds": 30, "rack_state_seconds": 30},
        "cache": {"ttl_seconds": 30},
        "telemetry": {
            "prometheus_url": None,
            "identity_label": "instance",
            "rack_label": "rack_id",
            "chassis_label": "chassis_id",
            "job_regex": ".*",
            "prometheus_heartbeat_seconds": 30,
            "prometheus_latency_window": 20,
            "basic_auth_user": None,
            "basic_auth_password": None,
            "tls_verify": True,
            "tls_ca_file": None,
            "tls_cert_file": None,
            "tls_key_file": None,
        },
        "planner": {
            "unknown_state": "UNKNOWN",
            "cache_ttl_seconds": 30,
            "max_ids_per_query": 50,
        },
        "features": {
            "notifications": False,
            "playlist": False,
            "offline": False,
            "demo": False,
        },
        "simulator": {
            "update_interval_seconds": 20,
            "seed": None,
            "scenario": None,
            "scale_factor": 1.0,
            "default_ttl_seconds": 120,
            "metrics_catalog_path": "config/simulator_metrics_full.yaml",
            "metrics_catalogs": [
                {
                    "id": "core",
                    "path": "config/simulator_metrics_full.yaml",
                    "enabled": True,
                },
                {
                    "id": "slurm",
                    "path": "config/simulator_metrics_slurm.yaml",
                    "enabled": True,
                },
            ],
            "incident_rates": {
                "node_micro_failure": 0.001,
                "rack_macro_failure": 0.01,
                "aisle_cooling_failure": 0.005,
            },
            "incident_durations": {
                "rack": 3,
                "aisle": 5,
            },
            "overrides_path": "config/simulator_overrides.yaml",
        },
    }


@app.put("/api/config")
def update_app_config(payload: AppConfig):
    config_path = Path(os.getenv("RACKSCOPE_APP_CONFIG", "config/app.yaml"))
    config_path.parent.mkdir(parents=True, exist_ok=True)
    with config_path.open("w") as f:
        yaml.safe_dump(payload.model_dump(), f, sort_keys=False)
    apply_config(payload)
    return payload


@app.get("/api/env")
def get_env() -> Dict[str, Any]:
    keys = [
        "RACKSCOPE_APP_CONFIG",
        "RACKSCOPE_CONFIG_DIR",
        "RACKSCOPE_CONFIG",
        "RACKSCOPE_TEMPLATES",
        "RACKSCOPE_CHECKS",
        "PROMETHEUS_URL",
        "PROMETHEUS_CACHE_TTL",
    ]
    return {key: os.getenv(key) for key in keys}


def _overrides_path() -> Path:
    if APP_CONFIG and getattr(APP_CONFIG, "simulator", None):
        return Path(APP_CONFIG.simulator.overrides_path)
    return Path("config/simulator_overrides.yaml")


def _load_overrides() -> list[dict[str, Any]]:
    path = _overrides_path()
    if not path.exists():
        return []
    try:
        data = yaml.safe_load(path.read_text()) or {}
    except yaml.YAMLError as exc:
        print(f"Failed to load overrides: {exc}")
        return []
    return data.get("overrides", []) if isinstance(data, dict) else []


def _save_overrides(overrides: list[dict[str, Any]]) -> None:
    path = _overrides_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"overrides": overrides}
    with path.open("w") as f:
        yaml.safe_dump(payload, f, sort_keys=False)


@app.get("/api/simulator/overrides")
def get_simulator_overrides():
    return {"overrides": _load_overrides()}


@app.get("/api/simulator/scenarios")
def get_simulator_scenarios():
    sim_path = Path("config/simulator.yaml")
    if not sim_path.exists():
        return {"scenarios": []}
    try:
        data = yaml.safe_load(sim_path.read_text()) or {}
    except yaml.YAMLError as exc:
        print(f"Failed to load simulator scenarios: {exc}")
        return {"scenarios": []}
    scenarios = data.get("scenarios") if isinstance(data, dict) else {}
    if not isinstance(scenarios, dict):
        return {"scenarios": []}
    payload = []
    for name in sorted(scenarios.keys()):
        entry = scenarios.get(name) if isinstance(scenarios.get(name), dict) else {}
        payload.append(
            {
                "name": name,
                "description": entry.get("description") if isinstance(entry, dict) else None,
            }
        )
    return {"scenarios": payload}


@app.post("/api/simulator/overrides")
def add_simulator_override(payload: dict):
    valid_metrics = {
        "up",
        "node_temperature_celsius",
        "node_power_watts",
        "node_load_percent",
        "node_health_status",
        "rack_down",
    }
    instance = payload.get("instance")
    rack_id = payload.get("rack_id")
    metric = payload.get("metric")
    value = payload.get("value")
    ttl = payload.get("ttl_seconds")
    if not metric:
        raise HTTPException(status_code=400, detail="metric is required")
    if metric not in valid_metrics:
        raise HTTPException(status_code=400, detail="metric is not supported")
    if not instance and not rack_id:
        raise HTTPException(status_code=400, detail="instance or rack_id is required")
    if rack_id and metric != "rack_down":
        raise HTTPException(status_code=400, detail="rack overrides only support rack_down")
    if instance and metric == "rack_down":
        raise HTTPException(status_code=400, detail="rack_down requires rack_id")
    try:
        value = float(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="value must be numeric")
    if metric == "node_health_status" and value not in (0, 1, 2):
        raise HTTPException(status_code=400, detail="node_health_status must be 0, 1, or 2")
    if metric == "up" and value not in (0, 1):
        raise HTTPException(status_code=400, detail="up must be 0 or 1")
    override_id = payload.get("id") or f"{(instance or rack_id)}-{metric}-{int(time.time())}"
    override = {
        "id": override_id,
        "instance": instance,
        "rack_id": rack_id,
        "metric": metric,
        "value": value,
    }
    default_ttl = None
    if APP_CONFIG and getattr(APP_CONFIG, "simulator", None):
        default_ttl = getattr(APP_CONFIG.simulator, "default_ttl_seconds", None)
    ttl_val = ttl if ttl is not None else default_ttl
    if ttl_val is not None:
        try:
            ttl_val = int(ttl_val)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="ttl_seconds must be int")
        if ttl_val < 0:
            raise HTTPException(status_code=400, detail="ttl_seconds must be >= 0")
        if ttl_val > 0:
            override["expires_at"] = int(time.time()) + ttl_val
    overrides = _load_overrides()
    overrides.append(override)
    _save_overrides(overrides)
    return {"overrides": overrides}


@app.delete("/api/simulator/overrides")
def clear_simulator_overrides():
    _save_overrides([])
    return {"overrides": []}


@app.delete("/api/simulator/overrides/{override_id}")
def delete_simulator_override(override_id: str):
    overrides = _load_overrides()
    next_overrides = [o for o in overrides if o.get("id") != override_id]
    _save_overrides(next_overrides)
    return {"overrides": next_overrides}


@app.get("/api/sites", response_model=List[Site])
def get_sites():
    return TOPOLOGY.sites if TOPOLOGY else []


@app.post("/api/topology/sites")
def create_site(payload: SiteCreate):
    global TOPOLOGY
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Site name is required")

    base_dir = Path(APP_CONFIG.paths.topology)
    sites_path = base_dir / "sites.yaml"
    if not sites_path.exists():
        raise HTTPException(status_code=404, detail="Topology sites file not found")

    data = yaml.safe_load(sites_path.read_text()) or {}
    sites = data.get("sites") or []
    site_id = _safe_segment(payload.id or name, "site")

    if any(site.get("id") == site_id for site in sites):
        raise HTTPException(status_code=400, detail="Site id already exists")

    site_entry = {"id": site_id, "name": name, "rooms": []}
    sites.append(site_entry)
    data["sites"] = sites
    sites_path.write_text(dump_yaml(data))

    (base_dir / "datacenters" / site_id / "rooms").mkdir(parents=True, exist_ok=True)

    TOPOLOGY = load_topology(APP_CONFIG.paths.topology)
    return {"site": site_entry}


@app.post("/api/topology/sites/{site_id}/rooms")
def create_room(site_id: str, payload: RoomCreate):
    global TOPOLOGY
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Room name is required")

    base_dir = Path(APP_CONFIG.paths.topology)
    sites_path = base_dir / "sites.yaml"
    if not sites_path.exists():
        raise HTTPException(status_code=404, detail="Topology sites file not found")

    data = yaml.safe_load(sites_path.read_text()) or {}
    sites = data.get("sites") or []
    site_entry = next((site for site in sites if site.get("id") == site_id), None)
    if not site_entry:
        raise HTTPException(status_code=404, detail="Site not found")

    room_id = _safe_segment(payload.id or name, "room")
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

    TOPOLOGY = load_topology(APP_CONFIG.paths.topology)
    return {"room": room_payload, "site_id": site_id}


@app.post("/api/topology/rooms/{room_id}/aisles/create")
def create_room_aisles(room_id: str, payload: RoomAislesCreate):
    global TOPOLOGY
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    if not TOPOLOGY:
        raise HTTPException(status_code=500, detail="Topology not loaded")

    target_site_id = None
    for site in TOPOLOGY.sites:
        if any(room.id == room_id for room in site.rooms):
            target_site_id = site.id
            break
    if not target_site_id:
        raise HTTPException(status_code=404, detail="Room not found")

    base_dir = Path(APP_CONFIG.paths.topology)
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
        aisle_id = _safe_segment(raw_id, "aisle")
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

    TOPOLOGY = load_topology(APP_CONFIG.paths.topology)
    return {"room_id": room_id, "aisles": new_aisles}


@app.get("/api/rooms", response_model=List[dict])
def get_rooms():
    rooms = []
    if TOPOLOGY:
        for site in TOPOLOGY.sites:
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


@app.get("/api/rooms/{room_id}/layout", response_model=Room)
def get_room_layout(room_id: str):
    if not TOPOLOGY:
        raise HTTPException(status_code=500, detail="Topology not loaded")

    for site in TOPOLOGY.sites:
        for room in site.rooms:
            if room.id == room_id:
                return room

    raise HTTPException(status_code=404, detail=f"Room {room_id} not found")


@app.get("/api/racks/{rack_id}", response_model=Rack)
def get_rack_details(rack_id: str):
    if not TOPOLOGY:
        raise HTTPException(status_code=500, detail="Topology not loaded")

    # Linear search (slow but ok for MVP)
    # In production, we would index racks by ID on load
    for site in TOPOLOGY.sites:
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


@app.put("/api/topology/aisles/{aisle_id}/racks")
def update_aisle_racks(aisle_id: str, payload: AisleOrderUpdate):
    global TOPOLOGY
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    if not TOPOLOGY:
        raise HTTPException(status_code=500, detail="Topology not loaded")
    if not payload.racks:
        raise HTTPException(status_code=400, detail="racks list is required")

    aisle_path = _find_aisle_path(payload.room_id, aisle_id)
    if not aisle_path or not aisle_path.exists():
        raise HTTPException(status_code=404, detail="Aisle file not found")

    data = yaml.safe_load(aisle_path.read_text()) or {}
    data["racks"] = payload.racks
    aisle_path.write_text(dump_yaml(data))

    # Reload topology to keep in-memory state aligned.
    TOPOLOGY = load_topology(APP_CONFIG.paths.topology)
    return {"status": "ok", "aisle_id": aisle_id, "racks": payload.racks}


@app.put("/api/topology/racks/{rack_id}/template")
def update_rack_template(rack_id: str, payload: RackTemplateUpdate):
    global TOPOLOGY
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    rack_path = _find_rack_path(rack_id)
    if not rack_path or not rack_path.exists():
        raise HTTPException(status_code=404, detail="Rack file not found")

    data = yaml.safe_load(rack_path.read_text()) or {}
    if payload.template_id:
        data["template_id"] = payload.template_id
    else:
        data.pop("template_id", None)
    rack_path.write_text(dump_yaml(data))

    TOPOLOGY = load_topology(APP_CONFIG.paths.topology)
    return {"status": "ok", "rack_id": rack_id, "template_id": payload.template_id}


@app.put("/api/topology/rooms/{room_id}/aisles")
def update_room_aisles(room_id: str, payload: RoomAislesUpdate):
    global TOPOLOGY
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    if not TOPOLOGY:
        raise HTTPException(status_code=500, detail="Topology not loaded")

    target_room = None
    target_site_id = None
    for site in TOPOLOGY.sites:
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

    base_dir = Path(APP_CONFIG.paths.topology)
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
        aisle_path = _find_aisle_path(room_id, aisle.id)
        if not aisle_path or not aisle_path.exists():
            raise HTTPException(status_code=404, detail=f"Aisle file not found: {aisle.id}")
        data = yaml.safe_load(aisle_path.read_text()) or {}
        data["racks"] = requested_aisles.get(aisle.id, [])
        aisle_path.write_text(dump_yaml(data))

    TOPOLOGY = load_topology(APP_CONFIG.paths.topology)
    return {"status": "ok", "room_id": room_id}


@app.post("/api/topology/racks/{rack_id}/devices")
def add_rack_device(rack_id: str, payload: RackDeviceCreate):
    global TOPOLOGY
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    if not CATALOG:
        raise HTTPException(status_code=500, detail="Catalog not loaded")

    rack_path = _find_rack_path(rack_id)
    if not rack_path or not rack_path.exists():
        raise HTTPException(status_code=404, detail="Rack file not found")

    if not CATALOG.get_device_template(payload.template_id):
        raise HTTPException(
            status_code=400, detail=f"Unknown device template: {payload.template_id}"
        )

    data = yaml.safe_load(rack_path.read_text()) or {}
    devices = data.get("devices") or []
    if any(d.get("id") == payload.id for d in devices):
        raise HTTPException(status_code=400, detail=f"Device id already exists: {payload.id}")

    rack_height = _get_rack_height(data)
    if payload.u_position < 1 or payload.u_position > rack_height:
        raise HTTPException(status_code=400, detail="u_position out of rack bounds")

    new_height = _get_device_height(payload.template_id)
    if payload.u_position + new_height - 1 > rack_height:
        raise HTTPException(status_code=400, detail="Device does not fit in rack height")

    occupied: set[int] = set()
    for device in devices:
        template_id = device.get("template_id")
        if not template_id:
            continue
        start = int(device.get("u_position", 0))
        height = _get_device_height(template_id)
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

    TOPOLOGY = load_topology(APP_CONFIG.paths.topology)
    return {"status": "ok", "rack_id": rack_id, "device_id": payload.id}


@app.put("/api/topology/racks/{rack_id}/devices/{device_id}")
def update_rack_device(rack_id: str, device_id: str, payload: RackDeviceUpdate):
    global TOPOLOGY
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    if not CATALOG:
        raise HTTPException(status_code=500, detail="Catalog not loaded")

    rack_path = _find_rack_path(rack_id)
    if not rack_path or not rack_path.exists():
        raise HTTPException(status_code=404, detail="Rack file not found")

    data = yaml.safe_load(rack_path.read_text()) or {}
    devices = data.get("devices") or []
    device = next((d for d in devices if d.get("id") == device_id), None)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    rack_height = _get_rack_height(data)
    template_id = device.get("template_id")
    if not template_id:
        raise HTTPException(status_code=400, detail="Device template_id missing")
    height = _get_device_height(template_id)
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
        other_height = _get_device_height(other_template_id)
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

    TOPOLOGY = load_topology(APP_CONFIG.paths.topology)
    return {
        "status": "ok",
        "rack_id": rack_id,
        "device_id": device_id,
        "u_position": payload.u_position,
    }


@app.delete("/api/topology/racks/{rack_id}/devices/{device_id}")
def delete_rack_device(rack_id: str, device_id: str):
    global TOPOLOGY
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")

    rack_path = _find_rack_path(rack_id)
    if not rack_path or not rack_path.exists():
        raise HTTPException(status_code=404, detail="Rack file not found")

    data = yaml.safe_load(rack_path.read_text()) or {}
    devices = data.get("devices") or []
    next_devices = [d for d in devices if d.get("id") != device_id]
    if len(next_devices) == len(devices):
        raise HTTPException(status_code=404, detail="Device not found")

    data["devices"] = next_devices
    rack_path.write_text(dump_yaml(data))

    TOPOLOGY = load_topology(APP_CONFIG.paths.topology)
    return {"status": "ok", "rack_id": rack_id, "device_id": device_id}


@app.put("/api/topology/racks/{rack_id}/devices")
def replace_rack_devices(rack_id: str, payload: RackDevicesUpdate):
    global TOPOLOGY
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    if not CATALOG:
        raise HTTPException(status_code=500, detail="Catalog not loaded")

    rack_path = _find_rack_path(rack_id)
    if not rack_path or not rack_path.exists():
        raise HTTPException(status_code=404, detail="Rack file not found")

    data = yaml.safe_load(rack_path.read_text()) or {}
    rack_height = _get_rack_height(data)

    seen_ids: set[str] = set()
    occupied: set[int] = set()

    for device in payload.devices:
        if device.id in seen_ids:
            raise HTTPException(status_code=400, detail=f"Duplicate device id: {device.id}")
        seen_ids.add(device.id)
        if not CATALOG.get_device_template(device.template_id):
            raise HTTPException(
                status_code=400, detail=f"Unknown device template: {device.template_id}"
            )
        height = _get_device_height(device.template_id)
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
    TOPOLOGY = load_topology(APP_CONFIG.paths.topology)
    return {"status": "ok", "rack_id": rack_id, "devices": len(payload.devices)}


@app.post("/api/catalog/templates")
def write_template(payload: TemplateWriteRequest):
    global CATALOG
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    templates_dir = Path(APP_CONFIG.paths.templates)
    templates_dir.mkdir(parents=True, exist_ok=True)

    if payload.kind == "device":
        template = DeviceTemplate(**payload.template)
        if CATALOG and CATALOG.get_device_template(template.id):
            raise HTTPException(
                status_code=400, detail=f"Device template already exists: {template.id}"
            )
        type_dir = _safe_segment(template.type, "other")
        target_dir = templates_dir / "devices" / type_dir
        key = "templates"
        filename = f"{_safe_segment(template.id, 'device')}.yaml"
    else:
        template = RackTemplate(**payload.template)
        if CATALOG and CATALOG.get_rack_template(template.id):
            raise HTTPException(
                status_code=400, detail=f"Rack template already exists: {template.id}"
            )
        target_dir = templates_dir / "racks"
        key = "rack_templates"
        filename = f"{_safe_segment(template.id, 'rack')}.yaml"

    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / filename
    if target_path.exists():
        raise HTTPException(status_code=400, detail=f"Template file already exists: {target_path}")
    data = {key: [template.model_dump()]}
    target_path.write_text(dump_yaml(data))

    # Reload catalog to keep in-memory state aligned.
    CATALOG = load_catalog(templates_dir)

    return template


@app.put("/api/catalog/templates")
def update_template(payload: TemplateWriteRequest):
    global CATALOG
    if not APP_CONFIG:
        raise HTTPException(status_code=500, detail="App config not loaded")
    templates_dir = Path(APP_CONFIG.paths.templates)
    templates_dir.mkdir(parents=True, exist_ok=True)

    if payload.kind == "device":
        template = DeviceTemplate(**payload.template)
        type_dir = _safe_segment(template.type, "other")
        target_dir = templates_dir / "devices" / type_dir
        key = "templates"
        filename = f"{_safe_segment(template.id, 'device')}.yaml"
        existing_path = _find_device_template_path(templates_dir, template.id)
        target_path = target_dir / filename
        if existing_path and existing_path != target_path:
            existing_path.unlink(missing_ok=True)
    else:
        template = RackTemplate(**payload.template)
        target_dir = templates_dir / "racks"
        key = "rack_templates"
        filename = f"{_safe_segment(template.id, 'rack')}.yaml"
        target_path = target_dir / filename

    target_dir.mkdir(parents=True, exist_ok=True)
    data = {key: [template.model_dump()]}
    target_path.write_text(dump_yaml(data))

    # Reload catalog to keep in-memory state aligned.
    CATALOG = load_catalog(templates_dir)

    return template


@app.get("/api/stats/global")
async def get_global_stats():
    rack_healths: Dict[str, str] = {}
    if TOPOLOGY and CHECKS_LIBRARY and PLANNER:
        targets_by_check = _collect_check_targets(TOPOLOGY, CATALOG, CHECKS_LIBRARY)
        snapshot = await PLANNER.get_snapshot(TOPOLOGY, CHECKS_LIBRARY, targets_by_check)
        rack_healths = snapshot.rack_states
    else:
        rack_healths = await prom_client.get_rack_health_summary()

    total_racks = 0
    crit_alerts = 0
    warn_alerts = 0

    if TOPOLOGY:
        for site in TOPOLOGY.sites:
            for room in site.rooms:
                for aisle in room.aisles:
                    total_racks += len(aisle.racks)
                total_racks += len(room.standalone_racks)

    for state in rack_healths.values():
        if state == "CRIT":
            crit_alerts += 1
        elif state == "WARN":
            warn_alerts += 1

    global_status = "OK"
    if crit_alerts > 0:
        global_status = "CRIT"
    elif warn_alerts > 0:
        global_status = "WARN"

    return {
        "total_rooms": len(TOPOLOGY.sites[0].rooms) if TOPOLOGY and TOPOLOGY.sites else 0,
        "total_racks": total_racks,
        "active_alerts": crit_alerts + warn_alerts,
        "crit_count": crit_alerts,
        "warn_count": warn_alerts,
        "status": global_status,
    }


@app.get("/api/stats/prometheus")
def get_prometheus_stats():
    stats = prom_client.get_latency_stats()
    heartbeat_seconds = 60
    if APP_CONFIG:
        heartbeat_seconds = max(10, APP_CONFIG.telemetry.prometheus_heartbeat_seconds)
    stats["heartbeat_seconds"] = heartbeat_seconds
    last_ts = stats.get("last_ts")
    stats["next_ts"] = (last_ts + heartbeat_seconds * 1000) if last_ts else None
    return stats


@app.get("/api/stats/telemetry")
def get_telemetry_stats():
    return prom_client.get_telemetry_stats()


@app.get("/api/rooms/{room_id}/state")
async def get_room_state(room_id: str):
    if not TOPOLOGY or not CHECKS_LIBRARY or not PLANNER:
        return {"room_id": room_id, "state": "UNKNOWN", "racks": {}}
    targets_by_check = _collect_check_targets(TOPOLOGY, CATALOG, CHECKS_LIBRARY)
    snapshot = await PLANNER.get_snapshot(TOPOLOGY, CHECKS_LIBRARY, targets_by_check)
    rack_healths = snapshot.rack_states

    room_status = "OK"
    rack_ids = []
    if TOPOLOGY:
        for site in TOPOLOGY.sites:
            for room in site.rooms:
                if room.id == room_id:
                    for aisle in room.aisles:
                        rack_ids.extend([r.id for r in aisle.racks])
                    rack_ids.extend([r.id for r in room.standalone_racks])

    for rid in rack_ids:
        h = rack_healths.get(rid, "OK")
        if h == "CRIT":
            room_status = "CRIT"
            break
        if h == "WARN" and room_status != "CRIT":
            room_status = "WARN"

    racks_out = {rid: {"state": rack_healths.get(rid, "UNKNOWN")} for rid in rack_ids}
    return {"room_id": room_id, "state": room_status, "racks": racks_out}


@app.get("/api/slurm/rooms/{room_id}/nodes")
async def get_slurm_room_nodes(room_id: str):
    if not APP_CONFIG or not TOPOLOGY:
        raise HTTPException(status_code=503, detail="Topology not loaded")

    room = _find_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    room_nodes: set[str] = set()
    racks = []
    for aisle in room.aisles:
        racks.extend(aisle.racks)
    racks.extend(room.standalone_racks)
    for rack in racks:
        for device in rack.devices:
            room_nodes.update(_extract_device_instances(device))

    node_states: Dict[str, Dict[str, Any]] = {
        node: {
            "status": "unknown",
            "severity": "UNKNOWN",
            "statuses": [],
            "partitions": [],
        }
        for node in room_nodes
    }

    slurm_cfg = APP_CONFIG.slurm
    query = (
        f"max by ({slurm_cfg.label_node},{slurm_cfg.label_status},{slurm_cfg.label_partition})"
        f" ({slurm_cfg.metric})"
    )

    result = await prom_client.query(query)
    if result.get("status") != "success":
        return {"room_id": room_id, "nodes": node_states}

    for item in result.get("data", {}).get("result", []):
        metric = item.get("metric", {})
        value = item.get("value", [None, "0"])[1]
        try:
            if float(value) <= 0:
                continue
        except (TypeError, ValueError):
            continue
        node = metric.get(slurm_cfg.label_node)
        if not node or (room_nodes and node not in room_nodes):
            continue
        raw_status = metric.get(slurm_cfg.label_status, "unknown")
        partition = metric.get(slurm_cfg.label_partition)
        normalized_status, has_star = _normalize_slurm_status(str(raw_status))
        severity = _slurm_severity(normalized_status, has_star)

        state = node_states.setdefault(
            node,
            {
                "status": normalized_status,
                "severity": severity,
                "statuses": [],
                "partitions": [],
            },
        )
        state["statuses"].append(str(raw_status))
        if partition:
            state["partitions"].append(str(partition))
        if _severity_rank(severity) > _severity_rank(state["severity"]):
            state["severity"] = severity
            state["status"] = normalized_status

    for node_id, state in node_states.items():
        state["statuses"] = sorted(set(state.get("statuses", [])))
        state["partitions"] = sorted(set(state.get("partitions", [])))

    return {"room_id": room_id, "nodes": node_states}


@app.get("/api/racks/{rack_id}/state")
async def get_rack_state(rack_id: str):
    if not TOPOLOGY or not CHECKS_LIBRARY or not PLANNER:
        return {"rack_id": rack_id, "state": "UNKNOWN", "metrics": {}, "nodes": {}}
    targets_by_check = _collect_check_targets(TOPOLOGY, CATALOG, CHECKS_LIBRARY)
    snapshot = await PLANNER.get_snapshot(TOPOLOGY, CHECKS_LIBRARY, targets_by_check)
    nodes_metrics = await prom_client.get_node_metrics(rack_id)

    # Calculate Node States and Aggregate Rack State
    processed_nodes = {}

    total_power = 0.0
    total_temp = 0.0
    temp_count = 0

    node_states = []

    for node_id, m in nodes_metrics.items():
        temp = m.get("temperature")
        power = m.get("power")

        if power is not None:
            total_power += power
        if temp is not None and temp > 0:
            total_temp += temp
            temp_count += 1

        state = snapshot.node_states.get(node_id, "UNKNOWN")
        alerts = snapshot.node_alerts.get(node_id, {})

        node_states.append(state)
        processed_nodes[node_id] = {
            "state": state,
            "temperature": temp if temp is not None else 0,
            "power": power if power is not None else 0,
            "alerts": [{"id": cid, "severity": sev} for cid, sev in alerts.items()],
        }

    rack_state = snapshot.rack_states.get(rack_id, aggregate_states(node_states))

    avg_temp = total_temp / temp_count if temp_count > 0 else 0

    return {
        "rack_id": rack_id,
        "state": rack_state,
        "metrics": {"temperature": avg_temp, "power": total_power},
        "nodes": processed_nodes,
    }


def _expand_device_instances(device: Device) -> List[str]:
    if isinstance(device.instance, str):
        return _expand_nodes_pattern(device.instance)
    if isinstance(device.instance, dict):
        expanded: List[str] = []
        for value in device.instance.values():
            if isinstance(value, str):
                expanded.extend(_expand_nodes_pattern(value))
        return expanded
    if isinstance(device.nodes, str):
        return _expand_nodes_pattern(device.nodes)
    if isinstance(device.nodes, dict):
        expanded: List[str] = []
        for value in device.nodes.values():
            if isinstance(value, str):
                expanded.extend(_expand_nodes_pattern(value))
        return expanded
    return []


@app.get("/api/alerts/active")
async def get_active_alerts():
    if not TOPOLOGY or not CHECKS_LIBRARY or not PLANNER:
        return {"alerts": []}
    targets_by_check = _collect_check_targets(TOPOLOGY, CATALOG, CHECKS_LIBRARY)
    snapshot = await PLANNER.get_snapshot(TOPOLOGY, CHECKS_LIBRARY, targets_by_check)

    node_context: Dict[str, Dict[str, str]] = {}
    for site in TOPOLOGY.sites:
        for room in site.rooms:
            for aisle in room.aisles:
                for rack in aisle.racks:
                    for device in rack.devices:
                        for node_id in _expand_device_instances(device):
                            node_context[node_id] = {
                                "site_id": site.id,
                                "site_name": site.name,
                                "room_id": room.id,
                                "room_name": room.name,
                                "rack_id": rack.id,
                                "rack_name": rack.name,
                                "device_id": device.id,
                                "device_name": device.name,
                            }
            for rack in room.standalone_racks:
                for device in rack.devices:
                    for node_id in _expand_device_instances(device):
                        node_context[node_id] = {
                            "site_id": site.id,
                            "site_name": site.name,
                            "room_id": room.id,
                            "room_name": room.name,
                            "rack_id": rack.id,
                            "rack_name": rack.name,
                            "device_id": device.id,
                            "device_name": device.name,
                        }

    alerts = []
    for node_id, checks in snapshot.node_alerts.items():
        context = node_context.get(node_id)
        if not context:
            continue
        alerts.append(
            {
                "node_id": node_id,
                "state": snapshot.node_states.get(node_id, "UNKNOWN"),
                "checks": [{"id": cid, "severity": sev} for cid, sev in checks.items()],
                **context,
            }
        )

    return {"alerts": alerts}
