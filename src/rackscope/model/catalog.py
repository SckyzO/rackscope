from __future__ import annotations
from typing import List, Optional, Literal, Union
from pydantic import BaseModel, Field

class LayoutConfig(BaseModel):
    type: Literal["grid", "vertical"] = "grid"
    rows: int = 1
    cols: int = 1
    # Matrix represents visual rows from top to bottom
    # Each inner list is a row, containing slot numbers
    matrix: List[List[int]]

class DeviceTemplate(BaseModel):
    id: str
    name: str
    u_height: int
    layout: LayoutConfig

class Catalog(BaseModel):
    templates: List[DeviceTemplate] = Field(default_factory=list)
    
    def get_template(self, template_id: str) -> Optional[DeviceTemplate]:
        for t in self.templates:
            if t.id == template_id:
                return t
        return None
