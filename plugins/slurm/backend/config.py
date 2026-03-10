"""
Slurm Plugin Configuration
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class SlurmStatusMap(BaseModel):
    """Slurm status to severity mapping."""

    ok: List[str] = Field(
        default_factory=lambda: ["idle", "allocated", "alloc", "completing", "comp"],
        description="Statuses mapped to OK severity",
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
        ],
        description="Statuses mapped to WARN severity",
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
        ],
        description="Statuses mapped to CRIT severity",
    )
    info: List[str] = Field(
        default_factory=list, description="Statuses mapped to INFO severity (custom level)"
    )


class SeverityColors(BaseModel):
    """Colors for severity levels (hex format)."""

    ok: str = Field(default="#22c55e", description="Color for OK severity (green)")
    warn: str = Field(default="#f59e0b", description="Color for WARN severity (orange)")
    crit: str = Field(default="#ef4444", description="Color for CRIT severity (red)")
    info: str = Field(default="#3b82f6", description="Color for INFO severity (blue)")


class SlurmPluginConfig(BaseModel):
    """Configuration for Slurm Plugin."""

    enabled: bool = Field(default=True, description="Enable Slurm plugin")
    metric: str = Field(
        default="slurm_node_status",
        min_length=1,
        description="Prometheus metric name for Slurm node status",
    )
    label_node: str = Field(
        default="node", min_length=1, description="Label name for node identifier"
    )
    label_status: str = Field(
        default="status", min_length=1, description="Label name for node status"
    )
    label_partition: str = Field(
        default="partition", min_length=1, description="Label name for partition"
    )
    status_map: SlurmStatusMap = Field(
        default_factory=SlurmStatusMap, description="Mapping of Slurm statuses to severity levels"
    )
    severity_colors: SeverityColors = Field(
        default_factory=SeverityColors, description="Colors for severity levels"
    )
    roles: List[str] = Field(
        default_factory=lambda: ["compute", "visu"],
        description="Device roles to include in Slurm monitoring",
    )
    include_unlabeled: bool = Field(default=False, description="Include devices without role label")
    mapping_path: Optional[str] = Field(
        default="config/plugins/slurm/node_mapping.yaml",
        description=(
            "Path to Slurm node → instance mapping file (relative to /app or absolute). "
            "For profiles: set this to the full path, e.g. "
            "'config/examples/hpc-cluster/plugins/slurm/node_mapping.yaml'."
        ),
    )
    # Metrics catalog — list of YAML files in config/plugins/slurm/metrics/
    # Each file defines metric queries shown in dashboards and tooltips.
    # The plugin auto-discovers all .yaml files in the metrics_catalog_dir.
    metrics_catalog_dir: str = Field(
        default="config/plugins/slurm/metrics",
        description="Directory containing Slurm metric catalog YAML files",
    )
    metrics_catalogs: List[str] = Field(
        default_factory=lambda: ["metrics.yaml"],
        description="List of catalog file names to load (relative to metrics_catalog_dir)",
    )
