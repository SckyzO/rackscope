"""
Standalone Prometheus metrics simulator for development and demo environments.

Reads topology and template YAML files to discover all instances (nodes,
racks, PDUs, etc.) and then continuously generates realistic gauge values
for each of them.  Prometheus scrapes this process directly; no real
hardware is required.

Scenarios (defined in scenarios.yaml) control failure injection: which
nodes are down, which checks are degraded, and at what rates.  Overrides
loaded from overrides.yaml allow the backend API to force specific metric
values at runtime for interactive demos.
"""

import time
import random
import yaml
import os
import math
import re
import fnmatch
from pathlib import Path
from prometheus_client import start_http_server, Gauge

TOPOLOGY_PATH = os.getenv("TOPOLOGY_FILE", "/app/config/topology")
TEMPLATES_PATH = os.getenv("TEMPLATES_PATH", "/app/config/templates")
SIMULATOR_CONFIG_PATH = os.getenv(
    "SIMULATOR_CONFIG", "/app/config/plugins/simulator/scenarios/scenarios.yaml"
)
APP_CONFIG_PATH = os.getenv("SIMULATOR_APP_CONFIG", "/app/config/app.yaml")
METRICS_LIBRARY_PATH = os.getenv("METRICS_LIBRARY", "/app/config/metrics/library")

METRICS = {}
METRICS_DEFS = {}
SUPPORTED_METRICS = {}


def load_yaml(path):
    try:
        with open(path, "r") as f:
            return yaml.safe_load(f)
    except Exception as e:
        print(f"Error loading {path}: {e}")
        return {}


def extract_base_metric_name(metric_query):
    """Extract base metric name from PromQL query.

    Examples:
        'node_temperature_celsius' -> 'node_temperature_celsius'
        'sum(raritan_pdu_activepower_watt{...})' -> 'raritan_pdu_activepower_watt'
        'rate(node_cpu_seconds_total[5m])' -> 'node_cpu_seconds_total'
    """
    if not metric_query:
        return None

    if not any(c in metric_query for c in ["(", "{", "["]):
        return metric_query.strip()

    import re

    # Match metric_name{labels} or metric_name[range]; the name precedes the
    # first brace or bracket.
    pattern = r"\b([a-zA-Z_:][a-zA-Z0-9_:]*)\s*[{\[]"
    match = re.search(pattern, metric_query)
    if match:
        return match.group(1)

    # Fallback: grab the first valid Prometheus identifier in the expression.
    pattern = r"\b([a-zA-Z_:][a-zA-Z0-9_:]+)"
    match = re.search(pattern, metric_query)
    if match:
        return match.group(1)

    return None


def load_metrics_library(path):
    """Load metrics library and build SUPPORTED_METRICS mapping.

    Returns dict mapping Prometheus metric names to their scope (node/rack).
    """
    supported = {}
    path = Path(path)

    if not path.exists():
        print(f"Warning: Metrics library not found at {path}, using fallback")
        return None

    # Load all metric YAML files
    yaml_files = list(path.rglob("*.yaml")) + list(path.rglob("*.yml"))

    for file_path in yaml_files:
        try:
            with file_path.open("r") as f:
                data = yaml.safe_load(f)

            if not data:
                continue

            if isinstance(data, dict) and "metric" in data:
                metric_query = data.get("metric")
                metric_name = extract_base_metric_name(metric_query)
                tags = data.get("tags", [])

                # "infrastructure" tag signals rack-level metrics (PDU, HMC, etc.).
                if "infrastructure" in tags or data.get("category") == "rack":
                    scope = "rack"
                else:
                    scope = "node"

                if metric_name:
                    supported[metric_name] = scope

            elif isinstance(data, dict) and "metrics" in data:
                for metric in data.get("metrics", []):
                    if not isinstance(metric, dict):
                        continue
                    metric_query = metric.get("metric")
                    metric_name = extract_base_metric_name(metric_query)
                    tags = metric.get("tags", [])

                    if "infrastructure" in tags or metric.get("category") == "rack":
                        scope = "rack"
                    else:
                        scope = "node"

                    if metric_name:
                        supported[metric_name] = scope

        except Exception as e:
            print(f"Warning: Failed to load metric from {file_path}: {e}")

    print(f"Loaded {len(supported)} metrics from library at {path}")
    return supported


def _expand_patterns(patterns):
    exact = set()
    wildcards = []
    if not patterns:
        return exact, wildcards
    for pattern in patterns:
        if not isinstance(pattern, str) or not pattern:
            continue
        if "[" in pattern and "]" in pattern and "-" in pattern:
            expanded = parse_nodeset(pattern)
            for name in expanded.values():
                exact.add(name)
            continue
        if "*" in pattern or "?" in pattern:
            wildcards.append(pattern)
            continue
        exact.add(pattern)
    return exact, wildcards


def _matches(name, exact, wildcards):
    if name in exact:
        return True
    for pattern in wildcards:
        if fnmatch.fnmatchcase(name, pattern):
            return True
    return False


def load_metrics_catalog(path):
    data = load_yaml(path) or {}
    metrics = data.get("metrics") if isinstance(data, dict) else []
    if not isinstance(metrics, list):
        return []
    return [m for m in metrics if isinstance(m, dict)]


def load_metrics_catalogs(paths):
    merged = {}
    for path in paths:
        for metric in load_metrics_catalog(path):
            name = metric.get("name")
            if isinstance(name, str):
                merged[name] = metric
    return list(merged.values())


def resolve_metrics_catalogs(sim_cfg):
    catalogs = sim_cfg.get("metrics_catalogs")
    paths = []
    if isinstance(catalogs, list):
        for item in catalogs:
            if isinstance(item, str):
                paths.append(item)
                continue
            if not isinstance(item, dict):
                continue
            if item.get("enabled") is False:
                continue
            path = item.get("path")
            if isinstance(path, str) and path:
                paths.append(path)
    if paths:
        return paths
    single_path = sim_cfg.get(
        "metrics_catalog_path", "/app/config/plugins/simulator/metrics/metrics_full.yaml"
    )
    return [single_path]


def build_metric_registry(metric_defs):
    registry = {}
    for name, definition in metric_defs.items():
        if name not in SUPPORTED_METRICS:
            print(f"Warning: Metric {name} not supported yet")
            continue
        scope = definition.get("scope")
        label_templates = definition.get("labels") or {}
        if definition.get("labels_only") or definition.get("include_base_labels") is False:
            labelnames = []
        else:
            labelnames = list(BASE_LABELS.get(scope, []))
        for key in label_templates.keys():
            if key not in labelnames:
                labelnames.append(key)
        registry[name] = Gauge(name, definition.get("help") or name, labelnames)
    return registry


def _resolve_token(value, base_labels, context):
    if not isinstance(value, str):
        return value
    if not value.startswith("$"):
        return value
    token = value[1:]
    if token in context:
        return context[token]
    return base_labels.get(token, "")


def resolve_labels(definition, base_labels, context):
    if definition.get("labels_only") or definition.get("include_base_labels") is False:
        labels = {}
    else:
        labels = dict(base_labels)
    for key, template in (definition.get("labels") or {}).items():
        labels[key] = _resolve_token(template, base_labels, context)
    return labels


def set_metric_value(name, base_labels, value, context):
    definition = METRICS_DEFS.get(name)
    gauge = METRICS.get(name)
    if not definition or not gauge:
        return
    labels = resolve_labels(definition, base_labels, context)
    gauge.labels(**labels).set(value)


def load_topology_data(path):
    if os.path.isdir(path):
        sites_path = os.path.join(path, "sites.yaml")
        sites_data = load_yaml(sites_path) or {}
        sites_out = []
        for site in sites_data.get("sites", []):
            site_id = site.get("id")
            if not site_id:
                continue
            rooms_out = []
            room_entries = site.get("rooms") or []
            if not room_entries:
                rooms_dir = os.path.join(path, "datacenters", site_id, "rooms")
                room_entries = [
                    {"id": p}
                    for p in sorted(os.listdir(rooms_dir))
                    if os.path.isdir(os.path.join(rooms_dir, p))
                ]
            for room_entry in room_entries:
                room_id = room_entry.get("id") if isinstance(room_entry, dict) else room_entry
                room_path = os.path.join(
                    path, "datacenters", site_id, "rooms", room_id, "room.yaml"
                )
                room_data = load_yaml(room_path) or {}
                aisles_out = []
                for aisle in room_data.get("aisles", []):
                    aisle_id = aisle.get("id") if isinstance(aisle, dict) else aisle
                    aisle_path = os.path.join(
                        path,
                        "datacenters",
                        site_id,
                        "rooms",
                        room_id,
                        "aisles",
                        aisle_id,
                        "aisle.yaml",
                    )
                    aisle_data = load_yaml(aisle_path) or {}
                    racks_out = []
                    for rack_ref in aisle_data.get("racks", []):
                        rack_id = rack_ref.get("id") if isinstance(rack_ref, dict) else rack_ref
                        rack_path = os.path.join(
                            path,
                            "datacenters",
                            site_id,
                            "rooms",
                            room_id,
                            "aisles",
                            aisle_id,
                            "racks",
                            f"{rack_id}.yaml",
                        )
                        rack_data = load_yaml(rack_path) or {}
                        racks_out.append(rack_data)
                    aisles_out.append(
                        {"id": aisle_id, "name": aisle.get("name"), "racks": racks_out}
                    )
                standalone_out = []
                for rack_ref in room_data.get("standalone_racks", []):
                    rack_id = rack_ref.get("id") if isinstance(rack_ref, dict) else rack_ref
                    rack_path = os.path.join(
                        path,
                        "datacenters",
                        site_id,
                        "rooms",
                        room_id,
                        "standalone_racks",
                        f"{rack_id}.yaml",
                    )
                    rack_data = load_yaml(rack_path) or {}
                    standalone_out.append(rack_data)
                rooms_out.append(
                    {
                        "id": room_data.get("id", room_id),
                        "name": room_data.get("name", room_id),
                        "aisles": aisles_out,
                        "standalone_racks": standalone_out,
                    }
                )
            sites_out.append({"id": site_id, "name": site.get("name", site_id), "rooms": rooms_out})
        return {"sites": sites_out}
    return load_yaml(path)


def parse_nodeset(pattern):
    if not isinstance(pattern, str):
        return pattern or {}
    match = re.match(r"(.+)\[(\d+)-(\d+)\]", pattern)
    if not match:
        return {1: pattern}
    prefix, start_str, end_str = match.groups()
    start, end = int(start_str), int(end_str)
    count = end - start + 1
    padding = len(start_str)
    nodes = {}
    for i in range(count):
        num = str(start + i).zfill(padding)
        nodes[i + 1] = f"{prefix}{num}"
    return nodes


def load_device_templates(templates_dir):
    """Load device templates to check instance_type."""
    templates = {}
    templates_path = os.path.join(templates_dir, "devices")
    if not os.path.exists(templates_path):
        print(f"Warning: templates path does not exist: {templates_path}")
        return templates

    for root, _, files in os.walk(templates_path):
        for file in files:
            if file.endswith(".yaml"):
                file_path = os.path.join(root, file)
                data = load_yaml(file_path) or {}
                for template in data.get("templates", []):
                    templates[template["id"]] = template

    print(f"Loaded {len(templates)} device templates")
    storage_templates = {k: v for k, v in templates.items() if v.get("type") == "storage"}
    print(f"Found {len(storage_templates)} storage templates: {list(storage_templates.keys())}")
    return templates


def load_topology_nodes(topo_data, device_templates=None):
    targets = []
    if not topo_data:
        return []

    device_templates = device_templates or {}

    for site in topo_data.get("sites", []):
        for room in site.get("rooms", []):

            def process_rack(rack, aisle_id):
                for device in rack.get("devices", []):
                    template_id = device.get("template_id")
                    template = device_templates.get(template_id, {})
                    device_type = template.get("type", "server")

                    nodes_map = device.get("instance") or device.get("nodes")
                    if isinstance(nodes_map, str):
                        nodes_map = parse_nodeset(nodes_map)
                    elif isinstance(nodes_map, list):
                        nodes_map = {
                            idx + 1: value
                            for idx, value in enumerate(nodes_map)
                            if isinstance(value, str)
                        }
                    elif not isinstance(nodes_map, dict):
                        nodes_map = {}

                    # For storage arrays (type=storage), create only 1 instance (the controller)
                    # Drives will be represented as labels in metrics
                    if device_type == "storage" and nodes_map:
                        # Get the number of slots for storage metrics from disk_layout (or fallback to layout)
                        disk_layout = template.get("disk_layout") or template.get("layout", {})
                        matrix = disk_layout.get("matrix", [[]])
                        slot_count = sum(len(row) for row in matrix)
                        storage_type = template.get("storage_type", "generic")

                        # Get the instance name (should be a single value, e.g., da01-r02-01)
                        instance_name = list(nodes_map.values())[0] if nodes_map else device["id"]

                        print(
                            f"Creating storage target: device={device['id']}, instance={instance_name}, slots={slot_count}, type={device_type}, storage_type={storage_type}"
                        )

                        targets.append(
                            {
                                "site_id": site["id"],
                                "room_id": room["id"],
                                "aisle_id": aisle_id,
                                "rack_id": rack["id"],
                                "chassis_id": device["id"],
                                "node_id": instance_name,
                                "device_type": "storage",
                                "storage_type": storage_type,
                                "slot_count": slot_count,
                                "template_id": template_id,
                            }
                        )
                    elif not nodes_map:
                        targets.append(
                            {
                                "site_id": site["id"],
                                "room_id": room["id"],
                                "aisle_id": aisle_id,
                                "rack_id": rack["id"],
                                "chassis_id": device["id"],
                                "node_id": device["id"],
                            }
                        )
                    else:
                        for _, node_id in nodes_map.items():
                            targets.append(
                                {
                                    "site_id": site["id"],
                                    "room_id": room["id"],
                                    "aisle_id": aisle_id,
                                    "rack_id": rack["id"],
                                    "chassis_id": device["id"],
                                    "node_id": node_id,
                                }
                            )

            for aisle in room.get("aisles", []):
                for rack in aisle.get("racks", []):
                    process_rack(rack, aisle["id"])
            for rack in room.get("standalone_racks", []):
                process_rack(rack, "standalone")
    return targets


active_incidents = {"aisles": {}, "racks": {}}
pdu_energy_state = {}
# Counter states for monotonically increasing metrics
node_cpu_idle_seconds = {}
node_disk_read_bytes = {}
node_disk_written_bytes = {}
node_network_rx_bytes = {}
node_network_tx_bytes = {}
switch_port_rx_bytes = {}
switch_port_tx_bytes = {}


def get_fallback_supported_metrics():
    """Fallback metrics if library can't be loaded."""
    return {
        # Node exporter metrics (base)
        "node_temperature_celsius": "node",
        "node_power_watts": "node",
        "node_health_status": "node",
        "node_load_percent": "node",
        "up": "node",
        # Node exporter metrics (new)
        "node_cpu_seconds_total": "node",
        "node_memory_MemAvailable_bytes": "node",
        "node_memory_MemTotal_bytes": "node",
        "node_filesystem_size_bytes": "node",
        "node_filesystem_avail_bytes": "node",
        "node_disk_read_bytes_total": "node",
        "node_disk_written_bytes_total": "node",
        "node_network_receive_bytes_total": "node",
        "node_network_transmit_bytes_total": "node",
        # IPMI metrics
        "ipmi_fan_speed_state": "node",
        "ipmi_power_state": "node",
        "ipmi_sensor_state": "node",
        "ipmi_temperature_state": "node",
        "ipmi_voltage_state": "node",
        "ipmi_up": "node",
        # Slurm
        "slurm_node_status": "node",
        # E-Series storage
        "eseries_exporter_collect_error": "node",
        "eseries_storage_system_status": "node",
        "eseries_drive_status": "node",
        "eseries_battery_status": "node",
        "eseries_fan_status": "node",
        "eseries_power_supply_status": "node",
        "eseries_cache_memory_dimm_status": "node",
        "eseries_thermal_sensor_status": "node",
        # Sequana3 cooling
        "sequana3_hyc_p_in_kpa": "rack",
        "sequana3_hyc_state_info": "rack",
        "sequana3_hyc_leak_sensor_pump": "rack",
        "sequana3_hyc_tmp_pcb_cel": "rack",
        # PMC (Power Management Controller) — total rack power aggregated by the PMC
        "sequana3_pmc_total_watt": "rack",
        # Raritan PDU
        "raritan_pdu_activeenergy_watthour_total": "rack",
        "raritan_pdu_activepower_watt": "rack",
        "raritan_pdu_apparentpower_voltampere": "rack",
        "raritan_pdu_current_ampere": "rack",
        "raritan_pdu_inletrating": "rack",
        "raritan_pdu_voltage_volt": "rack",
        # Network switches
        "switch_port_oper_status": "node",
        "switch_port_in_octets": "node",
        "switch_port_out_octets": "node",
    }


BASE_LABELS = {
    "node": ["site_id", "room_id", "rack_id", "chassis_id", "node_id", "instance", "job"],
    "rack": ["site_id", "room_id", "rack_id", "instance", "job"],
}

SLURM_STATUS_LEVELS = [
    "allocated",
    "completing",
    "down",
    "drain",
    "draining",
    "fail",
    "idle",
    "maint",
    "mixed",
    "reserved",
    "planned",
    "unknown",
]


def normalize_metric_defs(metric_defs):
    defs = {}
    for item in metric_defs:
        name = item.get("name") if isinstance(item, dict) else None
        if not name:
            continue
        scope = item.get("scope") or SUPPORTED_METRICS.get(name)
        if not scope:
            print(f"Warning: Metric {name} missing scope")
            continue
        instances = item.get("instances") if isinstance(item.get("instances"), list) else []
        racks = item.get("racks") if isinstance(item.get("racks"), list) else []
        labels = item.get("labels") if isinstance(item.get("labels"), dict) else {}
        help_text = item.get("help") if isinstance(item.get("help"), str) else name
        inst_exact, inst_wild = _expand_patterns(instances)
        rack_exact, rack_wild = _expand_patterns(racks)
        defs[name] = {
            "scope": scope,
            "labels": labels,
            "help": help_text,
            "inst_exact": inst_exact,
            "inst_wild": inst_wild,
            "rack_exact": rack_exact,
            "rack_wild": rack_wild,
            "labels_only": bool(item.get("labels_only")),
            "include_base_labels": item.get("include_base_labels", True),
        }
    return defs


def load_simulator_config():
    sim_cfg = load_yaml(SIMULATOR_CONFIG_PATH) or {}
    app_cfg = load_yaml(APP_CONFIG_PATH) or {}

    # Try new format first (plugins.simulator), then legacy format (simulator)
    app_sim = None
    if isinstance(app_cfg, dict):
        plugins = app_cfg.get("plugins")
        if isinstance(plugins, dict) and "simulator" in plugins:
            app_sim = plugins["simulator"]
        elif "simulator" in app_cfg:
            app_sim = app_cfg["simulator"]

    if isinstance(app_sim, dict):
        sim_cfg = {**sim_cfg, **app_sim}
    return sim_cfg


def apply_scenario(sim_cfg):
    scenario_name = sim_cfg.get("scenario")
    scenarios = sim_cfg.get("scenarios", {})
    if scenario_name and isinstance(scenarios, dict) and scenario_name in scenarios:
        scenario_cfg = scenarios.get(scenario_name) or {}
        if isinstance(scenario_cfg, dict):
            merged = dict(sim_cfg)
            # Scenario should be authoritative. Do not inherit random rates unless explicitly set.
            if "incident_rates" not in scenario_cfg:
                merged["incident_rates"] = {}
            for key in [
                "incident_rates",
                "incident_durations",
                "profiles",
                "seed",
                "update_interval_seconds",
            ]:
                if key in scenario_cfg:
                    merged[key] = scenario_cfg[key]
            if "scale_factor" in scenario_cfg:
                merged["scale_factor"] = scenario_cfg["scale_factor"]
            return merged
    return sim_cfg


def load_overrides(path):
    data = load_yaml(path) or {}
    overrides = data.get("overrides") if isinstance(data, dict) else []
    if not overrides:
        return []
    now = int(time.time())
    active = []
    for item in overrides:
        if not isinstance(item, dict):
            continue
        expires_at = item.get("expires_at")
        if expires_at and expires_at <= now:
            continue
        active.append(item)
    return active


def simulate():
    # SUPPORTED_METRICS is built from two independent sources:
    # 1. Fallback hardcoded dict (always available)
    # 2. Display metrics library (scope hints for well-known metrics)
    #
    # IMPORTANT: SUPPORTED_METRICS must NOT come from config/metrics/library/ alone.
    # The display library only has 7 metrics (for UI charts). The simulator
    # generates many more (node_exporter, IPMI, IPMI, Slurm, etc.) which come
    # from metrics_full.yaml. The catalog IS the authority on what to generate.
    # The display library just provides scope hints for metrics the catalog may
    # not explicitly classify.
    global SUPPORTED_METRICS
    SUPPORTED_METRICS = get_fallback_supported_metrics()  # Start with the full set
    library_hints = load_metrics_library(METRICS_LIBRARY_PATH)
    if library_hints:
        # Merge scope hints from display library on top of fallback (don't replace)
        SUPPORTED_METRICS.update(library_hints)
        print(f"Loaded display library scope hints ({len(library_hints)} entries); "
              f"SUPPORTED_METRICS total: {len(SUPPORTED_METRICS)}")
    else:
        print(f"Using fallback metrics only ({len(SUPPORTED_METRICS)} metrics)")

    # Load Initial Config
    sim_cfg = apply_scenario(load_simulator_config())
    update_interval = sim_cfg.get("update_interval_seconds", sim_cfg.get("update_interval", 20))
    rates = sim_cfg.get("incident_rates", {})
    durations = sim_cfg.get("incident_durations", {"rack": 3, "aisle": 5})
    profiles = sim_cfg.get("profiles", {})
    seed = sim_cfg.get("seed")
    scale_factor = sim_cfg.get("scale_factor", 1.0)
    slurm_random_statuses = (
        sim_cfg.get("slurm_random_statuses", {}) if isinstance(sim_cfg, dict) else {}
    )
    slurm_random_match = sim_cfg.get("slurm_random_match", []) if isinstance(sim_cfg, dict) else []
    overrides_path = sim_cfg.get("overrides_path", "/app/config/plugins/simulator/overrides/overrides.yaml")
    metrics_catalog_paths = resolve_metrics_catalogs(sim_cfg)
    metric_defs = normalize_metric_defs(load_metrics_catalogs(metrics_catalog_paths))
    if not metric_defs:
        print(f"Error: No metrics catalog found at {', '.join(metrics_catalog_paths)}")
        return
    global METRICS, METRICS_DEFS
    METRICS_DEFS = metric_defs
    METRICS = build_metric_registry(metric_defs)

    def metric_enabled(name, scope, node_id=None, rack_id=None):
        definition = METRICS_DEFS.get(name)
        if not definition or definition.get("scope") != scope:
            return False
        if scope == "node":
            if not definition["inst_exact"] and not definition["inst_wild"]:
                return True
            return _matches(node_id or "", definition["inst_exact"], definition["inst_wild"])
        if scope == "rack":
            if not definition["rack_exact"] and not definition["rack_wild"]:
                return True
            return _matches(rack_id or "", definition["rack_exact"], definition["rack_wild"])
        return False

    def build_base_labels(target):
        # Only include labels that are in BASE_LABELS for "node" scope
        # BASE_LABELS["node"] = ["site_id", "room_id", "rack_id", "chassis_id", "node_id", "instance", "job"]
        base_labels = {
            "site_id": target.get("site_id", ""),
            "room_id": target.get("room_id", ""),
            "rack_id": target.get("rack_id", ""),
            "chassis_id": target.get("chassis_id", ""),
            "node_id": target.get("node_id", ""),
            "instance": target["node_id"],
            "job": "node",
        }
        return base_labels

    print(f"Starting simulation loop (Interval: {update_interval}s)")

    # Load device templates once
    device_templates = load_device_templates(TEMPLATES_PATH)

    tick = 0

    while True:
        # Reload simulator config every tick — picks up scenario changes without container restart
        _new_cfg = apply_scenario(load_simulator_config())
        rates = _new_cfg.get("incident_rates", {})
        durations = _new_cfg.get("incident_durations", {"rack": 3, "aisle": 5})
        profiles = _new_cfg.get("profiles", {})
        seed = _new_cfg.get("seed")
        scale_factor = _new_cfg.get("scale_factor", 1.0)
        slurm_random_statuses = (
            _new_cfg.get("slurm_random_statuses", {}) if isinstance(_new_cfg, dict) else {}
        )
        slurm_random_match = (
            _new_cfg.get("slurm_random_match", []) if isinstance(_new_cfg, dict) else []
        )
        update_interval = _new_cfg.get(
            "update_interval_seconds", _new_cfg.get("update_interval", update_interval)
        )

        # Reload topology every tick to support dynamic changes
        topo_data = load_topology_data(TOPOLOGY_PATH)
        targets = load_topology_nodes(topo_data, device_templates)
        forced_slurm_status = {}
        if isinstance(slurm_random_statuses, dict):
            available_nodes = [target["node_id"] for target in targets if target.get("node_id")]
            if isinstance(slurm_random_match, list) and slurm_random_match:
                available_nodes = [
                    node_id
                    for node_id in available_nodes
                    if any(fnmatch.fnmatchcase(node_id, pattern) for pattern in slurm_random_match)
                ]
            random.shuffle(available_nodes)
            cursor = 0
            for status_name in ["drain", "down", "maint"]:
                count = slurm_random_statuses.get(status_name)
                if not isinstance(count, int) or count <= 0:
                    continue
                for _ in range(min(count, max(0, len(available_nodes) - cursor))):
                    forced_slurm_status[available_nodes[cursor]] = status_name
                    cursor += 1
        rack_info = {}
        for target in targets:
            rid = target["rack_id"]
            if rid not in rack_info:
                rack_info[rid] = {
                    "site_id": target["site_id"],
                    "room_id": target["room_id"],
                    "aisle_id": target["aisle_id"],
                }
        tick += 1

        if seed is not None:
            random.seed(f"{seed}-{tick}")

        overrides = load_overrides(overrides_path)
        overrides_by_instance = {}
        overrides_by_rack = {}
        for item in overrides:
            inst = item.get("instance")
            if not inst:
                rack_id = item.get("rack_id")
                if rack_id:
                    overrides_by_rack.setdefault(rack_id, []).append(item)
                continue
            overrides_by_instance.setdefault(inst, []).append(item)

        # --- Macro Incidents ---
        for aisle in set(t["aisle_id"] for t in targets):
            aisle_rate = min(1.0, rates.get("aisle_cooling_failure", 0.005) * scale_factor)
            if aisle not in active_incidents["aisles"] and random.random() < aisle_rate:
                print(f"!!! Incident: Aisle {aisle} cooling failure")
                active_incidents["aisles"][aisle] = tick
            elif aisle in active_incidents["aisles"] and (
                tick - active_incidents["aisles"][aisle]
            ) > durations.get("aisle", 5):
                del active_incidents["aisles"][aisle]

        for rack in set(t["rack_id"] for t in targets):
            rack_rate = min(1.0, rates.get("rack_macro_failure", 0.01) * scale_factor)
            if rack not in active_incidents["racks"] and random.random() < rack_rate:
                print(f"!!! Incident: Rack {rack} power issue")
                active_incidents["racks"][rack] = tick
            elif rack in active_incidents["racks"] and (
                tick - active_incidents["racks"][rack]
            ) > durations.get("rack", 3):
                del active_incidents["racks"][rack]

        for target in targets:
            base_labels = build_base_labels(target)
            nid = target["node_id"].lower()
            aid = target["aisle_id"]
            rid = target["rack_id"]
            is_storage = target.get("device_type") == "storage"

            random.seed(nid + str(tick // 2))

            # --- Skip compute-specific metrics for storage devices ---
            if is_storage:
                # For storage arrays, only generate eseries metrics
                slot_count = target.get("slot_count", 60)

                # Generate eseries metrics for storage controller and drives
                if metric_enabled(
                    "eseries_storage_system_status", "node", node_id=target["node_id"]
                ):
                    # Controller status (0 = optimal, 1 = degraded, 2 = failed)
                    controller_status = (
                        0 if random.random() > 0.02 else (1 if random.random() > 0.5 else 2)
                    )
                    # Always emit ALL status labels (1 = current, 0 = not current)
                    # This prevents stale Prometheus series from causing false-positive CRIT alerts
                    for _ctl_label, _ctl_code in [("optimal", 0), ("degraded", 1), ("failed", 2)]:
                        set_metric_value(
                            "eseries_storage_system_status",
                            base_labels,
                            1 if controller_status == _ctl_code else 0,
                            {"status": _ctl_label},
                        )

                if metric_enabled("eseries_drive_status", "node", node_id=target["node_id"]):
                    # Determine tray number from instance name (E-Series architecture)
                    # da01-* → tray=99 (head/controller)
                    # da02-* → tray=01 (shelf 1)
                    # da03-* → tray=02 (shelf 2), etc.
                    tray_num = "99"  # Default for head
                    instance_name = target["node_id"]
                    if instance_name.startswith("da"):
                        try:
                            array_num = int(
                                instance_name.split("-")[0][2:]
                            )  # Extract number from "daNNN"
                            if array_num == 1:
                                tray_num = "99"  # Head
                            else:
                                tray_num = str(array_num - 1).zfill(
                                    2
                                )  # Shelf (da02→01, da03→02, etc.)
                        except (ValueError, IndexError):
                            pass  # Keep default tray=99

                    # Generate metrics for all drives
                    for drive_slot in range(1, slot_count + 1):
                        # Random drive failures (1% chance)
                        drive_status_label = "optimal"
                        if random.random() < 0.01:
                            drive_status_label = "failed"

                        # Always emit both statuses (1=current, 0=other) to prevent stale CRIT series
                        for _drv_label in ["optimal", "failed"]:
                            set_metric_value(
                                "eseries_drive_status",
                                base_labels,
                                1 if _drv_label == drive_status_label else 0,
                                {
                                    "status": _drv_label,
                                    "drive_id": str(drive_slot),
                                    "slot": str(drive_slot),
                                    "tray": tray_num,
                                },
                            )

                # Skip the rest of compute-specific logic
                continue

            # --- Determine Profile ---
            prof_name = (
                "compute"
                if nid.startswith("compute")
                else "gpu"
                if nid.startswith("gpu")
                else "service"
                if (nid.startswith("login") or nid.startswith("mngt"))
                else "network"
                if ("isw" in nid or "esw" in nid)
                else "compute"
            )

            p = profiles.get(prof_name, profiles.get("compute", {}))

            # Base calculation
            load_min = p.get("load_min", 10)
            load_max = p.get("load_max", 50)

            if prof_name == "compute":
                load = load_min + ((math.sin(tick / 10.0) + 1) / 2.0 * (load_max - load_min))
            elif prof_name == "gpu":
                load = (
                    random.uniform(load_min, load_max)
                    if random.random() > 0.7
                    else random.uniform(5, 15)
                )
            else:
                load = random.uniform(load_min, load_max)

            # --- Apply Macro Incidents ---
            temp_boost = 12.0 if aid in active_incidents["aisles"] else 0
            is_down = rid in active_incidents["racks"]
            rack_overrides = overrides_by_rack.get(rid, [])
            for override in rack_overrides:
                metric = override.get("metric")
                value = override.get("value")
                if metric == "rack_down":
                    try:
                        value = float(value)
                    except (TypeError, ValueError):
                        continue
                    if value > 0:
                        is_down = True

            # Final Metrics
            temp = (
                p.get("base_temp", 22)
                + (load / 100.0 * p.get("temp_range", 5))
                + temp_boost
                + random.uniform(-0.5, 0.5)
            )
            power = (
                (p.get("base_power", 150) + (load / 100.0 * p.get("power_var", 50)))
                if not is_down
                else 50.0
            )
            final_load = load if not is_down else 0

            # Micro-failures
            node_rate = min(1.0, rates.get("node_micro_failure", 0.001) * scale_factor)
            if not is_down and random.random() < node_rate:
                temp += 25.0

            status = 0
            if is_down or temp > 45:
                status = 2
            elif temp > 38:
                status = 1
            up_val = 0 if is_down else 1

            inst_overrides = overrides_by_instance.get(target["node_id"], [])
            for override in inst_overrides:
                metric = override.get("metric")
                value = override.get("value")
                try:
                    value = float(value)
                except (TypeError, ValueError):
                    continue
                if metric == "up":
                    up_val = 0 if value <= 0 else 1
                    if up_val == 0:
                        status = 2
                        power = 0.0
                        final_load = 0.0
                elif metric == "node_temperature_celsius":
                    temp = value
                elif metric == "node_power_watts":
                    power = value
                elif metric == "node_load_percent":
                    final_load = value
                elif metric == "node_health_status":
                    status = int(value)

            if metric_enabled("node_temperature_celsius", "node", node_id=target["node_id"]):
                set_metric_value("node_temperature_celsius", base_labels, round(temp, 1), {})
            if metric_enabled("node_power_watts", "node", node_id=target["node_id"]):
                set_metric_value("node_power_watts", base_labels, round(power, 0), {})
            if metric_enabled("node_load_percent", "node", node_id=target["node_id"]):
                set_metric_value("node_load_percent", base_labels, round(final_load, 1), {})
            if metric_enabled("node_health_status", "node", node_id=target["node_id"]):
                set_metric_value("node_health_status", base_labels, status, {})
            if metric_enabled("up", "node", node_id=target["node_id"]):
                set_metric_value("up", base_labels, up_val, {})

            # Node Exporter: CPU idle time counter
            if metric_enabled("node_cpu_seconds_total", "node", node_id=target["node_id"]):
                cpu_key = nid
                idle_percent = 100.0 - final_load
                prev_idle = node_cpu_idle_seconds.get(cpu_key, random.uniform(500000, 1000000))
                # Increment by (idle_percent / 100) * update_interval seconds per CPU
                # Assuming 64 CPUs for compute nodes
                num_cpus = 64 if prof_name in ("compute", "gpu") else 32
                idle_increment = (idle_percent / 100.0) * update_interval * num_cpus
                new_idle = prev_idle + idle_increment
                node_cpu_idle_seconds[cpu_key] = new_idle
                set_metric_value(
                    "node_cpu_seconds_total",
                    base_labels,
                    round(new_idle, 2),
                    {"mode": "idle", "cpu": "0"},
                )

            # Node Exporter: Memory metrics
            if metric_enabled(
                "node_memory_MemTotal_bytes", "node", node_id=target["node_id"]
            ) or metric_enabled(
                "node_memory_MemAvailable_bytes", "node", node_id=target["node_id"]
            ):
                mem_total_gb = 512 if prof_name == "gpu" else 256 if prof_name == "compute" else 64
                mem_total_bytes = mem_total_gb * 1024 * 1024 * 1024
                mem_used_percent = final_load * 0.8  # Memory usage roughly tracks load
                mem_available_bytes = mem_total_bytes * (1.0 - mem_used_percent / 100.0)
                if metric_enabled("node_memory_MemTotal_bytes", "node", node_id=target["node_id"]):
                    set_metric_value(
                        "node_memory_MemTotal_bytes", base_labels, int(mem_total_bytes), {}
                    )
                if metric_enabled(
                    "node_memory_MemAvailable_bytes", "node", node_id=target["node_id"]
                ):
                    set_metric_value(
                        "node_memory_MemAvailable_bytes", base_labels, int(mem_available_bytes), {}
                    )

            # Node Exporter: Filesystem metrics
            if metric_enabled(
                "node_filesystem_size_bytes", "node", node_id=target["node_id"]
            ) or metric_enabled("node_filesystem_avail_bytes", "node", node_id=target["node_id"]):
                fs_size_gb = 1000 if "storage" in nid else 200
                fs_size_bytes = fs_size_gb * 1024 * 1024 * 1024
                fs_used_percent = 30.0 + (final_load * 0.5)  # Disk usage grows with load
                fs_avail_bytes = fs_size_bytes * (1.0 - fs_used_percent / 100.0)
                if metric_enabled("node_filesystem_size_bytes", "node", node_id=target["node_id"]):
                    set_metric_value(
                        "node_filesystem_size_bytes",
                        base_labels,
                        int(fs_size_bytes),
                        {"mountpoint": "/", "fstype": "ext4"},
                    )
                if metric_enabled("node_filesystem_avail_bytes", "node", node_id=target["node_id"]):
                    set_metric_value(
                        "node_filesystem_avail_bytes",
                        base_labels,
                        int(fs_avail_bytes),
                        {"mountpoint": "/", "fstype": "ext4"},
                    )

            # Node Exporter: Disk I/O counters
            if metric_enabled(
                "node_disk_read_bytes_total", "node", node_id=target["node_id"]
            ) or metric_enabled("node_disk_written_bytes_total", "node", node_id=target["node_id"]):
                disk_key = nid
                # I/O rate depends on load: more load = more I/O
                read_rate_mb = (10 + final_load * 0.5) if not is_down else 0
                write_rate_mb = (5 + final_load * 0.3) if not is_down else 0
                read_bytes_per_interval = read_rate_mb * 1024 * 1024 * update_interval
                write_bytes_per_interval = write_rate_mb * 1024 * 1024 * update_interval

                prev_read = node_disk_read_bytes.get(disk_key, random.uniform(5e11, 1e12))
                prev_write = node_disk_written_bytes.get(disk_key, random.uniform(3e11, 8e11))
                new_read = prev_read + read_bytes_per_interval
                new_write = prev_write + write_bytes_per_interval
                node_disk_read_bytes[disk_key] = new_read
                node_disk_written_bytes[disk_key] = new_write

                if metric_enabled("node_disk_read_bytes_total", "node", node_id=target["node_id"]):
                    set_metric_value(
                        "node_disk_read_bytes_total", base_labels, int(new_read), {"device": "sda"}
                    )
                if metric_enabled(
                    "node_disk_written_bytes_total", "node", node_id=target["node_id"]
                ):
                    set_metric_value(
                        "node_disk_written_bytes_total",
                        base_labels,
                        int(new_write),
                        {"device": "sda"},
                    )

            # Node Exporter: Network counters
            if metric_enabled(
                "node_network_receive_bytes_total", "node", node_id=target["node_id"]
            ) or metric_enabled(
                "node_network_transmit_bytes_total", "node", node_id=target["node_id"]
            ):
                net_key = nid
                # Network traffic depends on load and node type
                if prof_name == "network":
                    rx_rate_mb = 500 + random.uniform(-50, 50)
                    tx_rate_mb = 500 + random.uniform(-50, 50)
                else:
                    rx_rate_mb = (20 + final_load * 2) if not is_down else 0
                    tx_rate_mb = (15 + final_load * 1.5) if not is_down else 0

                rx_bytes_per_interval = rx_rate_mb * 1024 * 1024 * update_interval
                tx_bytes_per_interval = tx_rate_mb * 1024 * 1024 * update_interval

                prev_rx = node_network_rx_bytes.get(net_key, random.uniform(1e12, 5e12))
                prev_tx = node_network_tx_bytes.get(net_key, random.uniform(8e11, 4e12))
                new_rx = prev_rx + rx_bytes_per_interval
                new_tx = prev_tx + tx_bytes_per_interval
                node_network_rx_bytes[net_key] = new_rx
                node_network_tx_bytes[net_key] = new_tx

                if metric_enabled(
                    "node_network_receive_bytes_total", "node", node_id=target["node_id"]
                ):
                    set_metric_value(
                        "node_network_receive_bytes_total",
                        base_labels,
                        int(new_rx),
                        {"device": "eth0"},
                    )
                if metric_enabled(
                    "node_network_transmit_bytes_total", "node", node_id=target["node_id"]
                ):
                    set_metric_value(
                        "node_network_transmit_bytes_total",
                        base_labels,
                        int(new_tx),
                        {"device": "eth0"},
                    )

            # Switch port metrics for network devices
            if prof_name == "network":
                if (
                    metric_enabled("switch_port_oper_status", "node", node_id=target["node_id"])
                    or metric_enabled("switch_port_in_octets", "node", node_id=target["node_id"])
                    or metric_enabled("switch_port_out_octets", "node", node_id=target["node_id"])
                ):
                    num_ports = 40 if "isw" in nid else 48
                    for port_idx in range(1, min(num_ports + 1, 9)):  # Simulate first 8 ports
                        port_key = f"{nid}-port{port_idx}"
                        port_status = (
                            1 if not is_down and random.random() > 0.05 else 2
                        )  # 1=up, 2=down

                        if metric_enabled(
                            "switch_port_oper_status", "node", node_id=target["node_id"]
                        ):
                            set_metric_value(
                                "switch_port_oper_status",
                                base_labels,
                                port_status,
                                {"port": str(port_idx)},
                            )

                        if port_status == 1:  # Only count traffic if port is up
                            port_rx_rate_mb = random.uniform(10, 200)
                            port_tx_rate_mb = random.uniform(10, 200)
                            port_rx_bytes = port_rx_rate_mb * 1024 * 1024 * update_interval
                            port_tx_bytes = port_tx_rate_mb * 1024 * 1024 * update_interval

                            prev_port_rx = switch_port_rx_bytes.get(
                                port_key, random.uniform(1e10, 1e11)
                            )
                            prev_port_tx = switch_port_tx_bytes.get(
                                port_key, random.uniform(1e10, 1e11)
                            )
                            new_port_rx = prev_port_rx + port_rx_bytes
                            new_port_tx = prev_port_tx + port_tx_bytes
                            switch_port_rx_bytes[port_key] = new_port_rx
                            switch_port_tx_bytes[port_key] = new_port_tx

                            if metric_enabled(
                                "switch_port_in_octets", "node", node_id=target["node_id"]
                            ):
                                set_metric_value(
                                    "switch_port_in_octets",
                                    base_labels,
                                    int(new_port_rx),
                                    {"port": str(port_idx)},
                                )
                            if metric_enabled(
                                "switch_port_out_octets", "node", node_id=target["node_id"]
                            ):
                                set_metric_value(
                                    "switch_port_out_octets",
                                    base_labels,
                                    int(new_port_tx),
                                    {"port": str(port_idx)},
                                )

            slurm_status = forced_slurm_status.get(target["node_id"], "idle")
            if slurm_status == "idle":
                if up_val == 0 or status == 2:
                    slurm_status = "down"
                elif status == 1:
                    slurm_status = "drain"
                elif final_load >= 70:
                    slurm_status = "allocated"
            partitions = ["all", "cpu"]
            if "gpu" in nid:
                partitions.append("gpu")
            if metric_enabled("slurm_node_status", "node", node_id=target["node_id"]):
                for partition in partitions:
                    for status_name in SLURM_STATUS_LEVELS:
                        value = 1 if status_name == slurm_status else 0
                        set_metric_value(
                            "slurm_node_status",
                            base_labels,
                            value,
                            {
                                "status": status_name,
                                "partition": partition,
                                "node_id": target["node_id"],
                            },
                        )

            state_value = 2 if status == 2 else 1 if status == 1 else 0
            if metric_enabled("ipmi_fan_speed_state", "node", node_id=target["node_id"]):
                set_metric_value("ipmi_fan_speed_state", base_labels, state_value, {"name": "fan"})
            if metric_enabled("ipmi_power_state", "node", node_id=target["node_id"]):
                set_metric_value("ipmi_power_state", base_labels, state_value, {"name": "power"})
            if metric_enabled("ipmi_sensor_state", "node", node_id=target["node_id"]):
                set_metric_value("ipmi_sensor_state", base_labels, state_value, {"name": "sensor"})
            if metric_enabled("ipmi_temperature_state", "node", node_id=target["node_id"]):
                set_metric_value(
                    "ipmi_temperature_state", base_labels, state_value, {"name": "temperature"}
                )
            if metric_enabled("ipmi_voltage_state", "node", node_id=target["node_id"]):
                set_metric_value(
                    "ipmi_voltage_state", base_labels, state_value, {"name": "voltage"}
                )
            if metric_enabled("ipmi_up", "node", node_id=target["node_id"]):
                set_metric_value("ipmi_up", base_labels, up_val, {})

            warn_value = 1 if status in (1, 2) else 0
            crit_value = 1 if status == 2 else 0

            # E-Series metrics
            if metric_enabled("eseries_exporter_collect_error", "node", node_id=target["node_id"]):
                set_metric_value(
                    "eseries_exporter_collect_error", base_labels, warn_value, {"collector": "all"}
                )
            if metric_enabled("eseries_storage_system_status", "node", node_id=target["node_id"]):
                # Always emit both labels to prevent stale CRIT series in Prometheus
                for _es_label in ["optimal", "failed"]:
                    set_metric_value(
                        "eseries_storage_system_status",
                        base_labels,
                        crit_value if _es_label == "failed" else 0,
                        {"status": _es_label},
                    )

        for rack_id, info in rack_info.items():
            if (
                not metric_enabled("sequana3_hyc_p_in_kpa", "rack", rack_id=rack_id)
                and not metric_enabled("sequana3_hyc_state_info", "rack", rack_id=rack_id)
                and not metric_enabled("sequana3_hyc_leak_sensor_pump", "rack", rack_id=rack_id)
                and not metric_enabled("sequana3_hyc_tmp_pcb_cel", "rack", rack_id=rack_id)
            ):
                continue

            aisle_id = info.get("aisle_id")
            is_rack_down = rack_id in active_incidents["racks"]
            rack_overrides = overrides_by_rack.get(rack_id, [])
            for override in rack_overrides:
                if override.get("metric") == "rack_down":
                    try:
                        if float(override.get("value", 0)) > 0:
                            is_rack_down = True
                    except (TypeError, ValueError):
                        continue
            is_aisle_hot = aisle_id in active_incidents["aisles"]

            random.seed(f"{rack_id}-{tick}")
            pressure = 200.0 + random.uniform(-2.0, 2.0)
            leak = 0.0
            board_temp = 60.0 + random.uniform(-2.0, 2.0)
            # PMC total rack power — typical XH3000 rack: 4–8 kW per rack
            pmc_power = 5500.0 + random.uniform(-300.0, 300.0)

            if is_aisle_hot:
                pressure = 175.0 + random.uniform(-2.0, 2.0)
                leak = 0.6 + random.uniform(-0.1, 0.1)
                board_temp = 80.0 + random.uniform(-1.0, 1.0)
                pmc_power = 7200.0 + random.uniform(-200.0, 200.0)
            if is_rack_down:
                pressure = 160.0 + random.uniform(-1.0, 1.0)
                leak = 1.2 + random.uniform(-0.1, 0.1)
                board_temp = 95.0 + random.uniform(-1.0, 1.0)
                pmc_power = 0.0

            base_labels = {
                "site_id": info.get("site_id"),
                "room_id": info.get("room_id"),
                "rack_id": rack_id,
                "instance": f"sequana-{rack_id}",
                "job": "sequana3",
            }
            context = {
                "rack_id": rack_id,
                "instance": base_labels["instance"],
                "job": base_labels["job"],
                "cluster": "demo",
                "env": "demo",
                "host": "demo",
                "mc_type": "xh3000",
                "model": "xh3000",
                "region": "demo",
                "sequana_rack_id": rack_id,
                "sequana_type": "liquid",
                "state": "standbyspare",
            }

            if metric_enabled("sequana3_hyc_state_info", "rack", rack_id=rack_id):
                set_metric_value("sequana3_hyc_state_info", base_labels, 1, context)
            if metric_enabled("sequana3_hyc_p_in_kpa", "rack", rack_id=rack_id):
                set_metric_value("sequana3_hyc_p_in_kpa", base_labels, round(pressure, 2), context)
            if metric_enabled("sequana3_hyc_leak_sensor_pump", "rack", rack_id=rack_id):
                set_metric_value(
                    "sequana3_hyc_leak_sensor_pump", base_labels, round(leak, 2), context
                )
            if metric_enabled("sequana3_hyc_tmp_pcb_cel", "rack", rack_id=rack_id):
                set_metric_value(
                    "sequana3_hyc_tmp_pcb_cel", base_labels, round(board_temp, 1), context
                )
            if metric_enabled("sequana3_pmc_total_watt", "rack", rack_id=rack_id):
                set_metric_value(
                    "sequana3_pmc_total_watt", base_labels, round(pmc_power, 1), context
                )

        for rack_id, info in rack_info.items():
            if not (
                metric_enabled("raritan_pdu_activepower_watt", "rack", rack_id=rack_id)
                or metric_enabled(
                    "raritan_pdu_activeenergy_watthour_total", "rack", rack_id=rack_id
                )
                or metric_enabled("raritan_pdu_apparentpower_voltampere", "rack", rack_id=rack_id)
                or metric_enabled("raritan_pdu_current_ampere", "rack", rack_id=rack_id)
                or metric_enabled("raritan_pdu_inletrating", "rack", rack_id=rack_id)
                or metric_enabled("raritan_pdu_voltage_volt", "rack", rack_id=rack_id)
            ):
                continue

            base_labels = {
                "site_id": info.get("site_id"),
                "room_id": info.get("room_id"),
                "rack_id": rack_id,
                "instance": f"pdu-{rack_id}",
                "job": "pdu",
            }

            random.seed(f"pdu-{rack_id}-{tick}")
            for idx in range(1, 3):
                pduid = str(idx)
                pduname = f"pdu{idx}-{rack_id}"
                inlet_ctx = {
                    "pduid": pduid,
                    "pduname": pduname,
                    "inletid": "I1",
                    "inletname": "inlet-A",
                }

                power_watt = random.uniform(1500, 4200)
                apparent_va = power_watt * random.uniform(1.02, 1.08)
                current_amp = power_watt / 230.0
                rating_amp = 16 if idx % 2 == 0 else 20

                energy_key = (rack_id, pduid, "inlet")
                prev_energy = pdu_energy_state.get(energy_key, random.uniform(800000, 1600000))
                energy_wh = prev_energy + (power_watt * (update_interval / 3600.0))
                pdu_energy_state[energy_key] = energy_wh

                if metric_enabled("raritan_pdu_activepower_watt", "rack", rack_id=rack_id):
                    set_metric_value(
                        "raritan_pdu_activepower_watt",
                        base_labels,
                        round(power_watt, 1),
                        inlet_ctx,
                    )
                if metric_enabled("raritan_pdu_apparentpower_voltampere", "rack", rack_id=rack_id):
                    set_metric_value(
                        "raritan_pdu_apparentpower_voltampere",
                        base_labels,
                        round(apparent_va, 1),
                        inlet_ctx,
                    )
                if metric_enabled("raritan_pdu_current_ampere", "rack", rack_id=rack_id):
                    set_metric_value(
                        "raritan_pdu_current_ampere",
                        base_labels,
                        round(current_amp, 2),
                        inlet_ctx,
                    )
                if metric_enabled("raritan_pdu_inletrating", "rack", rack_id=rack_id):
                    set_metric_value(
                        "raritan_pdu_inletrating",
                        base_labels,
                        rating_amp,
                        inlet_ctx,
                    )
                if metric_enabled(
                    "raritan_pdu_activeenergy_watthour_total", "rack", rack_id=rack_id
                ):
                    set_metric_value(
                        "raritan_pdu_activeenergy_watthour_total",
                        base_labels,
                        round(energy_wh, 1),
                        inlet_ctx,
                    )
                if metric_enabled("raritan_pdu_voltage_volt", "rack", rack_id=rack_id):
                    voltage = 230.0 + random.uniform(
                        -2.0, 2.0
                    )  # European standard with small variation
                    set_metric_value(
                        "raritan_pdu_voltage_volt",
                        base_labels,
                        round(voltage, 1),
                        inlet_ctx,
                    )

                for outlet_id in range(1, 4):
                    outlet_ctx = {
                        "pduid": pduid,
                        "pduname": pduname,
                        "outletid": str(outlet_id),
                        "outletname": f"outlet-{outlet_id}",
                    }
                    outlet_power = power_watt * random.uniform(0.05, 0.25)
                    outlet_energy_key = (rack_id, pduid, f"outlet-{outlet_id}")
                    outlet_prev_energy = pdu_energy_state.get(
                        outlet_energy_key, random.uniform(50000, 200000)
                    )
                    outlet_energy = outlet_prev_energy + (outlet_power * (update_interval / 3600.0))
                    pdu_energy_state[outlet_energy_key] = outlet_energy
                    if metric_enabled("raritan_pdu_activepower_watt", "rack", rack_id=rack_id):
                        set_metric_value(
                            "raritan_pdu_activepower_watt",
                            base_labels,
                            round(outlet_power, 1),
                            outlet_ctx,
                        )
                    if metric_enabled(
                        "raritan_pdu_activeenergy_watthour_total", "rack", rack_id=rack_id
                    ):
                        set_metric_value(
                            "raritan_pdu_activeenergy_watthour_total",
                            base_labels,
                            round(outlet_energy, 1),
                            outlet_ctx,
                        )

        time.sleep(update_interval)


if __name__ == "__main__":
    start_http_server(9000)
    simulate()
