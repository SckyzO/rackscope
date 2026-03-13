---
id: data-model
title: Data Model
sidebar_position: 2
---

# Data Model

## Physical Hierarchy

```
Site
└── Room
    └── Aisle
        └── Rack
            └── Device
                └── Instance (Prometheus node)
```

Every level has a health state that aggregates from below it. The worst state wins: CRIT > WARN > UNKNOWN > OK.

## Core Models

### Site

```python
class Site(BaseModel):
    id: str
    name: str
    location: Optional[Location]  # lat/lon for world map
    timezone: Optional[str]       # IANA timezone (e.g., "Europe/Paris")
    rooms: List[str]              # room IDs
```

### Room

```python
class Room(BaseModel):
    id: str
    name: str
    site_id: str
    layout: Optional[RoomLayout]  # grid, compass, door position
    aisles: List[str]
    standalone_racks: List[str]
```

### Rack

```python
class Rack(BaseModel):
    id: str
    name: str
    u_height: int
    template_id: Optional[str]    # rack template for infrastructure
    devices: List[Device]
```

### Device

```python
class Device(BaseModel):
    id: str
    name: str
    template_id: str
    u_position: int
    instance: Union[str, List[str], Dict[int, str]]  # Prometheus node(s)
    role: Optional[str]                              # compute, visu, login, io, storage
```

> **`instance` vs `nodes`**: Use `instance` in all new configurations. `nodes` is a deprecated alias kept for backward compatibility. Both are accepted but `nodes` will be removed in a future version.

### Instance Expansion

Instances are expanded at load time:
- `"compute[001-004]"` → `["compute001", "compute002", "compute003", "compute004"]`
- `["node01", "node02"]` → `["node01", "node02"]`
- `{1: "compute001", 2: "compute002"}` → slot mapping

### DeviceTemplate

```python
class DeviceTemplate(BaseModel):
    id: str
    name: str
    type: DeviceType              # server, switch, storage, pdu
    role: Optional[str]           # compute, visu, login, io, storage
    u_height: int
    layout: Optional[DeviceLayout]
    rear_layout: Optional[DeviceLayout]
    checks: List[str]             # check IDs from the checks library
    metrics: List[str]            # metric IDs from the metrics library
```

## Health States

```python
class HealthState(str, Enum):
    OK = "OK"
    WARN = "WARN"
    CRIT = "CRIT"
    UNKNOWN = "UNKNOWN"
```

Aggregation rules:
- CRIT overrides all
- WARN overrides UNKNOWN and OK
- UNKNOWN overrides OK
- OK only if all checks pass

## Metrics Library

```python
class MetricDefinition(BaseModel):
    id: str
    name: str
    description: str
    expr: str                     # PromQL template with {instance} placeholder
    display: MetricDisplay        # unit, chart_type, color, thresholds
    category: str
    tags: List[str]
```
