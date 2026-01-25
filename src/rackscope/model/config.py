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

    @field_validator("job_regex")
    @classmethod
    def validate_job_regex(cls, value: str) -> str:
        try:
            re.compile(value)
        except re.error as exc:
            raise ValueError(f"Invalid job_regex: {exc}") from exc
        return value


class PlannerConfig(BaseModel):
    unknown_state: Literal["OK", "WARN", "CRIT", "UNKNOWN"] = "UNKNOWN"
    cache_ttl_seconds: int = Field(default=30, ge=1)
    max_ids_per_query: int = Field(default=50, ge=1)


class AppConfig(BaseModel):
    paths: PathsConfig
    refresh: RefreshConfig = Field(default_factory=RefreshConfig)
    cache: CacheConfig = Field(default_factory=CacheConfig)
    telemetry: TelemetryConfig = Field(default_factory=TelemetryConfig)
    planner: PlannerConfig = Field(default_factory=PlannerConfig)
