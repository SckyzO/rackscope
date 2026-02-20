import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Activity, AlertTriangle, Map as MapIcon, ArrowUpRight, Database } from 'lucide-react';
import { api } from '../../services/api';
import type {
  RoomSummary,
  Site,
  RoomState,
  GlobalStats,
  ActiveAlert,
  PrometheusStats,
  TelemetryStats,
} from '../../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardOverviewProps {
  searchQuery?: string;
  reloadKey?: number;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  searchQuery = '',
  reloadKey = 0,
}) => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomStates, setRoomStates] = useState<Record<string, RoomState>>({});
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [promStats, setPromStats] = useState<PrometheusStats | null>(null);
  const [telemetryStats, setTelemetryStats] = useState<TelemetryStats | null>(null);
  const [promHistory, setPromHistory] = useState<Array<{ timestamp: number; ms: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [refreshMs, setRefreshMs] = useState(30000);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;

  useEffect(() => {
    let active = true;
    const loadConfig = async () => {
      try {
        const configData = await api.getConfig();
        const nextRefresh = Number(configData?.refresh?.room_state_seconds) || 30;
        if (active) {
          setRefreshMs(Math.max(10000, nextRefresh * 1000));
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadConfig();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsData, stats, sitesData, alertsData, promData, telemetryData] =
          await Promise.all([
            api.getRooms(),
            api.getGlobalStats(),
            api.getSites(),
            api.getActiveAlerts(),
            api.getPrometheusStats(),
            api.getTelemetryStats(),
          ]);
        const safeRooms = Array.isArray(roomsData) ? roomsData : [];
        const safeSites = Array.isArray(sitesData) ? sitesData : [];
        setRooms(safeRooms);
        setGlobalStats(stats);
        setSites(safeSites);
        setActiveAlerts(Array.isArray(alertsData?.alerts) ? alertsData.alerts : []);
        setPromStats(promData || null);
        setTelemetryStats(telemetryData || null);
        setSelectedSiteId((prev) => prev ?? safeSites[0]?.id ?? null);

        // Update Prometheus latency history
        if (promData?.last_ms != null) {
          setPromHistory((prev) => {
            const newHistory = [
              ...prev,
              { timestamp: Date.now(), ms: promData.last_ms as number },
            ].slice(-20); // Keep last 20 data points
            return newHistory;
          });
        }

        const states: Record<string, RoomState> = {};
        await Promise.all(
          safeRooms.map(async (r) => {
            try {
              const s = await api.getRoomState(r.id);
              states[r.id] = s;
            } catch {
              states[r.id] = { state: 'UNKNOWN' };
            }
          })
        );
        setRoomStates(states);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, refreshMs);
    return () => clearInterval(interval);
  }, [refreshMs, reloadKey]);

  const matchingRoomIds = useMemo(() => {
    if (!hasQuery) return null;
    const matches = (value?: string) => (value || '').toLowerCase().includes(normalizedQuery);
    const matched = new Set<string>();

    for (const site of sites) {
      const siteMatch = matches(site.name) || matches(site.id);
      for (const room of site.rooms || []) {
        const roomMatch = siteMatch || matches(room.name) || matches(room.id);
        if (roomMatch) {
          matched.add(room.id);
          continue;
        }
        for (const aisle of room.aisles || []) {
          const aisleMatch = matches(aisle.name) || matches(aisle.id);
          if (aisleMatch) {
            matched.add(room.id);
            break;
          }
          for (const rack of aisle.racks || []) {
            const rackMatch = matches(rack.name) || matches(rack.id);
            if (rackMatch) {
              matched.add(room.id);
              break;
            }
            for (const device of rack.devices || []) {
              if (matches(device.name) || matches(device.id)) {
                matched.add(room.id);
                break;
              }
            }
          }
        }
        for (const rack of room.standalone_racks || []) {
          if (matches(rack.name) || matches(rack.id)) {
            matched.add(room.id);
            continue;
          }
          for (const device of rack.devices || []) {
            if (matches(device.name) || matches(device.id)) {
              matched.add(room.id);
              break;
            }
          }
        }
      }
    }

    return matched;
  }, [hasQuery, normalizedQuery, sites]);

  const filteredRooms = rooms.filter((room) => {
    if (selectedSiteId && room.site_id !== selectedSiteId) return false;
    if (!matchingRoomIds) return true;
    return matchingRoomIds.has(room.id);
  });

  const currentSite = useMemo(() => {
    if (!selectedSiteId) return null;
    return sites.find((site) => site.id === selectedSiteId) || null;
  }, [sites, selectedSiteId]);

  const roomSummaries = useMemo(() => {
    return filteredRooms.map((room) => {
      const racks = room.aisles?.flatMap((aisle) => aisle.racks || []) || [];
      const rackStates = roomStates[room.id]?.racks || {};
      let crit = 0;
      let warn = 0;
      let ok = 0;
      let unknown = 0;
      for (const rack of racks) {
        const rawState = rackStates[rack.id];
        const state = typeof rawState === 'string' ? rawState : (rawState?.state ?? 'UNKNOWN');
        if (state === 'CRIT') crit += 1;
        else if (state === 'WARN') warn += 1;
        else if (state === 'OK') ok += 1;
        else unknown += 1;
      }
      return {
        room,
        racks,
        totals: { crit, warn, ok, unknown, total: racks.length },
      };
    });
  }, [filteredRooms, roomStates]);

  const deviceAlerts = useMemo(() => {
    const weight = (state: string) => (state === 'CRIT' ? 2 : state === 'WARN' ? 1 : 0);
    return [...activeAlerts]
      .filter((item) => item?.state === 'CRIT' || item?.state === 'WARN')
      .sort((a, b) => weight(b.state) - weight(a.state))
      .slice(0, 5);
  }, [activeAlerts]);

  const activeChecksBySite = useMemo(() => {
    const totals = new Map<string, { checks: number; devices: number }>();
    for (const alert of activeAlerts) {
      if (!alert?.site_id) continue;
      const entry = totals.get(alert.site_id) || { checks: 0, devices: 0 };
      entry.checks += Array.isArray(alert.checks) ? alert.checks.length : 0;
      entry.devices += 1;
      totals.set(alert.site_id, entry);
    }
    return totals;
  }, [activeAlerts]);

  const siteAlertSummary = useMemo(() => {
    if (!currentSite) return null;
    return activeChecksBySite.get(currentSite.id) || { checks: 0, devices: 0 };
  }, [activeChecksBySite, currentSite]);

  // Chart.js configuration
  const chartData = {
    labels: promHistory.map((_, idx) => `T-${promHistory.length - idx - 1}`),
    datasets: [
      {
        label: 'Query Time (ms)',
        data: promHistory.map((p) => p.ms),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: { parsed: { y: number } }) => `${Math.round(context.parsed.y)} ms`,
        },
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        ticks: {
          color: 'rgba(156, 163, 175, 0.6)',
          font: {
            family: 'JetBrains Mono, monospace',
            size: 10,
          },
          callback: (value: string | number) => `${value}ms`,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse font-mono text-[13px] tracking-[0.3em] text-blue-500 uppercase">
          LDR :: AGGREGATING_GLOBAL_METRICS...
        </div>
      </div>
    );
  }

  return (
    <div className="custom-scrollbar h-full overflow-y-auto p-10">
      {/* Hero Section */}
      <header className="mb-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-base)]">
              Infrastructure Overview
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-gray-400">
              {currentSite && <span>{currentSite.name}</span>}
              {currentSite && siteAlertSummary && (
                <>
                  <span className="h-1 w-1 rounded-full bg-gray-600"></span>
                  <span>
                    {siteAlertSummary.checks} checks · {siteAlertSummary.devices} devices
                  </span>
                </>
              )}
              <span className="h-1 w-1 rounded-full bg-gray-600"></span>
              <span>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Status Cards Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Global Status */}
          <div
            className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6 transition-all hover:-translate-y-1"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="relative z-10">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-400">Global Status</div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)]/10">
                  <Activity className="h-5 w-5 text-[var(--color-accent)]" />
                </div>
              </div>
              <div
                className={`font-mono text-3xl font-black tracking-tight tabular-nums ${
                  globalStats?.status === 'CRIT'
                    ? 'text-status-crit'
                    : globalStats?.status === 'WARN'
                      ? 'text-status-warn'
                      : 'text-status-ok'
                }`}
              >
                {globalStats?.status === 'CRIT'
                  ? 'CRITICAL'
                  : globalStats?.status === 'WARN'
                    ? 'WARNING'
                    : 'OPTIMAL'}
              </div>
            </div>
            <div
              className={`absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 ${
                globalStats?.status === 'CRIT'
                  ? 'bg-gradient-to-br from-red-500/10 to-transparent'
                  : globalStats?.status === 'WARN'
                    ? 'bg-gradient-to-br from-yellow-500/10 to-transparent'
                    : 'bg-gradient-to-br from-green-500/10 to-transparent'
              }`}
            ></div>
          </div>

          {/* Active Alerts */}
          <div
            className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6 transition-all hover:-translate-y-1"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="relative z-10">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-400">Active Alerts</div>
                <div className="bg-status-warn/10 flex h-10 w-10 items-center justify-center rounded-xl">
                  <AlertTriangle className="text-status-warn h-5 w-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <div className="font-mono text-3xl font-black text-[var(--color-text-primary)] tabular-nums">
                  {globalStats?.active_alerts || 0}
                </div>
                <div className="font-mono text-[11px] tracking-[0.2em] text-gray-500 uppercase tabular-nums">
                  <span className="text-status-crit">{globalStats?.crit_count || 0}</span> CRIT /{' '}
                  <span className="text-status-warn">{globalStats?.warn_count || 0}</span> WARN
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
          </div>

          {/* Managed Racks */}
          <div
            className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6 transition-all hover:-translate-y-1"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="relative z-10">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-400">Managed Racks</div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)]/10">
                  <MapIcon className="h-5 w-5 text-[var(--color-accent)]" />
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <div className="font-mono text-3xl font-black text-[var(--color-text-primary)] tabular-nums">
                  {globalStats?.total_racks || 0}
                </div>
                <div className="font-mono text-[11px] tracking-[0.2em] text-gray-500 uppercase tabular-nums">
                  {sites.length} sites / {globalStats?.total_rooms || 0} rooms
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
          </div>

          {/* Prometheus Performance */}
          <div
            className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6 transition-all hover:-translate-y-1"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="relative z-10">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-400">Prometheus</div>
                <div className="bg-status-ok/10 flex h-10 w-10 items-center justify-center rounded-xl">
                  <Database className="text-status-ok h-5 w-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="font-mono text-3xl font-black text-[var(--color-text-primary)] tabular-nums">
                  {promStats?.avg_ms ? Math.round(promStats.avg_ms) : '--'}
                </div>
                <div className="font-mono text-[13px] tracking-[0.2em] text-gray-500 uppercase">
                  ms
                </div>
              </div>
              <div className="mt-2 font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase tabular-nums">
                avg query time
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
          </div>
        </div>
      </header>

      {/* Site Filter */}
      {sites.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {sites.map((site) => (
            <button
              key={site.id}
              onClick={() => setSelectedSiteId(site.id)}
              className={`rounded-full border px-4 py-1.5 font-mono text-[10px] tracking-widest uppercase transition-all ${
                selectedSiteId === site.id
                  ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/15 text-[var(--color-accent)] shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                  : 'border-[var(--color-border)] bg-transparent text-gray-500 hover:border-[var(--color-accent)]/30 hover:text-[var(--color-text-base)]'
              }`}
            >
              {site.name}
            </button>
          ))}
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
        {/* Left Column: Rooms List */}
        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">
                Infrastructure
              </div>
              <h2 className="mt-0.5 text-lg font-semibold text-gray-200">Rooms</h2>
            </div>
            <div className="text-xs font-medium text-gray-500">{roomSummaries.length} rooms</div>
          </div>

          <div className="space-y-2">
            {roomSummaries.map(({ room, totals }) => (
              <Link
                key={room.id}
                to={`/room/${room.id}`}
                className="group flex items-center justify-between gap-4 rounded-xl border border-transparent bg-black/20 px-5 py-4 transition-all hover:border-[var(--color-accent-primary)]/30 hover:bg-[var(--color-accent-primary)]/5"
              >
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold text-gray-200 transition-colors group-hover:text-[var(--color-accent-primary)]">
                    {room.name}
                  </span>
                  <span className="font-mono text-[10px] tracking-widest text-gray-500 uppercase tabular-nums">
                    {totals.total} racks
                  </span>
                </div>
                <div className="flex items-center gap-4 font-mono text-[11px] uppercase tabular-nums">
                  <span className="text-status-crit">{totals.crit}</span>
                  <span className="text-status-warn">{totals.warn}</span>
                  <span className="text-status-ok">{totals.ok}</span>
                  <span className="text-gray-600">{totals.unknown}</span>
                  <ArrowUpRight className="h-4 w-4 text-gray-500 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--color-accent-primary)]" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Right Column: Alerts + Telemetry */}
        <aside className="space-y-6">
          {/* Active Alerts */}
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">
                  Monitoring
                </div>
                <h2 className="mt-0.5 text-lg font-semibold text-gray-200">Active Alerts</h2>
              </div>
              <div className="text-xs font-medium text-gray-500">{activeAlerts.length} total</div>
            </div>

            {deviceAlerts.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 py-8 font-mono text-[11px] tracking-widest text-gray-500 uppercase">
                No active alerts
              </div>
            ) : (
              <div className="space-y-2">
                {deviceAlerts.map((item) => (
                  <Link
                    key={`${item.rack_id}-${item.node_id}`}
                    to={`/rack/${item.rack_id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-4 py-3 transition-all hover:border-[var(--color-accent-primary)]/30 hover:bg-[var(--color-accent-primary)]/5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-gray-200">
                        {item.device_name}
                      </div>
                      <div className="truncate font-mono text-[10px] tracking-widest text-gray-500 uppercase">
                        {item.site_name} / {item.room_name} / {item.rack_name}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 rounded-full border px-3 py-1 font-mono text-[10px] font-black tracking-widest uppercase ${
                        item.state === 'CRIT'
                          ? 'border-status-crit/40 bg-status-crit/10 text-status-crit'
                          : 'border-status-warn/40 bg-status-warn/10 text-status-warn'
                      }`}
                    >
                      {item.state}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Prometheus Telemetry */}
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold tracking-widest text-gray-500 uppercase">
                  Telemetry
                </div>
                <h2 className="mt-0.5 text-lg font-semibold text-gray-200">Prometheus</h2>
              </div>
              <div className="text-xs font-medium text-gray-500">
                {telemetryStats?.in_flight ?? 0} in flight
              </div>
            </div>

            {/* Chart */}
            <div className="mb-4 h-32 rounded-xl border border-white/5 bg-black/30 p-3">
              <Line data={chartData} options={chartOptions} />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="text-xs font-medium text-gray-500 uppercase">Queries</div>
                <div className="mt-2 font-mono text-xl font-black text-[var(--color-text-primary)] tabular-nums">
                  {telemetryStats?.query_count ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="text-xs font-medium text-gray-500 uppercase">Cache Hits</div>
                <div className="text-status-ok mt-2 font-mono text-xl font-black tabular-nums">
                  {telemetryStats?.cache_hits ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="text-xs font-medium text-gray-500 uppercase">Cache Misses</div>
                <div className="text-status-warn mt-2 font-mono text-xl font-black tabular-nums">
                  {telemetryStats?.cache_misses ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="text-xs font-medium text-gray-500 uppercase">Last Batch</div>
                <div className="mt-2 font-mono text-[11px] text-gray-300 tabular-nums">
                  {telemetryStats?.last_batch
                    ? `${telemetryStats.last_batch.total_ids} ids / ${telemetryStats.last_batch.query_count} q`
                    : '--'}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
