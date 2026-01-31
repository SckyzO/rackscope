# Baseline Metrics (Before Refactoring)

**Date**: 2025-01-31
**Branch**: refactoring/code-quality-improvements
**Commit**: Phase 0 Complete

---

## Code Structure

| File | Lines | Functions | Classes |
|------|-------|-----------|---------|
| src/rackscope/api/app.py | 2014 | 78 | 0 |
| src/rackscope/telemetry/planner.py | 457 | ~20 | 2 |
| src/rackscope/model/loader.py | 297 | ~15 | 0 |
| src/rackscope/telemetry/prometheus.py | 259 | ~10 | 1 |

---

## Test Coverage

```
Name                                    Stmts   Miss  Cover
-----------------------------------------------------------
src/rackscope/api/app.py                 1280   1097    14%
src/rackscope/model/catalog.py             79     12    85%
src/rackscope/model/checks.py              18      0   100%
src/rackscope/model/config.py             123     17    86%
src/rackscope/model/domain.py              89      7    92%
src/rackscope/model/loader.py             180    106    41%
src/rackscope/telemetry/planner.py        330    268    19%
src/rackscope/telemetry/prometheus.py     160    121    24%
-----------------------------------------------------------
TOTAL                                    2265   1633    28%
```

**Target**: 70%+

---

## Type Checking (mypy)

**Errors**: 30 errors in 3 files

Most common issues:
- `union-attr`: Item "None" has no attribute (9 occurrences)
- `var-annotated`: Need type annotation (3 occurrences)
- `arg-type`: Incompatible type arguments (7 occurrences)
- `assignment`: Incompatible types in assignment (2 occurrences)
- `no-redef`: Name already defined (3 occurrences)

---

## Complexity Analysis (radon)

### High Complexity Functions (C and D grade)

**Grade D (Very High Complexity)**:
- `src/rackscope/api/app.py`
  - `update_room_aisles`
  - `write_checks_file`
  - `add_simulator_override`
  - `create_room_aisles`
  - `_collect_check_targets`
- `src/rackscope/telemetry/planner.py`
  - `TelemetryPlanner.get_snapshot`
- `src/rackscope/model/loader.py`
  - `load_segmented_topology`

**Grade C (High Complexity)**:
- `src/rackscope/api/app.py`
  - `add_rack_device`
  - `update_rack_device`
  - `get_device_details`
  - `get_slurm_room_nodes`
  - `get_room_state`
  - `get_active_alerts`
  - `_extract_device_instances`
  - `get_global_stats`
  - `_expand_device_instances`
  - `replace_rack_devices`
  - `create_room`
  - `_build_slurm_states`
  - `get_slurm_partitions`
- `src/rackscope/telemetry/planner.py`
  - `_extract_nodes`
  - `_build_queries`
- `src/rackscope/telemetry/prometheus.py`
  - `PrometheusClient.get_pdu_metrics`
- `src/rackscope/model/loader.py`
  - `_load_checks_file`
  - `load_catalog`

**Target**: All modules should have average complexity < 10

---

## Test Suite

**Total Tests**: 10
- `tests/test_api.py`: 5 tests
- `tests/test_model.py`: 4 tests
- `tests/test_planner.py`: 1 test

**Status**: All passing ✅

---

## Frontend Metrics

### Large Components (>= 900 lines)

| File | Lines |
|------|-------|
| frontend/src/pages/SettingsPage.tsx | 2461 |
| frontend/src/components/RackVisualizer.tsx | 1028 |
| frontend/src/App.tsx | 926 |
| frontend/src/pages/TemplatesEditorPage.tsx | 908 |
| frontend/src/pages/TopologyEditorPage.tsx | 878 |

**Target**: All components < 400 lines

---

## Linter Status

### Backend (Ruff)
- Status: **Passing** ✅
- No warnings or errors

### Frontend (ESLint + Stylelint + Prettier)
- Status: **Unknown** (not tested in Phase 0)

---

## Next Steps

See `REFACTORING_ROADMAP.md` for detailed plan:

1. **Phase 1**: Split app.py into routers (target: < 200 lines)
2. **Phase 2**: Implement dependency injection
3. **Phase 3**: Extract service layer
4. **Phase 4**: Add structured logging
5. **Phase 5**: Expand test coverage to 70%+
6. **Phase 6**: Split large frontend components
7. **Phase 7**: Fix type errors (target: 0 errors)
8. **Phase 8**: Optimize performance
9. **Phase 9**: Documentation and cleanup

---

**End of Baseline Metrics**
