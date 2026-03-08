"""Main simulation loop and helper sub-functions.

simulate() is the entry point — it runs forever, reloading topology and
config on every tick, generating Prometheus metrics for all discovered
instances, and sleeping for update_interval_seconds between ticks.

Helper functions (_apply_failures, _apply_overrides, etc.) operate on
a plain list-of-dicts representation and are independently testable.
"""

import fnmatch
import math
import os
import random
import time
from pathlib import Path

import plugins.simulator.process.metrics as _m
from plugins.simulator.process.config import load_simulator_config
from plugins.simulator.process.metrics import (
    SLURM_STATUS_LEVELS,
    build_metric_registry,
    get_fallback_supported_metrics,
    load_metrics_catalogs,
    load_metrics_library,
    normalize_metric_defs,
    resolve_metrics_catalogs,
    set_metric_value,
)
from plugins.simulator.process.overrides import load_overrides
from plugins.simulator.process.topology import (
    _matches,
    load_device_templates,
    load_topology_data,
    load_topology_nodes,
)

TOPOLOGY_PATH = os.getenv("TOPOLOGY_FILE", "/app/config/topology")
TEMPLATES_PATH = os.getenv("TEMPLATES_PATH", "/app/config/templates")
METRICS_LIBRARY_PATH = os.getenv("METRICS_LIBRARY", "/app/config/metrics/library")

# ── Mutable simulation state ───────────────────────────────────────────────
_incident_state: dict = {
    "nodes_crit": set(),
    "nodes_warn": set(),
    "racks_crit": set(),
    "aisles_hot": set(),
    "last_roll_tick": 0,
}
pdu_energy_state: dict = {}

# Counter states for monotonically increasing metrics
node_cpu_idle_seconds: dict = {}
node_disk_read_bytes: dict = {}
node_disk_written_bytes: dict = {}
node_network_rx_bytes: dict = {}
node_network_tx_bytes: dict = {}
switch_port_rx_bytes: dict = {}
switch_port_tx_bytes: dict = {}


# ── Incident presets ──────────────────────────────────────────────────────

INCIDENT_PRESETS: dict = {
    "full_ok": {"crit": (0, 0), "warn": (0, 0), "racks": 0, "aisles": 0, "cph_default": 1},
    "light": {"crit": (1, 3), "warn": (1, 5), "racks": 0, "aisles": 0, "cph_default": 2},
    "medium": {"crit": (1, 3), "warn": (5, 10), "racks": 1, "aisles": 0, "cph_default": 4},
    "heavy": {"crit": (5, 10), "warn": (10, 20), "racks": 2, "aisles": 1, "cph_default": 4},
    "chaos": {
        "crit_pct": 0.15,
        "warn_pct": 0.25,
        "racks_pct": 0.20,
        "aisles_pct": 0.25,
        "cph_default": 3,
    },
}


def _get_cycle_ticks(changes_per_hour: int, update_interval: int) -> int:
    """Return how many ticks pass between incident reshuffles."""
    return max(1, int(3600 / max(1, changes_per_hour) / max(1, update_interval)))


def _roll_incidents(targets, sim_cfg, all_rack_ids, all_aisle_ids) -> dict:
    """Compute a fresh incident state.  Called on cycle boundaries.

    Returns a dict with four sets: nodes_crit, nodes_warn, racks_crit, aisles_hot.
    """
    mode = sim_cfg.get("incident_mode", "full_ok")
    all_node_ids = [t["node_id"] for t in targets if t.get("node_id")]

    if mode == "full_ok":
        return {"nodes_crit": set(), "nodes_warn": set(), "racks_crit": set(), "aisles_hot": set()}

    nodes_crit: set = set()
    nodes_warn: set = set()
    racks_crit: set = set()
    aisles_hot: set = set()

    if mode == "chaos":
        n_nodes = len(all_node_ids)
        n_crit = int(n_nodes * INCIDENT_PRESETS["chaos"]["crit_pct"])
        n_warn = int(n_nodes * INCIDENT_PRESETS["chaos"]["warn_pct"])
        n_racks_crit = int(len(all_rack_ids) * INCIDENT_PRESETS["chaos"]["racks_pct"])
        n_aisles_hot = int(len(all_aisle_ids) * INCIDENT_PRESETS["chaos"]["aisles_pct"])

        shuffled = all_node_ids.copy()
        random.shuffle(shuffled)
        nodes_crit = set(shuffled[:n_crit])
        nodes_warn = set(n for n in shuffled[n_crit:] if n not in nodes_crit)
        nodes_warn = set(list(nodes_warn)[:n_warn])

        rack_list = list(all_rack_ids)
        random.shuffle(rack_list)
        racks_crit = set(rack_list[:n_racks_crit])

        aisle_list = list(all_aisle_ids)
        random.shuffle(aisle_list)
        aisles_hot = set(aisle_list[:n_aisles_hot])

    elif mode == "custom":
        custom = sim_cfg.get("custom_incidents") or {}
        n_crit = int(custom.get("devices_crit", 0))
        n_warn = int(custom.get("devices_warn", 0))
        n_racks_crit = int(custom.get("racks_crit", 0))
        n_aisles_hot = int(custom.get("aisles_hot", 0))

        shuffled = all_node_ids.copy()
        random.shuffle(shuffled)
        nodes_crit = set(shuffled[:n_crit])
        nodes_warn = set(shuffled[n_crit : n_crit + n_warn])

        rack_list = list(all_rack_ids)
        random.shuffle(rack_list)
        racks_crit = set(rack_list[:n_racks_crit])

        aisle_list = list(all_aisle_ids)
        random.shuffle(aisle_list)
        aisles_hot = set(aisle_list[:n_aisles_hot])

    else:
        # Preset modes: light, medium, heavy
        preset = INCIDENT_PRESETS.get(mode, INCIDENT_PRESETS["light"])
        n_crit = random.randint(*preset.get("crit", (0, 0)))
        n_warn = random.randint(*preset.get("warn", (0, 0)))
        n_racks_crit = preset.get("racks", 0)
        n_aisles_hot = preset.get("aisles", 0)

        shuffled = all_node_ids.copy()
        random.shuffle(shuffled)
        nodes_crit = set(shuffled[:n_crit])
        nodes_warn = set(shuffled[n_crit : n_crit + n_warn])

        rack_list = list(all_rack_ids)
        random.shuffle(rack_list)
        racks_crit = set(rack_list[:n_racks_crit])

        aisle_list = list(all_aisle_ids)
        random.shuffle(aisle_list)
        aisles_hot = set(aisle_list[:n_aisles_hot])

    return {
        "nodes_crit": nodes_crit,
        "nodes_warn": nodes_warn,
        "racks_crit": racks_crit,
        "aisles_hot": aisles_hot,
    }


# ── Testable helper functions ──────────────────────────────────────────────


def _apply_overrides(targets, overrides):
    """Apply runtime metric overrides to a list of target dicts in-place.

    Each target must have an "instance" key and a "metrics" dict.
    Each override must have "instance", "metric", and "value" keys.

    Only overrides that match the target's instance AND exist in the
    target's metrics dict are applied.
    """
    if not overrides:
        return

    overrides_by_instance: dict = {}
    for item in overrides:
        inst = item.get("instance")
        if inst:
            overrides_by_instance.setdefault(inst, []).append(item)

    for target in targets:
        inst = target.get("instance")
        if not inst:
            continue
        for override in overrides_by_instance.get(inst, []):
            metric = override.get("metric")
            try:
                value = float(override.get("value"))
            except (TypeError, ValueError):
                continue
            if metric in target.get("metrics", {}):
                target["metrics"][metric] = value


def _apply_failures(targets, incident_state):
    """Mark targets as down/warn based on a pre-computed incident state.

    Each target must have "node_id", "rack_id", and a "metrics" dict.

    Args:
        targets:        list of target dicts (mutated in-place)
        incident_state: dict with sets nodes_crit, nodes_warn, racks_crit
    """
    nodes_crit = incident_state.get("nodes_crit", set())
    nodes_warn = incident_state.get("nodes_warn", set())
    racks_crit = incident_state.get("racks_crit", set())

    for target in targets:
        if "metrics" not in target:
            continue
        nid = target.get("node_id", "")
        rid = target.get("rack_id", "")
        if nid in nodes_crit or rid in racks_crit:
            target["metrics"]["up"] = 0.0
        elif nid in nodes_warn:
            target["metrics"]["node_health_status"] = 1.0


def _generate_node_metrics(
    target,
    profiles,
    incident_state,
    overrides_by_instance,
    overrides_by_rack,
    tick,
    update_interval,
):
    """Compute all node-level metric values for a single target.

    Returns a dict of metric_name → computed value (before Prometheus emission).
    Does NOT write to Prometheus — that is done by simulate().
    """
    nid = target["node_id"].lower()
    aid = target["aisle_id"]
    rid = target["rack_id"]

    random.seed(nid + str(tick // 2))

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

    load_min = p.get("load_min", 10)
    load_max = p.get("load_max", 50)

    if prof_name == "compute":
        load = load_min + ((math.sin(tick / 10.0) + 1) / 2.0 * (load_max - load_min))
    elif prof_name == "gpu":
        load = (
            random.uniform(load_min, load_max) if random.random() > 0.7 else random.uniform(5, 15)
        )
    else:
        load = random.uniform(load_min, load_max)

    nodes_crit = incident_state.get("nodes_crit", set())
    nodes_warn = incident_state.get("nodes_warn", set())
    racks_crit = incident_state.get("racks_crit", set())
    aisles_hot = incident_state.get("aisles_hot", set())

    temp_boost = 12.0 if aid in aisles_hot else 0
    is_down = (target["node_id"] in nodes_crit) or (rid in racks_crit)
    is_warn = (target["node_id"] in nodes_warn) and not is_down

    rack_overrides = overrides_by_rack.get(rid, [])
    for override in rack_overrides:
        if override.get("metric") == "rack_down":
            try:
                if float(override.get("value", 0)) > 0:
                    is_down = True
                    is_warn = False
            except (TypeError, ValueError):
                continue

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

    status = 0
    if is_down or temp > 45:
        status = 2
    elif temp > 38 or is_warn:
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

    return {
        "prof_name": prof_name,
        "load": load,
        "final_load": final_load,
        "temp": temp,
        "power": power,
        "status": status,
        "up_val": up_val,
        "is_down": is_down,
    }


def _generate_rack_metrics(rack_id, rack_info, incident_state, overrides_by_rack, tick):
    """Compute rack-level cooling and PDU metric values.

    Returns a dict:
      {
        "cooling": {pressure, leak, board_temp, pmc_power, base_labels, context},
        "pdu": list of per-PDU metric dicts
      }
    """
    info = rack_info[rack_id]
    aisle_id = info.get("aisle_id")
    is_rack_down = rack_id in incident_state.get("racks_crit", set())
    is_aisle_hot = aisle_id in incident_state.get("aisles_hot", set())

    rack_overrides = overrides_by_rack.get(rack_id, [])
    for override in rack_overrides:
        if override.get("metric") == "rack_down":
            try:
                if float(override.get("value", 0)) > 0:
                    is_rack_down = True
            except (TypeError, ValueError):
                continue

    random.seed(f"{rack_id}-{tick}")
    pressure = 200.0 + random.uniform(-2.0, 2.0)
    leak = 0.0
    board_temp = 60.0 + random.uniform(-2.0, 2.0)
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

    cooling_labels = {
        "site_id": info.get("site_id"),
        "room_id": info.get("room_id"),
        "rack_id": rack_id,
        "instance": f"sequana-{rack_id}",
        "job": "sequana3",
    }
    cooling_ctx = {
        "rack_id": rack_id,
        "instance": cooling_labels["instance"],
        "job": cooling_labels["job"],
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

    return {
        "is_rack_down": is_rack_down,
        "cooling": {
            "pressure": pressure,
            "leak": leak,
            "board_temp": board_temp,
            "pmc_power": pmc_power,
            "base_labels": cooling_labels,
            "context": cooling_ctx,
        },
    }


# ── Main simulation loop ───────────────────────────────────────────────────


def simulate():
    """Run the Prometheus metrics simulation loop (runs forever)."""
    # Build SUPPORTED_METRICS: fallback dict + optional display library hints
    _m.SUPPORTED_METRICS = get_fallback_supported_metrics()
    library_hints = load_metrics_library(METRICS_LIBRARY_PATH)
    if library_hints:
        _m.SUPPORTED_METRICS.update(library_hints)
        print(
            f"Loaded display library scope hints ({len(library_hints)} entries); "
            f"SUPPORTED_METRICS total: {len(_m.SUPPORTED_METRICS)}"
        )
    else:
        print(f"Using fallback metrics only ({len(_m.SUPPORTED_METRICS)} metrics)")

    # Load initial config
    sim_cfg = load_simulator_config()
    update_interval = sim_cfg.get("update_interval_seconds", sim_cfg.get("update_interval", 20))
    profiles = sim_cfg.get("profiles", {})
    seed = sim_cfg.get("seed")
    slurm_random_statuses = (
        sim_cfg.get("slurm_random_statuses", {}) if isinstance(sim_cfg, dict) else {}
    )
    slurm_random_match = sim_cfg.get("slurm_random_match", []) if isinstance(sim_cfg, dict) else []
    overrides_path = sim_cfg.get(
        "overrides_path", "/app/config/plugins/simulator/overrides/overrides.yaml"
    )
    metrics_catalog_paths = resolve_metrics_catalogs(sim_cfg)
    metric_defs = normalize_metric_defs(load_metrics_catalogs(metrics_catalog_paths))
    if not metric_defs:
        print(f"Error: No metrics catalog found at {', '.join(metrics_catalog_paths)}")
        return
    _m.METRICS_DEFS = metric_defs
    _m.METRICS = build_metric_registry(metric_defs)

    def metric_enabled(name, scope, node_id=None, rack_id=None):
        definition = _m.METRICS_DEFS.get(name)
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
        return {
            "site_id": target.get("site_id", ""),
            "room_id": target.get("room_id", ""),
            "rack_id": target.get("rack_id", ""),
            "chassis_id": target.get("chassis_id", ""),
            "node_id": target.get("node_id", ""),
            "instance": target["node_id"],
            "job": "node",
        }

    print(f"Starting simulation loop (Interval: {update_interval}s)")

    device_templates = load_device_templates(TEMPLATES_PATH)

    tick = 0
    _topo_mtime: float = 0.0
    targets: list = []

    def _get_topo_mtime(path: str) -> float:
        try:
            p = Path(path)
            if p.is_file():
                return p.stat().st_mtime
            if p.is_dir():
                mtimes = [f.stat().st_mtime for f in p.rglob("*.yaml")]
                mtimes += [f.stat().st_mtime for f in p.rglob("*.yml")]
                return max(mtimes) if mtimes else 0.0
        except Exception:
            pass
        return 0.0

    while True:
        # Reload config every tick — picks up scenario changes live
        _new_cfg = load_simulator_config()
        profiles = _new_cfg.get("profiles", {})
        seed = _new_cfg.get("seed")
        incident_mode = _new_cfg.get("incident_mode", "full_ok")
        changes_per_hour = int(_new_cfg.get("changes_per_hour", 2))
        slurm_random_statuses = (
            _new_cfg.get("slurm_random_statuses", {}) if isinstance(_new_cfg, dict) else {}
        )
        slurm_random_match = (
            _new_cfg.get("slurm_random_match", []) if isinstance(_new_cfg, dict) else []
        )
        update_interval = _new_cfg.get(
            "update_interval_seconds", _new_cfg.get("update_interval", update_interval)
        )

        # Reload topology only when YAML files change (mtime-based) to avoid GC pressure
        _current_mtime = _get_topo_mtime(TOPOLOGY_PATH)
        if _current_mtime != _topo_mtime or not targets:
            topo_data = load_topology_data(TOPOLOGY_PATH)
            targets = load_topology_nodes(topo_data, device_templates)
            _topo_mtime = _current_mtime
            print(f"[topology] Reloaded {len(targets)} targets (mtime changed)")

        forced_slurm_status = {}
        _slurm_agg: dict = {}

        if isinstance(slurm_random_statuses, dict):
            available_nodes = [t["node_id"] for t in targets if t.get("node_id")]
            if isinstance(slurm_random_match, list) and slurm_random_match:
                available_nodes = [
                    nid
                    for nid in available_nodes
                    if any(fnmatch.fnmatchcase(nid, p) for p in slurm_random_match)
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
        overrides_by_instance: dict = {}
        overrides_by_rack: dict = {}
        for item in overrides:
            inst = item.get("instance")
            if not inst:
                rack_id = item.get("rack_id")
                if rack_id:
                    overrides_by_rack.setdefault(rack_id, []).append(item)
                continue
            overrides_by_instance.setdefault(inst, []).append(item)

        # ── Scheduled Incident Rolling ────────────────────────────────────
        cycle_ticks = _get_cycle_ticks(changes_per_hour, update_interval)
        if tick == 1 or tick % cycle_ticks == 0:
            all_rack_ids = set(t["rack_id"] for t in targets)
            all_aisle_ids = set(t["aisle_id"] for t in targets)
            new_state = _roll_incidents(targets, _new_cfg, all_rack_ids, all_aisle_ids)
            _incident_state.update(new_state)
            _incident_state["last_roll_tick"] = tick
            print(
                f"[incidents] mode={incident_mode} | "
                f"crit={len(_incident_state['nodes_crit'])} "
                f"warn={len(_incident_state['nodes_warn'])} "
                f"racks={len(_incident_state['racks_crit'])} "
                f"aisles={len(_incident_state['aisles_hot'])}"
            )

        # ── Per-target node loop ─────────────────────────────────────────
        for target in targets:
            base_labels = build_base_labels(target)
            nid = target["node_id"].lower()
            rid = target["rack_id"]
            is_storage = target.get("device_type") == "storage"

            random.seed(nid + str(tick // 2))

            if is_storage:
                slot_count = target.get("slot_count", 60)

                if metric_enabled(
                    "eseries_storage_system_status", "node", node_id=target["node_id"]
                ):
                    controller_status = (
                        0 if random.random() > 0.02 else (1 if random.random() > 0.5 else 2)
                    )
                    for _ctl_label, _ctl_code in [("optimal", 0), ("degraded", 1), ("failed", 2)]:
                        set_metric_value(
                            "eseries_storage_system_status",
                            base_labels,
                            1 if controller_status == _ctl_code else 0,
                            {"status": _ctl_label},
                        )

                if metric_enabled("eseries_drive_status", "node", node_id=target["node_id"]):
                    tray_num = "99"
                    instance_name = target["node_id"]
                    if instance_name.startswith("da"):
                        try:
                            array_num = int(instance_name.split("-")[0][2:])
                            tray_num = "99" if array_num == 1 else str(array_num - 1).zfill(2)
                        except (ValueError, IndexError):
                            pass

                    for drive_slot in range(1, slot_count + 1):
                        drive_status_label = "optimal"
                        if random.random() < 0.01:
                            drive_status_label = "failed"
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
                continue

            # Compute node metrics via helper
            node_vals = _generate_node_metrics(
                target,
                profiles,
                _incident_state,
                overrides_by_instance,
                overrides_by_rack,
                tick,
                update_interval,
            )
            prof_name = node_vals["prof_name"]
            final_load = node_vals["final_load"]
            temp = node_vals["temp"]
            power = node_vals["power"]
            status = node_vals["status"]
            up_val = node_vals["up_val"]
            is_down = node_vals["is_down"]

            # Emit core metrics
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

            # Node Exporter: Memory
            if metric_enabled(
                "node_memory_MemTotal_bytes", "node", node_id=target["node_id"]
            ) or metric_enabled(
                "node_memory_MemAvailable_bytes", "node", node_id=target["node_id"]
            ):
                mem_total_gb = 512 if prof_name == "gpu" else 256 if prof_name == "compute" else 64
                mem_total_bytes = mem_total_gb * 1024 * 1024 * 1024
                mem_used_percent = final_load * 0.8
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

            # Node Exporter: Filesystem
            if metric_enabled(
                "node_filesystem_size_bytes", "node", node_id=target["node_id"]
            ) or metric_enabled("node_filesystem_avail_bytes", "node", node_id=target["node_id"]):
                fs_size_gb = 1000 if "storage" in nid else 200
                fs_size_bytes = fs_size_gb * 1024 * 1024 * 1024
                fs_used_percent = 30.0 + (final_load * 0.5)
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
                read_rate_mb = (10 + final_load * 0.5) if not is_down else 0
                write_rate_mb = (5 + final_load * 0.3) if not is_down else 0
                prev_read = node_disk_read_bytes.get(disk_key, random.uniform(5e11, 1e12))
                prev_write = node_disk_written_bytes.get(disk_key, random.uniform(3e11, 8e11))
                new_read = prev_read + read_rate_mb * 1024 * 1024 * update_interval
                new_write = prev_write + write_rate_mb * 1024 * 1024 * update_interval
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
                if prof_name == "network":
                    rx_rate_mb = 500 + random.uniform(-50, 50)
                    tx_rate_mb = 500 + random.uniform(-50, 50)
                else:
                    rx_rate_mb = (20 + final_load * 2) if not is_down else 0
                    tx_rate_mb = (15 + final_load * 1.5) if not is_down else 0
                prev_rx = node_network_rx_bytes.get(net_key, random.uniform(1e12, 5e12))
                prev_tx = node_network_tx_bytes.get(net_key, random.uniform(8e11, 4e12))
                new_rx = prev_rx + rx_rate_mb * 1024 * 1024 * update_interval
                new_tx = prev_tx + tx_rate_mb * 1024 * 1024 * update_interval
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

            # Switch port metrics
            if prof_name == "network":
                if (
                    metric_enabled("switch_port_oper_status", "node", node_id=target["node_id"])
                    or metric_enabled("switch_port_in_octets", "node", node_id=target["node_id"])
                    or metric_enabled("switch_port_out_octets", "node", node_id=target["node_id"])
                ):
                    num_ports = 40 if "isw" in nid else 48
                    for port_idx in range(1, min(num_ports + 1, 9)):
                        port_key = f"{nid}-port{port_idx}"
                        port_status = 1 if not is_down and random.random() > 0.05 else 2
                        if metric_enabled(
                            "switch_port_oper_status", "node", node_id=target["node_id"]
                        ):
                            set_metric_value(
                                "switch_port_oper_status",
                                base_labels,
                                port_status,
                                {"port": str(port_idx)},
                            )
                        if port_status == 1:
                            port_rx_bytes = random.uniform(10, 200) * 1024 * 1024 * update_interval
                            port_tx_bytes = random.uniform(10, 200) * 1024 * 1024 * update_interval
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

            # Slurm node metrics
            slurm_status = forced_slurm_status.get(target["node_id"], "idle")
            if slurm_status == "idle":
                if up_val == 0 or status == 2:
                    slurm_status = "down"
                elif status == 1:
                    slurm_status = "drain"
                elif final_load >= 70:
                    slurm_status = "allocated"
            partitions = ["all", "cpu"]
            is_gpu_node = "gpu" in nid or "visu" in nid
            if is_gpu_node:
                partitions.append("gpu")

            node_cpu_total = 128 if is_gpu_node else 64
            node_mem_total_mb = 512 * 1024 if is_gpu_node else 256 * 1024
            node_cpu_alloc = (
                int(node_cpu_total * final_load / 100) if slurm_status == "allocated" else 0
            )
            node_mem_alloc_mb = (
                int(node_mem_total_mb * min(final_load / 100 * 0.8 + 0.1, 0.95))
                if slurm_status == "allocated"
                else 0
            )

            if metric_enabled("slurm_node_status", "node", node_id=target["node_id"]):
                for partition in partitions:
                    node_labels = {
                        "status": slurm_status,
                        "partition": partition,
                        "node_id": target["node_id"],
                    }
                    for status_name in SLURM_STATUS_LEVELS:
                        set_metric_value(
                            "slurm_node_status",
                            base_labels,
                            1 if status_name == slurm_status else 0,
                            {
                                "status": status_name,
                                "partition": partition,
                                "node_id": target["node_id"],
                            },
                        )
                    for mname, val in [
                        ("slurm_node_cpu_alloc", node_cpu_alloc),
                        ("slurm_node_cpu_total", node_cpu_total),
                        ("slurm_node_mem_alloc", node_mem_alloc_mb),
                        ("slurm_node_mem_total", node_mem_total_mb),
                    ]:
                        if metric_enabled(mname, "node", node_id=target["node_id"]):
                            set_metric_value(mname, base_labels, val, node_labels)

            # Accumulate cluster-wide Slurm aggregates
            _stt = slurm_status
            _slurm_agg.setdefault("cpu_total", 0)
            _slurm_agg.setdefault("cpu_alloc", 0)
            _slurm_agg.setdefault("cpu_idle", 0)
            _slurm_agg.setdefault("nodes_total", 0)
            _slurm_agg.setdefault("nodes_alloc", 0)
            _slurm_agg.setdefault("nodes_idle", 0)
            _slurm_agg.setdefault("nodes_down", 0)
            _slurm_agg.setdefault("nodes_drain", 0)
            _slurm_agg.setdefault("gpu_total", 0)
            _slurm_agg.setdefault("gpu_alloc", 0)
            _slurm_agg.setdefault("partitions", {})
            _slurm_agg["cpu_total"] += node_cpu_total
            _slurm_agg["cpu_alloc"] += node_cpu_alloc
            _slurm_agg["cpu_idle"] += (
                node_cpu_total - node_cpu_alloc if _stt not in ("down", "drain") else 0
            )
            _slurm_agg["nodes_total"] += 1
            if _stt == "allocated":
                _slurm_agg["nodes_alloc"] += 1
            elif _stt == "idle":
                _slurm_agg["nodes_idle"] += 1
            elif _stt == "down":
                _slurm_agg["nodes_down"] += 1
            elif _stt in ("drain", "draining", "drained"):
                _slurm_agg["nodes_drain"] += 1
            if is_gpu_node:
                _slurm_agg["gpu_total"] += 4
                if _stt == "allocated":
                    _slurm_agg["gpu_alloc"] += 4
            for part in partitions:
                p = _slurm_agg["partitions"].setdefault(
                    part,
                    {"cpu_alloc": 0, "cpu_idle": 0, "cpu_total": 0, "jobs_run": 0, "jobs_pend": 0},
                )
                p["cpu_total"] += node_cpu_total
                p["cpu_alloc"] += node_cpu_alloc
                if _stt == "allocated":
                    p["jobs_run"] += 1
                else:
                    p["cpu_idle"] += node_cpu_total

            state_value = 2 if status == 2 else 1 if status == 1 else 0
            for mname, ctx in [
                ("ipmi_fan_speed_state", {"name": "fan"}),
                ("ipmi_power_state", {"name": "power"}),
                ("ipmi_sensor_state", {"name": "sensor"}),
                ("ipmi_temperature_state", {"name": "temperature"}),
                ("ipmi_voltage_state", {"name": "voltage"}),
            ]:
                if metric_enabled(mname, "node", node_id=target["node_id"]):
                    set_metric_value(mname, base_labels, state_value, ctx)
            if metric_enabled("ipmi_up", "node", node_id=target["node_id"]):
                set_metric_value("ipmi_up", base_labels, up_val, {})

            warn_value = 1 if status in (1, 2) else 0
            crit_value = 1 if status == 2 else 0
            if metric_enabled("eseries_exporter_collect_error", "node", node_id=target["node_id"]):
                set_metric_value(
                    "eseries_exporter_collect_error", base_labels, warn_value, {"collector": "all"}
                )
            if metric_enabled("eseries_storage_system_status", "node", node_id=target["node_id"]):
                for _es_label in ["optimal", "failed"]:
                    set_metric_value(
                        "eseries_storage_system_status",
                        base_labels,
                        crit_value if _es_label == "failed" else 0,
                        {"status": _es_label},
                    )

        # ── Cluster-wide Slurm aggregates ───────────────────────────────
        print(
            f"[DEBUG] _slurm_agg={len(_slurm_agg)} keys, "
            f"metric_enabled(slurm_cpus_alloc)={metric_enabled('slurm_cpus_alloc', 'rack')}, "
            f"in METRICS_DEFS={('slurm_cpus_alloc' in _m.METRICS_DEFS)}, "
            f"in METRICS={('slurm_cpus_alloc' in _m.METRICS)}"
        )
        if _slurm_agg:
            _ag = _slurm_agg
            empty_labels: dict = {}
            for mname, val in [
                ("slurm_cpus_alloc", _ag.get("cpu_alloc", 0)),
                ("slurm_cpus_idle", _ag.get("cpu_idle", 0)),
                ("slurm_cpus_total", _ag.get("cpu_total", 0)),
                ("slurm_nodes_alloc", _ag.get("nodes_alloc", 0)),
                ("slurm_nodes_idle", _ag.get("nodes_idle", 0)),
                ("slurm_nodes_down", _ag.get("nodes_down", 0)),
                ("slurm_nodes_drain", _ag.get("nodes_drain", 0)),
                ("slurm_nodes_total", _ag.get("nodes_total", 0)),
                ("slurm_gpus_alloc", _ag.get("gpu_alloc", 0)),
                ("slurm_gpus_idle", _ag.get("gpu_total", 0) - _ag.get("gpu_alloc", 0)),
                ("slurm_gpus_total", _ag.get("gpu_total", 0)),
            ]:
                if metric_enabled(mname, "rack"):
                    set_metric_value(mname, empty_labels, val, {})

            gpu_total = _ag.get("gpu_total", 0)
            if gpu_total > 0 and metric_enabled("slurm_gpus_utilization", "rack"):
                set_metric_value(
                    "slurm_gpus_utilization", empty_labels, _ag.get("gpu_alloc", 0) / gpu_total, {}
                )

            for part, pdata in _ag.get("partitions", {}).items():
                for mname, val in [
                    ("slurm_partition_cpus_allocated", pdata.get("cpu_alloc", 0)),
                    ("slurm_partition_cpus_idle", pdata.get("cpu_idle", 0)),
                    ("slurm_partition_cpus_total", pdata.get("cpu_total", 0)),
                    ("slurm_partition_jobs_running", pdata.get("jobs_run", 0)),
                    (
                        "slurm_partition_jobs_pending",
                        max(0, int(pdata.get("jobs_run", 0) * random.uniform(0.1, 0.4))),
                    ),
                ]:
                    if metric_enabled(mname, "rack"):
                        set_metric_value(mname, empty_labels, val, {"partition": part})

        # ── Per-rack cooling metrics (Sequana3) ──────────────────────────
        for rack_id, info in rack_info.items():
            if not any(
                metric_enabled(m, "rack", rack_id=rack_id)
                for m in [
                    "sequana3_hyc_p_in_kpa",
                    "sequana3_hyc_state_info",
                    "sequana3_hyc_leak_sensor_pump",
                    "sequana3_hyc_tmp_pcb_cel",
                ]
            ):
                continue

            rack_data = _generate_rack_metrics(
                rack_id, rack_info, _incident_state, overrides_by_rack, tick
            )
            c = rack_data["cooling"]
            bl = c["base_labels"]
            ctx = c["context"]

            if metric_enabled("sequana3_hyc_state_info", "rack", rack_id=rack_id):
                set_metric_value("sequana3_hyc_state_info", bl, 1, ctx)
            if metric_enabled("sequana3_hyc_p_in_kpa", "rack", rack_id=rack_id):
                set_metric_value("sequana3_hyc_p_in_kpa", bl, round(c["pressure"], 2), ctx)
            if metric_enabled("sequana3_hyc_leak_sensor_pump", "rack", rack_id=rack_id):
                set_metric_value("sequana3_hyc_leak_sensor_pump", bl, round(c["leak"], 2), ctx)
            if metric_enabled("sequana3_hyc_tmp_pcb_cel", "rack", rack_id=rack_id):
                set_metric_value("sequana3_hyc_tmp_pcb_cel", bl, round(c["board_temp"], 1), ctx)
            if metric_enabled("sequana3_pmc_total_watt", "rack", rack_id=rack_id):
                set_metric_value("sequana3_pmc_total_watt", bl, round(c["pmc_power"], 1), ctx)

        # ── Per-rack PDU metrics (Raritan) ───────────────────────────────
        for rack_id, info in rack_info.items():
            if not any(
                metric_enabled(m, "rack", rack_id=rack_id)
                for m in [
                    "raritan_pdu_activepower_watt",
                    "raritan_pdu_activeenergy_watthour_total",
                    "raritan_pdu_apparentpower_voltampere",
                    "raritan_pdu_current_ampere",
                    "raritan_pdu_inletrating",
                    "raritan_pdu_voltage_volt",
                ]
            ):
                continue

            rack_overrides = overrides_by_rack.get(rack_id, [])
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

                for ov in rack_overrides:
                    if ov.get("metric", "").endswith("_current_ampere"):
                        try:
                            current_amp = float(ov.get("value", current_amp))
                            power_watt = current_amp * 230.0
                            apparent_va = power_watt * 1.05
                        except (TypeError, ValueError):
                            pass
                        break

                energy_key = (rack_id, pduid, "inlet")
                prev_energy = pdu_energy_state.get(energy_key, random.uniform(800000, 1600000))
                energy_wh = prev_energy + (power_watt * (update_interval / 3600.0))
                pdu_energy_state[energy_key] = energy_wh

                for mname, val, ctx in [
                    ("raritan_pdu_activepower_watt", round(power_watt, 1), inlet_ctx),
                    ("raritan_pdu_apparentpower_voltampere", round(apparent_va, 1), inlet_ctx),
                    ("raritan_pdu_current_ampere", round(current_amp, 2), inlet_ctx),
                    ("raritan_pdu_inletrating", rating_amp, inlet_ctx),
                    ("raritan_pdu_activeenergy_watthour_total", round(energy_wh, 1), inlet_ctx),
                ]:
                    if metric_enabled(mname, "rack", rack_id=rack_id):
                        set_metric_value(mname, base_labels, val, ctx)

                if metric_enabled("raritan_pdu_voltage_volt", "rack", rack_id=rack_id):
                    voltage = 230.0 + random.uniform(-2.0, 2.0)
                    set_metric_value(
                        "raritan_pdu_voltage_volt", base_labels, round(voltage, 1), inlet_ctx
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
                    outlet_prev = pdu_energy_state.get(
                        outlet_energy_key, random.uniform(50000, 200000)
                    )
                    outlet_energy = outlet_prev + (outlet_power * (update_interval / 3600.0))
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
