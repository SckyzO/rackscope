# Phase 1: Backend Router Split

**Status:** ✅ Completed
**Date:** January 2026
**Commits:** 9 total
**Lines Changed:** -1723 lines (app.py: 2014 → 291 lines, 85% reduction)

## Overview

Phase 1 restructured the FastAPI backend by extracting 42 endpoints from the monolithic `app.py` file into 7 specialized router modules. This transformation improved code organization, maintainability, and separation of concerns while maintaining 100% backward compatibility.

## Objectives

1. Extract domain-specific endpoints into dedicated router modules
2. Reduce complexity of the main application file
3. Improve code discoverability and maintainability
4. Maintain all existing functionality and test compatibility

## Implementation Details

### File Structure Changes

**Before Phase 1:**
```
src/rackscope/api/
├── __init__.py
├── app.py (2014 lines - monolithic)
└── routers/ (empty)
```

**After Phase 1:**
```
src/rackscope/api/
├── __init__.py
├── app.py (291 lines - orchestration only)
└── routers/
    ├── __init__.py
    ├── catalog.py (4 endpoints)
    ├── checks.py (4 endpoints)
    ├── config.py (3 endpoints)
    ├── simulator.py (5 endpoints)
    ├── slurm.py (5 endpoints)
    ├── telemetry.py (5 endpoints)
    └── topology.py (16 endpoints)
```

### Extracted Routers

#### 1. Config Router (`config.py`)
- **Endpoints:** 3
- **Routes:**
  - `GET /api/config` - Get application configuration
  - `POST /api/config` - Update application configuration
  - `DELETE /api/config` - Reset to default configuration
- **Responsibilities:** Application configuration management

#### 2. Simulator Router (`simulator.py`)
- **Endpoints:** 5
- **Routes:**
  - `POST /api/simulator/snapshot` - Create telemetry snapshot
  - `GET /api/simulator/overrides` - Get metric overrides
  - `POST /api/simulator/overrides` - Set metric overrides
  - `DELETE /api/simulator/overrides` - Clear metric overrides
  - `POST /api/simulator/overrides/bulk` - Bulk update overrides
- **Responsibilities:** Telemetry simulation and metric overrides

#### 3. Catalog Router (`catalog.py`)
- **Endpoints:** 4
- **Routes:**
  - `GET /api/catalog/templates` - List all templates
  - `GET /api/catalog/templates/{path:path}` - Get specific template
  - `POST /api/catalog/templates` - Create/update template
  - `DELETE /api/catalog/templates` - Delete template
- **Responsibilities:** Device and rack template management

#### 4. Checks Router (`checks.py`)
- **Endpoints:** 4
- **Routes:**
  - `GET /api/checks` - Get checks library
  - `GET /api/checks/files` - List checks files
  - `GET /api/checks/files/{name}` - Read specific checks file
  - `PUT /api/checks/files/{name}` - Write checks file with validation
- **Responsibilities:** Health checks library management

#### 5. Topology Router (`topology.py`)
- **Endpoints:** 16
- **Routes:**
  - `GET /api/sites` - List all sites
  - `GET /api/sites/{site_id}/rooms` - Get rooms in a site
  - `GET /api/rooms/{room_id}` - Get room details
  - `POST /api/rooms/{room_id}` - Update room
  - `DELETE /api/rooms/{room_id}` - Delete room
  - `GET /api/rooms/{room_id}/aisles` - List aisles in room
  - `GET /api/rooms/{room_id}/aisles/{aisle_id}` - Get aisle details
  - `POST /api/rooms/{room_id}/aisles` - Create/update aisle
  - `DELETE /api/rooms/{room_id}/aisles/{aisle_id}` - Delete aisle
  - `GET /api/racks` - List all racks
  - `GET /api/racks/{rack_id}` - Get rack details
  - `POST /api/racks/{rack_id}` - Update rack
  - `DELETE /api/racks/{rack_id}` - Delete rack
  - `GET /api/racks/{rack_id}/devices` - List devices in rack
  - `POST /api/racks/{rack_id}/devices` - Create/update device
  - `DELETE /api/racks/{rack_id}/devices/{device_id}` - Delete device
- **Responsibilities:** Datacenter topology CRUD operations

#### 6. Telemetry Router (`telemetry.py`)
- **Endpoints:** 5
- **Routes:**
  - `GET /api/stats/global` - Global system statistics
  - `GET /api/stats/prometheus` - Prometheus client statistics
  - `GET /api/stats/telemetry` - Telemetry statistics
  - `GET /api/rooms/{room_id}/state` - Room health state
  - `GET /api/racks/{rack_id}/state` - Rack health state and metrics
- **Responsibilities:** Telemetry data and health states

#### 7. Slurm Router (`slurm.py`)
- **Endpoints:** 5
- **Routes:**
  - `GET /api/slurm/rooms/{room_id}/nodes` - Slurm node states for room
  - `GET /api/slurm/summary` - Slurm status summary
  - `GET /api/slurm/partitions` - Slurm partition statistics
  - `GET /api/slurm/nodes` - Detailed Slurm node list
  - Additional helper functions for Slurm data processing
- **Responsibilities:** Slurm workload manager integration

### Remaining in app.py

After extraction, `app.py` retained only:
- Global state variables (TOPOLOGY, CATALOG, CHECKS_LIBRARY, APP_CONFIG, PLANNER)
- Application lifecycle management (`lifespan` context manager)
- Configuration loading logic (`apply_config`, `_collect_check_targets`)
- Core endpoints:
  - `GET /healthz` - Health check
  - `GET /api/alerts/active` - Active alerts aggregation
- Router registration

### Helper Functions Migration

Many helper functions were co-located with their router modules:

**Topology Router Helpers:**
- `_find_rack_location()` - Locate rack in topology hierarchy
- `_find_aisle_path()` - Resolve aisle path
- `_find_rack_path()` - Resolve rack path
- `_get_device_height()` - Calculate device height
- `_get_rack_height()` - Calculate rack height

**Slurm Router Helpers:**
- `_normalize_slurm_status()` - Normalize Slurm status strings
- `_slurm_severity()` - Map status to severity
- `_expand_device_instances()` - Expand device instance patterns
- `_collect_room_nodes()` - Collect all nodes in room
- `_build_node_context()` - Build node context mapping
- `_load_slurm_mapping()` - Load Slurm name mappings
- `_fetch_slurm_results()` - Fetch metrics from Prometheus
- `_build_slurm_states()` - Build Slurm state map

**Simulator Router Helpers:**
- `_overrides_path()` - Get overrides file path
- `_load_overrides()` - Load metric overrides from disk

## Code Examples

### Router Creation Pattern

Each router follows this structure:

```python
"""
<Domain> Router

Endpoints for <domain-specific functionality>.
"""

from fastapi import APIRouter, HTTPException
from typing import <types>
from rackscope.model.<domain> import <models>

router = APIRouter(prefix="/api/<domain>", tags=["<domain>"])


@router.get("/<path>")
def endpoint_name(<params>):
    """Endpoint description."""
    from rackscope.api import app as app_module

    # Access global state via lazy import
    state = app_module.GLOBAL_STATE

    # Business logic
    return result
```

### Router Registration

In `app.py`:

```python
from rackscope.api.routers import (
    config,
    simulator,
    catalog,
    checks,
    topology,
    telemetry,
    slurm,
)

app = FastAPI(title="rackscope", version="0.0.0", lifespan=lifespan)

# Register routers
app.include_router(config.router)
app.include_router(simulator.router)
app.include_router(catalog.router)
app.include_router(checks.router)
app.include_router(topology.router)
app.include_router(telemetry.router)
app.include_router(slurm.router)
```

## Validation Results

### Tests
- ✅ All 10 tests passing
- ✅ No test modifications required
- ✅ 100% backward compatibility maintained

### Linting
- ✅ Zero ruff errors
- ✅ Zero ruff warnings
- ✅ All type hints preserved

### Code Metrics
- **app.py reduction:** 85% (2014 → 291 lines)
- **Average router size:** ~200 lines
- **Total endpoints:** 42 (plus 2 in app.py)
- **Cyclomatic complexity:** Significantly reduced in app.py

## Benefits Achieved

### 1. Improved Code Organization
- Clear separation of concerns by domain
- Easier to locate endpoint implementations
- Related functionality grouped together

### 2. Enhanced Maintainability
- Smaller, focused files are easier to understand
- Changes to one domain don't affect others
- Reduced merge conflicts for team development

### 3. Better Scalability
- New endpoints can be added to appropriate routers
- New domains can get dedicated routers
- Router-level middleware can be added easily

### 4. Simplified Testing
- Router modules can be tested in isolation
- Mock dependencies at router level
- Clearer test organization by domain

### 5. Developer Experience
- Faster navigation in IDE
- Clearer file purpose and boundaries
- Reduced cognitive load when reading code

## Challenges and Solutions

### Challenge 1: Circular Imports
**Problem:** Routers needed access to global state in `app.py`, but `app.py` imports routers.

**Solution:** Used lazy imports in router endpoints:
```python
def endpoint():
    from rackscope.api import app as app_module
    state = app_module.GLOBAL_STATE
```

### Challenge 2: Helper Function Placement
**Problem:** Some helper functions were used by multiple endpoints.

**Solution:** Co-located helpers with their primary consumer router. If shared across routers, duplicated or moved to appropriate model/utility module.

### Challenge 3: State Mutation Consistency
**Problem:** Mutations (POST/PUT/DELETE) needed to reload global state.

**Solution:** Kept reload pattern in each mutation endpoint:
```python
@router.post("/path")
def mutate_data():
    # Write changes
    # Reload global state
    app_module.STATE = load_state(path)
```

## Migration Process

The migration followed this systematic approach:

1. **Identify domain boundaries** - Group endpoints by logical domain
2. **Create router file** - Set up new router with prefix and tags
3. **Extract endpoints** - Move endpoint functions with docstrings
4. **Extract helpers** - Move related helper functions
5. **Update imports** - Add necessary imports to router
6. **Add lazy imports** - For global state access
7. **Register router** - Add to app.py router registration
8. **Validate** - Run tests and linting
9. **Commit** - One commit per router for clear history

## Commit History

1. **config router** - Extracted configuration management endpoints
2. **simulator router** - Extracted simulation and override endpoints
3. **catalog router** - Extracted template management endpoints
4. **checks router** - Extracted checks library endpoints
5. **topology router (part 1)** - Extracted site and room endpoints
6. **topology router (part 2)** - Extracted rack and device endpoints
7. **telemetry router** - Extracted stats and health state endpoints
8. **slurm router** - Extracted Slurm integration endpoints
9. **final cleanup** - Updated imports and removed dead code

## Next Steps

Phase 1 successfully decomposed the monolithic `app.py`. The next phase (Phase 2) will address the remaining anti-pattern:

- **Dependency Injection:** Replace lazy imports with FastAPI dependency injection
- **Benefits:** Better testability, clearer dependencies, type safety
- **Pattern:** Use `Depends()` for global state access

## Conclusion

Phase 1 achieved its goals of improving code organization while maintaining full backward compatibility. The codebase is now:
- ✅ More maintainable
- ✅ Easier to navigate
- ✅ Better organized by domain
- ✅ Ready for dependency injection (Phase 2)

The 85% reduction in `app.py` size and clear domain separation make the codebase significantly more approachable for new developers and easier to maintain for the team.
