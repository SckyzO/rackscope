from __future__ import annotations
from typing import List, Optional, Literal
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
    checks: List[str] = Field(default_factory=list)


class DeviceTemplate(BaseModel):
    id: str
    name: str
    type: str = "server"
    role: Optional[str] = None
    u_height: int
    layout: LayoutConfig
    rear_layout: Optional[LayoutConfig] = None
    rear_components: List[DeviceRearComponent] = Field(default_factory=list)
    checks: List[str] = Field(default_factory=list)


# --- Rack Infrastructure Templates ---


class InfrastructureComponent(BaseModel):
    id: str
    name: str
    type: Literal["power", "cooling", "management", "network", "other"]
    model: Optional[str] = None
    role: Optional[str] = None  # primary, backup, etc.

    # Positioning
    location: Literal["u-mount", "side-left", "side-right", "top", "bottom"] = "u-mount"
    u_position: Optional[int] = None
    u_height: Optional[int] = None


class RackInfrastructure(BaseModel):
    components: List[InfrastructureComponent] = Field(default_factory=list)
    front_components: List[InfrastructureComponent] = Field(default_factory=list)
    rear_components: List[InfrastructureComponent] = Field(default_factory=list)
    side_components: List[InfrastructureComponent] = Field(default_factory=list)
    rack_components: List["RackComponentRef"] = Field(default_factory=list)


class RackComponentTemplate(BaseModel):
    id: str
    name: str
    type: str = "other"
    model: Optional[str] = None
    role: Optional[str] = None
    location: Literal["side", "u-mount", "front", "rear"] = "u-mount"
    u_height: int
    checks: List[str] = Field(default_factory=list)
    metrics: List[str] = Field(default_factory=list)


class RackComponentRef(BaseModel):
    template_id: str
    u_position: int = 1
    u_height: Optional[int] = None
    side: Optional[Literal["left", "right"]] = None


class RackTemplate(BaseModel):
    id: str
    name: str
    u_height: int = 42
    infrastructure: RackInfrastructure = Field(default_factory=RackInfrastructure)
    checks: List[str] = Field(default_factory=list)


class Catalog(BaseModel):
    device_templates: List[DeviceTemplate] = Field(default_factory=list)
    rack_templates: List[RackTemplate] = Field(default_factory=list)
    rack_component_templates: List[RackComponentTemplate] = Field(default_factory=list)

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

    def get_rack_component_template(self, template_id: str) -> Optional[RackComponentTemplate]:
        for t in self.rack_component_templates:
            if t.id == template_id:
                return t
        return None
