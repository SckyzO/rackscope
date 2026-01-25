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


class ChecksLibrary(BaseModel):
    checks: List[CheckDefinition] = Field(default_factory=list)
