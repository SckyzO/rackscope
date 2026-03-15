"""Runtime override loading.

Overrides are written by the backend API to a YAML file and read by the
simulator on every tick. Each override can have an optional expires_at
Unix timestamp; expired entries are silently discarded.
"""

import time

from plugins.simulator.process.config import load_yaml


def load_overrides(path):
    """Load active (non-expired) overrides from the YAML file at path.

    Returns an empty list if the file is missing or contains no overrides.
    """
    data = load_yaml(path) or {}
    overrides = data.get("overrides") if isinstance(data, dict) else []
    if not overrides:
        return []
    now = int(time.time())
    active = []
    for item in overrides:
        if not isinstance(item, dict):
            continue
        expires_at = item.get("expires_at")
        if expires_at and expires_at <= now:
            continue
        active.append(item)
    return active
