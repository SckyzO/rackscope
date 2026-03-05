"""Prometheus metric registry and metric definition helpers.

Handles:
- Discovering which metrics to generate (scope hints from the library)
- Normalizing metric catalog entries into a uniform definition format
- Building the Prometheus Gauge registry
- Emitting values via set_metric_value()
"""

import re
import yaml
from pathlib import Path

from plugins.simulator.process.topology import _expand_patterns

# ── Module-level state (mutated by simulate() in loop.py) ─────────────────
METRICS: dict = {}           # name → prometheus_client.Gauge
METRICS_DEFS: dict = {}      # name → normalized definition dict
SUPPORTED_METRICS: dict = {} # name → scope string ("node" or "rack")

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


def extract_base_metric_name(metric_query):
    """Extract the base Prometheus metric name from a PromQL expression.

    Examples:
        "node_temperature_celsius"              -> "node_temperature_celsius"
        'sum(raritan_pdu_activepower_watt{...})' -> "raritan_pdu_activepower_watt"
        "rate(node_cpu_seconds_total[5m])"      -> "node_cpu_seconds_total"
    """
    if not metric_query:
        return None

    if not any(c in metric_query for c in ["(", "{", "["]):
        return metric_query.strip()

    # Match metric_name{labels} or metric_name[range]
    pattern = r"\b([a-zA-Z_:][a-zA-Z0-9_:]*)\s*[{\[]"
    match = re.search(pattern, metric_query)
    if match:
        return match.group(1)

    # Fallback: grab the first valid Prometheus identifier
    pattern = r"\b([a-zA-Z_:][a-zA-Z0-9_:]+)"
    match = re.search(pattern, metric_query)
    if match:
        return match.group(1)

    return None


def load_metrics_library(path):
    """Load the display metrics library and return a name → scope mapping."""
    supported = {}
    path = Path(path)

    if not path.exists():
        print(f"Warning: Metrics library not found at {path}, using fallback")
        return None

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
                scope = (
                    "rack"
                    if ("infrastructure" in tags or data.get("category") == "rack")
                    else "node"
                )
                if metric_name:
                    supported[metric_name] = scope

            elif isinstance(data, dict) and "metrics" in data:
                for metric in data.get("metrics", []):
                    if not isinstance(metric, dict):
                        continue
                    metric_query = metric.get("metric")
                    metric_name = extract_base_metric_name(metric_query)
                    tags = metric.get("tags", [])
                    scope = (
                        "rack"
                        if ("infrastructure" in tags or metric.get("category") == "rack")
                        else "node"
                    )
                    if metric_name:
                        supported[metric_name] = scope

        except Exception as e:
            print(f"Warning: Failed to load metric from {file_path}: {e}")

    print(f"Loaded {len(supported)} metrics from library at {path}")
    return supported


def load_metrics_catalog(path):
    """Load a single metrics catalog YAML file."""
    try:
        with open(path, "r") as f:
            data = yaml.safe_load(f) or {}
    except Exception as e:
        print(f"Error loading catalog {path}: {e}")
        return []
    metrics = data.get("metrics") if isinstance(data, dict) else []
    if not isinstance(metrics, list):
        return []
    return [m for m in metrics if isinstance(m, dict)]


def load_metrics_catalogs(paths):
    """Load and merge multiple catalog files, later entries taking priority."""
    merged = {}
    for path in paths:
        for metric in load_metrics_catalog(path):
            name = metric.get("name")
            if isinstance(name, str):
                merged[name] = metric
    return list(merged.values())


def resolve_metrics_catalogs(sim_cfg):
    """Build the ordered list of catalog paths from simulator config."""
    primary = sim_cfg.get(
        "metrics_catalog_path", "/app/config/plugins/simulator/metrics/metrics_full.yaml"
    )
    paths = [primary]
    catalogs = sim_cfg.get("metrics_catalogs")
    if isinstance(catalogs, list):
        for item in catalogs:
            if isinstance(item, str):
                if item not in paths:
                    paths.append(item)
                continue
            if not isinstance(item, dict):
                continue
            if item.get("enabled") is False:
                continue
            path = item.get("path")
            if isinstance(path, str) and path and path not in paths:
                paths.append(path)
    return paths


def normalize_metric_defs(metric_defs):
    """Normalize a list of catalog metric entries into the internal definition format."""
    if not metric_defs:
        return {}
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


def build_metric_registry(metric_defs):
    """Create prometheus_client Gauge objects for all known metrics."""
    from prometheus_client import Gauge  # lazy import — not available in backend

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


def set_metric_value(name, base_labels, value, context):
    """Emit a metric value to its Prometheus Gauge."""
    from plugins.simulator.process.labels import resolve_labels

    definition = METRICS_DEFS.get(name)
    gauge = METRICS.get(name)
    if not definition or not gauge:
        return
    labels = resolve_labels(definition, base_labels, context)
    if labels:
        gauge.labels(**labels).set(value)
    else:
        gauge.set(value)


def get_fallback_supported_metrics():
    """Return the full set of supported metrics when the library can't be loaded.

    Returns a dict mapping metric name → scope string ("node" or "rack").
    """
    return {
        # Node exporter — base
        "node_temperature_celsius": "node",
        "node_power_watts": "node",
        "node_health_status": "node",
        "node_load_percent": "node",
        "up": "node",
        # Node exporter — counters
        "node_cpu_seconds_total": "node",
        "node_memory_MemAvailable_bytes": "node",
        "node_memory_MemTotal_bytes": "node",
        "node_filesystem_size_bytes": "node",
        "node_filesystem_avail_bytes": "node",
        "node_disk_read_bytes_total": "node",
        "node_disk_written_bytes_total": "node",
        "node_network_receive_bytes_total": "node",
        "node_network_transmit_bytes_total": "node",
        # IPMI
        "ipmi_fan_speed_state": "node",
        "ipmi_power_state": "node",
        "ipmi_sensor_state": "node",
        "ipmi_temperature_state": "node",
        "ipmi_voltage_state": "node",
        "ipmi_up": "node",
        # Slurm — per-node
        "slurm_node_status": "node",
        "slurm_node_cpu_alloc": "node",
        "slurm_node_cpu_idle": "node",
        "slurm_node_cpu_total": "node",
        "slurm_node_mem_alloc": "node",
        "slurm_node_mem_total": "node",
        # Slurm — cluster-wide aggregates
        "slurm_cpus_alloc": "rack",
        "slurm_cpus_idle": "rack",
        "slurm_cpus_total": "rack",
        "slurm_nodes_alloc": "rack",
        "slurm_nodes_idle": "rack",
        "slurm_nodes_down": "rack",
        "slurm_nodes_drain": "rack",
        "slurm_nodes_total": "rack",
        "slurm_gpus_alloc": "rack",
        "slurm_gpus_idle": "rack",
        "slurm_gpus_total": "rack",
        "slurm_gpus_utilization": "rack",
        "slurm_partition_cpus_allocated": "rack",
        "slurm_partition_cpus_idle": "rack",
        "slurm_partition_cpus_total": "rack",
        "slurm_partition_jobs_running": "rack",
        "slurm_partition_jobs_pending": "rack",
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
