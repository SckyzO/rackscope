# REFACTORING ROADMAP

**Status**: PLANNED
**Branch**: `refactoring/code-quality-improvements`
**Start Date**: 2025-01-31
**Target Completion**: 4-6 weeks

---

## 🎯 Objectives

1. **Improve Code Maintainability**: Break down monolithic files into manageable modules
2. **Enhance Testability**: Achieve 70%+ test coverage with better test isolation
3. **Strengthen Type Safety**: Comprehensive validation and consistent error handling
4. **Optimize Performance**: Reduce cognitive load and improve runtime efficiency
5. **Update Documentation**: Keep all docs in sync with code changes

---

## 🚨 Ground Rules

### Safe Refactoring Process

1. **Branch Isolation**: All work happens in `refactoring/code-quality-improvements` branch
2. **Incremental Changes**: Each phase is a separate commit with clear message
3. **Validation Gates**: After each phase:
   - ✅ Run `make lint` (must pass)
   - ✅ Run `make test` (must pass)
   - ✅ Check `make logs` for errors
   - ✅ Manual smoke test via UI
4. **Documentation First**: Update/create docs BEFORE merging each phase
5. **Rollback Ready**: Each commit must be revertable without breaking the app

### Merge Criteria

Before merging to `main`:
- ✅ All tests pass
- ✅ All linters pass
- ✅ No regressions in existing functionality
- ✅ Documentation updated
- ✅ Code review approved
- ✅ Performance benchmarks stable or improved

---

## 📊 Phase Overview

| Phase | Focus | Duration | Risk | Priority |
|-------|-------|----------|------|----------|
| 0 | Setup & Tooling | 2 days | LOW | CRITICAL |
| 1 | Backend Router Split | 3-4 days | MEDIUM | CRITICAL |
| 2 | Dependency Injection | 2-3 days | MEDIUM | HIGH |
| 3 | Service Layer Extraction | 3-4 days | LOW | HIGH |
| 4 | Logging & Error Handling | 2-3 days | LOW | MEDIUM |
| 5 | Test Coverage Expansion | 4-5 days | LOW | HIGH |
| 6 | Frontend Component Split | 3-4 days | LOW | MEDIUM |
| 7 | Type Safety & Validation | 2-3 days | LOW | MEDIUM |
| 8 | Performance Optimizations | 2-3 days | LOW | LOW |
| 9 | Documentation & Cleanup | 2 days | LOW | CRITICAL |

**Total Estimated Time**: 25-34 days (5-7 weeks with buffer)

---

## 📋 Detailed Phases

### Phase 0: Setup & Tooling ⚙️

**Goal**: Prepare the environment and add quality tools.

**Duration**: 2 days

#### Tasks

- [x] Create `refactoring/code-quality-improvements` branch
- [ ] Add test coverage tool
  - [ ] Install `pytest-cov` in backend
  - [ ] Add `make coverage` command
  - [ ] Set baseline coverage report
- [ ] Add type checking
  - [ ] Install `mypy` in backend
  - [ ] Create `mypy.ini` configuration
  - [ ] Add `make typecheck` command
- [ ] Add complexity analysis
  - [ ] Install `radon` for complexity metrics
  - [ ] Add `make complexity` command
  - [ ] Set complexity thresholds
- [ ] Update Makefile with new commands
- [ ] Document new tools in CLAUDE.md

#### Validation

```bash
make coverage    # Generate coverage report
make typecheck   # Run mypy
make complexity  # Check code complexity
make lint        # All existing linters pass
```

#### Documentation

- [ ] Update CLAUDE.md: Add "Code Quality Tools" section
- [ ] Create TESTING.md: Testing guidelines and coverage goals

---

### Phase 1: Backend Router Split 🔀

**Goal**: Split `app.py` (2014 lines) into domain-specific routers.

**Duration**: 3-4 days

**Risk**: MEDIUM (many endpoints to move, risk of breaking imports)

#### Current Structure

```
src/rackscope/api/
├── __init__.py
└── app.py (2014 lines, 42 endpoints, 78 functions)
```

#### Target Structure

```
src/rackscope/api/
├── __init__.py
├── app.py              # App setup + lifespan (< 150 lines)
├── dependencies.py     # Shared dependencies (< 100 lines)
├── models.py          # Request/Response Pydantic models (< 200 lines)
├── routers/
│   ├── __init__.py
│   ├── topology.py    # Sites, rooms, aisles, racks endpoints
│   ├── catalog.py     # Templates endpoints
│   ├── checks.py      # Checks library endpoints
│   ├── telemetry.py   # Stats, health, alerts endpoints
│   ├── slurm.py       # Slurm-specific endpoints
│   ├── simulator.py   # Simulator control endpoints
│   └── config.py      # App config & env endpoints
└── utils.py           # Shared helper functions
```

#### Tasks

**Step 1.1: Extract Models (Day 1)**
- [ ] Create `api/models.py`
- [ ] Move all Pydantic request/response models
- [ ] Update imports in `app.py`
- [ ] Run `make lint && make test`

**Step 1.2: Create Router Infrastructure (Day 1)**
- [ ] Create `api/routers/` directory
- [ ] Create `api/routers/__init__.py`
- [ ] Create empty router files
- [ ] Set up APIRouter instances in each file

**Step 1.3: Extract Config Router (Day 1)**
- [ ] Move config endpoints to `routers/config.py`
  - `GET /api/config`
  - `PUT /api/config`
  - `GET /api/env`
- [ ] Register router in `app.py`
- [ ] Run `make lint && make test`
- [ ] Test via UI Settings page

**Step 1.4: Extract Simulator Router (Day 2)**
- [ ] Move simulator endpoints to `routers/simulator.py`
  - `GET /api/simulator/scenarios`
  - `GET /api/simulator/overrides`
  - `POST /api/simulator/overrides`
  - `DELETE /api/simulator/overrides`
  - `DELETE /api/simulator/overrides/{id}`
- [ ] Move helper functions: `_overrides_path()`, `_load_overrides()`, `_save_overrides()`
- [ ] Register router in `app.py`
- [ ] Run `make lint && make test`
- [ ] Test via UI Simulator controls

**Step 1.5: Extract Catalog Router (Day 2)**
- [ ] Move catalog endpoints to `routers/catalog.py`
  - `GET /api/catalog`
  - `POST /api/catalog/templates`
  - `PUT /api/catalog/templates`
  - `POST /api/catalog/templates/validate`
- [ ] Move helper: `_find_device_template_path()`
- [ ] Register router in `app.py`
- [ ] Run `make lint && make test`
- [ ] Test via UI Template Editor

**Step 1.6: Extract Checks Router (Day 2)**
- [ ] Move checks endpoints to `routers/checks.py`
  - `GET /api/checks`
  - `GET /api/checks/files`
  - `GET /api/checks/files/{name}`
  - `PUT /api/checks/files/{name}`
- [ ] Register router in `app.py`
- [ ] Run `make lint && make test`
- [ ] Test via UI Checks Library Editor

**Step 1.7: Extract Topology Router (Day 3)**
- [ ] Move topology endpoints to `routers/topology.py`
  - All `POST/PUT/DELETE /api/topology/*` endpoints
- [ ] Move helpers: `_safe_segment()`, `_find_rack_location()`, `_find_aisle_path()`, `_find_rack_path()`
- [ ] Register router in `app.py`
- [ ] Run `make lint && make test`
- [ ] Test via UI Topology Editor & Rack Editor

**Step 1.8: Extract Telemetry Router (Day 3)**
- [ ] Move telemetry endpoints to `routers/telemetry.py`
  - `GET /api/sites`
  - `GET /api/rooms`
  - `GET /api/rooms/{room_id}/layout`
  - `GET /api/rooms/{room_id}/state`
  - `GET /api/racks/{rack_id}`
  - `GET /api/racks/{rack_id}/state`
  - `GET /api/racks/{rack_id}/devices/{device_id}`
  - `GET /api/stats/global`
  - `GET /api/stats/prometheus`
  - `GET /api/stats/telemetry`
  - `GET /api/alerts/active`
- [ ] Move helpers: `_collect_check_targets()`, `_extract_device_instances()`, `_build_node_context()`
- [ ] Register router in `app.py`
- [ ] Run `make lint && make test`
- [ ] Test via UI Room/Rack views

**Step 1.9: Extract Slurm Router (Day 4)**
- [ ] Move Slurm endpoints to `routers/slurm.py`
  - `GET /api/slurm/rooms/{room_id}/nodes`
  - `GET /api/slurm/summary`
  - `GET /api/slurm/partitions`
  - `GET /api/slurm/nodes`
- [ ] Move helpers: `_normalize_slurm_status()`, `_slurm_severity()`, `_load_slurm_mapping()`, `_fetch_slurm_results()`, `_build_slurm_states()`, `_collect_room_nodes()`
- [ ] Register router in `app.py`
- [ ] Run `make lint && make test`
- [ ] Test via UI Slurm Dashboards

**Step 1.10: Final Cleanup (Day 4)**
- [ ] Move remaining helpers to `api/utils.py`
- [ ] Verify `app.py` is < 200 lines
- [ ] Run full test suite
- [ ] Run complexity analysis: `make complexity`
- [ ] Generate coverage report: `make coverage`

#### Validation

```bash
# After each step:
make lint
make test
make logs  # Check for errors

# Final validation:
make coverage   # Should maintain or improve coverage
make complexity # All routers should have low complexity
docker compose restart backend
# Test all UI pages manually
```

#### Documentation

- [ ] Create `docs/BACKEND_ARCHITECTURE.md`: Explain router structure
- [ ] Update `CLAUDE.md`: Add "API Router Structure" section
- [ ] Update `docs/API_REFERENCE.md`: Add router organization context

#### Rollback Plan

If issues arise:
```bash
git revert <commit-hash>  # Revert specific step
make up && make test      # Verify system works
```

---

### Phase 2: Dependency Injection 💉

**Goal**: Replace global state access with FastAPI dependencies.

**Duration**: 2-3 days

**Risk**: MEDIUM (changes core data access pattern)

#### Current Problem

```python
# Current: Direct global access
@app.get("/api/sites")
def get_sites():
    return TOPOLOGY.sites if TOPOLOGY else []
```

#### Target Solution

```python
# Target: Dependency injection
from typing import Annotated
from fastapi import Depends

@router.get("/sites")
async def get_sites(
    topology: Annotated[Topology, Depends(get_topology)]
):
    return topology.sites
```

#### Tasks

**Step 2.1: Create Dependencies Module (Day 1)**
- [ ] Create `api/dependencies.py`
- [ ] Implement dependency functions:
  ```python
  async def get_topology() -> Topology
  async def get_catalog() -> Catalog
  async def get_checks_library() -> ChecksLibrary
  async def get_app_config() -> AppConfig
  async def get_planner() -> TelemetryPlanner
  ```
- [ ] Add proper error handling (HTTPException 503 if not loaded)
- [ ] Run `make lint && make typecheck`

**Step 2.2: Migrate Telemetry Router (Day 1)**
- [ ] Update all endpoints in `routers/telemetry.py` to use dependencies
- [ ] Remove direct global access
- [ ] Run `make lint && make test`
- [ ] Test Room/Rack state endpoints

**Step 2.3: Migrate Topology Router (Day 2)**
- [ ] Update all endpoints in `routers/topology.py` to use dependencies
- [ ] Run `make lint && make test`
- [ ] Test Topology Editor

**Step 2.4: Migrate Catalog Router (Day 2)**
- [ ] Update all endpoints in `routers/catalog.py` to use dependencies
- [ ] Run `make lint && make test`
- [ ] Test Template Editor

**Step 2.5: Migrate Remaining Routers (Day 2-3)**
- [ ] Update `routers/checks.py`
- [ ] Update `routers/slurm.py`
- [ ] Update `routers/config.py`
- [ ] Update `routers/simulator.py`
- [ ] Run full test suite
- [ ] Run `make coverage`

**Step 2.6: Add Dependency Tests (Day 3)**
- [ ] Create `tests/test_dependencies.py`
- [ ] Test each dependency with mocked global state
- [ ] Test error cases (503 when not loaded)
- [ ] Run `make test`

#### Validation

```bash
make lint
make typecheck
make test
make coverage  # Should improve testability
```

#### Documentation

- [ ] Update `docs/BACKEND_ARCHITECTURE.md`: Explain dependency injection pattern
- [ ] Update `CLAUDE.md`: Add "Dependency Injection" section
- [ ] Add code examples in docs

---

### Phase 3: Service Layer Extraction 🏗️

**Goal**: Extract business logic into reusable services.

**Duration**: 3-4 days

**Risk**: LOW (pure refactoring, no behavior change)

#### Target Structure

```
src/rackscope/
├── api/
│   └── routers/
├── services/              # NEW
│   ├── __init__.py
│   ├── topology_service.py     # Topology queries and mutations
│   ├── slurm_service.py        # Slurm data processing
│   ├── telemetry_service.py    # Health snapshot management
│   └── instance_service.py     # Instance expansion and mapping
└── utils/
    ├── __init__.py
    ├── validation.py           # Input validation helpers
    ├── aggregation.py          # State aggregation logic
    └── path_utils.py           # File path utilities
```

#### Tasks

**Step 3.1: Create Topology Service (Day 1)**
- [ ] Create `services/topology_service.py`
- [ ] Extract functions:
  - `find_rack_by_id(topology, rack_id)`
  - `find_room_by_id(topology, room_id)`
  - `find_rack_location(topology, rack_id)`
  - `get_rack_path(config, rack_id)`
  - `get_aisle_path(config, room_id, aisle_id)`
- [ ] Add unit tests in `tests/test_topology_service.py`
- [ ] Update routers to use service
- [ ] Run `make lint && make test`

**Step 3.2: Create Slurm Service (Day 1-2)**
- [ ] Create `services/slurm_service.py`
- [ ] Extract functions:
  - `normalize_slurm_status(raw_status)`
  - `calculate_slurm_severity(status, has_star, status_map)`
  - `load_slurm_mapping(mapping_path)`
  - `fetch_slurm_results(client, config)`
  - `build_slurm_states(config, allowed_nodes)`
  - `collect_room_nodes(room)`
- [ ] Add unit tests in `tests/test_slurm_service.py`
- [ ] Update `routers/slurm.py` to use service
- [ ] Run `make lint && make test`

**Step 3.3: Create Telemetry Service (Day 2)**
- [ ] Create `services/telemetry_service.py`
- [ ] Extract functions:
  - `get_health_snapshot(topology, checks, catalog, planner)`
  - `collect_check_targets(topology, catalog, checks)`
  - `extract_device_instances(device)`
  - `build_node_context(topology)`
- [ ] Add unit tests in `tests/test_telemetry_service.py`
- [ ] Update `routers/telemetry.py` to use service
- [ ] Run `make lint && make test`

**Step 3.4: Create Instance Service (Day 3)**
- [ ] Create `services/instance_service.py`
- [ ] Extract functions:
  - `expand_device_instances(device)` (consolidate duplicate implementations)
  - `expand_nodes_pattern(pattern)` (from planner)
- [ ] Add unit tests in `tests/test_instance_service.py`
- [ ] Update all references to use service
- [ ] Run `make lint && make test`

**Step 3.5: Create Validation Utils (Day 3)**
- [ ] Create `utils/validation.py`
- [ ] Extract `safe_segment(value, fallback)`
- [ ] Add more validation helpers as needed
- [ ] Add unit tests
- [ ] Update routers to use utils

**Step 3.6: Create Aggregation Utils (Day 4)**
- [ ] Create `utils/aggregation.py`
- [ ] Extract:
  - `aggregate_states(states)`
  - `severity_rank(severity)`
- [ ] Add unit tests
- [ ] Update routers to use utils

**Step 3.7: Create Path Utils (Day 4)**
- [ ] Create `utils/path_utils.py`
- [ ] Extract path resolution logic
- [ ] Add unit tests
- [ ] Update routers to use utils

#### Validation

```bash
make lint
make typecheck
make test
make coverage  # Target: 60%+
make complexity # All services should be low complexity
```

#### Documentation

- [ ] Create `docs/SERVICES.md`: Explain service layer architecture
- [ ] Update `CLAUDE.md`: Add "Service Layer" section
- [ ] Add docstrings to all service functions

---

### Phase 4: Logging & Error Handling 📝

**Goal**: Replace `print()` with structured logging and add global error handlers.

**Duration**: 2-3 days

**Risk**: LOW (additive changes)

#### Tasks

**Step 4.1: Setup Logging Infrastructure (Day 1)**
- [ ] Create `src/rackscope/logging_config.py`
- [ ] Configure Python logging with JSON formatter
- [ ] Add log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- [ ] Add environment variable: `RACKSCOPE_LOG_LEVEL`
- [ ] Initialize logging in `app.py` lifespan

**Step 4.2: Replace Print Statements (Day 1-2)**
- [ ] Replace all `print()` with `logger.info()`, `logger.error()`, etc.
- [ ] Add contextual information to logs (rack_id, room_id, etc.)
- [ ] Ensure no sensitive data in logs (passwords, tokens)
- [ ] Run `make lint`

**Step 4.3: Add Global Exception Handlers (Day 2)**
- [ ] Create `api/exceptions.py`
- [ ] Add exception handler for `ValidationError`
- [ ] Add exception handler for `HTTPException`
- [ ] Add exception handler for generic `Exception`
- [ ] Add structured error responses
- [ ] Register handlers in `app.py`

**Step 4.4: Add Request Logging Middleware (Day 3)**
- [ ] Create middleware to log all requests
- [ ] Log: method, path, status, duration
- [ ] Add request ID for tracing
- [ ] Test with `make logs`

**Step 4.5: Update Tests (Day 3)**
- [ ] Update tests to verify log output
- [ ] Test exception handlers
- [ ] Run `make test`

#### Validation

```bash
make lint
make test
make logs  # Verify structured logs appear
# Check log output is JSON formatted
docker compose logs backend | grep "INFO\|ERROR"
```

#### Documentation

- [ ] Create `docs/LOGGING.md`: Logging guidelines
- [ ] Update `CLAUDE.md`: Add "Logging Standards" section

---

### Phase 5: Test Coverage Expansion 🧪

**Goal**: Achieve 70%+ test coverage with comprehensive test suite.

**Duration**: 4-5 days

**Risk**: LOW (only adding tests)

#### Current Coverage Baseline

```bash
make coverage
# Establish baseline before starting
```

#### Tasks

**Step 5.1: Test Routers (Day 1-2)**
- [ ] Create `tests/api/test_topology_router.py`
- [ ] Create `tests/api/test_catalog_router.py`
- [ ] Create `tests/api/test_checks_router.py`
- [ ] Create `tests/api/test_telemetry_router.py`
- [ ] Create `tests/api/test_slurm_router.py`
- [ ] Create `tests/api/test_simulator_router.py`
- [ ] Create `tests/api/test_config_router.py`
- [ ] Test all endpoints: happy path + error cases
- [ ] Use FastAPI TestClient with dependency overrides
- [ ] Run `make test && make coverage`

**Step 5.2: Test Services (Day 2-3)**
- [ ] Create `tests/services/test_topology_service.py`
- [ ] Create `tests/services/test_slurm_service.py`
- [ ] Create `tests/services/test_telemetry_service.py`
- [ ] Create `tests/services/test_instance_service.py`
- [ ] Test business logic in isolation
- [ ] Use mocks for external dependencies
- [ ] Run `make test && make coverage`

**Step 5.3: Test Utils (Day 3)**
- [ ] Create `tests/utils/test_validation.py`
- [ ] Create `tests/utils/test_aggregation.py`
- [ ] Create `tests/utils/test_path_utils.py`
- [ ] Test edge cases and error conditions
- [ ] Run `make test && make coverage`

**Step 5.4: Test Models (Day 4)**
- [ ] Create `tests/model/test_domain.py` (expand existing)
- [ ] Create `tests/model/test_catalog.py`
- [ ] Create `tests/model/test_checks.py`
- [ ] Create `tests/model/test_config.py`
- [ ] Test Pydantic validation rules
- [ ] Test field validators and model validators
- [ ] Run `make test && make coverage`

**Step 5.5: Integration Tests (Day 4-5)**
- [ ] Create `tests/integration/test_workflow.py`
- [ ] Test complete workflows:
  - Create site → room → aisle → rack → device
  - Create template → assign to device
  - Create check → assign to template → verify health
  - Slurm integration end-to-end
- [ ] Run `make test && make coverage`

**Step 5.6: Coverage Report & Analysis (Day 5)**
- [ ] Generate HTML coverage report
- [ ] Identify uncovered code paths
- [ ] Add tests for critical uncovered areas
- [ ] Target: 70%+ overall coverage
- [ ] Document coverage exceptions (if any)

#### Validation

```bash
make test        # All tests must pass
make coverage    # Target: 70%+
# Generate HTML report
docker compose exec backend pytest --cov=rackscope --cov-report=html
# View report: open htmlcov/index.html
```

#### Documentation

- [ ] Update `TESTING.md`: Add testing guidelines
- [ ] Document test structure and conventions
- [ ] Add examples of writing tests with dependency injection

---

### Phase 6: Frontend Component Split ⚛️

**Goal**: Break down large components into manageable sub-components.

**Duration**: 3-4 days

**Risk**: LOW (pure UI refactoring)

#### Target Files

1. **SettingsPage.tsx** (2461 lines) → Split into 6 components
2. **RackVisualizer.tsx** (1028 lines) → Split into 4 components
3. **App.tsx** (926 lines) → Simplify routing

#### Tasks

**Step 6.1: Refactor SettingsPage (Day 1-2)**

Target structure:
```
pages/SettingsPage/
├── index.tsx                 # Main container (< 200 lines)
├── GeneralSettings.tsx       # Site name, branding
├── PrometheusSettings.tsx    # Prometheus config
├── TelemetrySettings.tsx     # Identity, labels, refresh
├── SlurmSettings.tsx         # Slurm configuration
├── SimulatorSettings.tsx     # Simulator controls
├── FeatureToggles.tsx        # Feature flags
└── types.ts                  # Shared types
```

- [ ] Create new directory structure
- [ ] Extract each settings section into component
- [ ] Maintain all functionality
- [ ] Test settings save/load
- [ ] Run `npm run lint` inside container
- [ ] Manual UI testing

**Step 6.2: Refactor RackVisualizer (Day 2-3)**

Target structure:
```
components/RackVisualizer/
├── index.tsx                # Main container (< 200 lines)
├── RackFrontView.tsx        # Front rack rendering
├── RackRearView.tsx         # Rear rack rendering
├── DeviceCell.tsx           # Single device/cell
├── ChassisGrid.tsx          # Chassis matrix grid
├── InfrastructurePanel.tsx  # PDU, HMC display
└── types.ts                 # Shared types
```

- [ ] Create new directory structure
- [ ] Extract rendering logic into sub-components
- [ ] Use React.memo for performance
- [ ] Test rack visualization
- [ ] Run `npm run lint`
- [ ] Manual UI testing

**Step 6.3: Simplify App.tsx (Day 3)**
- [ ] Extract route definitions to separate file
- [ ] Extract layout logic
- [ ] Reduce to < 400 lines
- [ ] Run `npm run lint`
- [ ] Test all routes

**Step 6.4: Add Component Tests (Day 4)**
- [ ] Add tests for SettingsPage components
- [ ] Add tests for RackVisualizer components
- [ ] Use React Testing Library
- [ ] Run tests inside container

#### Validation

```bash
# Run linters inside containers
docker compose exec frontend npm run lint
docker compose exec frontend npm run lint:css
docker compose exec frontend npm run lint:format

# Manual testing
# - Visit all pages
# - Test Settings save/load
# - Test Rack visualization (front/rear)
# - Test responsive layout
```

#### Documentation

- [ ] Update `docs/FRONTEND_ARCHITECTURE.md` (create if missing)
- [ ] Document component structure
- [ ] Add component usage examples

---

### Phase 7: Type Safety & Validation 🔒

**Goal**: Strengthen type checking and validation.

**Duration**: 2-3 days

**Risk**: LOW (mostly additive)

#### Tasks

**Step 7.1: Enable Strict TypeScript (Day 1)**
- [ ] Update `frontend/tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noImplicitAny": true,
      "strictNullChecks": true,
      "strictFunctionTypes": true
    }
  }
  ```
- [ ] Fix type errors incrementally
- [ ] Run `npm run build` inside container

**Step 7.2: Generate Types from Backend (Day 1-2)**
- [ ] Install `openapi-typescript-codegen` or similar
- [ ] Generate TypeScript types from FastAPI OpenAPI schema
- [ ] Replace manual type definitions in `types.ts`
- [ ] Update all imports
- [ ] Run `npm run lint`

**Step 7.3: Add Backend Type Checking (Day 2)**
- [ ] Configure mypy for strict mode
- [ ] Fix type errors in codebase
- [ ] Add type hints to all function signatures
- [ ] Run `make typecheck`

**Step 7.4: Improve Pydantic Validation (Day 3)**
- [ ] Review all Pydantic models
- [ ] Add missing validators
- [ ] Add field constraints (min_length, pattern, etc.)
- [ ] Add model validators for complex rules
- [ ] Test validation with invalid inputs

#### Validation

```bash
make typecheck  # Backend type checking
docker compose exec frontend npm run build  # Frontend type checking
make test       # All validation tests pass
```

#### Documentation

- [ ] Update `CLAUDE.md`: Add "Type Safety" section
- [ ] Document type generation workflow

---

### Phase 8: Performance Optimizations ⚡

**Goal**: Optimize runtime performance and reduce complexity.

**Duration**: 2-3 days

**Risk**: LOW (optional improvements)

#### Tasks

**Step 8.1: Add Caching Layer (Day 1)**
- [ ] Add in-memory index for rack lookups: `Dict[str, Rack]`
- [ ] Build index on topology load
- [ ] Replace linear searches with dict lookups
- [ ] Measure performance improvement

**Step 8.2: Optimize Frontend Rendering (Day 1-2)**
- [ ] Add React.memo to expensive components
- [ ] Add useMemo for expensive calculations
- [ ] Add useCallback for event handlers
- [ ] Test with React DevTools Profiler

**Step 8.3: Optimize Prometheus Queries (Day 2)**
- [ ] Review planner batch size
- [ ] Optimize PromQL expressions
- [ ] Add query result caching at service level
- [ ] Measure query latency improvement

**Step 8.4: Add Performance Monitoring (Day 3)**
- [ ] Add timing logs for critical operations
- [ ] Add Prometheus query stats to telemetry
- [ ] Create performance dashboard (optional)

#### Validation

```bash
make logs       # Check performance logs
# Measure before/after:
# - Room state load time
# - Rack state load time
# - Topology editor responsiveness
```

#### Documentation

- [ ] Document performance optimizations in `docs/PERFORMANCE.md`
- [ ] Add performance best practices to `CLAUDE.md`

---

### Phase 9: Documentation & Cleanup 📚

**Goal**: Finalize all documentation and clean up technical debt.

**Duration**: 2 days

**Risk**: LOW

#### Tasks

**Step 9.1: Update All Documentation (Day 1)**
- [ ] Review and update `CLAUDE.md`
- [ ] Review and update `docs/ARCHITECTURE.md`
- [ ] Review and update `docs/API_REFERENCE.md`
- [ ] Review and update `docs/ADMIN_GUIDE.md`
- [ ] Create missing documentation
- [ ] Ensure consistency across all docs

**Step 9.2: Code Cleanup (Day 1)**
- [ ] Remove commented code
- [ ] Remove unused imports
- [ ] Remove dead code paths
- [ ] Ensure consistent code style
- [ ] Run `make lint`

**Step 9.3: Add Code Comments (Day 2)**
- [ ] Add docstrings to all public functions
- [ ] Add module-level docstrings
- [ ] Add inline comments for complex logic
- [ ] Generate API documentation

**Step 9.4: Final Review (Day 2)**
- [ ] Review all changes since branch creation
- [ ] Run full test suite: `make test`
- [ ] Run all linters: `make lint && make typecheck`
- [ ] Generate final coverage report: `make coverage`
- [ ] Test all UI pages manually
- [ ] Compare performance with baseline

**Step 9.5: Create Migration Guide (Day 2)**
- [ ] Document breaking changes (if any)
- [ ] Document new patterns and best practices
- [ ] Create upgrade checklist

#### Validation

```bash
# Final validation checklist
make lint        ✅
make typecheck   ✅
make test        ✅
make coverage    ✅ (Target: 70%+)
make complexity  ✅ (All modules low complexity)
make logs        ✅ (No errors)

# Manual UI testing
# ✅ Test all pages
# ✅ Test all editors
# ✅ Test all dashboards
# ✅ Test Slurm views
# ✅ Test Settings
```

#### Documentation

- [ ] Create `REFACTORING_SUMMARY.md`: Summary of all changes
- [ ] Update `CHANGELOG.md` with refactoring notes
- [ ] Update `CONTRIBUTING.md` with new patterns

---

## 🎓 New Tools & Commands

### Additional Linters

Add to `pyproject.toml`:
```toml
[project.optional-dependencies]
dev = [
  "pytest>=8.4",
  "pytest-cov>=4.1.0",      # NEW: Coverage
  "pytest-asyncio>=0.23.0",  # NEW: Async tests
  "mypy>=1.8.0",            # NEW: Type checking
  "radon>=6.0.1",           # NEW: Complexity analysis
  "ruff>=0.14.14",
]
```

### New Makefile Targets

Add to `Makefile`:
```makefile
# Code Quality Tools
coverage:
	docker compose exec backend pytest --cov=rackscope --cov-report=term --cov-report=html
	@echo "Coverage report: htmlcov/index.html"

typecheck:
	docker compose exec backend mypy src/rackscope

complexity:
	docker compose exec backend radon cc src/rackscope -a -nc

quality: lint typecheck complexity coverage
	@echo "All quality checks complete!"

# Development helpers
shell-backend:
	docker compose exec backend bash

shell-frontend:
	docker compose exec frontend sh

watch-logs:
	docker compose logs -f backend frontend
```

### mypy Configuration

Create `mypy.ini`:
```ini
[mypy]
python_version = 3.12
warn_return_any = True
warn_unused_configs = True
disallow_untyped_defs = True
disallow_incomplete_defs = True
check_untyped_defs = True
no_implicit_optional = True
warn_redundant_casts = True
warn_unused_ignores = True
warn_no_return = True
strict_equality = True

[mypy-httpx.*]
ignore_missing_imports = True

[mypy-yaml.*]
ignore_missing_imports = True
```

---

## 📊 Success Metrics

### Code Quality Metrics

| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| Test Coverage | ~30% | 70%+ | TBD |
| app.py Lines | 2014 | < 200 | TBD |
| Avg Module Lines | ~400 | < 300 | TBD |
| Cyclomatic Complexity | ~15 | < 10 | TBD |
| Type Coverage | 0% | 90%+ | TBD |
| Linter Warnings | TBD | 0 | TBD |

### Performance Metrics

| Metric | Before | Target | Actual |
|--------|--------|--------|--------|
| Room State Load | TBD | -20% | TBD |
| Rack State Load | TBD | -20% | TBD |
| Bundle Size (Frontend) | TBD | < 500KB | TBD |
| Build Time | TBD | < 30s | TBD |

---

## 🚀 Getting Started

### 1. Create Branch

```bash
git checkout -b refactoring/code-quality-improvements
```

### 2. Start Phase 0

```bash
# Install new tools
docker compose exec backend pip install pytest-cov mypy radon
docker compose exec backend pip freeze > requirements.txt

# Update Makefile
# (manual edit)

# Test new commands
make coverage
make typecheck
make complexity
```

### 3. Commit Phase 0

```bash
git add .
git commit -m "refactor(tooling): add coverage, mypy, radon tools

- Add pytest-cov for test coverage
- Add mypy for type checking
- Add radon for complexity analysis
- Update Makefile with new commands
- Update CLAUDE.md with tooling section

Phase: 0 - Setup & Tooling
Status: Complete
Validated: ✅ make coverage, make typecheck, make complexity"
```

---

## 📋 Commit Message Format

Use conventional commits for all refactoring work:

```
<type>(<scope>): <subject>

<body>

Phase: <phase-number> - <phase-name>
Status: <In Progress|Complete>
Validated: <validation-commands>
```

**Types**: `refactor`, `test`, `docs`, `perf`, `style`

**Example**:
```
refactor(api): split app.py into domain routers

- Extract topology endpoints to routers/topology.py
- Extract catalog endpoints to routers/catalog.py
- Move models to api/models.py
- Update imports

Phase: 1 - Backend Router Split
Status: In Progress (Step 1.3 complete)
Validated: ✅ make lint, make test
```

---

## 🔄 Rollback Procedures

If a phase introduces regressions:

```bash
# Option 1: Revert last commit
git revert HEAD
make up && make test

# Option 2: Reset to specific commit
git reset --hard <commit-hash>
make up && make test

# Option 3: Cherry-pick good commits to new branch
git checkout -b refactoring/recovery
git cherry-pick <good-commit-1> <good-commit-2>
make up && make test
```

---

## 📞 Help & Support

If you encounter issues during refactoring:

1. Check logs: `make logs`
2. Run validation: `make lint && make test`
3. Review this roadmap
4. Check `CLAUDE.md` for patterns
5. Ask for help in PR comments

---

## ✅ Final Checklist Before Merge

- [ ] All phases complete
- [ ] All tests pass: `make test`
- [ ] All linters pass: `make lint && make typecheck`
- [ ] Coverage ≥ 70%: `make coverage`
- [ ] Complexity low: `make complexity`
- [ ] No console errors: `make logs`
- [ ] All documentation updated
- [ ] Manual testing complete
- [ ] Performance stable or improved
- [ ] Code review approved
- [ ] Migration guide created

---

**End of Refactoring Roadmap**
