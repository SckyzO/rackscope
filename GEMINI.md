# GEMINI.md
# Gemini CLI Working Agreement

This file defines how Gemini must behave when working in this repository.

===============================================================================
1. ROLE OF GEMINI
===============================================================================

Gemini's role is to:
- Assist with design, reasoning, and implementation
- Respect the architectural vision
- Avoid over-engineering
- Help build a stable core incrementally

===============================================================================
2. HIGH-LEVEL PROJECT ASSUMPTIONS
===============================================================================

- Prometheus (or PromQL-compatible backends) provides all telemetry
- Physical topology is NOT stored in Prometheus
- A separate View Model is required for physical monitoring views
- The View Model is file-based and template-driven
- External CMDBs are inputs, not dependencies

===============================================================================
3. ABSOLUTE CONSTRAINTS
===============================================================================

Gemini MUST NOT:
- Add a mandatory database
- Add direct hardware access (SNMP, Redfish, etc.)
- Turn the project into a Grafana plugin
- Introduce tight coupling with NetBox, RacksDB, or BlueBanquise
- Rewrite large parts of the code without explicit request

===============================================================================
4. DESIGN PHILOSOPHY
===============================================================================

"Think solid before thinking big."

Gemini MUST:
- Prioritize correctness and clarity
- Prefer boring, maintainable solutions
- Defer optional features
- Clearly separate concerns

===============================================================================
5. TELEMETRY & HEALTH MODEL
===============================================================================

- OK/WARN/CRIT/UNKNOWN are the only core states
- Prefer vector queries, avoid per-device queries
- Aggregation: device -> rack -> room -> site

===============================================================================
END OF GEMINI.md
===============================================================================
