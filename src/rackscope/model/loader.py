from __future__ import annotations

from pathlib import Path
from typing import Union

import yaml
from pydantic import ValidationError

from rackscope.model.domain import Topology
from rackscope.model.catalog import Catalog, DeviceTemplate, RackTemplate

# ... (keep exceptions)

def load_catalog(templates_dir: Union[str, Path]) -> Catalog:
    """Load all template files from a directory recursively into a single Catalog."""
    path = Path(templates_dir)
    catalog = Catalog()
    
    if not path.exists() or not path.is_dir():
        return catalog

    # Recursive glob to catch subdirectories like devices/ and racks/
    for yaml_file in path.rglob("*.yaml"):
        try:
            with yaml_file.open("r") as f:
                data = yaml.safe_load(f)
                if not data: continue
                
                # Load Device Templates
                if "templates" in data:
                    for t_data in data["templates"]:
                        catalog.device_templates.append(DeviceTemplate(**t_data))
                
                # Load Rack Templates
                if "rack_templates" in data:
                    for t_data in data["rack_templates"]:
                        catalog.rack_templates.append(RackTemplate(**t_data))
                        
        except Exception as e:
            print(f"Warning: Failed to load template file {yaml_file}: {e}")
            
    return catalog

def load_topology(path: Union[str, Path]) -> Topology:
    """Load and validate topology from a YAML file."""
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Topology file not found: {path}")

    try:
        with path.open("r") as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        raise InvalidFormatError(f"Error parsing YAML file {path}: {e}")

    if data is None:
        return Topology()

    try:
        return Topology(**data)
    except ValidationError as e:
        # Pydantic errors are quite detailed, we wrap them for consistency
        raise InvalidFormatError(f"Validation failed for {path}:\n{e}")
