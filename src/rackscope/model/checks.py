from __future__ import annotations

import re
from typing import List, Optional, Literal, Union

from pydantic import BaseModel, Field, ConfigDict, field_validator


class CheckRule(BaseModel):
    op: Literal["==", "!=", ">", ">=", "<", "<="]
    value: Union[int, float, str]
    severity: Literal["OK", "WARN", "CRIT", "UNKNOWN"]


class CheckDefinition(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    scope: Literal["node", "chassis", "rack"]
    expr: str
    output: Literal["bool", "numeric"] = "bool"
    selectors: List[str] = Field(default_factory=list)
    rules: List[CheckRule] = Field(default_factory=list)
    kind: Optional[str] = None
    # For storage arrays: expand into virtual nodes per label value (e.g., slot, drive_id)
    expand_by_label: Optional[str] = Field(
        default=None,
        description="Label name to expand into virtual nodes (e.g., 'slot' for per-drive checks)",
    )
    expand_discovery_expr: Optional[str] = Field(
        default=None,
        description=(
            "Optional PromQL expression to discover all label values (uses $instances). "
            "Slots found here but absent from the main query get expand_absent_state."
        ),
    )
    expand_absent_state: Optional[str] = Field(
        default=None,
        description=(
            "State assigned to virtual nodes discovered but absent from the main query. "
            "Defaults to planner unknown_state. Set to 'OK' when absence means healthy."
        ),
    )
    expand_crit_threshold: Optional[int] = Field(
        default=None,
        description=(
            "When set, a parent instance is CRIT only if this many or more virtual nodes "
            "are CRIT; fewer CRIT virtual nodes result in WARN instead."
        ),
    )
    for_duration: Optional[str] = Field(
        alias="for",
        default=None,
        description="Prometheus duration before alert fires (e.g. '5m'). null = immediate.",
    )

    @field_validator("for_duration")
    @classmethod
    def _validate_for_duration(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r"^\d+[smhdwy]$", v):
            raise ValueError(f"Invalid duration '{v}'. Use Prometheus format: 30s, 1m, 5m, 1h")
        return v


class ChecksLibrary(BaseModel):
    checks: List[CheckDefinition] = Field(default_factory=list)
