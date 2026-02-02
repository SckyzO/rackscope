# Architecture Documentation

This directory contains all architectural documentation for the Rackscope project.

## 📖 Getting Started

Start here to understand the project:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - High-level architecture overview
- **[NOTES.md](./NOTES.md)** - Working notes and implementation details

### 🤖 AI Agent Guidelines

Instructions for AI coding assistants (located at **project root** for auto-detection):

- **[../AGENTS.md](../AGENTS.md)** - Working agreement for all coding agents (strict rules)
- **[../CLAUDE.md](../CLAUDE.md)** - Claude Code specific guidance and environment setup
- **[../GEMINI.md](../GEMINI.md)** - Gemini CLI working agreement
- **[../prompt.md](../prompt.md)** - Repository bootstrap prompt for new AI sessions

## 📋 Strategic Plans

Long-term vision and architecture plans:

- **[plans/ROADMAP.md](./plans/ROADMAP.md)** - Project roadmap and milestones
- **[plans/REFACTORING_ROADMAP.md](./plans/REFACTORING_ROADMAP.md)** - Refactoring roadmap and progress tracking
- **[plans/FOUNDATION_PLAN.md](./plans/FOUNDATION_PLAN.md)** - Foundation architecture plan
- **[plans/LOGICAL_ARCHITECTURE_PLAN.md](./plans/LOGICAL_ARCHITECTURE_PLAN.md)** - Logical architecture design
- **[plans/PLUGIN_ARCHITECTURE.md](./plans/PLUGIN_ARCHITECTURE.md)** - Plugin system architecture ⭐

## 🏗️ Implementation Phases

Detailed phase-by-phase implementation plans:

### Completed Phases

- **[phases/BASELINE_METRICS.md](./phases/BASELINE_METRICS.md)** - Baseline metrics before refactoring
- **[phases/PHASE_1_BACKEND_ROUTER_SPLIT.md](./phases/PHASE_1_BACKEND_ROUTER_SPLIT.md)** - Backend router organization
- **[phases/PHASE_2_DEPENDENCY_INJECTION.md](./phases/PHASE_2_DEPENDENCY_INJECTION.md)** - Dependency injection implementation
- **[phases/PHASE_3_SERVICE_LAYER.md](./phases/PHASE_3_SERVICE_LAYER.md)** - Service layer architecture
- **[phases/PHASE_4_LOGGING_ERROR_HANDLING.md](./phases/PHASE_4_LOGGING_ERROR_HANDLING.md)** - Logging and error handling
- **[phases/PHASE_5_TEST_COVERAGE.md](./phases/PHASE_5_TEST_COVERAGE.md)** - Test coverage improvements (36% → 66%)

### Planned Phases

- **[phases/PHASE_6_BACKEND_PLAN.md](./phases/PHASE_6_BACKEND_PLAN.md)** - Backend plugin architecture refactoring (1 week)
- **[phases/PHASE_7_FRONTEND_PLAN.md](./phases/PHASE_7_FRONTEND_PLAN.md)** - Frontend rebuild with React + Tailwind + shadcn (3 weeks)

## 📚 Reference Documentation

Technical reference for specific subsystems:

- **[reference/CHECKS_LIBRARY.md](./reference/CHECKS_LIBRARY.md)** - Health check system and library
- **[reference/IMPORTERS.md](./reference/IMPORTERS.md)** - Data import system documentation
- **[reference/VIEW_MODEL.md](./reference/VIEW_MODEL.md)** - View model layer specification
- **[reference/TESTING.md](./reference/TESTING.md)** - Testing strategy and guidelines

## 🎯 Architectural Decisions

Records of key architectural decisions:

- **[decisions/ADR.md](./decisions/ADR.md)** - Architectural Decision Records (ADRs)

## 📁 Directory Structure

```
PROJECT_ROOT/
├── AGENTS.md                    # 🤖 AI agent working agreement (at root for auto-detection)
├── CLAUDE.md                    # 🤖 Claude Code guidance (at root for auto-detection)
├── GEMINI.md                    # 🤖 Gemini CLI guidance (at root for auto-detection)
├── prompt.md                    # 🤖 Bootstrap prompt (at root for easy access)
│
└── ARCHITECTURE/
    ├── README.md                # This file - index of all documentation
    ├── ARCHITECTURE.md          # High-level architecture overview
    ├── NOTES.md                 # Working notes
    ├── README_PRIVATE.md        # Private notes
    │
    ├── decisions/               # Architectural decisions
    │   └── ADR.md               # Architectural Decision Records
    │
    ├── phases/                  # Phase-by-phase implementation plans
    │   ├── BASELINE_METRICS.md  # Pre-refactoring baseline metrics
    │   ├── PHASE_1_BACKEND_ROUTER_SPLIT.md
    │   ├── PHASE_2_DEPENDENCY_INJECTION.md
    │   ├── PHASE_3_SERVICE_LAYER.md
    │   ├── PHASE_4_LOGGING_ERROR_HANDLING.md
    │   ├── PHASE_5_TEST_COVERAGE.md
    │   ├── PHASE_6_BACKEND_PLAN.md  # 🎯 Next: Backend refactoring
    │   └── PHASE_7_FRONTEND_PLAN.md # 🎯 Next: Frontend rebuild
    │
    ├── plans/                   # Strategic architecture plans
    │   ├── ROADMAP.md           # Project roadmap
    │   ├── REFACTORING_ROADMAP.md  # Refactoring progress tracking
    │   ├── FOUNDATION_PLAN.md   # Foundation architecture
    │   ├── LOGICAL_ARCHITECTURE_PLAN.md
    │   └── PLUGIN_ARCHITECTURE.md  # ⭐ Plugin system design
    │
    └── reference/               # Technical reference documentation
        ├── CHECKS_LIBRARY.md    # Health check system
        ├── IMPORTERS.md         # Import system
        ├── VIEW_MODEL.md        # View model layer
        └── TESTING.md           # Testing strategy and guidelines

Note: AI agent files (AGENTS.md, CLAUDE.md, GEMINI.md, prompt.md) are kept at
project root for automatic detection by AI coding assistants.
```

## 🚀 Current Status

**Last Completed**: Phase 5 - Test Coverage (36% → 66%, 251 tests)

**Next Steps**:
1. Phase 6 - Backend refactoring (plugin architecture)
2. Phase 7 - Frontend rebuild (React + Tailwind + shadcn)

---

**Project**: Rackscope - Datacenter Infrastructure Monitoring
**Repository**: https://github.com/your-org/rackscope
**Documentation Version**: February 2026
