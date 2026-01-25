from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class PathsConfig(BaseModel):
    topology: str
    templates: str
    checks: str


class RefreshConfig(BaseModel):
    room_state_seconds: int = 60
    rack_state_seconds: int = 60


class CacheConfig(BaseModel):
    ttl_seconds: int = 60


class TelemetryConfig(BaseModel):
    prometheus_url: Optional[str] = None
    identity_label: str = "instance"
    rack_label: str = "rack_id"
    chassis_label: str = "chassis_id"
    job_regex: str = ".*"


class PlannerConfig(BaseModel):
    unknown_state: str = "UNKNOWN"
    cache_ttl_seconds: int = 60
    max_ids_per_query: int = 50


class AppConfig(BaseModel):
    paths: PathsConfig
    refresh: RefreshConfig = Field(default_factory=RefreshConfig)
    cache: CacheConfig = Field(default_factory=CacheConfig)
    telemetry: TelemetryConfig = Field(default_factory=TelemetryConfig)
    planner: PlannerConfig = Field(default_factory=PlannerConfig)
