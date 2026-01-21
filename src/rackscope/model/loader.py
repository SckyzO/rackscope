from __future__ import annotations

from pathlib import Path
from typing import Union

import yaml
from pydantic import ValidationError

from rackscope.model.domain import Topology


class LoaderError(Exception):
    """Base class for loader errors."""
    pass

class FileNotFoundError(LoaderError):
    """Raised when the topology file is missing."""
    pass

class InvalidFormatError(LoaderError):
    """Raised when the file content is not valid YAML or doesn't match the schema."""
    pass

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
