"""Topology generator using REST API.

Generates datacenter topologies by calling the Rackscope API endpoints.
Provides real-time validation and immediate availability without restart.
"""

import argparse
from pathlib import Path

import requests
import yaml
from pydantic import ValidationError

from generator_models import GeneratorConfig


class TopologyAPIGenerator:
    """Generate topology via REST API calls."""

    def __init__(self, base_url: str = "http://localhost:8000", timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.created_sites = []
        self.created_rooms = []
        self.created_aisles = []
        self.created_racks = []

    def _check_backend(self):
        """Check if backend is reachable."""
        try:
            resp = self.session.get(f"{self.base_url}/api/healthz", timeout=5)
            if resp.status_code == 200:
                print(f"✓ Backend is reachable at {self.base_url}")
                return True
        except requests.exceptions.RequestException as e:
            print(f"✗ Backend not reachable at {self.base_url}: {e}")
            return False
        return False

    def create_site(self, site_id: str, name: str) -> dict:
        """Create a new site."""
        payload = {"id": site_id, "name": name}
        resp = self.session.post(
            f"{self.base_url}/api/topology/sites",
            json=payload,
            timeout=self.timeout,
        )
        if resp.status_code not in (200, 201):
            raise Exception(f"Failed to create site {site_id}: {resp.text}")

        result = resp.json()
        self.created_sites.append(site_id)
        print(f"  ✓ Site created: {site_id}")
        return result

    def create_room(self, site_id: str, room_id: str, name: str) -> dict:
        """Create a new room under a site."""
        payload = {"id": room_id, "name": name}
        resp = self.session.post(
            f"{self.base_url}/api/topology/sites/{site_id}/rooms",
            json=payload,
            timeout=self.timeout,
        )
        if resp.status_code not in (200, 201):
            raise Exception(f"Failed to create room {room_id}: {resp.text}")

        result = resp.json()
        self.created_rooms.append((site_id, room_id))
        print(f"    ✓ Room created: {room_id}")
        return result

    def create_aisle(self, room_id: str, aisle_id: str, name: str) -> dict:
        """Create a new aisle in a room."""
        payload = {"aisles": [{"id": aisle_id, "name": name}]}
        resp = self.session.post(
            f"{self.base_url}/api/topology/rooms/{room_id}/aisles/create",
            json=payload,
            timeout=self.timeout,
        )
        if resp.status_code not in (200, 201):
            raise Exception(f"Failed to create aisle {aisle_id}: {resp.text}")

        result = resp.json()
        self.created_aisles.append((room_id, aisle_id))
        print(f"      ✓ Aisle created: {aisle_id}")
        return result

    def create_rack(
        self,
        aisle_id: str,
        rack_id: str,
        name: str,
        template_id: str,
        u_height: int,
    ) -> dict:
        """Add a rack to an aisle."""
        # The API uses PUT to update racks list for an aisle
        # We need to get existing racks first, then append
        payload = {
            "racks": [
                {
                    "id": rack_id,
                    "name": name,
                    "template_id": template_id,
                    "u_height": u_height,
                    "devices": [],
                }
            ]
        }
        resp = self.session.put(
            f"{self.base_url}/api/topology/aisles/{aisle_id}/racks",
            json=payload,
            timeout=self.timeout,
        )
        if resp.status_code not in (200, 201):
            raise Exception(f"Failed to create rack {rack_id}: {resp.text}")

        result = resp.json()
        self.created_racks.append((aisle_id, rack_id))
        print(f"        ✓ Rack created: {rack_id}")
        return result

    def add_devices_to_rack(self, rack_id: str, devices: list) -> dict:
        """Add devices to a rack."""
        payload = {"devices": devices}
        resp = self.session.put(
            f"{self.base_url}/api/topology/racks/{rack_id}/devices",
            json=payload,
            timeout=self.timeout,
        )
        if resp.status_code not in (200, 201):
            raise Exception(f"Failed to add devices to rack {rack_id}: {resp.text}")

        result = resp.json()
        print(f"          ✓ {len(devices)} devices added to {rack_id}")
        return result

    def generate_from_config(self, config: GeneratorConfig, dry_run: bool = False):
        """Generate topology from configuration."""
        if dry_run:
            print("DRY RUN MODE - No API calls will be made")
            print("")

        # Check backend availability
        if not dry_run and not self._check_backend():
            raise Exception("Backend is not reachable. Start it with 'make up'")

        print("")
        print("Generating topology from config...")
        print(f"  Sites: {len(config.sites)}")
        print("")

        node_counters = {
            "compute": config.node_counters.compute,
            "gpu": config.node_counters.gpu,
            "visu": config.node_counters.visu,
            "storage": config.node_counters.storage,
            "io": config.node_counters.io,
            "login": config.node_counters.login,
            "mgmt": config.node_counters.mgmt,
        }

        for site_config in config.sites:
            site_id = site_config.id
            site_name = site_config.name

            if dry_run:
                print(f"Would create site: {site_id} ({site_name})")
            else:
                self.create_site(site_id, site_name)

            for room_config in site_config.rooms:
                room_id = room_config.id
                room_name = room_config.name

                if dry_run:
                    print(f"  Would create room: {room_id} ({room_name})")
                else:
                    self.create_room(site_id, room_id, room_name)

                for aisle_num, aisle_config in enumerate(room_config.aisles, start=1):
                    aisle_id = aisle_config.id
                    aisle_name = aisle_config.name

                    if dry_run:
                        print(f"    Would create aisle: {aisle_id} ({aisle_name})")
                    else:
                        self.create_aisle(room_id, aisle_id, aisle_name)

                    rack_num_offset = 1
                    for rack_config in aisle_config.racks:
                        for i in range(rack_config.count):
                            rack_num = rack_num_offset + i

                            # Format rack ID and name
                            rack_id = rack_config.id_pattern.format(
                                aisle_num=aisle_num,
                                rack_num=rack_num,
                            )
                            rack_name = rack_config.name_pattern.format(
                                aisle_num=aisle_num,
                                rack_num=rack_num,
                            )

                            if dry_run:
                                print(f"      Would create rack: {rack_id} ({rack_name})")
                            else:
                                self.create_rack(
                                    aisle_id,
                                    rack_id,
                                    rack_name,
                                    rack_config.template_id,
                                    rack_config.u_height,
                                )

                            # Generate devices
                            devices = []
                            for device_config in rack_config.devices:
                                for dev_idx in range(1, device_config.count + 1):
                                    # Format device ID and name
                                    device_id = device_config.id_pattern.format(
                                        rack_id=rack_id,
                                        i=dev_idx,
                                        rack_num=rack_num,
                                    )
                                    device_name = device_config.name_pattern.format(
                                        rack_id=rack_id,
                                        i=dev_idx,
                                        rack_num=rack_num,
                                    )

                                    # Calculate U position
                                    u_step = device_config.u_step or 1
                                    u_position = device_config.u_start + (dev_idx - 1) * u_step

                                    # Generate nodes pattern if specified
                                    nodes = None
                                    if device_config.nodes_pattern:
                                        counter_type = self._infer_counter_type(
                                            device_config.nodes_pattern
                                        )
                                        if device_config.node_counter_start is not None:
                                            start = (
                                                device_config.node_counter_start
                                                + (dev_idx - 1) * device_config.nodes_per_device
                                            )
                                        else:
                                            start = node_counters[counter_type]
                                            node_counters[counter_type] += (
                                                device_config.nodes_per_device
                                            )

                                        end = start + device_config.nodes_per_device - 1
                                        nodes = device_config.nodes_pattern.format(
                                            start=start,
                                            end=end,
                                            i=dev_idx,
                                            rack_num=rack_num,
                                        )

                                    device = {
                                        "id": device_id,
                                        "name": device_name,
                                        "template_id": device_config.template_id,
                                        "u_position": u_position,
                                    }

                                    if nodes:
                                        device["nodes"] = nodes

                                    devices.append(device)

                            # Add all devices to rack
                            if dry_run:
                                print(f"        Would add {len(devices)} devices to {rack_id}")
                            else:
                                if devices:
                                    self.add_devices_to_rack(rack_id, devices)

                        rack_num_offset += rack_config.count

        print("")
        print("✓ Topology generation completed!")
        print(f"  Sites created: {len(self.created_sites)}")
        print(f"  Rooms created: {len(self.created_rooms)}")
        print(f"  Aisles created: {len(self.created_aisles)}")
        print(f"  Racks created: {len(self.created_racks)}")

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
        description="Generate topology via REST API.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate from config (requires backend running)
  python generate_topology_api.py -c generator_config_small.yaml

  # Dry run (show what would be created)
  python generate_topology_api.py -c generator_config_small.yaml --dry-run

  # Use custom backend URL
  python generate_topology_api.py -c generator_config_hpc.yaml --url http://prod:8000
        """,
    )
    parser.add_argument(
        "-c",
        "--config",
        type=Path,
        default=Path(__file__).parent / "generator_config_small.yaml",
        help="Path to generator configuration YAML file (default: generator_config_small.yaml)",
    )
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="Backend URL (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="Request timeout in seconds (default: 30)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be created without making API calls",
    )
    args = parser.parse_args()

    # Load configuration
    print(f"Loading configuration from {args.config}...")
    try:
        config = load_config(args.config)
    except Exception as e:
        print(f"✗ Failed to load configuration: {e}")
        return 1

    # Generate topology via API
    generator = TopologyAPIGenerator(base_url=args.url, timeout=args.timeout)

    try:
        generator.generate_from_config(config, dry_run=args.dry_run)
    except Exception as e:
        print(f"✗ Generation failed: {e}")
        return 1

    if not args.dry_run:
        print("")
        print("Note: The topology is now live in the backend!")
        print(f"      Visit {args.url} to see it.")

    return 0


if __name__ == "__main__":
    exit(main())
