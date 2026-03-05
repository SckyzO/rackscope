"""Simulator configuration loading.

Reads app.yaml (plugins.simulator or legacy simulator key) and merges
with scenarios.yaml to produce the effective simulation configuration.
"""

import os

import yaml

SIMULATOR_CONFIG_PATH = os.getenv(
    "SIMULATOR_CONFIG", "/app/config/plugins/simulator/scenarios/scenarios.yaml"
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
    """Load and merge simulator configuration from scenarios.yaml + app.yaml."""
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


def apply_scenario(sim_cfg):
    """Merge the active scenario's settings into the base config."""
    scenario_name = sim_cfg.get("scenario")
    scenarios = sim_cfg.get("scenarios", {})
    if scenario_name and isinstance(scenarios, dict) and scenario_name in scenarios:
        scenario_cfg = scenarios.get(scenario_name) or {}
        if isinstance(scenario_cfg, dict):
            merged = dict(sim_cfg)
            # Scenario should be authoritative — do not inherit random rates unless
            # explicitly set by the scenario.
            if "incident_rates" not in scenario_cfg:
                merged["incident_rates"] = {}
            for key in [
                "incident_rates",
                "incident_durations",
                "profiles",
                "seed",
                "update_interval_seconds",
            ]:
                if key in scenario_cfg:
                    merged[key] = scenario_cfg[key]
            if "scale_factor" in scenario_cfg:
                merged["scale_factor"] = scenario_cfg["scale_factor"]
            return merged
    return sim_cfg
