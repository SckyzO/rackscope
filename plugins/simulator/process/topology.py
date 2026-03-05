"""Topology loading and node discovery.

Parses YAML topology files (segmented or monolithic) and expands nodeset
patterns (e.g. compute[001-004]) into concrete instance lists.
"""

import fnmatch
import os
import re
from pathlib import Path

from plugins.simulator.process.config import load_yaml


def parse_nodeset(pattern):
    """Expand a nodeset pattern string into a slot-indexed dict.

    Examples:
        "compute[001-004]" -> {1: "compute001", 2: "compute002", ...}
        "node1"            -> {1: "node1"}
        None               -> {}
    """
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


def _expand_patterns(patterns):
    """Split a list of patterns into exact names and wildcard patterns."""
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
    """Return True if name matches any exact name or wildcard pattern."""
    if name in exact:
        return True
    for pattern in wildcards:
        if fnmatch.fnmatchcase(name, pattern):
            return True
    return False


def load_device_templates(templates_dir):
    """Load device templates keyed by template id."""
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


def load_topology_data(path):
    """Load topology from a directory (segmented layout) or a single YAML file."""
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
                        rack_id = (
                            rack_ref.get("id") if isinstance(rack_ref, dict) else rack_ref
                        )
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
                    rack_id = (
                        rack_ref.get("id") if isinstance(rack_ref, dict) else rack_ref
                    )
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
            sites_out.append(
                {"id": site_id, "name": site.get("name", site_id), "rooms": rooms_out}
            )
        return {"sites": sites_out}
    return load_yaml(path)


def load_topology_nodes(topo_data, device_templates=None):
    """Extract the flat list of simulation targets from topology data."""
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

                    if device_type == "storage" and nodes_map:
                        disk_layout = template.get("disk_layout") or template.get("layout", {})
                        matrix = disk_layout.get("matrix", [[]])
                        slot_count = sum(len(row) for row in matrix)
                        storage_type = template.get("storage_type", "generic")
                        instance_name = (
                            list(nodes_map.values())[0] if nodes_map else device["id"]
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
