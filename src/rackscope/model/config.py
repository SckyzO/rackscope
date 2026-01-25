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


class AppConfig(BaseModel):
    paths: PathsConfig
    refresh: RefreshConfig = Field(default_factory=RefreshConfig)
    cache: CacheConfig = Field(default_factory=CacheConfig)
    telemetry: TelemetryConfig = Field(default_factory=TelemetryConfig)
