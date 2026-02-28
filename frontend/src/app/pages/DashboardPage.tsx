import { useState, useEffect, useRef, useCallback } from 'react';
import ReactGridLayout, { type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { OfflineWorldMap } from '../components/OfflineWorldMap';
import type { SiteMarker, MapStyle } from '../components/OfflineWorldMap';
import { useAppConfigSafe } from '../contexts/AppConfigContext';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  DoorOpen,
  Globe,
  Cpu,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Bell,
  Activity,
  Zap,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Layers,
  ShieldCheck,
  Network,
  SlidersHorizontal,
  X,
  BarChart2,
  LayoutDashboard,
  GripVertical,
  Check,
  Undo2,
  PanelRight,
  Plus,
  Copy,
  Trash2,
  Pencil,
} from 'lucide-react';
import { api } from '../../services/api';
import type {
  ActiveAlert,
  Site,
  SlurmSummary,
  PrometheusStats,
  RoomState,
  DeviceTemplate,
  CheckDefinition,
} from '../../types';

// Maps used by widgets to render device-type labels, colors, and icons.
// Keyed by DeviceTemplate.type so the UI is template-driven, not hardcoded per vendor.

const DEV_TYPE_COLOR: Record<string, string> = {
  server: '#3b82f6',
  storage: '#f59e0b',
  network: '#06b6d4',
  pdu: '#eab308',
  cooling: '#10b981',
  other: '#6b7280',
};
const DEV_TYPE_ICON: Record<string, React.ElementType> = {
  server: Server,
  storage: Layers,
  network: Network,
  pdu: Zap,
  cooling: Activity,
  other: Cpu,
};

// ── Types ─────────────────────────────────────────────────────────────────────

type RoomWithState = {
  id: string;
  name: string;
  siteName: string;
  state: string;
};

type DonutSlice = { label: string; count: number; color: string };

type StatKey = 'sites' | 'rooms' | 'racks' | 'devices' | 'crit' | 'warn';

// Each widget is independently resizable via react-grid-layout.
// Widget config is persisted to localStorage under rackscope.dashboards.
type WidgetType =
  | 'stat-card'
  | 'stats-row'
  | 'health-gauge'
  | 'severity-donut'
  | 'active-alerts'
  | 'slurm-cluster'
  | 'infrastructure'
  | 'prometheus'
  | 'catalog-checks'
  | 'alert-count'
  | 'rack-utilization'
  | 'node-heatmap'
  | 'uptime'
  | 'recent-alerts'
  | 'site-map'
  | 'check-summary'
  | 'device-types'
  | 'slurm-nodes'
  | 'slurm-utilization'
  | 'world-map';

type WidgetConfig = {
  id: string;
  type: WidgetType;
  // 2D grid position — react-grid-layout coordinates
  x: number;
  y: number;
  w: number; // column span (1-12)
  h: number; // row span
  minW?: number;
  minH?: number;
  statKey?: StatKey;
};

type Dashboard = {
  id: string;
  name: string;
  widgets: WidgetConfig[];
};

const DASHBOARDS_STORAGE_KEY = 'rackscope.dashboards';
const ACTIVE_DASHBOARD_STORAGE_KEY = 'rackscope.dashboard.active';
const DASHBOARDS_STORAGE_VERSION_KEY = 'rackscope.dashboards.version';
// Version '2' introduced x/y/w/h coordinates (react-grid-layout) replacing
// the old colSpan/rowSpan model. Stale data is discarded on version mismatch.
const DASHBOARDS_STORAGE_VERSION = '2';

type WidgetDefinition = {
  type: WidgetType;
  title: string;
  description: string;
  defaultW: number;
  defaultH: number;
  icon: React.ElementType;
  requiresSlurm?: boolean;
};

type DashboardData = {
  alerts: ActiveAlert[];
  sites: Site[];
  roomStates: Record<string, string>;
  slurm: SlurmSummary | null;
  slurmEnabled: boolean;
  promStats: PrometheusStats | null;
  deviceTemplates: DeviceTemplate[];
  rackTemplateCount: number;
  checks: CheckDefinition[];
  critCount: number;
  warnCount: number;
  totalDevices: number;
  totalRacks: number;
  totalRooms: number;
  healthScore: number;
  allRooms: RoomWithState[];
  donutSlices: DonutSlice[];
  alertLimit: number;
  setAlertLimit: (n: number) => void;
  alertPage: number;
  setAlertPage: (n: number) => void;
  alertStateFilter: string;
  setAlertStateFilter: (s: string) => void;
  alertRoomFilter: string;
  setAlertRoomFilter: (s: string) => void;
  filteredAlerts: ActiveAlert[];
  filteredAlertsAll: ActiveAlert[];
  totalAlertPages: number;
  safeAlertPage: number;
  promNextSec: number;
  promConnected: boolean;
  devsByType: Record<string, number>;
  checksByScope: Record<string, number>;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const HC: Record<string, string> = {
  OK: '#10b981',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#6b7280',
};

const SEV_PILL: Record<string, string> = {
  OK: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CRIT: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  UNKNOWN: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_COLOR: Record<string, string> = {
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

// Row height drives the vertical rhythm of the grid.
// Increasing this makes shorter widgets feel less cramped.
const ROW_PX = 140;

// 2D grid layout — x/y/w/h (12-column grid, rowHeight=ROW_PX)
const DEFAULT_WIDGETS: WidgetConfig[] = [
  // ── y=0, h=1 — KPI strip ─────────────────────────────────────────────────
  { id: 'stat-sites', type: 'stat-card', x: 0, y: 0, w: 2, h: 1, minH: 1, statKey: 'sites' },
  { id: 'stat-rooms', type: 'stat-card', x: 2, y: 0, w: 2, h: 1, minH: 1, statKey: 'rooms' },
  { id: 'stat-racks', type: 'stat-card', x: 4, y: 0, w: 2, h: 1, minH: 1, statKey: 'racks' },
  { id: 'stat-devices', type: 'stat-card', x: 6, y: 0, w: 2, h: 1, minH: 1, statKey: 'devices' },
  { id: 'stat-crit', type: 'stat-card', x: 8, y: 0, w: 2, h: 1, minH: 1, statKey: 'crit' },
  { id: 'stat-warn', type: 'stat-card', x: 10, y: 0, w: 2, h: 1, minH: 1, statKey: 'warn' },
  // ── y=1, h=3 — Primary monitoring ────────────────────────────────────────
  { id: 'alerts', type: 'active-alerts', x: 0, y: 1, w: 6, h: 3, minW: 3, minH: 2 },
  { id: 'worldmap', type: 'world-map', x: 6, y: 1, w: 6, h: 3, minW: 3, minH: 2 },
  // ── y=4, h=2 — Gauges ────────────────────────────────────────────────────
  { id: 'gauge', type: 'health-gauge', x: 0, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
  { id: 'donut', type: 'severity-donut', x: 4, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
  { id: 'prometheus', type: 'prometheus', x: 8, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
  // ── y=6, h=2 — Operational ───────────────────────────────────────────────
  { id: 'infra', type: 'infrastructure', x: 0, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
  { id: 'heatmap', type: 'node-heatmap', x: 4, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
  { id: 'catalog', type: 'catalog-checks', x: 8, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
];

// ── react-grid-layout helpers ─────────────────────────────────────────────────

/**
 * Convert WidgetConfig[] to the Layout[] shape expected by react-grid-layout.
 * The `i` field is the widget id — RGL uses it as the React key and for position tracking.
 */
const toRglLayout = (widgets: WidgetConfig[]): Layout[] =>
  widgets.map(({ id, x, y, w, h, minW, minH }) => ({
    i: id,
    x,
    y,
    w,
    h,
    ...(minW !== undefined && { minW }),
    ...(minH !== undefined && { minH }),
  }));

/**
 * Merge position updates from react-grid-layout back into the WidgetConfig array.
 * Called on every drag/resize; persists to localStorage via saveWidgets.
 */
const applyRglLayout = (widgets: WidgetConfig[], newLayout: Layout[]): WidgetConfig[] => {
  const pos = Object.fromEntries(newLayout.map((l) => [l.i, l]));
  return widgets.map((w) => {
    const l = pos[w.id];
    if (!l) return w;
    return { ...w, x: l.x, y: l.y, w: l.w, h: l.h };
  });
};

const WIDGET_CATALOG: WidgetDefinition[] = [
  {
    type: 'stats-row',
    title: 'Stats Overview',
    description: 'Sites, rooms, racks, devices, CRIT, WARN counts',
    defaultW: 12,
    defaultH: 1,
    icon: BarChart2,
  },
  {
    type: 'health-gauge',
    title: 'Health Score',
    description: 'Overall infrastructure health as a gauge',
    defaultW: 4,
    defaultH: 2,
    icon: Activity,
  },
  {
    type: 'severity-donut',
    title: 'Severity Distribution',
    description: 'CRIT / WARN / OK node distribution',
    defaultW: 4,
    defaultH: 2,
    icon: Globe,
  },
  {
    type: 'active-alerts',
    title: 'Active Alerts',
    description: 'Live CRIT/WARN alerts with filters',
    defaultW: 8,
    defaultH: 2,
    icon: XCircle,
  },
  {
    type: 'slurm-cluster',
    title: 'Slurm Cluster',
    description: 'HPC cluster status and node breakdown',
    defaultW: 8,
    defaultH: 2,
    icon: Cpu,
    requiresSlurm: true,
  },
  {
    type: 'infrastructure',
    title: 'Infrastructure',
    description: 'Rooms health overview',
    defaultW: 4,
    defaultH: 2,
    icon: Server,
  },
  {
    type: 'prometheus',
    title: 'Prometheus',
    description: 'Monitoring connectivity and latency',
    defaultW: 4,
    defaultH: 2,
    icon: Zap,
  },
  {
    type: 'catalog-checks',
    title: 'Catalog & Checks',
    description: 'Templates and checks library stats',
    defaultW: 4,
    defaultH: 2,
    icon: ShieldCheck,
  },
  {
    type: 'stat-card',
    title: 'Stat Card',
    description: 'Single metric (sites, rooms, racks...)',
    defaultW: 2,
    defaultH: 1,
    icon: BarChart2,
  },
  {
    type: 'alert-count',
    title: 'Alert Count',
    description: 'CRIT + WARN count prominent display',
    defaultW: 3,
    defaultH: 2,
    icon: XCircle,
  },
  {
    type: 'rack-utilization',
    title: 'Rack Utilization',
    description: 'Fill % per room as bar chart',
    defaultW: 6,
    defaultH: 3,
    icon: Server,
  },
  {
    type: 'node-heatmap',
    title: 'Node Health',
    description: 'Alert nodes grouped by room with CRIT/WARN/OK summary',
    defaultW: 6,
    defaultH: 3,
    icon: Cpu,
  },
  {
    type: 'uptime',
    title: 'Scrape Latency',
    description: 'Last Prometheus scrape latency',
    defaultW: 3,
    defaultH: 2,
    icon: Zap,
  },
  {
    type: 'recent-alerts',
    title: 'Recent CRIT',
    description: 'Last 3 critical alerts',
    defaultW: 4,
    defaultH: 2,
    icon: AlertTriangle,
  },
  {
    type: 'site-map',
    title: 'Site Map',
    description: 'Sites with room counts',
    defaultW: 4,
    defaultH: 2,
    icon: Globe,
  },
  {
    type: 'check-summary',
    title: 'Check Summary',
    description: 'Checks library stats',
    defaultW: 3,
    defaultH: 2,
    icon: ShieldCheck,
  },
  {
    type: 'device-types',
    title: 'Device Types',
    description: 'Template types breakdown',
    defaultW: 4,
    defaultH: 2,
    icon: Layers,
  },
  {
    type: 'slurm-nodes',
    title: 'Slurm Nodes',
    description: 'Total Slurm nodes count',
    defaultW: 3,
    defaultH: 2,
    icon: Activity,
    requiresSlurm: true,
  },
  {
    type: 'slurm-utilization',
    title: 'Slurm Utilization',
    description: 'Allocated % gauge',
    defaultW: 6,
    defaultH: 3,
    icon: Activity,
    requiresSlurm: true,
  },
  {
    type: 'world-map',
    title: 'World Map',
    description: 'Mini map with site markers and health states',
    defaultW: 6,
    defaultH: 3,
    icon: Globe,
  },
];

// ── Primitive sub-components ──────────────────────────────────────────────────

type StatCardProps = {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
};

const StatCard = ({ icon: Icon, label, value, color, sub }: StatCardProps) => (
  <div className="flex h-full items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: `${color}18` }}
    >
      <Icon className="h-5 w-5" style={{ color }} />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 dark:text-gray-600">{sub}</p>}
    </div>
  </div>
);

const AlertSevBadge = ({ state }: { state: string }) => {
  if (state === 'CRIT')
    return (
      <span className="bg-error-50 text-error-500 dark:bg-error-500/15 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium">
        <span className="bg-error-500 h-1.5 w-1.5 rounded-full" />
        Critical
      </span>
    );
  return (
    <span className="bg-warning-50 text-warning-500 dark:bg-warning-500/15 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium">
      <span className="bg-warning-500 h-1.5 w-1.5 rounded-full" />
      Warning
    </span>
  );
};

type AlertRowProps = { alert: ActiveAlert; onClick: () => void };

const AlertRow = ({ alert, onClick }: AlertRowProps) => (
  <button
    onClick={onClick}
    className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
  >
    <AlertSevBadge state={alert.state} />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{alert.node_id}</p>
      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
        {[alert.device_name, alert.rack_name, alert.room_name].filter(Boolean).join(' · ')}
      </p>
    </div>
    {alert.checks.length > 0 && (
      <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        {alert.checks[0].id}
        {alert.checks.length > 1 ? ` +${alert.checks.length - 1}` : ''}
      </span>
    )}
    <ChevronRight className="group-hover:text-brand-500 h-3.5 w-3.5 shrink-0 text-gray-300 transition-colors dark:text-gray-700" />
  </button>
);

// ── HealthGauge SVG ───────────────────────────────────────────────────────────

type GaugeProps = { score: number; size?: number };

const HealthGauge = ({ score, size = 140 }: GaugeProps) => {
  const r = 52;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * 0.75;
  const dashOffset = arcLength - (Math.min(100, Math.max(0, score)) / 100) * arcLength;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="text-gray-900 dark:text-white"
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        className="stroke-gray-100 dark:stroke-gray-800"
        strokeWidth={10}
        strokeDasharray={`${arcLength} ${circumference - arcLength}`}
        strokeDashoffset={circumference * 0.125}
        strokeLinecap="round"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeDasharray={`${arcLength - dashOffset} ${circumference - (arcLength - dashOffset)}`}
        strokeDashoffset={circumference * 0.125}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="22"
        fontWeight="700"
        fill="currentColor"
      >
        {Math.round(score)}%
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="9"
        fill="#9ca3af"
        letterSpacing="1"
      >
        HEALTH
      </text>
    </svg>
  );
};

// ── SeverityDonut SVG ─────────────────────────────────────────────────────────

const polarToXY = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const SeverityDonut = ({ slices }: { slices: DonutSlice[] }) => {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 54;
  const innerR = 36;
  const total = slices.reduce((s, d) => s + d.count, 0);
  if (total === 0)
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center text-xs text-gray-400"
      >
        No data
      </div>
    );

  const paths = slices
    .filter((s) => s.count > 0)
    .reduce<{ items: { d: string; color: string; label: string; count: number }[]; angle: number }>(
      (acc, s) => {
        const fraction = s.count / total;
        const sweepAngle = fraction * 360;
        const endAngle = acc.angle + sweepAngle;
        const largeArc = sweepAngle > 180 ? 1 : 0;
        const p1 = polarToXY(cx, cy, outerR, acc.angle);
        const p2 = polarToXY(cx, cy, outerR, endAngle);
        const p3 = polarToXY(cx, cy, innerR, endAngle);
        const p4 = polarToXY(cx, cy, innerR, acc.angle);
        const d = `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y} Z`;
        return {
          items: [...acc.items, { d, color: s.color, label: s.label, count: s.count }],
          angle: endAngle,
        };
      },
      { items: [], angle: 0 }
    ).items;

  const dominant = slices
    .filter((s) => s.count > 0)
    .sort((a, b) => {
      const order = ['CRIT', 'WARN', 'UNKNOWN', 'OK'];
      return order.indexOf(a.label) - order.indexOf(b.label);
    })[0];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} />
      ))}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="700"
        fill={dominant?.color ?? '#9ca3af'}
      >
        {dominant?.label ?? ''}
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="8"
        fill="#9ca3af"
      >
        {total} nodes
      </text>
    </svg>
  );
};

// ── Widget placeholder helper ─────────────────────────────────────────────────

const WidgetPlaceholder = ({ title, icon: Icon }: { title: string; icon: React.ElementType }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/50">
    <Icon className="h-8 w-8 text-gray-300 dark:text-gray-700" />
    <p className="text-sm font-medium text-gray-400 dark:text-gray-600">{title}</p>
  </div>
);

// ── Widget: StatsRow ──────────────────────────────────────────────────────────

const StatsRowWidget = ({ data }: { data: DashboardData }) => (
  <div className="grid h-full grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-6">
    <StatCard icon={Globe} label="Sites" value={data.sites.length} color="#465fff" />
    <StatCard icon={DoorOpen} label="Rooms" value={data.totalRooms} color="#8b5cf6" />
    <StatCard icon={Server} label="Racks" value={data.totalRacks} color="#06b6d4" />
    <StatCard icon={Cpu} label="Devices" value={data.totalDevices} color="#10b981" />
    <StatCard
      icon={XCircle}
      label="CRIT"
      value={data.critCount}
      color="#ef4444"
      sub={
        data.critCount === 0
          ? 'All clear'
          : `${data.critCount} node${data.critCount > 1 ? 's' : ''}`
      }
    />
    <StatCard
      icon={AlertTriangle}
      label="WARN"
      value={data.warnCount}
      color="#f59e0b"
      sub={
        data.warnCount === 0
          ? 'All clear'
          : `${data.warnCount} node${data.warnCount > 1 ? 's' : ''}`
      }
    />
  </div>
);

// ── Widget: StatCard (single stat) ────────────────────────────────────────────

const STAT_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    getValue: (d: DashboardData) => string | number;
    getSub?: (d: DashboardData) => string;
  }
> = {
  sites: { label: 'Sites', icon: Globe, color: '#465fff', getValue: (d) => d.sites.length },
  rooms: { label: 'Rooms', icon: DoorOpen, color: '#8b5cf6', getValue: (d) => d.totalRooms },
  racks: { label: 'Racks', icon: Server, color: '#06b6d4', getValue: (d) => d.totalRacks },
  devices: { label: 'Devices', icon: Cpu, color: '#10b981', getValue: (d) => d.totalDevices },
  crit: {
    label: 'CRIT',
    icon: XCircle,
    color: '#ef4444',
    getValue: (d) => d.critCount,
    getSub: (d) =>
      d.critCount === 0 ? 'All clear' : `${d.critCount} node${d.critCount > 1 ? 's' : ''}`,
  },
  warn: {
    label: 'WARN',
    icon: AlertTriangle,
    color: '#f59e0b',
    getValue: (d) => d.warnCount,
    getSub: (d) =>
      d.warnCount === 0 ? 'All clear' : `${d.warnCount} node${d.warnCount > 1 ? 's' : ''}`,
  },
};

const StatCardWidget = ({ data, statKey }: { data: DashboardData; statKey?: string }) => {
  const cfg = STAT_CONFIG[statKey ?? 'sites'];
  if (!cfg) return null;
  return (
    <StatCard
      icon={cfg.icon}
      label={cfg.label}
      value={cfg.getValue(data)}
      color={cfg.color}
      sub={cfg.getSub?.(data)}
    />
  );
};

// ── Widget: HealthGauge ───────────────────────────────────────────────────────

const HealthGaugeWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <HealthGauge score={data.healthScore} />
    <div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Health Score</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {data.totalDevices - data.critCount - data.warnCount} / {data.totalDevices} devices healthy
      </p>
      {data.critCount > 0 && (
        <p className="mt-2 text-xs text-red-500">
          {data.critCount} CRIT alert{data.critCount > 1 ? 's' : ''}
        </p>
      )}
      {data.warnCount > 0 && (
        <p className="text-xs text-amber-500">
          {data.warnCount} WARN alert{data.warnCount > 1 ? 's' : ''}
        </p>
      )}
      {data.critCount === 0 && data.warnCount === 0 && (
        <p className="mt-2 flex items-center gap-1 text-xs text-green-500">
          <CheckCircle className="h-3.5 w-3.5" /> All devices healthy
        </p>
      )}
    </div>
  </div>
);

// ── Widget: SeverityDonut ─────────────────────────────────────────────────────

const SeverityDonutWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <SeverityDonut slices={data.donutSlices} />
    <div className="flex-1 space-y-2">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Severity Distribution
      </p>
      {data.donutSlices.map((s) => (
        <div key={s.label} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-gray-600 dark:text-gray-400">{s.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">
              {s.count}
            </span>
            <span className="text-gray-400">
              {data.totalDevices > 0 ? Math.round((s.count / data.totalDevices) * 100) : 0}%
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Widget: ActiveAlerts ──────────────────────────────────────────────────────

const ActiveAlertsWidget = ({
  data,
  navigate,
}: {
  data: DashboardData;
  navigate: (path: string) => void;
}) => {
  const critCount = data.alerts.filter((a) => a.state === 'CRIT').length;
  const warnCount = data.alerts.filter((a) => a.state === 'WARN').length;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <Bell className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active Alerts</h2>
          {critCount > 0 && (
            <span className="bg-error-50 text-error-500 dark:bg-error-500/15 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold">
              <span className="bg-error-500 h-1.5 w-1.5 rounded-full" />
              {critCount} CRIT
            </span>
          )}
          {warnCount > 0 && (
            <span className="bg-warning-50 text-warning-500 dark:bg-warning-500/15 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold">
              <span className="bg-warning-500 h-1.5 w-1.5 rounded-full" />
              {warnCount} WARN
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/notifications')}
          className="text-brand-500 hover:text-brand-600 text-xs font-medium transition-colors"
        >
          View all →
        </button>
      </div>

      {/* Toolbar — filtres style notifications */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2 dark:border-gray-800">
        <div className="flex h-8 items-center gap-0.5 rounded-lg border border-gray-200 px-1 dark:border-gray-700">
          {[
            { id: 'all', label: 'All', count: data.alerts.length },
            { id: 'CRIT', label: 'Critical', count: critCount },
            { id: 'WARN', label: 'Warning', count: warnCount },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                data.setAlertStateFilter(f.id);
                data.setAlertPage(0);
              }}
              className={`flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors ${
                data.alertStateFilter === f.id
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <span
                  className={`rounded-full px-1 text-[10px] font-bold ${
                    data.alertStateFilter === f.id
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {data.allRooms.length > 1 && (
          <select
            value={data.alertRoomFilter}
            onChange={(e) => {
              data.setAlertRoomFilter(e.target.value);
              data.setAlertPage(0);
            }}
            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          >
            <option value="all">All rooms</option>
            {data.allRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={data.alertLimit}
          onChange={(e) => {
            data.setAlertLimit(Number(e.target.value));
            data.setAlertPage(0);
          }}
          className="ml-auto h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
        >
          {[5, 10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n} rows
            </option>
          ))}
        </select>
      </div>

      {/* Body */}
      {data.alerts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <CheckCircle className="h-8 w-8 text-green-400" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            All systems healthy
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600">No active alerts</p>
        </div>
      ) : (
        <>
          <div className="flex-1 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
            {data.filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <CheckCircle className="h-7 w-7 text-green-400" />
                <p className="text-sm text-gray-400">No alerts match the filters</p>
              </div>
            ) : (
              data.filteredAlerts.map((alert, i) => (
                <AlertRow
                  key={i}
                  alert={alert}
                  onClick={() => navigate(`/views/rack/${alert.rack_id}`)}
                />
              ))
            )}
          </div>

          {/* Pagination footer */}
          {data.filteredAlertsAll.length > data.alertLimit && (
            <div className="flex shrink-0 items-center justify-between border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
              <button
                onClick={() => data.setAlertPage(Math.max(0, data.safeAlertPage - 1))}
                disabled={data.safeAlertPage === 0}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <span className="text-xs text-gray-400">
                <b className="text-gray-700 dark:text-gray-200">{data.safeAlertPage + 1}</b>
                {' / '}
                <b className="text-gray-700 dark:text-gray-200">{data.totalAlertPages}</b>
              </span>
              <button
                onClick={() =>
                  data.setAlertPage(Math.min(data.totalAlertPages - 1, data.safeAlertPage + 1))
                }
                disabled={data.safeAlertPage >= data.totalAlertPages - 1}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ── Widget: SlurmCluster ──────────────────────────────────────────────────────

const SlurmClusterWidget = ({
  data,
  navigate,
}: {
  data: DashboardData;
  navigate: (path: string) => void;
}) => {
  if (!data.slurmEnabled || !data.slurm) return null;
  const slurmTotal = data.slurm.total_nodes ?? 0;
  const slurmStatus = data.slurm.by_status ?? {};
  const slurmSevs = data.slurm.by_severity ?? {};
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Slurm Cluster</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
            {slurmTotal} nodes
          </span>
        </div>
        <button
          onClick={() => navigate('/slurm/overview')}
          className="text-brand-500 text-xs hover:underline"
        >
          Details →
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="space-y-1.5">
            <div className="flex h-6 w-full overflow-hidden rounded-full">
              {Object.entries(slurmStatus)
                .filter(([, v]) => v > 0)
                .map(([st, count]) => (
                  <div
                    key={st}
                    title={`${st}: ${count}`}
                    className="h-full transition-all"
                    style={{
                      width: `${(count / slurmTotal) * 100}%`,
                      backgroundColor: STATUS_COLOR[st.toLowerCase()] ?? '#6b7280',
                    }}
                  />
                ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(slurmStatus)
                .filter(([, v]) => v > 0)
                .map(([st, count]) => (
                  <div
                    key={st}
                    className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLOR[st.toLowerCase()] ?? '#6b7280' }}
                    />
                    <span className="capitalize">{st}</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{count}</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total', value: slurmTotal, color: 'text-gray-500' },
              { label: 'CRIT', value: slurmSevs['CRIT'] ?? 0, color: 'text-red-500' },
              { label: 'WARN', value: slurmSevs['WARN'] ?? 0, color: 'text-amber-500' },
              { label: 'OK', value: slurmSevs['OK'] ?? 0, color: 'text-green-500' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-gray-50 p-2.5 text-center dark:bg-gray-800"
              >
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Widget: Infrastructure ────────────────────────────────────────────────────

const InfrastructureWidget = ({
  data,
  navigate,
}: {
  data: DashboardData;
  navigate: (path: string) => void;
}) => (
  <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
      <div className="flex items-center gap-2">
        <Server className="text-brand-500 h-4 w-4" />
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Infrastructure</h2>
      </div>
      <button
        onClick={() => navigate('/views/worldmap')}
        className="text-brand-500 text-xs hover:underline"
      >
        World Map →
      </button>
    </div>
    <div className="flex-1 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
      {data.allRooms.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-gray-400">No rooms configured</div>
      ) : (
        data.allRooms.map((room) => (
          <button
            key={room.id}
            onClick={() => navigate(`/views/room/${room.id}`)}
            className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: HC[room.state] ?? HC.UNKNOWN }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                {room.name}
              </p>
              <p className="truncate text-[11px] text-gray-400">{room.siteName}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${SEV_PILL[room.state] ?? SEV_PILL.UNKNOWN}`}
            >
              {room.state}
            </span>
          </button>
        ))
      )}
    </div>
  </div>
);

// ── Widget: Prometheus ────────────────────────────────────────────────────────

const PrometheusWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-4 flex items-center gap-2">
      <Zap className="h-4 w-4 text-amber-500" />
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Prometheus</h2>
      <span
        className={`ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${data.promConnected ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${data.promConnected ? 'animate-pulse bg-green-500' : 'bg-red-500'}`}
        />
        {data.promConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
    {data.promStats ? (
      <div className="space-y-2">
        {[
          {
            label: 'Last latency',
            value: data.promStats.last_ms ? `${Math.round(data.promStats.last_ms)} ms` : '—',
          },
          {
            label: 'Avg latency',
            value: data.promStats.avg_ms ? `${Math.round(data.promStats.avg_ms)} ms` : '—',
          },
          {
            label: 'Next scrape',
            value: data.promNextSec > 0 ? `${data.promNextSec}s` : 'now',
          },
          {
            label: 'Heartbeat',
            value: data.promStats.heartbeat_seconds ? `${data.promStats.heartbeat_seconds}s` : '—',
          },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="font-mono font-medium text-gray-800 dark:text-gray-200">{value}</span>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-xs text-gray-400">Checking connection...</p>
    )}
  </div>
);

// ── Widget: CatalogChecks ─────────────────────────────────────────────────────

const CatalogChecksWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <div className="mb-4 flex items-center gap-2">
      <ShieldCheck className="text-brand-500 h-4 w-4" />
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Catalog &amp; Checks
      </h2>
    </div>

    {Object.keys(data.devsByType).length > 0 && (
      <div className="mb-4 space-y-2">
        <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
          Device Templates ({data.deviceTemplates.length})
        </p>
        {Object.entries(data.devsByType)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => {
            const Icon = DEV_TYPE_ICON[type] ?? Cpu;
            const color = DEV_TYPE_COLOR[type] ?? DEV_TYPE_COLOR.other;
            const pct = Math.round((count / data.deviceTemplates.length) * 100);
            return (
              <div key={type} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3 w-3 shrink-0" style={{ color }} />
                    <span className="text-gray-600 capitalize dark:text-gray-400">{type}</span>
                  </div>
                  <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                    {count}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
          <span>Rack templates</span>
          <span className="font-mono font-medium text-gray-600 dark:text-gray-400">
            {data.rackTemplateCount}
          </span>
        </div>
      </div>
    )}

    {data.checks.length > 0 && (
      <div className="space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
        <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
          Checks Library ({data.checks.length})
        </p>
        {Object.entries(data.checksByScope)
          .sort(([, a], [, b]) => b - a)
          .map(([scope, count]) => (
            <div key={scope} className="flex items-center justify-between text-xs">
              <span className="text-gray-500 capitalize dark:text-gray-400">{scope} scope</span>
              <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                {count}
              </span>
            </div>
          ))}
      </div>
    )}
  </div>
);

// ── Widget: AlertCount ────────────────────────────────────────────────────────

const AlertCountWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-baseline gap-3">
      <span className="text-5xl font-black text-red-500">{data.critCount}</span>
      <span className="text-2xl font-bold text-amber-500">+{data.warnCount}</span>
    </div>
    <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Active Alerts</p>
  </div>
);

// ── Widget: RackUtilization ───────────────────────────────────────────────────

const RackUtilizationWidget = ({ data }: { data: DashboardData }) => {
  const rooms = data.allRooms.slice(0, 6);
  if (rooms.length === 0) return <WidgetPlaceholder title="Rack Utilization" icon={Server} />;
  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-3 shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Rack Utilization
      </p>
      <div className="space-y-2">
        {rooms.map((r) => (
          <div key={r.id} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{r.name}</span>
              <span className="text-gray-700 dark:text-gray-300">{r.state}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${r.state === 'CRIT' ? 90 : r.state === 'WARN' ? 60 : r.state === 'OK' ? 40 : 20}%`,
                  backgroundColor: HC[r.state] ?? HC.UNKNOWN,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Widget: NodeHeatmap ───────────────────────────────────────────────────────

type NodeTooltip = { alert: ActiveAlert; x: number; y: number };

const NodeHeatmapWidget = ({ data }: { data: DashboardData }) => {
  const [tooltip, setTooltip] = useState<NodeTooltip | null>(null);

  const critAlerts = data.alerts.filter((a) => a.state === 'CRIT');
  const warnAlerts = data.alerts.filter((a) => a.state === 'WARN');
  const okCount = Math.max(0, data.totalDevices - critAlerts.length - warnAlerts.length);

  const byRoom = new Map<string, { name: string; alerts: ActiveAlert[] }>();
  for (const a of data.alerts) {
    if (!byRoom.has(a.room_id)) byRoom.set(a.room_id, { name: a.room_name, alerts: [] });
    (byRoom.get(a.room_id) as { name: string; alerts: ActiveAlert[] }).alerts.push(a);
  }
  const affectedRooms = [...byRoom.values()].sort(
    (a, b) =>
      (b.alerts.some((x) => x.state === 'CRIT') ? 1 : 0) -
      (a.alerts.some((x) => x.state === 'CRIT') ? 1 : 0)
  );

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Node Health</p>
        <div className="flex items-center gap-2.5 text-xs">
          {critAlerts.length > 0 && (
            <span className="font-semibold text-red-500">{critAlerts.length} CRIT</span>
          )}
          {warnAlerts.length > 0 && (
            <span className="font-semibold text-amber-500">{warnAlerts.length} WARN</span>
          )}
          <span className="text-gray-400">{okCount} OK</span>
        </div>
      </div>

      {/* Content */}
      {affectedRooms.length === 0 ? (
        <div className="flex flex-1 items-center justify-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-500" />
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            All nodes healthy
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto">
          {affectedRooms.map((room) => (
            <div key={room.name}>
              <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                {room.name}
              </p>
              <div className="flex flex-wrap gap-1">
                {room.alerts
                  .sort((a, b) => (a.state === 'CRIT' ? -1 : 1) - (b.state === 'CRIT' ? -1 : 1))
                  .map((a) => (
                    <div
                      key={a.node_id}
                      className="h-5 w-5 cursor-default rounded-sm"
                      style={{ backgroundColor: HC[a.state] ?? HC.UNKNOWN }}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ alert: a, x: rect.left + rect.width / 2, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tooltip — fixed so it escapes overflow:hidden/auto containers */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-[200]"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
        >
          <div className="rounded-xl bg-gray-900 px-3 py-2 shadow-2xl dark:bg-gray-800">
            <p className="font-mono text-sm font-bold text-white">{tooltip.alert.node_id}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {tooltip.alert.rack_name} · {tooltip.alert.room_name}
            </p>
            {tooltip.alert.checks.length > 0 && (
              <p className="mt-1 font-mono text-[10px] text-gray-500">
                {tooltip.alert.checks[0].id}
                {tooltip.alert.checks.length > 1 ? ` +${tooltip.alert.checks.length - 1}` : ''}
              </p>
            )}
            <p
              className="mt-1 text-xs font-bold"
              style={{ color: HC[tooltip.alert.state] ?? HC.UNKNOWN }}
            >
              {tooltip.alert.state}
            </p>
          </div>
          {/* Arrow pointing down */}
          <div
            className="mx-auto h-0 w-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #111827',
            }}
          />
        </div>
      )}
    </div>
  );
};

// ── Widget: Uptime ────────────────────────────────────────────────────────────

const UptimeWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <Zap className="h-6 w-6 text-amber-500" />
    <p className="text-2xl font-bold text-gray-900 dark:text-white">
      {data.promStats?.last_ms ? `${Math.round(data.promStats.last_ms)} ms` : '—'}
    </p>
    <p className="text-xs text-gray-400">Last scrape latency</p>
  </div>
);

// ── Widget: RecentAlerts ──────────────────────────────────────────────────────

const RecentAlertsWidget = ({ data }: { data: DashboardData }) => {
  const top3 = data.alerts.filter((a) => a.state === 'CRIT').slice(0, 3);
  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-2 shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Recent CRIT
      </p>
      {top3.length === 0 ? (
        <p className="text-xs text-green-500">No CRIT alerts</p>
      ) : (
        <div className="space-y-2">
          {top3.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <span className="truncate font-mono text-gray-800 dark:text-gray-200">
                {a.node_id}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Widget: SiteMap ───────────────────────────────────────────────────────────

const SiteMapWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <p className="mb-3 shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">Sites</p>
    <div className="space-y-2">
      {data.sites.map((s) => (
        <div key={s.id} className="flex items-center justify-between text-xs">
          <span className="font-medium text-gray-800 dark:text-gray-200">{s.name}</span>
          <span className="text-gray-400">{s.rooms?.length ?? 0} rooms</span>
        </div>
      ))}
      {data.sites.length === 0 && <p className="text-xs text-gray-400">No sites</p>}
    </div>
  </div>
);

// ── Widget: CheckSummary ──────────────────────────────────────────────────────

const CheckSummaryWidget = ({ data }: { data: DashboardData }) => {
  const scopes = data.checks.reduce<Record<string, number>>((a, c) => {
    const key = c.scope ?? 'unknown';
    a[key] = (a[key] ?? 0) + 1;
    return a;
  }, {});
  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-3 shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">Checks</p>
      <div className="flex items-end gap-4">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">
          {data.checks.length}
        </span>
        <div className="space-y-0.5 pb-0.5">
          {Object.entries(scopes).map(([scope, n]) => (
            <div key={scope} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="capitalize">{scope}</span>
              <span className="font-semibold">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Widget: DeviceTypes ───────────────────────────────────────────────────────

const DeviceTypesWidget = ({ data }: { data: DashboardData }) => {
  const types = data.deviceTemplates.reduce<Record<string, number>>((a, t) => {
    const key = t.type ?? 'other';
    a[key] = (a[key] ?? 0) + 1;
    return a;
  }, {});
  const total = data.deviceTemplates.length;
  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-3 shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Device Types
      </p>
      <div className="space-y-1.5">
        {Object.entries(types)
          .sort(([, a], [, b]) => b - a)
          .map(([type, n]) => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${total > 0 ? (n / total) * 100 : 0}%` }}
                />
              </div>
              <span className="w-16 text-gray-600 capitalize dark:text-gray-400">{type}</span>
              <span className="w-4 text-right font-mono text-gray-700 dark:text-gray-300">{n}</span>
            </div>
          ))}
      </div>
    </div>
  );
};

// ── Widget: SlurmNodes ────────────────────────────────────────────────────────

const SlurmNodesWidget = ({ data }: { data: DashboardData }) => (
  <div className="flex h-full flex-col items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    {data.slurmEnabled && data.slurm ? (
      <>
        <p className="text-5xl font-black text-purple-500">{data.slurm.total_nodes}</p>
        <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Slurm Nodes</p>
      </>
    ) : (
      <p className="text-xs text-gray-400">Slurm not enabled</p>
    )}
  </div>
);

// ── Widget: SlurmUtilization ──────────────────────────────────────────────────

const SlurmUtilizationWidget = ({ data }: { data: DashboardData }) => {
  if (!data.slurmEnabled || !data.slurm)
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-gray-200 bg-white p-5 text-xs text-gray-400 dark:border-gray-800 dark:bg-gray-900">
        Slurm not enabled
      </div>
    );
  const total = data.slurm.total_nodes;
  const allocated = (data.slurm.by_status?.allocated ?? 0) + (data.slurm.by_status?.alloc ?? 0);
  const pct = total > 0 ? Math.round((allocated / total) * 100) : 0;
  return (
    <div className="flex h-full flex-col justify-center rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="mb-3 shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Slurm Utilization
      </p>
      <div className="flex items-center gap-4">
        <p
          className="text-4xl font-black"
          style={{ color: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981' }}
        >
          {pct}%
        </p>
        <div className="flex-1 space-y-1">
          <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400">
            {allocated}/{total} nodes allocated
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Widget: WorldMap ──────────────────────────────────────────────────────────

const WorldMapWidget = ({
  data,
  navigate,
}: {
  data: DashboardData;
  navigate: (path: string) => void;
}) => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const { config } = useAppConfigSafe();

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // localStorage overrides the backend config so the user's map-style preference
  // survives page reloads without a round-trip to the API (same as WorldMapPage).
  const mapStyle = (localStorage.getItem('rackscope.map.style') ||
    config?.map?.style ||
    'minimal') as MapStyle;
  const geoSites = data.sites.filter((s) => s.location?.lat != null && s.location?.lon != null);

  const markers: SiteMarker[] = geoSites.map((s) => ({
    id: s.id,
    name: s.name,
    lat: (s.location as NonNullable<typeof s.location>).lat,
    lon: (s.location as NonNullable<typeof s.location>).lon,
    roomCount: s.rooms?.length ?? 0,
  }));

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Globe className="text-brand-500 h-4 w-4" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">World Map</p>
          {geoSites.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
              {geoSites.length} site{geoSites.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate('/views/worldmap')}
          className="text-brand-500 text-xs hover:underline"
        >
          Full map →
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {geoSites.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-gray-400">
            <Globe className="h-6 w-6 text-gray-200 dark:text-gray-700" />
            No sites with coordinates
          </div>
        ) : (
          <OfflineWorldMap
            sites={markers}
            isDark={isDark}
            mapStyle={mapStyle}
            initialCenter={[10, 20]}
            initialZoom={1}
            zoomControl
            onSiteClick={() => navigate('/views/worldmap')}
          />
        )}
      </div>
    </div>
  );
};

// ── Widget renderer ───────────────────────────────────────────────────────────

type WidgetRendererProps = {
  widget: WidgetConfig;
  data: DashboardData;
  navigate: (path: string) => void;
};

const WidgetContent = ({ widget, data, navigate }: WidgetRendererProps) => {
  switch (widget.type) {
    case 'stat-card':
      return <StatCardWidget data={data} statKey={widget.statKey} />;
    case 'stats-row':
      return <StatsRowWidget data={data} />;
    case 'health-gauge':
      return <HealthGaugeWidget data={data} />;
    case 'severity-donut':
      return <SeverityDonutWidget data={data} />;
    case 'active-alerts':
      return <ActiveAlertsWidget data={data} navigate={navigate} />;
    case 'slurm-cluster':
      return <SlurmClusterWidget data={data} navigate={navigate} />;
    case 'infrastructure':
      return <InfrastructureWidget data={data} navigate={navigate} />;
    case 'prometheus':
      return <PrometheusWidget data={data} />;
    case 'catalog-checks':
      return <CatalogChecksWidget data={data} />;
    case 'alert-count':
      return <AlertCountWidget data={data} />;
    case 'rack-utilization':
      return <RackUtilizationWidget data={data} />;
    case 'node-heatmap':
      return <NodeHeatmapWidget data={data} />;
    case 'uptime':
      return <UptimeWidget data={data} />;
    case 'recent-alerts':
      return <RecentAlertsWidget data={data} />;
    case 'site-map':
      return <SiteMapWidget data={data} />;
    case 'check-summary':
      return <CheckSummaryWidget data={data} />;
    case 'device-types':
      return <DeviceTypesWidget data={data} />;
    case 'slurm-nodes':
      return <SlurmNodesWidget data={data} />;
    case 'slurm-utilization':
      return <SlurmUtilizationWidget data={data} />;
    case 'world-map':
      return <WorldMapWidget data={data} navigate={navigate} />;
    default:
      return null;
  }
};

// ── Widget picker panel ───────────────────────────────────────────────────────

type WidgetPickerProps = {
  widgets: WidgetConfig[];
  slurmEnabled: boolean;
  onAdd: (type: WidgetType) => void;
  onReset: () => void;
  onClose: () => void;
  open: boolean;
};

const WidgetPicker = ({
  widgets,
  slurmEnabled,
  onAdd,
  onReset,
  onClose,
  open,
}: WidgetPickerProps) => {
  const available = WIDGET_CATALOG.filter((def) => !def.requiresSlurm || slurmEnabled);
  const addedTypes = new Set(widgets.map((w) => w.type));

  const groups: { label: string; defs: typeof WIDGET_CATALOG }[] = [
    {
      label: 'Stats',
      defs: available.filter((d) =>
        ['stat-card', 'alert-count', 'uptime', 'slurm-nodes'].includes(d.type)
      ),
    },
    {
      label: 'Charts',
      defs: available.filter((d) =>
        ['health-gauge', 'severity-donut', 'rack-utilization', 'slurm-utilization'].includes(d.type)
      ),
    },
    {
      label: 'Monitoring',
      defs: available.filter((d) =>
        ['active-alerts', 'recent-alerts', 'node-heatmap', 'world-map'].includes(d.type)
      ),
    },
    {
      label: 'Overview',
      defs: available.filter((d) =>
        ['infrastructure', 'site-map', 'prometheus', 'slurm-cluster'].includes(d.type)
      ),
    },
    {
      label: 'Catalog',
      defs: available.filter((d) =>
        ['catalog-checks', 'check-summary', 'device-types'].includes(d.type)
      ),
    },
    { label: 'Stats Row (legacy)', defs: available.filter((d) => d.type === 'stats-row') },
  ].filter((g) => g.defs.length > 0);

  return (
    <div
      className={`fixed top-[72px] right-0 z-40 flex h-[calc(100vh-72px)] w-[400px] flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out dark:border-gray-800 dark:bg-gray-950 ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Widget Library</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {addedTypes.size} / {available.length} widgets active
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600 dark:border-gray-700 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Widget list grouped */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                {group.label}
              </p>
              <div className="space-y-1.5">
                {group.defs.map((def) => {
                  const isAdded = addedTypes.has(def.type);
                  const Icon = def.icon;
                  return (
                    <button
                      key={def.type}
                      onClick={() => !isAdded && onAdd(def.type)}
                      disabled={isAdded}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                        isAdded
                          ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-50 dark:border-gray-800 dark:bg-gray-900/50'
                          : 'hover:border-brand-500/50 hover:bg-brand-50 dark:hover:bg-brand-500/10 cursor-pointer border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isAdded
                            ? 'bg-gray-100 dark:bg-gray-800'
                            : 'bg-brand-50 dark:bg-brand-500/10'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${isAdded ? 'text-gray-400' : 'text-brand-500'}`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {def.title}
                        </p>
                        <p className="truncate text-xs text-gray-400">{def.description}</p>
                      </div>
                      {isAdded ? (
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400 dark:bg-gray-800">
                          Added
                        </span>
                      ) : (
                        <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/10 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                          + Add
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-100 p-4 dark:border-gray-800">
        <button
          onClick={onReset}
          className="hover:border-brand-500/50 hover:text-brand-500 w-full rounded-xl border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-400 transition-colors dark:border-gray-700"
        >
          ↺ Reset to default layout
        </button>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const DashboardPage = () => {
  const navigate = useNavigate();

  // ── Data state ────────────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [roomStates, setRoomStates] = useState<Record<string, string>>({});
  const [slurm, setSlurm] = useState<SlurmSummary | null>(null);
  const [slurmEnabled, setSlurmEnabled] = useState(false);
  const [promStats, setPromStats] = useState<PrometheusStats | null>(null);
  const [deviceTemplates, setDeviceTemplates] = useState<DeviceTemplate[]>([]);
  const [rackTemplateCount, setRackTemplateCount] = useState(0);
  const [checks, setChecks] = useState<CheckDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Alert filter state ────────────────────────────────────────────────────
  const [alertLimit, setAlertLimit] = useState<number>(() => {
    const stored = localStorage.getItem('rackscope.dash.alert-limit');
    return stored ? Number(stored) : 5;
  });
  const [alertPage, setAlertPage] = useState(0);
  const [alertStateFilter, setAlertStateFilter] = useState<string>('all');
  const [alertRoomFilter, setAlertRoomFilter] = useState<string>('all');

  // ── Settings panel state ──────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const stored = localStorage.getItem('rackscope.dash.refresh');
    return stored ? Number(stored) : 30;
  });
  const [defaultAlertLimit, setDefaultAlertLimit] = useState<number>(() => {
    const stored = localStorage.getItem('rackscope.dash.alert-limit');
    return stored ? Number(stored) : 5;
  });

  // ── Dashboard layout state ────────────────────────────────────────────────
  const [dashboards, setDashboards] = useState<Dashboard[]>(() => {
    try {
      const version = localStorage.getItem(DASHBOARDS_STORAGE_VERSION_KEY);
      const stored = localStorage.getItem(DASHBOARDS_STORAGE_KEY);
      if (stored && version === DASHBOARDS_STORAGE_VERSION)
        return JSON.parse(stored) as Dashboard[];
    } catch {
      /* ignore */
    }
    return [{ id: 'default', name: 'Overview', widgets: DEFAULT_WIDGETS }];
  });
  const [activeDashboardId, setActiveDashboardId] = useState<string>(() => {
    return localStorage.getItem(ACTIVE_DASHBOARD_STORAGE_KEY) ?? 'default';
  });
  // Kept in sync so the ResizeObserver callback always reads the current dashboard
  // id without capturing a stale closure over activeDashboardId.
  const activeDashboardIdRef = useRef(activeDashboardId);

  const activeDashboard = dashboards.find((d) => d.id === activeDashboardId) ?? dashboards[0];
  const widgets = activeDashboard?.widgets ?? DEFAULT_WIDGETS;

  useEffect(() => {
    activeDashboardIdRef.current = activeDashboardId;
  }, [activeDashboardId]);

  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Snapshot taken when entering edit mode — used by Discard to roll back
  const widgetSnapshot = useRef<WidgetConfig[]>([]);
  // Rename state for dashboard tabs
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // react-grid-layout needs explicit pixel width; a ResizeObserver keeps it current.
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(1200);

  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setGridWidth(entry.contentRect.width);
    });
    obs.observe(el);
    setGridWidth(el.getBoundingClientRect().width);
    return () => obs.disconnect();
  }, []);

  // ── Widget + dashboard operations ─────────────────────────────────────────
  const persistDashboards = (next: Dashboard[]) => {
    localStorage.setItem(DASHBOARDS_STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(DASHBOARDS_STORAGE_VERSION_KEY, DASHBOARDS_STORAGE_VERSION);
  };

  const saveWidgets = useCallback(
    (newWidgets: WidgetConfig[]) => {
      const next = dashboards.map((d) =>
        d.id === activeDashboardId ? { ...d, widgets: newWidgets } : d
      );
      setDashboards(next);
      persistDashboards(next);
    },
    [dashboards, activeDashboardId]
  );

  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      const updated = applyRglLayout(widgets, newLayout);
      saveWidgets(updated);
    },
    [widgets, saveWidgets]
  );

  const removeWidget = (id: string) => saveWidgets(widgets.filter((w) => w.id !== id));

  const addWidget = (type: WidgetType) => {
    const def = WIDGET_CATALOG.find((d) => d.type === type);
    if (!def) return;
    const maxY = widgets.reduce((m, w) => Math.max(m, w.y + w.h), 0);
    saveWidgets([
      ...widgets,
      {
        id: `${type}-${Date.now()}`,
        type,
        x: 0,
        y: maxY,
        w: def.defaultW,
        h: def.defaultH,
        minH: def.defaultH > 1 ? 2 : 1,
      },
    ]);
  };

  const resetLayout = () => saveWidgets(DEFAULT_WIDGETS);

  const switchDashboard = (id: string) => {
    setActiveDashboardId(id);
    localStorage.setItem(ACTIVE_DASHBOARD_STORAGE_KEY, id);
    setEditMode(false);
    setPickerOpen(false);
  };

  const createDashboard = () => {
    const id = `dash-${Date.now()}`;
    const name = `Dashboard ${dashboards.length + 1}`;
    const next = [...dashboards, { id, name, widgets: [] }];
    setDashboards(next);
    persistDashboards(next);
    setActiveDashboardId(id);
    localStorage.setItem(ACTIVE_DASHBOARD_STORAGE_KEY, id);
    setEditMode(false);
    setPickerOpen(false);
    setRenamingId(id);
    setRenameValue(name);
  };

  const deleteDashboard = (id: string) => {
    if (dashboards.length <= 1) return;
    const next = dashboards.filter((d) => d.id !== id);
    setDashboards(next);
    persistDashboards(next);
    if (activeDashboardId === id) {
      const newActive = next[0].id;
      setActiveDashboardId(newActive);
      localStorage.setItem(ACTIVE_DASHBOARD_STORAGE_KEY, newActive);
    }
  };

  const duplicateDashboard = (id: string) => {
    const src = dashboards.find((d) => d.id === id);
    if (!src) return;
    const newId = `dash-${Date.now()}`;
    const next = [
      ...dashboards,
      { id: newId, name: `${src.name} (copy)`, widgets: src.widgets.map((w) => ({ ...w })) },
    ];
    setDashboards(next);
    persistDashboards(next);
    setActiveDashboardId(newId);
    localStorage.setItem(ACTIVE_DASHBOARD_STORAGE_KEY, newId);
  };

  const renameDashboard = (id: string, name: string) => {
    const next = dashboards.map((d) => (d.id === id ? { ...d, name } : d));
    setDashboards(next);
    persistDashboards(next);
  };

  const finishRename = () => {
    if (renamingId && renameValue.trim()) renameDashboard(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadAll = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [alertsData, sitesData, configData, promData, catalogData, checksData] =
        await Promise.all([
          api.getActiveAlerts(),
          api.getSites(),
          api.getConfig(),
          api.getPrometheusStats().catch(() => null),
          api.getCatalog().catch(() => null),
          api.getChecks().catch(() => null),
        ]);
      setAlerts(alertsData?.alerts ?? []);
      const siteList = Array.isArray(sitesData) ? sitesData : [];
      setSites(siteList);
      setPromStats(promData);
      setDeviceTemplates(catalogData?.device_templates ?? []);
      setRackTemplateCount(catalogData?.rack_templates?.length ?? 0);
      setChecks(checksData?.checks ?? []);

      const slEnabled = Boolean(configData?.plugins?.slurm?.enabled);
      setSlurmEnabled(slEnabled);
      if (slEnabled) {
        const slurmData = await api.getSlurmSummary().catch(() => null);
        setSlurm(slurmData);
      }

      const roomIds: string[] = siteList.flatMap((s: Site) => (s.rooms ?? []).map((r) => r.id));
      const stateEntries = await Promise.all(
        roomIds.map((id) =>
          api
            .getRoomState(id)
            .then((s: RoomState) => [id, s?.state ?? 'UNKNOWN'] as [string, string])
            .catch(() => [id, 'UNKNOWN'] as [string, string])
        )
      );
      setRoomStates(Object.fromEntries(stateEntries));
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAll();
    const t = setInterval(() => void loadAll(true), refreshInterval * 1000);
    return () => clearInterval(t);
  }, [refreshInterval]);

  // ── Prometheus countdown ticker ───────────────────────────────────────────
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalRooms = sites.reduce((n, s) => n + (s.rooms?.length ?? 0), 0);
  const totalRacks = sites.reduce(
    (n, s) =>
      n +
      (s.rooms ?? []).reduce(
        (rn, r) =>
          rn +
          (r.aisles ?? []).reduce((an, a) => an + (a.racks?.length ?? 0), 0) +
          (r.standalone_racks?.length ?? 0),
        0
      ),
    0
  );
  const totalDevices = sites.reduce(
    (n, s) =>
      n +
      (s.rooms ?? []).reduce(
        (rn, r) =>
          rn +
          (r.aisles ?? []).reduce(
            (an, a) =>
              an + (a.racks ?? []).reduce((dn, rack) => dn + (rack.devices?.length ?? 0), 0),
            0
          ),
        0
      ),
    0
  );

  const critCount = alerts.filter((a) => a.state === 'CRIT').length;
  const warnCount = alerts.filter((a) => a.state === 'WARN').length;
  const healthScore =
    totalDevices > 0
      ? Math.round(((totalDevices - critCount - warnCount) / totalDevices) * 100)
      : 100;

  const donutSlices: DonutSlice[] = [
    { label: 'CRIT', count: critCount, color: '#ef4444' },
    { label: 'WARN', count: warnCount, color: '#f59e0b' },
    { label: 'OK', count: Math.max(0, totalDevices - critCount - warnCount), color: '#10b981' },
  ].filter((s) => s.count > 0);

  const allRooms: RoomWithState[] = sites.flatMap((s) =>
    (s.rooms ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      siteName: s.name,
      state: roomStates[r.id] ?? 'UNKNOWN',
    }))
  );

  const devsByType = deviceTemplates.reduce<Record<string, number>>((acc, t) => {
    acc[t.type ?? 'other'] = (acc[t.type ?? 'other'] ?? 0) + 1;
    return acc;
  }, {});
  const checksByScope = checks.reduce<Record<string, number>>((acc, c) => {
    acc[c.scope ?? 'unknown'] = (acc[c.scope ?? 'unknown'] ?? 0) + 1;
    return acc;
  }, {});

  // ── Filtered alerts ───────────────────────────────────────────────────────
  const filteredAlertsAll = alerts
    .filter((a) => alertStateFilter === 'all' || a.state === alertStateFilter)
    .filter((a) => alertRoomFilter === 'all' || a.room_id === alertRoomFilter)
    .sort((a, b) => (a.state === 'CRIT' ? -1 : 1) - (b.state === 'CRIT' ? -1 : 1));
  const totalAlertPages = Math.max(1, Math.ceil(filteredAlertsAll.length / alertLimit));
  const safeAlertPage = Math.min(alertPage, totalAlertPages - 1);
  const filteredAlerts = filteredAlertsAll.slice(
    safeAlertPage * alertLimit,
    (safeAlertPage + 1) * alertLimit
  );

  // ── Prometheus countdown ──────────────────────────────────────────────────
  const promConnected = Boolean(promStats?.last_ts);
  const promNextMs = promStats?.next_ts ? promStats.next_ts - now : null;
  const promNextSec = promNextMs && promNextMs > 0 ? Math.ceil(promNextMs / 1000) : 0;

  // ── Shared data object passed to all widgets ──────────────────────────────
  const dashboardData: DashboardData = {
    alerts,
    sites,
    roomStates,
    slurm,
    slurmEnabled,
    promStats,
    deviceTemplates,
    rackTemplateCount,
    checks,
    critCount,
    warnCount,
    totalDevices,
    totalRacks,
    totalRooms,
    healthScore,
    allRooms,
    donutSlices,
    alertLimit,
    setAlertLimit,
    alertPage,
    setAlertPage,
    alertStateFilter,
    setAlertStateFilter,
    alertRoomFilter,
    setAlertRoomFilter,
    filteredAlerts,
    filteredAlertsAll,
    totalAlertPages,
    safeAlertPage,
    promNextSec,
    promConnected,
    devsByType,
    checksByScope,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {/* Dashboard tabs */}
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {dashboards.map((d) => {
              const isActive = d.id === activeDashboardId;
              if (renamingId === d.id) {
                return (
                  <form
                    key={d.id}
                    onSubmit={(e) => {
                      e.preventDefault();
                      finishRename();
                    }}
                  >
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={finishRename}
                      className="border-brand-400 h-8 w-36 rounded-lg border bg-white px-2 text-sm focus:outline-none dark:bg-gray-800 dark:text-white"
                    />
                  </form>
                );
              }
              return (
                <div
                  key={d.id}
                  className={`group flex h-8 items-center gap-1 rounded-lg px-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-500 text-white'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200'
                  }`}
                >
                  <button
                    className="max-w-[120px] truncate font-medium"
                    onClick={() => switchDashboard(d.id)}
                  >
                    {d.name}
                  </button>
                  {isActive && (
                    <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        title="Rename"
                        onClick={() => {
                          setRenamingId(d.id);
                          setRenameValue(d.name);
                        }}
                        className="rounded p-0.5 hover:bg-white/20"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        title="Duplicate"
                        onClick={() => duplicateDashboard(d.id)}
                        className="rounded p-0.5 hover:bg-white/20"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      {dashboards.length > 1 && (
                        <button
                          title="Delete"
                          onClick={() => deleteDashboard(d.id)}
                          className="rounded p-0.5 hover:bg-red-500/30"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  )}
                </div>
              );
            })}
            <button
              onClick={createDashboard}
              title="New dashboard"
              className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-200"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button
                onClick={() => setPickerOpen((o) => !o)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  pickerOpen
                    ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-700/50 dark:bg-brand-500/10 dark:text-brand-400'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
                }`}
              >
                <PanelRight className="h-4 w-4" />
                Widgets
              </button>
              <button
                onClick={() => {
                  saveWidgets(widgetSnapshot.current);
                  setEditMode(false);
                  setPickerOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              >
                <Undo2 className="h-4 w-4" />
                Discard
              </button>
              <button
                onClick={() => {
                  saveWidgets(widgets);
                  setEditMode(false);
                  setPickerOpen(false);
                }}
                className="bg-brand-500 hover:bg-brand-600 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white transition-colors"
              >
                <Check className="h-4 w-4" />
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                widgetSnapshot.current = widgets;
                setEditMode(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <LayoutDashboard className="h-4 w-4" />
              Edit layout
            </button>
          )}
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button
            onClick={() => void loadAll(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Grid — powered by react-grid-layout ─────────────────────────────── */}
      <div ref={gridContainerRef} className={editMode && pickerOpen ? 'pr-[420px]' : ''}>
        {loading ? (
          /* Loading skeleton */
          <div className="grid grid-cols-12 gap-5" style={{ gridAutoRows: `${ROW_PX}px` }}>
            {[12, 4, 4, 4, 8, 4].map((_, i) => (
              <div
                key={i}
                className="col-span-4 h-32 animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : (
          <ReactGridLayout
            layout={toRglLayout(widgets)}
            onLayoutChange={handleLayoutChange}
            width={gridWidth}
            cols={12}
            rowHeight={ROW_PX}
            margin={[20, 20]}
            containerPadding={[0, 0]}
            isDraggable={editMode}
            isResizable={editMode}
            draggableHandle=".rgl-drag-handle"
            resizeHandles={['se', 's', 'e']}
            useCSSTransforms
          >
            {widgets.map((widget) => (
              <div
                key={widget.id}
                className={`group relative ${editMode ? 'ring-brand-500/20 rounded-2xl ring-1 ring-offset-1 ring-offset-transparent' : ''}`}
              >
                {/* Edit mode top bar (drag handle + remove) */}
                {editMode && (
                  <div className="rgl-drag-handle bg-brand-500/15 border-brand-500/20 absolute inset-x-0 top-0 z-20 flex h-7 cursor-grab items-center justify-between rounded-t-2xl border-b px-3 active:cursor-grabbing">
                    <GripVertical className="text-brand-500 h-4 w-4" />
                    <div className="flex items-center gap-1">
                      <span className="bg-brand-500/20 text-brand-500 rounded px-1.5 py-0.5 font-mono text-[10px]">
                        {widget.w}/{widget.h}
                      </span>
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeWidget(widget.id);
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded border border-red-300 bg-white text-[11px] text-red-500 hover:bg-red-50 dark:border-red-800 dark:bg-gray-900"
                        title="Remove widget"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {/* Widget content — pointer-events-none in edit mode so RGL handles all mouse events */}
                <div className={`h-full ${editMode ? 'pointer-events-none select-none' : ''}`}>
                  <WidgetContent widget={widget} data={dashboardData} navigate={navigate} />
                </div>
              </div>
            ))}
          </ReactGridLayout>
        )}
      </div>

      {/* Widget picker panel — independent from edit mode, toggled via "Widgets" button */}
      {editMode && (
        <WidgetPicker
          widgets={widgets}
          slurmEnabled={slurmEnabled}
          onAdd={addWidget}
          onReset={resetLayout}
          onClose={() => setPickerOpen(false)}
          open={pickerOpen}
        />
      )}

      {/* Settings panel */}
      {settingsOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSettingsOpen(false)} />
          <div className="fixed top-[72px] right-0 z-50 h-[calc(100vh-72px)] w-80 border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Dashboard Settings
              </h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Refresh interval
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[15, 30, 60, 120].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setRefreshInterval(s);
                        localStorage.setItem('rackscope.dash.refresh', String(s));
                      }}
                      className={`rounded-xl py-2 text-xs font-medium transition-colors ${
                        refreshInterval === s
                          ? 'bg-brand-500 text-white'
                          : 'border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {s >= 60 ? `${s / 60}m` : `${s}s`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Default alert count
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[5, 10, 20, 50, 100].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setDefaultAlertLimit(n);
                        setAlertLimit(n);
                        localStorage.setItem('rackscope.dash.alert-limit', String(n));
                      }}
                      className={`rounded-xl py-2 text-xs font-medium transition-colors ${
                        defaultAlertLimit === n
                          ? 'bg-brand-500 text-white'
                          : 'border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
