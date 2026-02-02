"""Configurable topology generator for Rackscope.

Generates realistic datacenter topologies from YAML configuration files.
"""

import argparse
from pathlib import Path
from typing import Optional

import yaml
from pydantic import ValidationError

try:
    from faker import Faker

    FAKER_AVAILABLE = True
except ImportError:
    FAKER_AVAILABLE = False
    print("Warning: faker not installed. Fake location generation disabled.")

from generator_models import (
    GeneratorConfig,
    SiteConfig,
    RoomConfig,
    AisleConfig,
    RackConfig,
    DevicePlacementConfig,
)


class TopologyGenerator:
    """Generate topology from configuration."""

    def __init__(self, config: GeneratorConfig):
        self.config = config
        self.node_counters = {
            "compute": config.node_counters.compute,
            "gpu": config.node_counters.gpu,
            "visu": config.node_counters.visu,
            "storage": config.node_counters.storage,
            "io": config.node_counters.io,
            "login": config.node_counters.login,
            "mgmt": config.node_counters.mgmt,
        }
        if FAKER_AVAILABLE:
            self.faker = Faker()
        else:
            self.faker = None

    def _infer_counter_type(self, pattern: str) -> str:
        """Infer node counter type from pattern."""
        pattern_lower = pattern.lower()
        if "compute" in pattern_lower:
            return "compute"
        elif "gpu" in pattern_lower:
            return "gpu"
        elif "visu" in pattern_lower:
            return "visu"
        elif "storage" in pattern_lower or "hdd" in pattern_lower or "ssd" in pattern_lower:
            return "storage"
        elif "io" in pattern_lower:
            return "io"
        elif "login" in pattern_lower:
            return "login"
        elif "mngt" in pattern_lower or "mgmt" in pattern_lower:
            return "mgmt"
        return "compute"  # Default

    def _generate_location(self, location_config):
        """Generate or use manual location data."""
        if not location_config:
            return {}

        # Manual coordinates
        if location_config.latitude is not None and location_config.longitude is not None:
            return {
                "latitude": location_config.latitude,
                "longitude": location_config.longitude,
                "address": location_config.address,
            }

        # Generate fake location
        if location_config.generate and self.faker:
            if location_config.country:
                self.faker = Faker(
                    location_config.country.lower() + "_" + location_config.country.upper()
                )

            return {
                "latitude": float(self.faker.latitude()),
                "longitude": float(self.faker.longitude()),
                "address": self.faker.address().replace("\n", ", "),
            }

        return {}

    def _format_pattern(self, pattern: str, **kwargs) -> str:
        """Format a pattern string with provided kwargs."""
        return pattern.format(**kwargs)

    def _generate_nodes_pattern(
        self,
        pattern: Optional[str],
        nodes_per_device: int,
        counter_type: str,
        device_index: int,
        rack_num: int,
        counter_start: Optional[int] = None,
    ) -> Optional[str]:
        """Generate nodes pattern for a device."""
        if not pattern:
            return None

        # Use device-specific counter or global counter
        if counter_start is not None:
            start = counter_start + (device_index - 1) * nodes_per_device
        else:
            start = self.node_counters[counter_type]
            self.node_counters[counter_type] += nodes_per_device

        end = start + nodes_per_device - 1

        # Format the pattern
        return self._format_pattern(
            pattern,
            start=start,
            end=end,
            i=device_index,
            rack_num=rack_num,
        )

    def _generate_device(
        self,
        device_config: DevicePlacementConfig,
        rack_id: str,
        rack_num: int,
        device_index: int,
    ) -> dict:
        """Generate a single device."""
        # Infer counter type from nodes pattern
        counter_type = "compute"
        if device_config.nodes_pattern:
            counter_type = self._infer_counter_type(device_config.nodes_pattern)

        # Generate nodes pattern if specified
        nodes = None
        if device_config.nodes_pattern:
            nodes = self._generate_nodes_pattern(
                device_config.nodes_pattern,
                device_config.nodes_per_device,
                counter_type,
                device_index,
                rack_num,
                device_config.node_counter_start,
            )

        # Format device ID and name
        device_id = self._format_pattern(
            device_config.id_pattern,
            rack_id=rack_id,
            i=device_index,
            rack_num=rack_num,
        )
        device_name = self._format_pattern(
            device_config.name_pattern,
            rack_id=rack_id,
            i=device_index,
            rack_num=rack_num,
        )

        device = {
            "id": device_id,
            "name": device_name,
            "template_id": device_config.template_id,
            "u_position": device_config.u_start + (device_index - 1) * (device_config.u_step or 1),
        }

        if nodes:
            device["nodes"] = nodes

        return device

    def _generate_rack(
        self,
        rack_config: RackConfig,
        aisle_num: int,
        rack_num: int,
    ) -> dict:
        """Generate a single rack."""
        # Format rack ID and name
        rack_id = self._format_pattern(
            rack_config.id_pattern,
            aisle_num=aisle_num,
            rack_num=rack_num,
        )
        rack_name = self._format_pattern(
            rack_config.name_pattern,
            aisle_num=aisle_num,
            rack_num=rack_num,
        )

        # Generate devices
        devices = []
        for device_config in rack_config.devices:
            for i in range(1, device_config.count + 1):
                device = self._generate_device(
                    device_config,
                    rack_id,
                    rack_num,
                    i,
                )
                devices.append(device)

        rack = {
            "id": rack_id,
            "name": rack_name,
            "template_id": rack_config.template_id,
            "u_height": rack_config.u_height,
            "devices": devices,
        }

        return rack

    def _generate_aisle(
        self,
        aisle_config: AisleConfig,
        aisle_num: int,
    ) -> dict:
        """Generate an aisle with racks."""
        racks = []
        rack_num_offset = 1

        for rack_config in aisle_config.racks:
            for i in range(rack_config.count):
                rack = self._generate_rack(
                    rack_config,
                    aisle_num,
                    rack_num_offset + i,
                )
                racks.append(rack)
            rack_num_offset += rack_config.count

        return {
            "id": aisle_config.id,
            "name": aisle_config.name,
            "racks": racks,
        }

    def _generate_room(self, room_config: RoomConfig) -> dict:
        """Generate a room with aisles and standalone racks."""
        aisles = []
        for aisle_num, aisle_config in enumerate(room_config.aisles, start=1):
            aisle = self._generate_aisle(aisle_config, aisle_num)
            aisles.append(aisle)

        standalone_racks = []
        for rack_num, rack_config in enumerate(room_config.standalone_racks, start=1):
            rack = self._generate_rack(rack_config, 0, rack_num)
            standalone_racks.append(rack)

        room = {
            "id": room_config.id,
            "name": room_config.name,
            "aisles": aisles,
        }

        if standalone_racks:
            room["standalone_racks"] = standalone_racks

        return room

    def _generate_site(self, site_config: SiteConfig) -> dict:
        """Generate a site with rooms."""
        rooms = []
        for room_config in site_config.rooms:
            room = self._generate_room(room_config)
            rooms.append(room)

        site = {
            "id": site_config.id,
            "name": site_config.name,
            "rooms": rooms,
        }

        # Add location if configured
        location = self._generate_location(site_config.location)
        if location:
            site.update(location)

        return site

    def generate(self) -> dict:
        """Generate complete topology."""
        sites = []
        for site_config in self.config.sites:
            site = self._generate_site(site_config)
            sites.append(site)

        return {"sites": sites}


def write_monolithic(data: dict, output: Path):
    """Write topology as a single YAML file."""
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w") as f:
        yaml.dump(data, f, sort_keys=False)
    print(f"✓ Topology generated: {output}")


def write_segmented(data: dict, base: Path):
    """Write topology as segmented directory structure."""
    rooms_root = base / "datacenters"
    rooms_root.mkdir(parents=True, exist_ok=True)

    sites_out = []
    for site in data.get("sites", []):
        site_id = site.get("id")
        if not site_id:
            continue

        site_name = site.get("name", site_id)
        rooms_out = []

        for room in site.get("rooms", []):
            room_id = room.get("id")
            if not room_id:
                continue

            room_name = room.get("name", room_id)
            rooms_out.append({"id": room_id, "name": room_name})

            room_dir = base / "datacenters" / site_id / "rooms" / room_id
            (room_dir / "aisles").mkdir(parents=True, exist_ok=True)
            (room_dir / "standalone_racks").mkdir(parents=True, exist_ok=True)

            room_out = {
                "id": room_id,
                "name": room_name,
                "aisles": [],
                "standalone_racks": [],
            }

            aisles_out = []
            for aisle in room.get("aisles", []):
                aisle_id = aisle.get("id")
                if not aisle_id:
                    continue

                aisle_name = aisle.get("name", aisle_id)
                aisles_out.append({"id": aisle_id, "name": aisle_name})

                aisle_dir = room_dir / "aisles" / aisle_id
                (aisle_dir / "racks").mkdir(parents=True, exist_ok=True)

                racks_list = []
                for rack in aisle.get("racks", []):
                    rack_id = rack.get("id")
                    if not rack_id:
                        continue
                    racks_list.append(rack_id)
                    rack_file = aisle_dir / "racks" / f"{rack_id}.yaml"
                    rack_file.write_text(yaml.safe_dump(rack, sort_keys=False))

                aisle_yaml = {"id": aisle_id, "name": aisle_name, "racks": racks_list}
                (aisle_dir / "aisle.yaml").write_text(yaml.safe_dump(aisle_yaml, sort_keys=False))

            room_out["aisles"] = aisles_out

            for rack in room.get("standalone_racks", []):
                rack_id = rack.get("id")
                if not rack_id:
                    continue
                room_out["standalone_racks"].append(rack_id)
                rack_file = room_dir / "standalone_racks" / f"{rack_id}.yaml"
                rack_file.write_text(yaml.safe_dump(rack, sort_keys=False))

            (room_dir / "room.yaml").write_text(yaml.safe_dump(room_out, sort_keys=False))

        sites_out.append({"id": site_id, "name": site_name, "rooms": rooms_out})

    (base / "sites.yaml").write_text(yaml.safe_dump({"sites": sites_out}, sort_keys=False))
    print(f"✓ Topology generated: {base}")


def load_config(config_path: Path) -> GeneratorConfig:
    """Load and validate generator configuration."""
    with open(config_path) as f:
        config_data = yaml.safe_load(f)

    try:
        config = GeneratorConfig(**config_data)
        return config
    except ValidationError as e:
        print("✗ Configuration validation failed:")
        print(e)
        raise


def main():
    parser = argparse.ArgumentParser(
        description="Generate topology from configuration file.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate from config to segmented structure
  python generate_topology.py -c generator_config_hpc.yaml -o config/topology

  # Generate to single file
  python generate_topology.py -c generator_config_hpc.yaml -o topology.yaml

  # Use default config
  python generate_topology.py -o config/topology
        """,
    )
    parser.add_argument(
        "-c",
        "--config",
        type=Path,
        default=Path(__file__).parent / "generator_config_hpc.yaml",
        help="Path to generator configuration YAML file (default: generator_config_hpc.yaml)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("config/topology"),
        help="Output path (directory for segmented, .yaml for monolithic)",
    )
    args = parser.parse_args()

    # Load configuration
    print(f"Loading configuration from {args.config}...")
    try:
        config = load_config(args.config)
    except Exception as e:
        print(f"✗ Failed to load configuration: {e}")
        return 1

    # Generate topology
    print("Generating topology...")
    generator = TopologyGenerator(config)
    data = generator.generate()

    # Count elements
    total_racks = sum(
        len(aisle.get("racks", []))
        for site in data["sites"]
        for room in site["rooms"]
        for aisle in room.get("aisles", [])
    )
    total_devices = sum(
        len(rack.get("devices", []))
        for site in data["sites"]
        for room in site["rooms"]
        for aisle in room.get("aisles", [])
        for rack in aisle.get("racks", [])
    )

    print(f"  Sites: {len(data['sites'])}")
    print(f"  Racks: {total_racks}")
    print(f"  Devices: {total_devices}")

    # Write output
    output = args.output
    if output.suffix == ".yaml":
        write_monolithic(data, output)
    else:
        write_segmented(data, output)

    return 0


if __name__ == "__main__":
    exit(main())
