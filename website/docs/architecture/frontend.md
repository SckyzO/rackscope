---
id: frontend
title: Frontend Architecture
sidebar_position: 4
---

# Frontend Architecture

## Directory Structure

```
frontend/src/
├── app/                        # Main application
│   ├── AppRouter.tsx           # React Router config (routes at /)
│   ├── layout/
│   │   ├── AppLayout.tsx       # Main shell (sidebar + header + outlet)
│   │   ├── AppHeader.tsx       # Top navigation bar
│   │   ├── AppSidebar.tsx      # Navigation sidebar + plugin menu
│   │   └── AppSearch.tsx       # Global search
│   ├── contexts/
│   │   ├── AppConfigContext.tsx # App config + feature flags
│   │   ├── PageTitleContext.tsx
│   │   └── PlaylistContext.tsx
│   ├── components/             # Shared UI components
│   └── pages/                  # All page components
│       ├── views/              # Physical views (WorldMap, Room, Rack, Device)
│       ├── slurm/              # Slurm plugin views
│       ├── editors/            # Configuration editors
│       ├── rackscope/          # Rackscope-specific pages
│       ├── ui/                 # UI library showcase pages
│       ├── charts/
│       └── tables/
├── contexts/
│   └── AuthContext.tsx         # Authentication context
└── services/
    └── api.ts                  # API client with caching
```

## Routing

All routes at `/` root (no prefix):

```typescript
// Key routes
/                           → DashboardPage
/views/worldmap             → WorldMapPage
/views/room/:roomId         → RoomPage
/views/rack/:rackId         → RackPage
/views/device/:rackId/:deviceId → DevicePage
/slurm/overview             → SlurmOverviewPage
/slurm/wallboard/:roomId    → SlurmWallboardPage
/editors/topology           → DatacenterEditorPage
/editors/rack               → RackEditorPage
/editors/settings           → SettingsPage
/auth/signin                → SignInPage (no layout)
```

## State Management

- **Server state**: fetched via `api.ts` with `fetchWithCache()` (5s TTL)
- **App config**: `AppConfigContext` — feature flags, user preferences
- **Theme**: `localStorage["rackscope.theme"]`
- **Sidebar**: `localStorage["rackscope.sidebar"]`

## API Client

```typescript
// frontend/src/services/api.ts
export const api = {
  // Health-only (fast, default)
  getRackState: (rackId: string) => fetchWithCache(`/api/racks/${rackId}/state`, ...),

  // With metrics (slow, detail views only)
  getRackStateWithMetrics: (rackId: string) =>
    fetchWithCache(`/api/racks/${rackId}/state?include_metrics=true`, ...),

  // Plugin menu (drives dynamic sidebar)
  getPluginsMenu: () => fetchWithCache('/api/plugins/menu', ...),
};
```

## CSS Conventions

- Root: `.rs-root`
- Sidebar: `.rs-sidebar`, `.rs-sidebar-nav`
- Scrollbar: `.rs-scrollbar`
- Colors: Tailwind utility classes + CSS variables

## Dark Mode

Dark mode is **first-class** (default for NOC environments):
- Managed by `AppConfigContext`
- Persisted to `localStorage["rackscope.theme"]`
- All components must support both dark and light modes
