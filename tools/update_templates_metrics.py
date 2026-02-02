#!/usr/bin/env python3
"""Update device templates with metrics field based on device type."""

import yaml
from pathlib import Path

# Metrics mapping by device type
METRICS_BY_TYPE = {
    "server": [
        "node_up",
        "node_cpu_usage",
        "node_memory_used_percent",
        "node_memory_available_bytes",
        "node_disk_usage_percent",
        "node_disk_io_read_bytes",
        "node_disk_io_write_bytes",
        "node_network_receive_bytes",
        "node_network_transmit_bytes",
        "node_temperature",
        "node_power",
        "node_load",
        "node_health_status",
        "ipmi_up",
        "ipmi_fan_speed_state",
        "ipmi_temperature_state",
        "ipmi_power_state",
        "ipmi_voltage_state",
        "ipmi_sensor_state",
        "slurm_node_status",
    ],
    "storage": [
        "node_up",
        "node_temperature",
        "node_power",
        "eseries_exporter_collect_error",
        "eseries_storage_system_status",
        "eseries_drive_status",
        "eseries_battery_status",
        "eseries_fan_status",
        "eseries_power_supply_status",
    ],
    "switch": [
        "node_up",
        "node_temperature",
        "node_power",
        "switch_port_status",
        "switch_port_traffic_in",
        "switch_port_traffic_out",
    ],
    "pdu": [
        "pdu_active_power",
        "pdu_current",
        "pdu_energy_total",
        "pdu_voltage",
    ],
}


def update_template_file(file_path: Path) -> None:
    """Update a template file with metrics field."""
    print(f"Processing: {file_path}")

    with open(file_path, "r") as f:
        data = yaml.safe_load(f)

    if not data or "templates" not in data:
        print("  ⚠️  Skipping (no templates key)")
        return

    updated = False
    for template in data["templates"]:
        if not isinstance(template, dict):
            continue

        # Get device type
        device_type = template.get("type", "server")

        # Check if metrics field already exists and is populated
        if "metrics" in template and template["metrics"]:
            print(
                f"  ℹ️  {template.get('id', 'unknown')}: metrics already set ({len(template['metrics'])} metrics)"
            )
            continue

        # Add metrics based on type
        metrics = METRICS_BY_TYPE.get(device_type, [])
        if metrics:
            template["metrics"] = metrics
            updated = True
            print(f"  ✅ {template.get('id', 'unknown')}: added {len(metrics)} metrics")
        else:
            print(
                f"  ⚠️  {template.get('id', 'unknown')}: no metrics defined for type '{device_type}'"
            )

    if updated:
        with open(file_path, "w") as f:
            yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True)
        print("  💾 File updated")


def main():
    """Update all device templates."""
    templates_dir = Path("config/templates/devices")

    if not templates_dir.exists():
        print(f"❌ Templates directory not found: {templates_dir}")
        return

    # Find all YAML files
    yaml_files = list(templates_dir.rglob("*.yaml"))

    print(f"Found {len(yaml_files)} template files\n")

    for file_path in sorted(yaml_files):
        update_template_file(file_path)
        print()

    print(f"✅ Completed! Updated {len(yaml_files)} files")


if __name__ == "__main__":
    main()
