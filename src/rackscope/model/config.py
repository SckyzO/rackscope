from __future__ import annotations

from typing import Optional, Literal, List, Dict, Any
import re

from pydantic import BaseModel, Field, field_validator


class PathsConfig(BaseModel):
    topology: str = Field(min_length=1)
    templates: str = Field(min_length=1)
    checks: str = Field(min_length=1)
    metrics: str = Field(default="config/metrics/library", min_length=1)


class RefreshConfig(BaseModel):
    room_state_seconds: int = Field(default=30, ge=10)
    rack_state_seconds: int = Field(default=30, ge=10)


class CacheConfig(BaseModel):
    ttl_seconds: int = Field(default=30, ge=1)  # Deprecated, kept for backward compatibility
    health_checks_ttl_seconds: int = Field(default=30, ge=1)  # TTL for health checks
    metrics_ttl_seconds: int = Field(default=120, ge=1)  # TTL for detailed metrics


class TelemetryConfig(BaseModel):
    prometheus_url: Optional[str] = None
    identity_label: str = "instance"
    rack_label: str = "rack_id"
    chassis_label: str = "chassis_id"
    job_regex: str = ".*"
    prometheus_heartbeat_seconds: int = Field(default=30, ge=10)
    prometheus_latency_window: int = Field(default=20, ge=1)
    debug_stats: bool = False
    basic_auth_user: Optional[str] = None
    basic_auth_password: Optional[str] = None
    tls_verify: bool = True
    tls_ca_file: Optional[str] = None
    tls_cert_file: Optional[str] = None
    tls_key_file: Optional[str] = None

    @field_validator("job_regex")
    @classmethod
    def validate_job_regex(cls, value: str) -> str:
        try:
            re.compile(value)
        except re.error as exc:
            raise ValueError(f"Invalid job_regex: {exc}") from exc
        return value

    @field_validator("basic_auth_password")
    @classmethod
    def validate_basic_auth_password(cls, value: Optional[str], info) -> Optional[str]:
        # Treat empty strings as None
        if not value:
            return None
        user = info.data.get("basic_auth_user")
        if not user:
            raise ValueError("basic_auth_user is required when basic_auth_password is set")
        return value

    @field_validator("tls_key_file")
    @classmethod
    def validate_tls_key_file(cls, value: Optional[str], info) -> Optional[str]:
        # Treat empty strings as None
        if not value:
            return None
        cert = info.data.get("tls_cert_file")
        if not cert:
            raise ValueError("tls_cert_file is required when tls_key_file is set")
        return value

    @field_validator("basic_auth_user", "tls_cert_file", "tls_ca_file", "prometheus_url")
    @classmethod
    def validate_optional_string(cls, value: Optional[str]) -> Optional[str]:
        """Convert empty strings to None for optional string fields."""
        if value == "":
            return None
        return value


class PlannerConfig(BaseModel):
    unknown_state: Literal["OK", "WARN", "CRIT", "UNKNOWN"] = "UNKNOWN"
    cache_ttl_seconds: int = Field(default=30, ge=1)
    max_ids_per_query: int = Field(default=200, ge=1)


class FeatureConfig(BaseModel):
    notifications: bool = False
    notifications_max_visible: int = Field(default=10, ge=1)
    playlist: bool = False
    offline: bool = False
    demo: bool = False


class IncidentRates(BaseModel):
    node_micro_failure: float = Field(default=0.001, ge=0, le=1)
    rack_macro_failure: float = Field(default=0.01, ge=0, le=1)
    aisle_cooling_failure: float = Field(default=0.005, ge=0, le=1)


class IncidentDurations(BaseModel):
    rack: int = Field(default=3, ge=1)
    aisle: int = Field(default=5, ge=1)


class SimulatorMetricsCatalog(BaseModel):
    id: str = Field(min_length=1)
    path: str = Field(min_length=1)
    enabled: bool = True


class SimulatorConfig(BaseModel):
    update_interval_seconds: int = Field(default=20, ge=1)
    seed: Optional[int] = None
    scenario: Optional[str] = None
    scale_factor: float = Field(default=1.0, ge=0.0)
    incident_rates: IncidentRates = Field(default_factory=IncidentRates)
    incident_durations: IncidentDurations = Field(default_factory=IncidentDurations)
    overrides_path: str = Field(default="config/plugins/simulator/overrides.yaml", min_length=1)
    default_ttl_seconds: int = Field(default=120, ge=0)
    metrics_catalog_path: str = Field(
        default="config/plugins/simulator/metrics_full.yaml", min_length=1
    )
    metrics_catalogs: List[SimulatorMetricsCatalog] = Field(default_factory=list)


class AppInfoConfig(BaseModel):
    name: str = Field(default="Rackscope", min_length=1)
    description: Optional[str] = Field(default="Datacenter Overview")


class MapCenterConfig(BaseModel):
    lat: float = Field(default=20, ge=-90, le=90)
    lon: float = Field(default=0, ge=-180, le=180)


class MapConfig(BaseModel):
    default_view: Optional[Literal["world", "continent", "country", "city"]] = Field(
        default="world"
    )
    default_zoom: Optional[int] = Field(default=None, ge=1, le=18)
    min_zoom: int = Field(default=2, ge=1, le=18)
    max_zoom: int = Field(default=7, ge=1, le=18)
    zoom_controls: bool = True
    center: MapCenterConfig = Field(default_factory=MapCenterConfig)


class SlurmStatusMap(BaseModel):
    ok: List[str] = Field(
        default_factory=lambda: ["idle", "allocated", "alloc", "completing", "comp"]
    )
    warn: List[str] = Field(
        default_factory=lambda: [
            "mixed",
            "mix",
            "maint",
            "planned",
            "plnd",
            "reserved",
            "resv",
            "blocked",
            "block",
            "power_down",
            "pow_dn",
            "power_up",
            "pow_up",
            "powering_up",
            "powered_down",
            "reboot_issued",
            "reboot_req",
        ]
    )
    crit: List[str] = Field(
        default_factory=lambda: [
            "down",
            "drain",
            "drained",
            "draining",
            "drng",
            "fail",
            "failing",
            "failg",
            "error",
            "unknown",
            "unk",
            "noresp",
            "inval",
        ]
    )


class SlurmConfig(BaseModel):
    metric: str = Field(default="slurm_node_status", min_length=1)
    label_node: str = Field(default="node", min_length=1)
    label_status: str = Field(default="status", min_length=1)
    label_partition: str = Field(default="partition", min_length=1)
    status_map: SlurmStatusMap = Field(default_factory=SlurmStatusMap)
    roles: List[str] = Field(default_factory=lambda: ["compute", "visu"])
    include_unlabeled: bool = False
    mapping_path: Optional[str] = None


class AuthConfig(BaseModel):
    enabled: bool = False
    username: str = "admin"
    password_hash: str = ""  # bcrypt hash; empty = not yet configured
    secret_key: str = ""  # JWT signing key; auto-generated at startup if empty
    session_duration: Literal["8h", "24h", "unlimited"] = "24h"


class AppConfig(BaseModel):
    app: AppInfoConfig = Field(default_factory=AppInfoConfig)
    paths: PathsConfig
    refresh: RefreshConfig = Field(default_factory=RefreshConfig)
    cache: CacheConfig = Field(default_factory=CacheConfig)
    telemetry: TelemetryConfig = Field(default_factory=TelemetryConfig)
    planner: PlannerConfig = Field(default_factory=PlannerConfig)
    features: FeatureConfig = Field(default_factory=FeatureConfig)
    auth: AuthConfig = Field(default_factory=AuthConfig)
    map: MapConfig = Field(default_factory=MapConfig)

    # Plugin configuration (new format - recommended)
    plugins: Dict[str, Dict[str, Any]] = Field(
        default_factory=dict,
        description="Plugin-specific configuration. Each plugin validates its own config.",
    )

    # Legacy plugin configuration (deprecated - kept for backward compatibility)
    simulator: Optional[SimulatorConfig] = Field(
        default=None, description="DEPRECATED: Use plugins.simulator instead"
    )
    slurm: Optional[SlurmConfig] = Field(
        default=None, description="DEPRECATED: Use plugins.slurm instead"
    )
