"""Simulator configuration loading.

Reads plugin.yaml (base config) and app.yaml (operator overrides) and merges
them to produce the effective simulation configuration.
"""

import os

import yaml

APP_CONFIG_PATH = os.getenv("SIMULATOR_APP_CONFIG", "/app/config/app.yaml")


# Resolve simulator plugin config path:
# 1. Explicit SIMULATOR_CONFIG env var (set by docker-compose for legacy deployments)
# 2. {profile_dir}/plugins/simulator/config/plugin.yaml  (profile-scoped)
# 3. Global fallback
def _resolve_simulator_config_path() -> str:
    explicit = os.getenv("SIMULATOR_CONFIG")
    if explicit:
        return explicit
    profile_dir = os.path.dirname(os.path.abspath(APP_CONFIG_PATH))
    profile_path = os.path.join(profile_dir, "plugins", "simulator", "config", "plugin.yaml")
    if os.path.isfile(profile_path):
        return profile_path
    return "/app/config/plugins/simulator/config/plugin.yaml"


SIMULATOR_CONFIG_PATH = _resolve_simulator_config_path()


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
        # Only let app.yaml override keys that are NOT already owned by plugin.yaml.
        # plugin.yaml is the single source of truth for simulator behaviour
        # (incident_mode, changes_per_hour, etc.).  app.yaml should only carry
        # the 'enabled' flag and optional path overrides.
        #
        # MAINTENANCE NOTE: any new field added to plugin.yaml that should NOT
        # be overridable from app.yaml must be added to this set to prevent
        # silent shadowing (app.yaml value would silently win otherwise).
        PLUGIN_YAML_OWNED = {
            "incident_mode",
            "changes_per_hour",
            "custom_incidents",
            "slurm_random_statuses",
            "slurm_random_match",
            "slurm_alloc_percent",
            "update_interval_seconds",
            "seed",
            "profiles",
            "metrics_catalogs",
        }
        safe_overrides = {k: v for k, v in app_sim.items() if k not in PLUGIN_YAML_OWNED}
        sim_cfg = {**sim_cfg, **safe_overrides}
    return sim_cfg
