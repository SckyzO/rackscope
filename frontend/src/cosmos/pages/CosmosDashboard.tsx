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
} from 'lucide-react';
import { api } from '../../services/api';
import type { ActiveAlert, Site, SlurmSummary, PrometheusStats, RoomState } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

type RoomWithState = {
  id: string;
  name: string;
  siteName: string;
  state: string;
};

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

// ── Main page ─────────────────────────────────────────────────────────────────

export const CosmosDashboard = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [roomStates, setRoomStates] = useState<Record<string, string>>({});
  const [slurm, setSlurm] = useState<SlurmSummary | null>(null);
  const [slurmEnabled, setSlurmEnabled] = useState(false);
  const [promStats, setPromStats] = useState<PrometheusStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadAll = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const [alertsData, sitesData, configData, promData] = await Promise.all([
        api.getActiveAlerts(),
        api.getSites(),
        api.getConfig(),
        api.getPrometheusStats().catch(() => null),
      ]);
      setAlerts(alertsData?.alerts ?? []);
      const siteList = Array.isArray(sitesData) ? sitesData : [];
      setSites(siteList);
      setPromStats(promData);

      const slEnabled = Boolean(configData?.plugins?.slurm?.enabled);
      setSlurmEnabled(slEnabled);
      if (slEnabled) {
        const slurmData = await api.getSlurmSummary().catch(() => null);
        setSlurm(slurmData);
      }

      // Load room states
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
    const t = setInterval(() => void loadAll(true), 30000);
    return () => clearInterval(t);
  }, []);

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
        <button
          onClick={() => void loadAll(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <CheckCircle className="h-8 w-8 text-green-400" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  All systems healthy
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-600">No active alerts</p>
              </div>
            ) : (
              <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
                {[...alerts]
                  .sort((a, b) => (a.state === 'CRIT' ? -1 : 1) - (b.state === 'CRIT' ? -1 : 1))
                  .slice(0, 10)
                  .map((alert, i) => (
                    <AlertRow
                      key={i}
                      alert={alert}
                      onClick={() => navigate(`/cosmos/views/rack/${alert.rack_id}`)}
                    />
                  ))}
              </div>
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
                            style={{ backgroundColor: STATUS_COLOR[st.toLowerCase()] ?? '#6b7280' }}
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
        </div>
      </div>
    </div>
  );
};
