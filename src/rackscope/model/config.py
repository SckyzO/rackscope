from __future__ import annotations

from typing import Optional, Literal
import re

from pydantic import BaseModel, Field, field_validator


class PathsConfig(BaseModel):
    topology: str = Field(min_length=1)
    templates: str = Field(min_length=1)
    checks: str = Field(min_length=1)


class RefreshConfig(BaseModel):
    room_state_seconds: int = Field(default=30, ge=10)
    rack_state_seconds: int = Field(default=30, ge=10)


class CacheConfig(BaseModel):
    ttl_seconds: int = Field(default=30, ge=1)


class TelemetryConfig(BaseModel):
    prometheus_url: Optional[str] = None
    identity_label: str = "instance"
    rack_label: str = "rack_id"
    chassis_label: str = "chassis_id"
    job_regex: str = ".*"
    prometheus_heartbeat_seconds: int = Field(default=30, ge=10)
    prometheus_latency_window: int = Field(default=20, ge=1)
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
        if value is None:
            return value
        user = info.data.get("basic_auth_user")
        if not user:
            raise ValueError("basic_auth_user is required when basic_auth_password is set")
        return value

    @field_validator("tls_key_file")
    @classmethod
    def validate_tls_key_file(cls, value: Optional[str], info) -> Optional[str]:
        if value is None:
            return value
        cert = info.data.get("tls_cert_file")
        if not cert:
            raise ValueError("tls_cert_file is required when tls_key_file is set")
        return value


class PlannerConfig(BaseModel):
    unknown_state: Literal["OK", "WARN", "CRIT", "UNKNOWN"] = "UNKNOWN"
    cache_ttl_seconds: int = Field(default=30, ge=1)
    max_ids_per_query: int = Field(default=50, ge=1)


class FeatureConfig(BaseModel):
    notifications: bool = False
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


class SimulatorConfig(BaseModel):
    update_interval_seconds: int = Field(default=20, ge=1)
    seed: Optional[int] = None
    scenario: Optional[str] = None
    scale_factor: float = Field(default=1.0, ge=0.1)
    incident_rates: IncidentRates = Field(default_factory=IncidentRates)
    incident_durations: IncidentDurations = Field(default_factory=IncidentDurations)
    overrides_path: str = Field(default="config/simulator_overrides.yaml", min_length=1)


class AppConfig(BaseModel):
    paths: PathsConfig
    refresh: RefreshConfig = Field(default_factory=RefreshConfig)
    cache: CacheConfig = Field(default_factory=CacheConfig)
    telemetry: TelemetryConfig = Field(default_factory=TelemetryConfig)
    planner: PlannerConfig = Field(default_factory=PlannerConfig)
    features: FeatureConfig = Field(default_factory=FeatureConfig)
    simulator: SimulatorConfig = Field(default_factory=SimulatorConfig)
