"""
Telemetry Service

Business logic for telemetry data collection and health checks.
"""

from typing import List, Dict

from rackscope.model.domain import Topology, Device
from rackscope.model.catalog import Catalog
from rackscope.model.checks import ChecksLibrary
from rackscope.services.instance_service import expand_device_instances


def extract_device_instances(device: Device) -> List[str]:
    """Extract device instance names with fallback to device ID.

    This is a variant of instance_service.expand_device_instances
    that falls back to device.id if no instances are found.

    Args:
        device: The device to extract instances from

    Returns:
        List of instance names, or [device.id] if none found
    """
    instances = expand_device_instances(device)
    return instances if instances else [device.id]


def collect_check_targets(
    topology: Topology,
    catalog: Catalog,
    checks: ChecksLibrary,
) -> Dict[str, Dict[str, List[str]]]:
    """Collect check targets from topology based on templates.

    Analyzes the topology and catalog to determine which checks
    should be executed on which targets (nodes, chassis, racks).

    Args:
        topology: The datacenter topology
        catalog: The template catalog
        checks: The checks library

    Returns:
        Dictionary mapping check IDs to their targets by scope:
        {
            "check_id": {
                "node": ["node1", "node2", ...],
                "chassis": ["chassis1", ...],
                "rack": ["rack1", ...]
            }
        }
    """
    check_by_id = {c.id: c for c in checks.checks}
    targets: Dict[str, Dict[str, set[str]]] = {}

    def add_targets(check_id: str, nodes: List[str], chassis: List[str], racks: List[str]) -> None:
        """Add targets for a check based on its scope."""
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
                    nodes = extract_device_instances(device)
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
                if rack_template and rack_template.infrastructure.rack_components:
                    for component_ref in rack_template.infrastructure.rack_components:
                        component_template = catalog.get_rack_component_template(
                            component_ref.template_id
                        )
                        if not component_template or not component_template.checks:
                            continue
                        for check_id in component_template.checks:
                            add_targets(check_id, rack_nodes, rack_chassis, [rack.id])

    return {
        check_id: {
            "node": sorted(list(values.get("node", set()))),
            "chassis": sorted(list(values.get("chassis", set()))),
            "rack": sorted(list(values.get("rack", set()))),
        }
        for check_id, values in targets.items()
    }
