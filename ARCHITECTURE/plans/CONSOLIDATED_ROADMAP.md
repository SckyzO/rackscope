# Consolidated Development Roadmap

**Status**: Active
**Branch**: `refactoring/code-quality-improvements`
**Last Updated**: 2026-02-02
**Completion Target**: 5-6 weeks from Phase 6 start

---

## 📋 Executive Summary

This roadmap consolidates two streams of work:
1. **Backend refactoring** (Phases 1-5) - ✅ COMPLETED
2. **Plugin architecture + Frontend rebuild** (Phases 6-7) - 🎯 NEXT
3. **Optimization + Cleanup** (Phases 8-9) - 📅 PLANNED

The goal is to transform Rackscope from a monolithic application into a **plugin-based architecture** with a **modern, pixel-perfect frontend** while maintaining stability and avoiding breaking changes.

---

## 🎯 Strategic Objectives

### Completed (Phases 1-5)
✅ **Improve Code Maintainability**: Broke down monolithic files into manageable modules
✅ **Enhance Testability**: Achieved 66% test coverage (36% → 66%, 251 tests)
✅ **Strengthen Architecture**: Implemented DI, service layer, structured logging

### In Progress (Phases 6-7)
🎯 **Plugin Architecture**: Separate core from optional features (Slurm, Simulator)
🎯 **Modern Frontend**: Rebuild with React + Tailwind + shadcn for pixel-perfect design
🎯 **Extensibility**: Allow plugins to register menu sections, widgets, and features

### Planned (Phases 8-9)
📅 **Performance Optimization**: Caching, query optimization, rendering improvements
📅 **Production Readiness**: Final cleanup, documentation, and validation

---

## 📊 Phase Overview

| Phase | Focus | Duration | Risk | Status |
|-------|-------|----------|------|--------|
| 1 | Backend Router Split | 3-4 days | MEDIUM | ✅ COMPLETE |
| 2 | Dependency Injection | 2-3 days | MEDIUM | ✅ COMPLETE |
| 3 | Service Layer | 3-4 days | LOW | ✅ COMPLETE |
| 4 | Logging & Error Handling | 2-3 days | LOW | ✅ COMPLETE |
| 5 | Test Coverage (36% → 66%) | 4-5 days | LOW | ✅ COMPLETE |
| **6** | **Backend Plugin Architecture** | **1 week** | **HIGH** | **🎯 NEXT** |
| **7** | **Frontend Rebuild** | **3 weeks** | **HIGH** | **📅 PLANNED** |
| 8 | Performance Optimizations | 2-3 days | LOW | 📅 PLANNED |
| 9 | Documentation & Cleanup | 2 days | LOW | 📅 PLANNED |

**Total Remaining Time**: ~5 weeks

---

## ✅ Completed Phases (1-5)

### Phase 1: Backend Router Split ✅
- Split monolithic `app.py` (2014 lines) into domain routers
- Created `api/routers/` structure (topology, catalog, checks, telemetry, slurm, simulator, config)
- Reduced `app.py` to < 200 lines
- **Result**: Better code organization, easier navigation

### Phase 2: Dependency Injection ✅
- Replaced global state access with FastAPI dependencies
- Created `api/dependencies.py` with `get_topology()`, `get_catalog()`, etc.
- Improved testability with dependency overrides
- **Result**: Clean architecture, better separation of concerns

### Phase 3: Service Layer ✅
- Extracted business logic into reusable services
- Created `services/` directory (topology, telemetry, instance, slurm)
- Moved utility functions to `utils/`
- **Result**: Reusable logic, better test isolation

### Phase 4: Logging & Error Handling ✅
- Replaced `print()` with structured logging
- Added global exception handlers
- Implemented request logging middleware
- **Result**: Better observability, consistent error handling

### Phase 5: Test Coverage ✅
- Expanded test suite from 36% to 66% coverage
- Added router tests, service tests, model tests
- Created 251 total tests
- **Result**: Improved confidence, better regression detection

**Baseline Metrics After Phase 5**:
- Test Coverage: **66%** (target: 70%+)
- Total Tests: **251**
- app.py Lines: **< 200** (from 2014)
- All linters: **✅ PASSING**

---

## 🎯 Phase 6: Backend Plugin Architecture (NEXT)

**Goal**: Separate core functionality from optional plugins without breaking existing features.

**Duration**: 1 week (7 days)
**Risk**: HIGH (structural changes to core architecture)
**Priority**: CRITICAL (required before frontend rebuild)

### Why This Matters

**Current Problem**:
- Slurm code hardcoded in core (should be optional)
- Simulator hardcoded in core (dev-only, shouldn't be in prod)
- PDU/Switch metrics hardcoded in `prometheus.py` (should use templates)
- No way to add new integrations without modifying core

**Target Solution**:
- **Core**: Visualization, health checks, editors, settings (essential features)
- **Plugins**: Slurm (workload), Simulator (dev tool), future integrations (optional features)
- **Template-driven**: All metrics use `RackComponentTemplate` (no hardcoding)

### Detailed Plan

See **[PHASE_6_BACKEND_PLAN.md](../phases/PHASE_6_BACKEND_PLAN.md)** for complete implementation details.

#### Phase 6A: Fix Template System (Days 1-3)

**Problem**: `prometheus.py` has hardcoded PDU metrics (lines 225+)
```python
# ❌ Current: Hardcoded
queries = {
    "activepower_watt": f'raritan_pdu_activepower_watt{{rack_id="{rack_id}"}}',
    "current_amp": f'raritan_pdu_current_ampere{{rack_id="{rack_id}"}}',
}
```

**Solution**: Generic metrics collection based on templates
```python
# ✅ Target: Template-driven
async def collect_component_metrics(
    rack: Rack,
    component_ref: RackComponentRef,
    catalog: Catalog,
    prom_client: PrometheusClient
) -> Dict[str, float]:
    template = catalog.get_rack_component_template(component_ref.template_id)
    metrics = {}
    for metric_name in template.metrics:
        query = build_metric_query(metric_name, rack.id, component_ref)
        result = await prom_client.query(query)
        metrics[metric_name] = parse_prometheus_result(result)
    return metrics
```

**Tasks**:
- Day 1: Create `services/metrics_service.py` with generic collection
- Day 2: Remove hardcoded `get_pdu_metrics()` from prometheus.py
- Day 3: Update telemetry router to use new service, test thoroughly

**Validation**:
```bash
make test          # All tests must pass
make lint          # No regressions
# Manual: Verify PDU metrics still display in UI
```

#### Phase 6B: Plugin Foundation (Days 4-5)

**Goal**: Create plugin base class and registry system

**Files to Create**:
```
src/rackscope/plugins/
├── __init__.py
├── base.py          # RackscopePlugin base class
└── registry.py      # PluginRegistry for lifecycle management
```

**Plugin Base Class**:
```python
class RackscopePlugin(ABC):
    """Base class for all Rackscope plugins"""

    @property
    @abstractmethod
    def plugin_id(self) -> str:
        """Unique plugin identifier (e.g., 'workload-slurm')"""

    @property
    @abstractmethod
    def plugin_name(self) -> str:
        """Human-readable plugin name"""

    def register_routes(self, app: FastAPI) -> None:
        """Register plugin-specific API routes"""
        pass

    def register_menu_sections(self) -> List[MenuSection]:
        """Register plugin menu sections for frontend"""
        return []

    async def on_startup(self) -> None:
        """Called when plugin is loaded"""
        pass

    async def on_shutdown(self) -> None:
        """Called when plugin is unloaded"""
        pass
```

**Tasks**:
- Day 4: Create base.py with RackscopePlugin class
- Day 4: Create registry.py with plugin discovery and lifecycle
- Day 5: Add plugin API endpoints (`GET /api/plugins`, `GET /api/plugins/menu`)
- Day 5: Write tests for plugin system

**Validation**:
```bash
make test          # Plugin system tests pass
make lint          # No issues
# Manual: Call /api/plugins endpoint (should return empty list for now)
```

#### Phase 6C: Extract Simulator Plugin (Day 6)

**Goal**: Move simulator from core to plugin

**Current Location**: `tools/simulator/`, `api/routers/simulator.py`
**Target Location**: `src/rackscope/plugins/simulator/`

**New Structure**:
```
src/rackscope/plugins/simulator/
├── __init__.py
├── plugin.py           # SimulatorPlugin class
├── router.py           # Simulator API routes (moved from api/routers/)
└── service.py          # Simulator logic
```

**Tasks**:
- Move simulator router to plugin
- Create SimulatorPlugin class
- Register plugin in registry (disabled by default in prod)
- Update app.yaml to enable/disable simulator

**Validation**:
```bash
make test
# Manual: Enable simulator in config, verify UI controls work
# Manual: Disable simulator in config, verify endpoints return 404
```

#### Phase 6D: Extract Slurm Plugin (Day 7)

**Goal**: Move Slurm integration from core to plugin

**Current Location**: `api/routers/slurm.py`, `services/slurm_service.py`
**Target Location**: `src/rackscope/plugins/workload/slurm/`

**New Structure**:
```
src/rackscope/plugins/workload/slurm/
├── __init__.py
├── plugin.py           # SlurmPlugin class
├── router.py           # Slurm API routes (moved)
└── service.py          # Slurm logic (moved)
```

**Tasks**:
- Move Slurm router and service to plugin
- Create SlurmPlugin class with menu section registration
- Update app.yaml to enable/disable Slurm
- Test with Slurm enabled and disabled

**Validation**:
```bash
make test
# Manual: Enable Slurm, verify dashboards work
# Manual: Disable Slurm, verify menu section disappears
```

### Safety Strategy: "Don't Break Anything"

**Incremental Approach**:
1. Each day is a separate commit
2. After each commit: `make test && make lint`
3. Manual UI smoke test after each commit
4. Keep old code until new code is validated
5. Easy rollback if issues arise

**Checkpoints**:
- ✅ After Phase 6A: PDU metrics still work
- ✅ After Phase 6B: Plugin system ready, no breaking changes
- ✅ After Phase 6C: Simulator works as plugin, can be disabled
- ✅ After Phase 6D: Slurm works as plugin, menu dynamic

**Rollback Plan**:
```bash
git revert HEAD           # Revert last commit
make up && make test      # Verify system still works
```

---

## 🎯 Phase 7: Frontend Rebuild (PLANNED)

**Goal**: Rebuild frontend with modern stack and pixel-perfect design.

**Duration**: 3 weeks
**Risk**: HIGH (complete UI overhaul)
**Priority**: HIGH (user experience improvement)

### Why Rebuild?

**Current Problems**:
- Mixed design patterns (no consistent design system)
- Component duplication and complexity
- No plugin UI integration
- Hard to maintain and extend

**Target Solution**:
- **Tailwind CSS + shadcn/ui**: Industry-standard design system
- **Plugin-aware**: Dynamic menu, plugin-specific views
- **Editors in core**: Topology, templates, checks, settings
- **Pixel-perfect design**: Professional, polished UI

### Detailed Plan

See **[PHASE_7_FRONTEND_PLAN.md](../phases/PHASE_7_FRONTEND_PLAN.md)** for complete implementation details.

#### Week 1: Core Layout & Navigation

**Goals**:
- Setup Tailwind CSS + shadcn/ui
- Create app shell with sidebar and header
- Implement dynamic menu from plugins
- Core routing structure

**Deliverables**:
- AppShell component with responsive layout
- Sidebar with core + plugin sections
- Header with breadcrumbs and actions
- React Router setup

**Validation**:
- All pages accessible via navigation
- Plugin menu sections display correctly
- Responsive on mobile/tablet/desktop

#### Week 2: Core Views

**Goals**:
- Rebuild main visualization views
- Overview, Map, Room, Rack, Device pages
- Health state visualization

**Deliverables**:
- Overview page (site/room grid with health)
- Map page (world map with site markers)
- Room page (floor plan with rack layout)
- Rack page (front/rear views with devices)
- Device page (instance tabs with checks)

**Validation**:
- All views render correctly
- Health states display properly
- Navigation between views works
- Data fetching optimized

#### Week 3: Editors & Settings

**Goals**:
- Rebuild editor interfaces
- Topology, Template, Checks editors
- Settings UI

**Deliverables**:
- Topology Editor (site/room/rack management)
- Template Editor (device/rack templates)
- Checks Editor (health check library)
- Settings UI (app config, telemetry, plugins)

**Validation**:
- CRUD operations work for all entities
- Validation displays properly
- Save/cancel workflows correct
- Settings persist correctly

### Safety Strategy

**Progressive Migration**:
1. **Week 1**: New layout coexists with old pages
2. **Week 2**: Migrate views one by one, test each
3. **Week 3**: Migrate editors, remove old code

**Feature Flags**:
```typescript
// Enable new UI per-page during migration
const USE_NEW_RACK_VIEW = true;
const USE_NEW_TOPOLOGY_EDITOR = false;
```

**Validation Gates**:
- ✅ After each component: Visual regression test
- ✅ After each page: Full user flow test
- ✅ Before removing old code: Side-by-side comparison

---

## 📅 Phase 8: Performance Optimizations (PLANNED)

**Goal**: Optimize runtime performance and reduce latency.

**Duration**: 2-3 days
**Risk**: LOW (optional improvements, no breaking changes)

### Tasks

#### Backend Optimizations (Day 1)
- Add in-memory rack/room lookup cache (`Dict[str, Rack]`)
- Build index on topology load
- Replace linear searches with O(1) dict lookups
- Optimize PromQL queries in planner
- Add query result caching at service level

#### Frontend Optimizations (Day 2)
- Add `React.memo` to expensive components
- Add `useMemo` for expensive calculations
- Add `useCallback` for event handlers
- Optimize bundle size (code splitting)
- Test with React DevTools Profiler

#### Monitoring & Metrics (Day 3)
- Add timing logs for critical operations
- Add Prometheus query stats to telemetry
- Measure before/after performance
- Document performance improvements

### Validation

```bash
# Measure before/after:
# - Room state load time
# - Rack state load time
# - Bundle size (frontend)
# - Memory usage
```

### Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Room State Load | TBD | -20% |
| Rack State Load | TBD | -20% |
| Bundle Size | TBD | < 500KB |
| First Paint | TBD | < 1s |

---

## 📅 Phase 9: Documentation & Cleanup (PLANNED)

**Goal**: Finalize documentation and clean up technical debt.

**Duration**: 2 days
**Risk**: LOW (non-functional improvements)

### Tasks

#### Documentation (Day 1)
- Update all architecture docs
- Update API reference
- Update admin guide
- Create plugin development guide
- Update user guide with new UI

#### Code Cleanup (Day 1)
- Remove commented code
- Remove unused imports
- Remove dead code paths
- Ensure consistent code style
- Run `make lint`

#### Final Validation (Day 2)
- Run full test suite: `make test`
- Run all linters: `make lint && make typecheck`
- Generate final coverage report: `make coverage`
- Test all UI pages manually
- Compare performance with baseline
- Create release notes

### Success Checklist

```bash
✅ make lint        # All linters pass
✅ make typecheck   # No type errors
✅ make test        # All tests pass
✅ make coverage    # 70%+ coverage
✅ make logs        # No errors
✅ Manual testing   # All features work
✅ Performance      # Stable or improved
✅ Documentation    # Up to date
```

---

## 📊 Success Metrics

### Code Quality

| Metric | Baseline (After Phase 5) | Target (After Phase 9) |
|--------|--------------------------|------------------------|
| Test Coverage | 66% | 70%+ |
| Total Tests | 251 | 300+ |
| app.py Lines | < 200 | < 200 |
| Cyclomatic Complexity | < 10 | < 10 |
| Type Coverage | ~50% | 90%+ |

### Architecture

| Metric | Before | After Phase 6 | After Phase 7 |
|--------|--------|---------------|---------------|
| Core Files | Monolith | Plugin-based | Plugin-based |
| Plugin System | None | ✅ Working | ✅ Working |
| Hardcoded Metrics | Yes (PDU) | No (Template) | No (Template) |
| Frontend Stack | React 19 | React 19 | React 19 + Tailwind + shadcn |
| Dynamic Menu | No | Yes (Backend) | Yes (Full Stack) |

### Performance

| Metric | Before | Target (After Phase 8) |
|--------|--------|------------------------|
| Room State Load | TBD | -20% |
| Rack State Load | TBD | -20% |
| Bundle Size | TBD | < 500KB |
| First Paint | TBD | < 1s |

---

## 🛡️ Risk Management

### High-Risk Phases

**Phase 6 (Backend Plugin Architecture)** - Risk: HIGH
- **Mitigation**: Incremental extraction, keep old code until validated
- **Rollback**: Git revert per commit
- **Testing**: Comprehensive integration tests after each step

**Phase 7 (Frontend Rebuild)** - Risk: HIGH
- **Mitigation**: Progressive migration, feature flags per page
- **Rollback**: Keep old code until new is stable
- **Testing**: Visual regression tests, side-by-side comparison

### Validation Gates

After each phase:
1. ✅ All automated tests pass (`make test`)
2. ✅ All linters pass (`make lint`, `make typecheck`)
3. ✅ No errors in logs (`make logs`)
4. ✅ Manual smoke test (core features work)
5. ✅ Performance stable or improved

If any gate fails:
1. Investigate root cause
2. Fix issue or revert commit
3. Re-run validation
4. Document incident

---

## 🚀 Getting Started

### Continue from Phase 6

```bash
# Current branch
git branch
# refactoring/code-quality-improvements

# Verify Phase 5 completion
make test          # Should pass
make coverage      # Should show 66%
make lint          # Should pass

# Start Phase 6A
# 1. Read ARCHITECTURE/phases/PHASE_6_BACKEND_PLAN.md
# 2. Create src/rackscope/services/metrics_service.py
# 3. Follow day-by-day plan
```

### Commit Message Format

Use conventional commits with phase tracking:

```
<type>(<scope>): <subject>

<body>

Phase: <phase-number><sub-phase> - <phase-name>
Status: <In Progress|Complete>
Validated: <validation-commands>
```

**Example**:
```
refactor(telemetry): create generic metrics collection service

- Create services/metrics_service.py
- Add collect_component_metrics() function
- Add build_metric_query() helper
- Add tests in tests/services/test_metrics_service.py

Phase: 6A - Fix Template System (Day 1)
Status: In Progress
Validated: ✅ make lint, make test
```

---

## 📞 Support & References

### Documentation

- **This Roadmap**: Consolidated plan for all remaining work
- **[PHASE_6_BACKEND_PLAN.md](../phases/PHASE_6_BACKEND_PLAN.md)**: Detailed Phase 6 implementation
- **[PHASE_7_FRONTEND_PLAN.md](../phases/PHASE_7_FRONTEND_PLAN.md)**: Detailed Phase 7 implementation
- **[PLUGIN_ARCHITECTURE.md](./PLUGIN_ARCHITECTURE.md)**: Plugin system design
- **[REFACTORING_ROADMAP.md](./REFACTORING_ROADMAP.md)**: Original refactoring plan (Phases 1-5 + old 6-9)

### Quick Commands

```bash
# Development
make up            # Start all services
make logs          # View logs
make restart       # Restart services

# Quality
make lint          # Run linters
make typecheck     # Run mypy
make test          # Run tests
make coverage      # Generate coverage report

# Shell access
docker compose exec backend bash
docker compose exec frontend sh
```

### Help

If you encounter issues:
1. Check logs: `make logs`
2. Run validation: `make lint && make test`
3. Review relevant phase plan document
4. Check CLAUDE.md for patterns
5. Git revert if needed

---

## ✅ Final Checklist (Before Merging to Main)

### Code Quality
- [ ] All tests pass: `make test`
- [ ] All linters pass: `make lint && make typecheck`
- [ ] Coverage ≥ 70%: `make coverage`
- [ ] Complexity low: All modules < 10
- [ ] No console errors: `make logs`

### Features
- [ ] Core functionality works (visualization, health checks)
- [ ] Plugin system works (Slurm, Simulator)
- [ ] Template metrics work (no hardcoding)
- [ ] New frontend works (all views, editors)
- [ ] Dynamic menu works (plugin sections)

### Documentation
- [ ] All docs updated
- [ ] Plugin development guide created
- [ ] Migration guide created
- [ ] CHANGELOG.md updated
- [ ] Release notes prepared

### Performance
- [ ] Performance benchmarks stable or improved
- [ ] No memory leaks
- [ ] Bundle size acceptable
- [ ] Load times acceptable

### Review
- [ ] Code review approved
- [ ] Manual testing complete (all features)
- [ ] Stakeholder approval
- [ ] Ready to deploy

---

**End of Consolidated Roadmap**

**Next Step**: Start Phase 6A (Fix Template System) - Day 1
