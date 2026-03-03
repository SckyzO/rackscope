---
sidebar_position: 5
title: Dashboard Widget System
description: How to create, register and publish custom dashboard widgets
---

# Dashboard Widget System

The dashboard is powered by a **modular widget registry**. Every widget is a self-contained file that registers itself at import time. Adding a widget requires creating a single file — no switch statements, no central catalog to edit.

---

## Architecture overview

```
frontend/src/app/dashboard/
├── types.ts          ← Shared types (WidgetType, DashboardData, WidgetConfig…)
├── constants.ts      ← Colors, storage keys, DEFAULT_WIDGETS layout
├── registry.ts       ← registerWidget / getWidget / getAllWidgets
├── primitives.tsx    ← Shared sub-components (StatCard, HealthGauge…)
├── widgets/
│   ├── ActiveAlertsWidget.tsx
│   ├── WorldMapWidget.tsx
│   └── …             ← One file per core widget
└── index.ts          ← Barrel: imports all widgets → triggers registrations

frontend/src/app/plugins/
├── slurm/widgets/
│   ├── SlurmClusterWidget.tsx
│   ├── SlurmNodesWidget.tsx
│   ├── SlurmUtilizationWidget.tsx
│   └── index.ts      ← Imported by dashboard/index.ts
└── simulator/widgets/
    ├── SimulatorStatusWidget.tsx
    └── index.ts      ← Imported by dashboard/index.ts
```

`DashboardPage.tsx` imports `from '../dashboard'` which runs `index.ts`, which imports every widget file (including plugin widget barrels), which calls `registerWidget()`. The page then renders via `getWidget(type).component`.

Plugin widgets live in `plugins/<name>/widgets/` — they register themselves the same way as core widgets but declare a `requiresPlugin` field so the Widget Library hides them when the plugin is disabled.

---

## Creating a widget — step by step

### 1. Create the widget file

```tsx title="frontend/src/app/dashboard/widgets/MyWidget.tsx"
import { Star } from 'lucide-react';
import { registerWidget } from '../registry';
import type { DashboardData } from '../types';

// The component receives `widget` (its config), `data` (all dashboard data),
// and `navigate` (React Router navigate).
export const MyWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5
                  dark:border-gray-800 dark:bg-gray-900">
    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">My Widget</p>
    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
      {data.totalDevices}
    </p>
    <p className="text-xs text-gray-400">devices</p>
  </div>
);

// Self-registration — runs once when this module is imported.
registerWidget({
  type: 'my-widget',       // unique snake-case identifier
  title: 'My Widget',
  description: 'Short description shown in the Widget Library panel',
  defaultW: 3,             // columns (grid is 12-wide)
  defaultH: 2,             // rows (each row = 140 px)
  icon: Star,              // Lucide icon shown in the picker
  group: 'Stats',          // picker group: Stats | Charts | Monitoring | Overview | Catalog | Legacy
  component: MyWidget,
});
```

### 2. Register the type

Add `'my-widget'` to the `WidgetType` union in `types.ts`:

```ts title="frontend/src/app/dashboard/types.ts"
export type WidgetType =
  | 'stat-card'
  | 'active-alerts'
  // …
  | 'my-widget';   // ← add here
```

### 3. Import the file in `index.ts`

For a **core widget** (not tied to a plugin):

```ts title="frontend/src/app/dashboard/index.ts"
// … existing imports …
import './widgets/MyWidget';   // ← add this line
```

For a **plugin widget**, add it to the plugin barrel instead:

```ts title="frontend/src/app/plugins/myplugin/widgets/index.ts"
import './MyPluginWidget';
```

The plugin barrel is already imported by `dashboard/index.ts` (one import per plugin, not per widget).

That's it. The widget appears in **Edit layout → Widget Library** and can be added to any dashboard.

---

## The `DashboardData` object

Every widget receives the same `data: DashboardData` prop. It is computed once per refresh cycle and passed to all visible widgets.

| Field | Type | Description |
|---|---|---|
| `alerts` | `ActiveAlert[]` | All active CRIT/WARN alerts |
| `sites` | `Site[]` | Full topology (rooms, aisles, racks nested) |
| `roomStates` | `Record<string, string>` | `roomId → 'OK' \| 'WARN' \| 'CRIT' \| 'UNKNOWN'` |
| `slurm` | `SlurmSummary \| null` | Slurm aggregate data (null if plugin disabled) |
| `slurmEnabled` | `boolean` | Whether the Slurm plugin is active |
| `promStats` | `PrometheusStats \| null` | Prometheus latency / heartbeat stats |
| `deviceTemplates` | `DeviceTemplate[]` | Full device template catalog |
| `rackTemplateCount` | `number` | Number of rack templates |
| `checks` | `CheckDefinition[]` | Full checks library |
| `critCount` | `number` | Number of CRIT alerts |
| `warnCount` | `number` | Number of WARN alerts |
| `totalDevices` | `number` | Sum of all devices across the topology |
| `totalRacks` | `number` | Sum of all racks |
| `totalRooms` | `number` | Sum of all rooms |
| `healthScore` | `number` | `0–100` — `(healthy / total) * 100` |
| `allRooms` | `RoomWithState[]` | Flat list of rooms with resolved state |
| `donutSlices` | `DonutSlice[]` | `[{label, count, color}]` for CRIT/WARN/OK |
| `devsByType` | `Record<string, number>` | Device count per template type |
| `checksByScope` | `Record<string, number>` | Check count per scope (node/chassis/rack) |
| `promNextSec` | `number` | Seconds until next Prometheus scrape |
| `promConnected` | `boolean` | Whether Prometheus is reachable |
| `filteredAlerts` | `ActiveAlert[]` | Alerts after user-selected filters (paginated) |
| `filteredAlertsAll` | `ActiveAlert[]` | Alerts after filters (all pages) |
| `alertLimit` / `alertPage` / … | `number` | Alert pagination state (read + write) |

> **Read-only convention**: widgets should only call the `set*` functions (alertLimit, alertPage, alertStateFilter, alertRoomFilter) from interactive elements (buttons, selects). Never call them during render.

---

## The `WidgetConfig` object

The `widget` prop carries the per-instance configuration saved in localStorage.

```ts
type WidgetConfig = {
  id: string;       // unique instance id, e.g. 'my-widget-1748293820000'
  type: WidgetType; // the registered type
  x: number;        // column position (0-11)
  y: number;        // row position
  w: number;        // column span
  h: number;        // row span
  minW?: number;
  minH?: number;
  statKey?: StatKey; // used by 'stat-card' to pick the metric
};
```

You can extend `WidgetConfig` with extra fields for per-widget settings (e.g. a threshold value, a display mode). Those fields are persisted automatically because the whole config object is JSON-serialised to localStorage.

---

## The `navigate` prop

Widgets that link to other pages receive a `navigate: (path: string) => void` prop (React Router's `useNavigate`). Use it instead of `<Link>` to avoid importing router context inside widgets.

```tsx
<button onClick={() => navigate('/views/room/room-a')}>
  View room →
</button>
```

---

## Picker groups

Widgets are organised in the Widget Library panel by their `group` field:

| Group | Widget types |
|---|---|
| `Stats` | Single-number KPIs (stat-card, alert-count, uptime, slurm-nodes) |
| `Charts` | Gauges and bar charts (health-gauge, severity-donut, rack-utilization, slurm-utilization) |
| `Monitoring` | Live alert feeds and maps (active-alerts, recent-alerts, node-heatmap, world-map) |
| `Overview` | Infrastructure summaries (infrastructure, site-map, prometheus, slurm-cluster) |
| `Catalog` | Template and check stats (catalog-checks, check-summary, device-types) |
| `Legacy` | Deprecated or compatibility widgets (stats-row) |

---

## Plugin-specific widgets

Widgets tied to an optional plugin live in `plugins/<name>/widgets/` and declare `requiresPlugin` with the plugin ID (e.g. `'slurm'`, `'simulator'`). The Widget Library reads enabled plugins from `AppConfigContext` and hides widgets whose plugin is inactive.

```ts title="frontend/src/app/plugins/slurm/widgets/SlurmMyWidget.tsx"
registerWidget({
  type: 'slurm-my-widget',
  // …
  requiresPlugin: 'slurm',   // hidden when Slurm plugin is disabled
  component: SlurmMyWidget,
});
```

The `WidgetPicker` filters using context:

```ts
const { plugins } = useAppConfigSafe();
const available = getAllWidgets().filter(
  (def) => !def.requiresPlugin || Boolean(plugins[def.requiresPlugin as keyof typeof plugins])
);
```

To add a new plugin widget:
1. Create `plugins/<name>/widgets/MyPluginWidget.tsx`
2. Add `'my-plugin-widget'` to `WidgetType` in `types.ts`
3. Import from the plugin's `index.ts` barrel (already imported by `dashboard/index.ts`)

No changes needed to `dashboard/widgets/` or `dashboard/index.ts` beyond the barrel import, which only needs to be added once per plugin.

---

## Shared primitives

`primitives.tsx` exports reusable sub-components to keep widgets visually consistent:

| Export | Usage |
|---|---|
| `StatCard` | Coloured icon + large number + label |
| `HealthGauge` | SVG arc gauge (0–100%) |
| `SeverityDonut` | SVG donut for CRIT/WARN/OK distribution |
| `AlertSevBadge` | Pill badge for CRIT / WARN state |
| `AlertRow` | Clickable alert row with node id, location, check id |
| `WidgetPlaceholder` | Empty-state card with dashed border |

```tsx
import { StatCard, WidgetPlaceholder } from '../primitives';
```

---

## Constants

`constants.ts` exports colours and maps used across widgets:

```ts
import { HC, SEV_PILL, STATUS_COLOR, DEV_TYPE_COLOR, DEV_TYPE_ICON } from '../constants';

// HC — severity hex colours
HC.CRIT   // '#ef4444'
HC.WARN   // '#f59e0b'
HC.OK     // '#10b981'
HC.UNKNOWN// '#6b7280'

// SEV_PILL — Tailwind classes for severity badges
SEV_PILL.CRIT   // 'bg-red-100 text-red-700 dark:…'

// STATUS_COLOR — Slurm node status hex colours
STATUS_COLOR.idle      // '#10b981'
STATUS_COLOR.allocated // '#3b82f6'
STATUS_COLOR.down      // '#ef4444'

// DEV_TYPE_COLOR / DEV_TYPE_ICON — per device-type colour and Lucide icon
DEV_TYPE_COLOR.server  // '#3b82f6'
DEV_TYPE_ICON.storage  // Layers  (Lucide icon component)
```

---

## Widget sizing guide

The grid is **12 columns wide** with a row height of **140 px** and 20 px gutters.

| Size | w × h | Typical use |
|---|---|---|
| Tiny KPI | 2×1 | Single number (stat-card) |
| Small KPI | 3×2 | Prominent count (alert-count, uptime) |
| Medium | 4×2 | Gauge, list, chart |
| Wide | 6×3 | Alert feed, heatmap, map |
| Full-width | 12×1 | Stats row |

Set `defaultW` / `defaultH` in the registration. The user can resize any widget freely after adding it.

---

## Complete example — "Top WARN rooms" widget

```tsx title="frontend/src/app/dashboard/widgets/TopWarnRoomsWidget.tsx"
import { AlertTriangle } from 'lucide-react';
import { HC } from '../constants';
import { registerWidget } from '../registry';
import type { DashboardData, WidgetProps } from '../types';

export const TopWarnRoomsWidget = ({
  data,
  navigate,
}: {
  data: DashboardData;
  navigate: WidgetProps['navigate'];
}) => {
  const warnRooms = data.allRooms
    .filter((r) => r.state === 'WARN' || r.state === 'CRIT')
    .sort((a, b) => (a.state === 'CRIT' ? -1 : 1) - (b.state === 'CRIT' ? -1 : 1))
    .slice(0, 5);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4
                    dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-3 shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Rooms with issues
      </p>
      {warnRooms.length === 0 ? (
        <p className="text-xs text-green-500">All rooms healthy</p>
      ) : (
        <div className="space-y-1.5 overflow-y-auto">
          {warnRooms.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/views/room/${r.id}`)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left
                         hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: HC[r.state] }}
              />
              <span className="flex-1 truncate text-sm text-gray-800 dark:text-gray-200">
                {r.name}
              </span>
              <span className="text-xs text-gray-400">{r.siteName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

registerWidget({
  type: 'top-warn-rooms',
  title: 'Rooms with Issues',
  description: 'Top 5 rooms in WARN or CRIT state',
  defaultW: 4,
  defaultH: 2,
  icon: AlertTriangle,
  group: 'Monitoring',
  component: TopWarnRoomsWidget,
});
```

Then in `types.ts`:
```ts
| 'top-warn-rooms'
```

And in `index.ts`:
```ts
import './widgets/TopWarnRoomsWidget';
```

---

## Checklist — core widget

- [ ] Create `dashboard/widgets/MyWidget.tsx` with `export const MyWidget` + `registerWidget()`
- [ ] Add `'my-widget'` to `WidgetType` in `types.ts`
- [ ] Add `import './widgets/MyWidget'` in `dashboard/index.ts`
- [ ] Run `make lint` to catch any ESLint issues
- [ ] Test: open the dashboard → Edit layout → Widget Library → find your widget → Add

## Checklist — plugin widget

- [ ] Create `plugins/<name>/widgets/MyWidget.tsx` with `requiresPlugin: '<name>'`
- [ ] Add `'my-widget'` to `WidgetType` in `types.ts`
- [ ] Add `import './MyWidget'` in `plugins/<name>/widgets/index.ts`
- [ ] (First widget for the plugin only) Add `import '../plugins/<name>/widgets'` in `dashboard/index.ts`
- [ ] Run `make lint` + `npx tsc --noEmit` to verify
- [ ] Test: disable plugin → widget absent from picker; enable → widget appears
