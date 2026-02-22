import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  DoorOpen,
  Globe,
  Cpu,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Activity,
  Zap,
  RefreshCw,
  ChevronRight,
  Layers,
  ShieldCheck,
  Network,
  SlidersHorizontal,
  X,
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

// Device type icon + color mapping
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

// ── Sub-components ────────────────────────────────────────────────────────────

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

type StatCardProps = {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
};

const StatCard = ({ icon: Icon, label, value, color, sub }: StatCardProps) => (
  <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
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

type AlertRowProps = { alert: ActiveAlert; onClick: () => void };

const AlertRow = ({ alert, onClick }: AlertRowProps) => (
  <button
    onClick={onClick}
    className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
    style={{ borderLeftWidth: 3, borderLeftColor: HC[alert.state] ?? HC.UNKNOWN }}
  >
    <div
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `${HC[alert.state] ?? HC.UNKNOWN}18` }}
    >
      {alert.state === 'CRIT' ? (
        <XCircle className="h-3.5 w-3.5" style={{ color: HC.CRIT }} />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5" style={{ color: HC.WARN }} />
      )}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
          {alert.node_id}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${SEV_PILL[alert.state] ?? ''}`}
        >
          {alert.state}
        </span>
      </div>
      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
        {alert.device_name} · {alert.rack_name} · {alert.room_name}
      </p>
      {alert.checks.length > 0 && (
        <p className="mt-0.5 truncate font-mono text-[10px] text-gray-400">
          {alert.checks[0].id}
          {alert.checks.length > 1 ? ` +${alert.checks.length - 1}` : ''}
        </p>
      )}
    </div>
    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300 dark:text-gray-700" />
  </button>
);

// ── HealthGauge ───────────────────────────────────────────────────────────────

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
      {/* Track */}
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
      {/* Progress */}
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
      {/* Score */}
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

// ── SeverityDonut ─────────────────────────────────────────────────────────────

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

// ── Main page ─────────────────────────────────────────────────────────────────

export const CosmosDashboard = () => {
  const navigate = useNavigate();
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
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Alert filter state
  const [alertLimit, setAlertLimit] = useState<number>(() => {
    const stored = localStorage.getItem('cosmos-dash-alert-limit');
    return stored ? Number(stored) : 5;
  });
  const [alertPage, setAlertPage] = useState(0);
  const [alertStateFilter, setAlertStateFilter] = useState<string>('all');
  const [alertRoomFilter, setAlertRoomFilter] = useState<string>('all');

  // Settings panel state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const stored = localStorage.getItem('cosmos-dash-refresh');
    return stored ? Number(stored) : 30;
  });
  const [defaultAlertLimit, setDefaultAlertLimit] = useState<number>(() => {
    const stored = localStorage.getItem('cosmos-dash-alert-limit');
    return stored ? Number(stored) : 5;
  });

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
      setLastUpdate(new Date());
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

  // ── Derived stats ────────────────────────────────────────────────────────────

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
    {
      label: 'OK',
      count: Math.max(0, totalDevices - critCount - warnCount),
      color: '#10b981',
    },
  ].filter((s) => s.count > 0);

  const allRooms: RoomWithState[] = sites.flatMap((s) =>
    (s.rooms ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      siteName: s.name,
      state: roomStates[r.id] ?? 'UNKNOWN',
    }))
  );

  // Slurm status bar
  const slurmTotal = slurm?.total_nodes ?? 0;
  const slurmStatus = slurm?.by_status ?? {};
  const slurmSevs = slurm?.by_severity ?? {};

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

  // Catalog stats
  const devsByType = deviceTemplates.reduce<Record<string, number>>((acc, t) => {
    acc[t.type ?? 'other'] = (acc[t.type ?? 'other'] ?? 0) + 1;
    return acc;
  }, {});
  const checksByScope = checks.reduce<Record<string, number>>((acc, c) => {
    acc[c.scope ?? 'unknown'] = (acc[c.scope ?? 'unknown'] ?? 0) + 1;
    return acc;
  }, {});

  // Filtered alerts
  // All filtered alerts (no pagination slice — used for total count + pagination)
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

  // Prometheus next scrape countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const promConnected = Boolean(promStats?.last_ts);
  const promNextMs = promStats?.next_ts ? promStats.next_ts - now : null;
  const promNextSec = promNextMs && promNextMs > 0 ? Math.ceil(promNextMs / 1000) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {lastUpdate ? `Last updated ${lastUpdate.toLocaleTimeString()}` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Stats row */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard icon={Globe} label="Sites" value={sites.length} color="#465fff" />
          <StatCard icon={DoorOpen} label="Rooms" value={totalRooms} color="#8b5cf6" />
          <StatCard icon={Server} label="Racks" value={totalRacks} color="#06b6d4" />
          <StatCard icon={Cpu} label="Devices" value={totalDevices} color="#10b981" />
          <StatCard
            icon={XCircle}
            label="CRIT"
            value={critCount}
            color="#ef4444"
            sub={critCount === 0 ? 'All clear' : `${critCount} node${critCount > 1 ? 's' : ''}`}
          />
          <StatCard
            icon={AlertTriangle}
            label="WARN"
            value={warnCount}
            color="#f59e0b"
            sub={warnCount === 0 ? 'All clear' : `${warnCount} node${warnCount > 1 ? 's' : ''}`}
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Health Score card */}
        <div className="flex items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <HealthGauge score={healthScore} />
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Health Score</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {totalDevices - critCount - warnCount} / {totalDevices} devices healthy
            </p>
            {critCount > 0 && (
              <p className="mt-2 text-xs text-red-500">
                {critCount} CRIT alert{critCount > 1 ? 's' : ''}
              </p>
            )}
            {warnCount > 0 && (
              <p className="text-xs text-amber-500">
                {warnCount} WARN alert{warnCount > 1 ? 's' : ''}
              </p>
            )}
            {critCount === 0 && warnCount === 0 && (
              <p className="mt-2 flex items-center gap-1 text-xs text-green-500">
                <CheckCircle className="h-3.5 w-3.5" /> All devices healthy
              </p>
            )}
          </div>
        </div>

        {/* Severity distribution card */}
        <div className="flex items-center gap-5 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <SeverityDonut slices={donutSlices} />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Severity Distribution
            </p>
            {donutSlices.map((s) => (
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
                    {totalDevices > 0 ? Math.round((s.count / totalDevices) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        {/* LEFT column */}
        <div className="space-y-5">
          {/* Active Alerts */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Active Alerts
                </h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                  {alerts.length}
                </span>
              </div>
              <button
                onClick={() => navigate('/cosmos/notifications')}
                className="text-brand-500 text-xs hover:underline"
              >
                View all →
              </button>
            </div>

            {/* Controls row */}
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 pt-2 pb-3 dark:border-gray-800">
              {/* State filter pills */}
              <div className="flex gap-1">
                {['all', 'CRIT', 'WARN'].map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setAlertStateFilter(f);
                      setAlertPage(0);
                    }}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                      alertStateFilter === f
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    }`}
                  >
                    {f === 'all' ? 'All' : f}
                  </button>
                ))}
              </div>
              {/* Room filter */}
              {allRooms.length > 1 && (
                <select
                  value={alertRoomFilter}
                  onChange={(e) => {
                    setAlertRoomFilter(e.target.value);
                    setAlertPage(0);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                >
                  <option value="all">All rooms</option>
                  {allRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
              {/* Limit selector */}
              <div className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400">
                <span>Show</span>
                <select
                  value={alertLimit}
                  onChange={(e) => {
                    setAlertLimit(Number(e.target.value));
                    setAlertPage(0);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                >
                  {[5, 10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <CheckCircle className="h-8 w-8 text-green-400" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  All systems healthy
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-600">No active alerts</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredAlerts.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8">
                      <CheckCircle className="h-7 w-7 text-green-400" />
                      <p className="text-sm text-gray-400">No alerts match the current filters</p>
                    </div>
                  ) : (
                    filteredAlerts.map((alert, i) => (
                      <AlertRow
                        key={i}
                        alert={alert}
                        onClick={() => navigate(`/cosmos/views/rack/${alert.rack_id}`)}
                      />
                    ))
                  )}
                </div>

                {/* Pagination footer */}
                {filteredAlertsAll.length > alertLimit && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-5 py-2.5 dark:border-gray-800">
                    <button
                      onClick={() => setAlertPage((p) => Math.max(0, p - 1))}
                      disabled={safeAlertPage === 0}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-30 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                    >
                      ← Prev
                    </button>
                    <span className="text-xs text-gray-400">
                      Page {safeAlertPage + 1} / {totalAlertPages}
                      <span className="ml-2 text-gray-300 dark:text-gray-600">
                        ({filteredAlertsAll.length} total)
                      </span>
                    </span>
                    <button
                      onClick={() => setAlertPage((p) => Math.min(totalAlertPages - 1, p + 1))}
                      disabled={safeAlertPage >= totalAlertPages - 1}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-30 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Slurm (only if enabled) */}
          {slurmEnabled && slurm && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-500" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Slurm Cluster
                  </h2>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                    {slurmTotal} nodes
                  </span>
                </div>
                <button
                  onClick={() => navigate('/cosmos/slurm/overview')}
                  className="text-brand-500 text-xs hover:underline"
                >
                  Details →
                </button>
              </div>
              <div className="space-y-4 p-5">
                {/* Stacked bar */}
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
                            style={{
                              backgroundColor: STATUS_COLOR[st.toLowerCase()] ?? '#6b7280',
                            }}
                          />
                          <span className="capitalize">{st}</span>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {count}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                {/* Severity mini stats */}
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
          )}
        </div>

        {/* RIGHT column */}
        <div className="space-y-5">
          {/* Infrastructure overview */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Server className="text-brand-500 h-4 w-4" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Infrastructure
                </h2>
              </div>
              <button
                onClick={() => navigate('/cosmos/views/worldmap')}
                className="text-brand-500 text-xs hover:underline"
              >
                World Map →
              </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {allRooms.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-gray-400">
                  No rooms configured
                </div>
              ) : (
                allRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => navigate(`/cosmos/views/room/${room.id}`)}
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

          {/* Prometheus status */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Prometheus</h2>
              <span
                className={`ml-auto flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${promConnected ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${promConnected ? 'animate-pulse bg-green-500' : 'bg-red-500'}`}
                />
                {promConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {promStats ? (
              <div className="space-y-2">
                {[
                  {
                    label: 'Last latency',
                    value: promStats.last_ms ? `${Math.round(promStats.last_ms)} ms` : '—',
                  },
                  {
                    label: 'Avg latency',
                    value: promStats.avg_ms ? `${Math.round(promStats.avg_ms)} ms` : '—',
                  },
                  { label: 'Next scrape', value: promNextSec > 0 ? `${promNextSec}s` : 'now' },
                  {
                    label: 'Heartbeat',
                    value: promStats.heartbeat_seconds ? `${promStats.heartbeat_seconds}s` : '—',
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{label}</span>
                    <span className="font-mono font-medium text-gray-800 dark:text-gray-200">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Checking connection...</p>
            )}
          </div>

          {/* Catalog & Checks */}
          {(deviceTemplates.length > 0 || checks.length > 0) && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="text-brand-500 h-4 w-4" />
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Catalog &amp; Checks
                </h2>
              </div>

              {/* Device templates by type */}
              {Object.keys(devsByType).length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                    Device Templates ({deviceTemplates.length})
                  </p>
                  {Object.entries(devsByType)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => {
                      const Icon = DEV_TYPE_ICON[type] ?? Cpu;
                      const color = DEV_TYPE_COLOR[type] ?? DEV_TYPE_COLOR.other;
                      const pct = Math.round((count / deviceTemplates.length) * 100);
                      return (
                        <div key={type} className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <Icon className="h-3 w-3 shrink-0" style={{ color }} />
                              <span className="text-gray-600 capitalize dark:text-gray-400">
                                {type}
                              </span>
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
                      {rackTemplateCount}
                    </span>
                  </div>
                </div>
              )}

              {/* Checks */}
              {checks.length > 0 && (
                <div className="space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                    Checks Library ({checks.length})
                  </p>
                  {Object.entries(checksByScope)
                    .sort(([, a], [, b]) => b - a)
                    .map(([scope, count]) => (
                      <div key={scope} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 capitalize dark:text-gray-400">
                          {scope} scope
                        </span>
                        <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSettingsOpen(false)} />
          <div className="fixed top-0 right-0 z-50 h-full w-80 border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
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
              {/* Refresh interval */}
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
                        localStorage.setItem('cosmos-dash-refresh', String(s));
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
              {/* Default alert count */}
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
                        localStorage.setItem('cosmos-dash-alert-limit', String(n));
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
