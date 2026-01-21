# AGENTS.md
# Working Agreement for Coding Agents (Codex, AI-assisted development)

This file defines strict rules for any coding assistant interacting with this
repository.

Failure to follow these rules is considered a critical error.

===============================================================================
1. PROJECT CONTEXT
===============================================================================

Project name:
- Short: rackscope
- Long: Rack & Server Monitoring Dashboard

This project is an open-source, Prometheus-first application providing physical
monitoring views of infrastructure:

- Datacenter / Site
- Room (top-down floor plan)
- Rack (front and rear views)
- Equipment (servers, chassis, switches, PDUs, cooling/hydraulics)

The application:
- DOES NOT own a CMDB database
- DOES NOT collect metrics itself
- CONSUMES Prometheus-compatible telemetry (PromQL)
- USES file-based configuration (YAML/JSON) as source of truth
- IS template-driven and GitOps-friendly

Build a solid, extensible core first, then evolve gradually.

===============================================================================
2. CORE PRINCIPLES (NON-NEGOTIABLE)
===============================================================================

- Simplicity over cleverness
- Explicit over implicit
- File-based configuration first
- Incremental development
- No premature optimization
- No speculative features
- No tight coupling to external tools (Grafana, NetBox, etc.)

This is NOT a Grafana plugin.
This is NOT a CMDB.
This IS a physical monitoring view layer.

===============================================================================
3. SCOPE CONTROL
===============================================================================

Agents MUST NOT:
- Introduce a mandatory database
- Introduce direct SNMP / Redfish / hardware access
- Replace Prometheus, Alertmanager, or Grafana
- Add features not explicitly requested
- Rewrite large parts of the codebase without instruction
- Mix multiple concerns in a single change

Agents SHOULD:
- Keep changes minimal and focused
- Make changes reversible
- Propose alternatives instead of enforcing choices

===============================================================================
4. CONFIGURATION RULES
===============================================================================

- YAML/JSON files are the source of truth
- Configuration must be:
  - human-readable
  - copy/paste friendly
  - strictly validated
- Segmented file layouts are preferred over monolithic files
- Templates must reduce duplication

Agents MUST:
- Never embed configuration implicitly in code
- Never hardcode environment-specific values
- Always validate configuration inputs

===============================================================================
5. ARCHITECTURE RULES
===============================================================================

The architecture is layered:

- View Model (file-based, CMDB-agnostic)
- Telemetry Layer (PromQL only)
- Health Engine (OK/WARN/CRIT/UNKNOWN)
- API Layer (REST)
- UI Layer (wallboard + editors)

Agents MUST respect these boundaries.

===============================================================================
6. PERFORMANCE & TELEMETRY
===============================================================================

Prometheus query explosion MUST be avoided.

Agents MUST:
- Prefer vector queries over per-device queries
- Use aggregation and grouping
- Add caching where appropriate
- Never generate one query per device per refresh

Recording rules (health series) are recommended but optional.

===============================================================================
7. UI / UX RULES
===============================================================================

This project targets:
- NOC operators
- System administrators (N1/N2)
- MCO teams

Therefore:
- Fast visual comprehension is critical
- Dark mode is first-class
- Color is not the only indicator (icons/text required)
- Animations must be minimal and functional

Agents MUST NOT:
- Introduce heavy visual effects
- Build “dashboard-like” layouts
- Depend on Grafana UI components

===============================================================================
8. DEVELOPMENT PRACTICES
===============================================================================

- Small commits, single intent per commit
- English for code, comments, and commit messages
- No dead code
- No commented-out code blocks
- Explicit error handling
- Clear log messages

===============================================================================
9. AI-SPECIFIC RULES
===============================================================================

Agents MUST:
- Respect the current design documents
- Avoid context bloat
- Not invent requirements
- Not silently change APIs or data models

If something is unclear:
- ASK before implementing

===============================================================================
END OF AGENTS.md
===============================================================================
