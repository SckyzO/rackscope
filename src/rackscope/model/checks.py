from __future__ import annotations

from typing import List, Optional, Literal, Union

from pydantic import BaseModel, Field


class CheckRule(BaseModel):
    op: Literal["==", "!=", ">", ">=", "<", "<="]
    value: Union[int, float, str]
    severity: Literal["OK", "WARN", "CRIT", "UNKNOWN"]


class CheckDefinition(BaseModel):
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
        description="Label name to expand into virtual nodes (e.g., 'slot' for per-drive checks)"
    )


class ChecksLibrary(BaseModel):
    checks: List[CheckDefinition] = Field(default_factory=list)
