import { Server, Cpu, Network, Zap, Activity, Layers } from 'lucide-react';
import type React from 'react';
import type { WidgetConfig } from './types';

export const HC: Record<string, string> = {
  OK: '#10b981',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#6b7280',
};

export const SEV_PILL: Record<string, string> = {
  OK: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CRIT: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  UNKNOWN: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

export const STATUS_COLOR: Record<string, string> = {
  idle: '#10b981',
  allocated: '#3b82f6',
  alloc: '#3b82f6',
  down: '#ef4444',
  drain: '#f97316',
  drained: '#f97316',
  draining: '#f59e0b',
  mixed: '#8b5cf6',
  unknown: '#6b7280',
};

export const DEV_TYPE_COLOR: Record<string, string> = {
  server: '#3b82f6',
  storage: '#f59e0b',
  network: '#06b6d4',
  pdu: '#eab308',
  cooling: '#10b981',
  other: '#6b7280',
};

export const DEV_TYPE_ICON: Record<string, React.ElementType> = {
  server: Server,
  storage: Layers,
  network: Network,
  pdu: Zap,
  cooling: Activity,
  other: Cpu,
};

// Row height drives the vertical rhythm of the grid.
export const ROW_PX = 140;

export const DASHBOARDS_STORAGE_KEY = 'rackscope.dashboards';
export const ACTIVE_DASHBOARD_STORAGE_KEY = 'rackscope.dashboard.active';
export const DASHBOARDS_STORAGE_VERSION_KEY = 'rackscope.dashboards.version';
// Version '2' introduced x/y/w/h coordinates (react-grid-layout) replacing
// the old colSpan/rowSpan model. Stale data is discarded on version mismatch.
// Version '3' added inPlaylist flag to Dashboard.
// Version '4' standardised widget title bars (outer card shell moved to WidgetContent).
export const DASHBOARDS_STORAGE_VERSION = '4';

// 2D grid layout — x/y/w/h (12-column grid, rowHeight=ROW_PX)
export const DEFAULT_WIDGETS: WidgetConfig[] = [
  // ── y=0, h=1 — KPI strip ─────────────────────────────────────────────────
  { id: 'stat-sites', type: 'stat-card', x: 0, y: 0, w: 2, h: 1, minH: 1, statKey: 'sites' },
  { id: 'stat-rooms', type: 'stat-card', x: 2, y: 0, w: 2, h: 1, minH: 1, statKey: 'rooms' },
  { id: 'stat-racks', type: 'stat-card', x: 4, y: 0, w: 2, h: 1, minH: 1, statKey: 'racks' },
  { id: 'stat-devices', type: 'stat-card', x: 6, y: 0, w: 2, h: 1, minH: 1, statKey: 'devices' },
  { id: 'stat-crit', type: 'stat-card', x: 8, y: 0, w: 2, h: 1, minH: 1, statKey: 'crit' },
  { id: 'stat-warn', type: 'stat-card', x: 10, y: 0, w: 2, h: 1, minH: 1, statKey: 'warn' },
  // ── y=1, h=3 — Primary monitoring ────────────────────────────────────────
  { id: 'alerts', type: 'active-alerts', x: 0, y: 1, w: 6, h: 3, minW: 3, minH: 1 },
  { id: 'worldmap', type: 'world-map', x: 6, y: 1, w: 6, h: 3, minW: 3, minH: 1 },
  // ── y=4, h=2 — Gauges ────────────────────────────────────────────────────
  { id: 'gauge', type: 'health-gauge', x: 0, y: 4, w: 4, h: 2, minW: 2, minH: 1 },
  { id: 'donut', type: 'severity-donut', x: 4, y: 4, w: 4, h: 2, minW: 2, minH: 1 },
  { id: 'prometheus', type: 'prometheus', x: 8, y: 4, w: 4, h: 2, minW: 2, minH: 1 },
  // ── y=6, h=2 — Operational ───────────────────────────────────────────────
  { id: 'infra', type: 'infrastructure', x: 0, y: 6, w: 4, h: 2, minW: 2, minH: 1 },
  { id: 'heatmap', type: 'node-heatmap', x: 4, y: 6, w: 4, h: 2, minW: 2, minH: 1 },
  { id: 'catalog', type: 'catalog-checks', x: 8, y: 6, w: 4, h: 2, minW: 2, minH: 1 },
];
