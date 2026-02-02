# ADR.md (Private) — Consolidated Decisions

This file consolidates all ADRs to keep the folder minimal.

## ADR-001 — Standalone App vs Grafana Plugin

Context
- We want a physical datacenter monitoring UI (room top view, rack elevation, playlist, notifications).
- We need GitOps-friendly configuration and offline mode.
- Grafana plugins impose dashboard constraints and Grafana lifecycle risk.

Decision
- Build a standalone web application.
- Keep Grafana as an analysis tool (optional deep links).

Consequences
- Full control of UI/UX and configuration model.
- Additional service to deploy (mitigated by container packaging).
- Auth/RBAC can be phased later.

Status
- Accepted

---

## ADR-002 — Frontend Stack

Context
- Pixel-accurate UI, complex physical layouts.
- Backend is Python/FastAPI.
- User requested Tailwind CSS v4, suggested React/Next.js.

Decision
- React (SPA) scaffolded with Vite.
- Tailwind CSS v4 for styling.

Rationale
- Vite + SPA keeps deployment simple alongside FastAPI.
- Tailwind v4 performance and CSS variables fit the design goals.
- Shadcn/Radix can be used for base components when needed.

Consequences
- Frontend lives in `frontend/`.
- Build pipeline: `npm run build` -> serve static assets.
- CORS enabled in dev.

Status
- Accepted
