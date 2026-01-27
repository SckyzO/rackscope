# Notes & Décisions du projet

## 2026-01 — État actuel (résumé)
- **Backend**: Python / FastAPI (Dockerized), PromQL planner + cache/dedup + TTL.
- **Frontend**: React (Vite) + Tailwind CSS v4.
- **Topologie**: segmentation par dossiers (datacenter/room/aisle/rack).
- **Multi‑DC**: supporté côté modèle + UI (sélecteur + arbre).
- **Settings**: page complète (telemetry, cache, features, simulator).
- **Simulator**: multi‑metrics + overrides + scénarios (demo).
- **Editors**: Template editor (device + rack), Topology editor (drag/drop aisles), Rack editor (assign devices).

## Points importants
- **Identité**: `instance` par défaut, `nodes` deprecated (accepté).
- **Checks**: bibliothèque par fichiers (`config/checks/library/*.yaml`).
- **Performance**: vector queries, pas de query par device.
- **Docs**: tenir à jour `docs/` à chaque phase validée.

## Commit Guidelines
We follow the **Conventional Commits** specification:
- Format: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `style`.
- Language: English only.
- Mood: Imperative (e.g., "add" not "added").
