from __future__ import annotations

from typing import Optional, Literal, List, Dict, Any
import ipaddress
import re
from urllib.parse import urlparse

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
    service_ttl_seconds: int = Field(default=5, ge=1)  # TTL for service-level response cache


class TelemetryConfig(BaseModel):
    prometheus_url: Optional[str] = None
    prometheus_timeout_seconds: float = Field(
        default=5.0,
        gt=0,
        le=60,
        description="Timeout in seconds for Prometheus HTTP requests (connect + read).",
    )
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

    @field_validator("prometheus_url")
    @classmethod
    def validate_prometheus_url(cls, value: Optional[str]) -> Optional[str]:
        """Validate prometheus_url against SSRF risks.

        Checks (per Context7 / OWASP SSRF prevention):
        1. Scheme must be http or https — block file://, dict://, etc.
        2. No embedded credentials — use basic_auth_user/password fields.
        3. Block cloud metadata DNS names (GCP, Alibaba).
        4. Block link-local IP range 169.254.0.0/16 (AWS/Azure IMDS, not just .254).
        5. Block 0.0.0.0 / :: (invalid bind addresses).

        Private ranges (10.x, 192.168.x, 172.16.x) are intentionally NOT blocked
        because Prometheus is typically on a private network in datacenter deployments.
        """
        if not value:
            return value
        parsed = urlparse(value)

        # 1. Scheme check
        if parsed.scheme not in ("http", "https"):
            raise ValueError(
                f"prometheus_url must use http or https scheme, got: {parsed.scheme!r}"
            )

        # 2. No embedded credentials
        if parsed.username or parsed.password:
            raise ValueError(
                "prometheus_url must not embed credentials. "
                "Use basic_auth_user and basic_auth_password fields instead."
            )

        host = (parsed.hostname or "").lower()

        # 3. Block known cloud metadata DNS names
        _BLOCKED_METADATA_HOSTS = {
            "metadata.google.internal",  # GCP metadata
            "100.100.100.200",           # Alibaba Cloud IMDS
        }
        if host in _BLOCKED_METADATA_HOSTS:
            raise ValueError(
                f"prometheus_url targets a cloud metadata address: {host!r}"
            )

        # 4 & 5. Block dangerous IP addresses (link-local range + unspecified)
        try:
            addr = ipaddress.ip_address(host)
            if addr.is_link_local:
                # Covers full 169.254.0.0/16 (IPv4) and fe80::/10 (IPv6)
                raise ValueError(
                    f"prometheus_url targets a link-local address {host!r} "
                    "(cloud instance metadata range — SSRF risk)"
                )
            if addr.is_unspecified:
                raise ValueError(
                    f"prometheus_url targets an unspecified address: {host!r}"
                )
        except ValueError as e:
            # Re-raise our own errors; suppress ipaddress parse errors (hostname not an IP)
            if any(kw in str(e) for kw in ("link-local", "cloud", "unspecified")):
                raise

        return value

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


class PlaylistConfig(BaseModel):
    """Configuration for NOC screen rotation (playlist mode)."""

    interval_seconds: int = Field(default=30, ge=5, description="Seconds per view")
    views: List[str] = Field(
        default_factory=lambda: [
            "/views/worldmap",
            "/slurm/overview",
        ],
        description="Ordered list of routes to cycle through",
    )


class FeatureConfig(BaseModel):
    notifications: bool = True
    notifications_max_visible: int = Field(default=10, ge=1)
    playlist: bool = False
    offline: bool = False
    wizard: bool = True  # Show setup wizard on first launch; set to false to disable permanently
    # Page visibility
    worldmap: bool = True
    show_logs: bool = True   # Backend log viewer — hide in kiosk/public deployments
    dev_tools: bool = False  # UI Library, showcase, dev pages (off in prod)


class SimulatorMetricsCatalog(BaseModel):
    id: str = Field(min_length=1)
    path: str = Field(min_length=1)
    enabled: bool = True


class SimulatorConfig(BaseModel):
    """Legacy simulator config (app.yaml simulator: key — kept for backward compat).

    New deployments should use config/plugins/simulator/config/plugin.yaml instead.
    The incident_mode / changes_per_hour fields are in the plugin config, not here.
    """

    update_interval_seconds: int = Field(default=20, ge=1)
    seed: Optional[int] = None
    overrides_path: str = Field(
        default="config/plugins/simulator/overrides/overrides.yaml", min_length=1
    )
    default_ttl_seconds: int = Field(default=120, ge=0)
    metrics_catalog_path: str = Field(
        default="config/plugins/simulator/metrics/metrics_full.yaml", min_length=1
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


class PasswordPolicyConfig(BaseModel):
    min_length: int = Field(default=6, ge=1, le=128)
    max_length: int = Field(default=128, ge=6, le=512)
    require_digit: bool = False
    require_symbol: bool = False


class AuthConfig(BaseModel):
    enabled: bool = False
    username: str = "admin"
    password_hash: str = ""  # bcrypt hash; empty = not yet configured
    secret_key: str = ""  # JWT signing key; auto-generated at startup if empty
    session_duration: Literal["8h", "24h", "unlimited"] = "24h"
    policy: PasswordPolicyConfig = Field(default_factory=PasswordPolicyConfig)
    trusted_networks: List[str] = Field(
        default_factory=list,
        description="CIDRs or exact IPs allowed to reach admin endpoints when "
        "auth.enabled=false. Empty list = no restriction (default, backward compatible).",
    )


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

    playlist: PlaylistConfig = Field(default_factory=PlaylistConfig)

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
