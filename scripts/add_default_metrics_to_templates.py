#!/usr/bin/env python3
"""
Add default metrics to device templates that don't have them.

This script adds common metrics to templates based on their type:
- servers: node/IPMI metrics (temperature, power, load)
- network: switch metrics (uptime, traffic)
- storage: storage metrics (capacity, IOPS)
"""

import sys
from pathlib import Path
import yaml

# Default metrics by device type
DEFAULT_METRICS = {
    "server": [
        "node_temperature_celsius",
        "node_power_watts",
        "node_load_percent",
        "ipmi_temperature_celsius",
        "ipmi_power_watts",
    ],
    "network": [
        "switch_uptime_seconds",
        "switch_temperature_celsius",
    ],
    "storage": [
        "storage_capacity_bytes",
        "storage_used_bytes",
    ],
}


def update_template_file(file_path: Path, dry_run: bool = False):
    """Update a single template file with default metrics."""
    try:
        with open(file_path, "r") as f:
            data = yaml.safe_load(f)

        if not data or "templates" not in data:
            print(f"  ⚠️  Skipping {file_path.name} (invalid structure)")
            return

        modified = False
        for template in data["templates"]:
            # Skip if metrics already exist
            if "metrics" in template and template["metrics"]:
                print(f"  ✓ {template['id']}: already has metrics")
                continue

            # Get default metrics for this type
            device_type = template.get("type", "server")
            default_metrics = DEFAULT_METRICS.get(device_type, DEFAULT_METRICS["server"])

            # Add metrics
            template["metrics"] = default_metrics
            modified = True
            print(f"  ✓ {template['id']}: added {len(default_metrics)} metrics")

        # Write back if modified
        if modified and not dry_run:
            with open(file_path, "w") as f:
                yaml.safe_dump(data, f, default_flow_style=False, sort_keys=False)
            print(f"  ✅ Updated {file_path.name}")

    except Exception as e:
        print(f"  ❌ Error processing {file_path.name}: {e}")


def main():
    # Get templates directory
    config_dir = Path("config/templates/devices")
    if not config_dir.exists():
        print(f"❌ Templates directory not found: {config_dir}")
        sys.exit(1)

    dry_run = "--dry-run" in sys.argv

    if dry_run:
        print("🔍 DRY RUN MODE - No files will be modified\n")
    else:
        print("🚀 Updating templates with default metrics\n")

    # Process all template files
    for category_dir in config_dir.iterdir():
        if not category_dir.is_dir():
            continue

        print(f"📁 {category_dir.name}/")
        for template_file in category_dir.glob("*.yaml"):
            update_template_file(template_file, dry_run=dry_run)
        print()

    if dry_run:
        print("✅ Dry run complete. Run without --dry-run to apply changes.")
    else:
        print("✅ All templates updated!")


if __name__ == "__main__":
    main()
