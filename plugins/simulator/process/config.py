"""Simulator configuration loading.

Reads plugin.yaml (base config) and app.yaml (operator overrides) and merges
them to produce the effective simulation configuration.
"""

import os

import yaml

SIMULATOR_CONFIG_PATH = os.getenv(
    "SIMULATOR_CONFIG", "/app/config/plugins/simulator/config/plugin.yaml"
)
APP_CONFIG_PATH = os.getenv("SIMULATOR_APP_CONFIG", "/app/config/app.yaml")


def load_yaml(path):
    try:
        with open(path, "r") as f:
            return yaml.safe_load(f)
    except Exception as e:
        print(f"Error loading {path}: {e}")
        return {}


def load_simulator_config():
    """Load simulator configuration from plugin.yaml, overridden by app.yaml."""
    sim_cfg = load_yaml(SIMULATOR_CONFIG_PATH) or {}
    app_cfg = load_yaml(APP_CONFIG_PATH) or {}

    # Try new format first (plugins.simulator), then legacy format (simulator)
    app_sim = None
    if isinstance(app_cfg, dict):
        plugins = app_cfg.get("plugins")
        if isinstance(plugins, dict) and "simulator" in plugins:
            app_sim = plugins["simulator"]
        elif "simulator" in app_cfg:
            app_sim = app_cfg["simulator"]

    if isinstance(app_sim, dict):
        sim_cfg = {**sim_cfg, **app_sim}
    return sim_cfg
