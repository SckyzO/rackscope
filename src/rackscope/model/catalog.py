from __future__ import annotations
from typing import List, Optional, Literal, Union
from pydantic import BaseModel, Field

# --- Device Templates ---

class LayoutConfig(BaseModel):
    type: Literal["grid", "vertical"] = "grid"
    rows: int = 1
    cols: int = 1
    matrix: List[List[int]]

class DeviceRearComponent(BaseModel):
    id: str
    name: str
    type: Literal["psu", "fan", "io", "hydraulics", "other"]
    role: Optional[str] = None


class DeviceTemplate(BaseModel):
    id: str
    name: str
    type: str = "server"
    u_height: int
    layout: LayoutConfig
    rear_layout: Optional[LayoutConfig] = None
    rear_components: List[DeviceRearComponent] = Field(default_factory=list)

# --- Rack Infrastructure Templates ---

class InfrastructureComponent(BaseModel):
    id: str
    name: str
    type: Literal["power", "cooling", "management", "network", "other"]
    model: Optional[str] = None
    role: Optional[str] = None # primary, backup, etc.
    
    # Positioning
    location: Literal["u-mount", "side-left", "side-right", "top", "bottom"] = "u-mount"
    u_position: Optional[int] = None
    u_height: Optional[int] = None

class RackInfrastructure(BaseModel):
    components: List[InfrastructureComponent] = Field(default_factory=list)
    front_components: List[InfrastructureComponent] = Field(default_factory=list)
    rear_components: List[InfrastructureComponent] = Field(default_factory=list)
    side_components: List[InfrastructureComponent] = Field(default_factory=list)

class RackTemplate(BaseModel):
    id: str
    name: str
    u_height: int = 42
    infrastructure: RackInfrastructure = Field(default_factory=RackInfrastructure)

class Catalog(BaseModel):
    device_templates: List[DeviceTemplate] = Field(default_factory=list)
    rack_templates: List[RackTemplate] = Field(default_factory=list)
    
    def get_device_template(self, template_id: str) -> Optional[DeviceTemplate]:
        for t in self.device_templates:
            if t.id == template_id:
                return t
        return None

    def get_rack_template(self, template_id: str) -> Optional[RackTemplate]:
        for t in self.rack_templates:
            if t.id == template_id:
                return t
        return None
