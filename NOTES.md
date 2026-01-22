# Notes & Décisions du projet

## 2026-01-21 - Initialisation & UX
- **Backend**: Python / FastAPI (Dockerized).
- **Topologie**: Modèle hiérarchique (Site -> Salle -> Allée -> Baie).
- **Frontend**: SPA React (Vite) + Tailwind CSS v4 (Dockerized).
- **UI Status**: Sidebar et RoomView fonctionnelles. Vue Rack en cours.

## Phase 2 (Terminée)
- Intégration Prometheus réelle.
- Simulation de métriques (Node-level).
- Templates HPC (BullSequana, Blades, Storage High-Density).
- UI "Intelligent Density" pour les Drawers de stockage.

## Phase 3 (En cours)
- Page Rack dédiée `/rack/{id}` (Cockpit).
- Vue Infrastructure (HMC/PMC).
- Vue Arrière (Rear View).

## Roadmap Future
- **i18n**: Support multilingue (ajouté à la Phase 4).
- **Settings**: Configuration des seuils.
- **Search**: Recherche globale.