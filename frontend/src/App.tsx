import { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationHeader } from './components/NotificationHeader';
import { RoomPage } from './pages/RoomPage';
import { RackPage } from './pages/RackPage';
import { SettingsPage } from './pages/SettingsPage';
import { TemplatesLibraryPage } from './pages/TemplatesLibraryPage';
import { TemplatesEditorPage } from './pages/TemplatesEditorPage';
import { TemplatesRackEditorPage } from './pages/TemplatesRackEditorPage';
import { ChecksLibraryEditorPage } from './pages/ChecksLibraryEditorPage';
import { TopologyEditorPage } from './pages/TopologyEditorPage';
import { RackEditorPage } from './pages/RackEditorPage';
import { api } from './services/api';
import type {
  RoomSummary,
  Site,
  RoomState,
  GlobalStats,
  ActiveAlert,
  PrometheusStats,
  TelemetryStats,
} from './types';
import { expandInstanceMatches, matchesText } from './utils/search';
import {
  Activity,
  AlertTriangle,
  Map as MapIcon,
  ArrowUpRight,
  Search,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

// Layout global
const Layout = ({
  children,
  searchQuery,
  onSearchChange,
  onReload,
}: {
  children: React.ReactNode;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onReload: () => void;
}) => {
  const [stale, setStale] = useState(api.isStale());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const blurTimer = useRef<number | null>(null);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;

  useEffect(() => {
    const interval = setInterval(() => {
      setStale(api.isStale());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    const loadSites = async () => {
      try {
        const sitesData = await api.getSites();
        if (active) {
          setSites(Array.isArray(sitesData) ? sitesData : []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadSites();
    return () => {
      active = false;
    };
  }, []);

  const searchResults = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    const hasQueryLocal = normalized.length > 0;
    if (!hasQueryLocal) return [];
    const results: Array<{
      id: string;
      type: 'datacenter' | 'room' | 'aisle' | 'rack' | 'device' | 'instance';
      label: string;
      sublabel: string;
      to: string;
    }> = [];
    const seen = new Set<string>();
    const pushResult = (item: (typeof results)[number]) => {
      if (seen.has(item.id)) return;
      seen.add(item.id);
      results.push(item);
    };

    for (const site of sites) {
      if (matchesText(site.name, normalized) || matchesText(site.id, normalized)) {
        const targetRoom = site.rooms?.[0];
        pushResult({
          id: site.id,
          type: 'datacenter',
          label: site.name || site.id,
          sublabel: 'Datacenter',
          to: targetRoom ? `/room/${targetRoom.id}` : '/',
        });
      }

      for (const room of site.rooms || []) {
        if (matchesText(room.name, normalized) || matchesText(room.id, normalized)) {
          pushResult({
            id: room.id,
            type: 'room',
            label: room.name || room.id,
            sublabel: `${site.name || site.id} / Room`,
            to: `/room/${room.id}`,
          });
        }

        for (const aisle of room.aisles || []) {
          if (matchesText(aisle.name, normalized) || matchesText(aisle.id, normalized)) {
            pushResult({
              id: `${room.id}:${aisle.id}`,
              type: 'aisle',
              label: aisle.name || aisle.id,
              sublabel: `${site.name || site.id} / ${room.name || room.id} / Aisle`,
              to: `/room/${room.id}`,
            });
          }

          for (const rack of aisle.racks || []) {
            const rackMatches =
              matchesText(rack.name, normalized) || matchesText(rack.id, normalized);
            if (rackMatches) {
              pushResult({
                id: rack.id,
                type: 'rack',
                label: rack.name || rack.id,
                sublabel: `${site.name || site.id} / ${room.name || room.id} / ${aisle.name || aisle.id}`,
                to: `/rack/${rack.id}`,
              });
            }

            for (const device of rack.devices || []) {
              if (matchesText(device.name, normalized) || matchesText(device.id, normalized)) {
                pushResult({
                  id: `${rack.id}:${device.id}`,
                  type: 'device',
                  label: device.name || device.id,
                  sublabel: `${rack.name || rack.id} / Device`,
                  to: `/rack/${rack.id}`,
                });
              }
              const instanceMatches = expandInstanceMatches(searchQuery, device.instance, 50);
              for (const value of instanceMatches) {
                pushResult({
                  id: `${rack.id}:${device.id}:${value}`,
                  type: 'instance',
                  label: value,
                  sublabel: `${rack.name || rack.id} / Instance`,
                  to: `/rack/${rack.id}`,
                });
                if (results.length >= 30) break;
              }
            }
          }
        }

        for (const rack of room.standalone_racks || []) {
          const rackMatches =
            matchesText(rack.name, normalized) || matchesText(rack.id, normalized);
          if (rackMatches) {
            pushResult({
              id: rack.id,
              type: 'rack',
              label: rack.name || rack.id,
              sublabel: `${site.name || site.id} / ${room.name || room.id}`,
              to: `/rack/${rack.id}`,
            });
          }
          for (const device of rack.devices || []) {
            if (matchesText(device.name, normalized) || matchesText(device.id, normalized)) {
              pushResult({
                id: `${rack.id}:${device.id}`,
                type: 'device',
                label: device.name || device.id,
                sublabel: `${rack.name || rack.id} / Device`,
                to: `/rack/${rack.id}`,
              });
            }
            const instanceMatches = expandInstanceMatches(searchQuery, device.instance, 50);
            for (const value of instanceMatches) {
              pushResult({
                id: `${rack.id}:${device.id}:${value}`,
                type: 'instance',
                label: value,
                sublabel: `${rack.name || rack.id} / Instance`,
                to: `/rack/${rack.id}`,
              });
              if (results.length >= 30) break;
            }
          }
        }
      }
    }

    return results.slice(0, 30);
  }, [searchQuery, sites]);

  const handleSearchFocus = () => {
    if (blurTimer.current) {
      window.clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setSearchOpen(true);
  };

  const handleSearchBlur = () => {
    blurTimer.current = window.setTimeout(() => {
      setSearchOpen(false);
    }, 150);
  };

  return (
    <div className="bg-rack-dark flex h-screen overflow-hidden font-sans text-gray-100">
      <Sidebar collapsed={sidebarCollapsed} searchQuery={searchQuery} />
      <main className="relative flex-1 overflow-hidden bg-[var(--color-bg-base)] text-[var(--color-text-base)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <header className="relative z-10 flex h-20 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-panel)]/80 px-5 backdrop-blur-xl">
          <div className="flex min-w-[240px] items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-black/30 text-gray-400 transition-colors hover:border-[var(--color-accent)]/30 hover:text-[var(--color-accent)]"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[var(--color-accent)] to-[#0b1f3a] shadow-[0_0_16px_rgba(59,130,246,0.35)]">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${stale ? 'bg-status-crit' : 'bg-status-ok'} shadow-[0_0_8px_var(--color-status-ok)]`}
              ></div>
              <span className="text-[11px] font-bold tracking-[0.2em] text-gray-400 uppercase">
                {stale ? 'Stale' : 'Live'}
              </span>
            </div>
          </div>
          <div className="max-w-[700px] flex-1 px-6">
            <div className="relative">
              <Search className="absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                placeholder="Search datacenter / room / rack / device"
                className="h-12 w-full rounded-xl border border-[var(--color-border)] bg-black/30 pr-4 pl-11 text-[13px] text-gray-300 placeholder:text-gray-500 focus:border-[var(--color-accent)]/50 focus:outline-none"
              />
              {searchOpen && hasQuery && (
                <div className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-panel)]/95 shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-3 font-mono text-[11px] tracking-[0.2em] text-gray-400 uppercase">
                      No matches found
                    </div>
                  ) : (
                    <div className="custom-scrollbar max-h-80 overflow-y-auto">
                      {searchResults.map((result) => (
                        <Link
                          key={result.id}
                          to={result.to}
                          className="flex items-center justify-between border-b border-[var(--color-border)]/60 px-4 py-3 transition-colors hover:bg-white/5"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setSearchOpen(false)}
                        >
                          <div>
                            <div className="text-[12px] font-semibold text-gray-100">
                              {result.label}
                            </div>
                            <div className="font-mono text-[9px] tracking-[0.2em] text-gray-500 uppercase">
                              {result.sublabel}
                            </div>
                          </div>
                          <div className="font-mono text-[9px] tracking-[0.2em] text-[var(--color-accent)] uppercase">
                            {result.type}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex min-w-[240px] items-center justify-end gap-3">
            <button
              type="button"
              onClick={onReload}
              className="flex h-9 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-black/30 px-3 font-mono text-[10px] tracking-widest text-gray-400 uppercase transition-colors hover:border-[var(--color-accent)]/30 hover:text-[var(--color-accent)]"
              title="Reload now"
            >
              Reload
            </button>
            <NotificationHeader />
            <Link
              to="/settings"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-black/30 text-gray-400 transition-colors hover:border-[var(--color-accent)]/30 hover:text-[var(--color-accent)]"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </header>
        <div className="h-[calc(100%-5rem)]">{children}</div>
      </main>
    </div>
  );
};

/**
 * Dashboard Component (Overview)
 *
 * Central monitoring hub providing a high-level view of the entire infrastructure.
 */
const Dashboard = ({
  searchQuery = '',
  reloadKey = 0,
}: {
  searchQuery?: string;
  reloadKey?: number;
}) => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomStates, setRoomStates] = useState<Record<string, RoomState>>({});
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [promStats, setPromStats] = useState<PrometheusStats | null>(null);
  const [checksTotal, setChecksTotal] = useState(0);
  const [telemetryStats, setTelemetryStats] = useState<TelemetryStats | null>(null);
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
        const [roomsData, stats, sitesData, alertsData, promData, checksData, telemetryData] =
          await Promise.all([
            api.getRooms(),
            api.getGlobalStats(),
            api.getSites(),
            api.getActiveAlerts(),
            api.getPrometheusStats(),
            api.getChecks(),
            api.getTelemetryStats(),
          ]);
        const safeRooms = Array.isArray(roomsData) ? roomsData : [];
        const safeSites = Array.isArray(sitesData) ? sitesData : [];
        setRooms(safeRooms);
        setGlobalStats(stats);
        setSites(safeSites);
        setActiveAlerts(Array.isArray(alertsData?.alerts) ? alertsData.alerts : []);
        setPromStats(promData || null);
        setChecksTotal(Array.isArray(checksData?.checks) ? checksData.checks.length : 0);
        setTelemetryStats(telemetryData || null);
        setSelectedSiteId((prev) => prev ?? safeSites[0]?.id ?? null);

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
      .slice(0, 10);
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

  if (loading) {
    return (
      <div className="animate-pulse p-12 font-mono text-blue-500">
        LDR :: AGGREGATING_GLOBAL_METRICS...
      </div>
    );
  }

  return (
    <div className="custom-scrollbar h-full overflow-y-auto p-10">
      <header className="mb-10 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="font-mono text-[10px] tracking-[0.45em] text-gray-500 uppercase">
            Wallboard
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--color-accent-primary)] uppercase">
            Overview
          </h1>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] tracking-[0.3em] text-gray-500 uppercase">
            <span>Global Infrastructure Status</span>
            {currentSite && (
              <span className="flex items-center gap-2 text-gray-400">
                <span className="h-1 w-1 rounded-full bg-gray-600"></span>
                {currentSite.name}
              </span>
            )}
            {siteAlertSummary && (
              <span className="flex items-center gap-2 text-gray-400">
                <span className="h-1 w-1 rounded-full bg-gray-600"></span>
                {siteAlertSummary.checks} checks / {siteAlertSummary.devices} devices
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="bg-rack-panel border-rack-border flex items-center justify-between rounded-2xl border px-6 py-5">
            <div>
              <div className="text-[10px] font-bold tracking-[0.3em] text-gray-500 uppercase">
                Global Status
              </div>
              <div
                className={`mt-2 font-mono text-2xl font-black ${
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-black/20">
              <Activity className="h-5 w-5 text-[var(--color-accent-primary)]" />
            </div>
          </div>
          <div className="bg-rack-panel border-rack-border flex items-center justify-between rounded-2xl border px-6 py-5">
            <div>
              <div className="text-[10px] font-bold tracking-[0.3em] text-gray-500 uppercase">
                Active Alerts
              </div>
              <div className="mt-2 flex items-center gap-4">
                <div className="font-mono text-2xl font-black text-white">
                  {globalStats?.active_alerts || 0}
                </div>
                <div className="font-mono text-[11px] text-gray-500 uppercase">
                  <span className="text-status-crit">{globalStats?.crit_count || 0}</span> CRIT /{' '}
                  <span className="text-status-warn">{globalStats?.warn_count || 0}</span> WARN
                </div>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-black/20">
              <AlertTriangle className="text-status-warn h-5 w-5" />
            </div>
          </div>
          <div className="bg-rack-panel border-rack-border flex items-center justify-between rounded-2xl border px-6 py-5">
            <div>
              <div className="text-[10px] font-bold tracking-[0.3em] text-gray-500 uppercase">
                Managed Racks
              </div>
              <div className="mt-2 font-mono text-2xl font-black text-white">
                {globalStats?.total_racks || 0}
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-black/20">
              <MapIcon className="h-5 w-5 text-[var(--color-accent-primary)]" />
            </div>
          </div>
          <div className="bg-rack-panel border-rack-border flex items-center justify-between rounded-2xl border px-6 py-5">
            <div>
              <div className="text-[10px] font-bold tracking-[0.3em] text-gray-500 uppercase">
                Prometheus
              </div>
              <div className="mt-2 font-mono text-2xl font-black text-white">
                {promStats?.avg_ms ? `${Math.round(promStats.avg_ms)} ms` : '--'}
              </div>
              <div className="mt-1 font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                {promStats?.last_ms ? `last ${Math.round(promStats.last_ms)} ms` : 'no samples'}
              </div>
              <div className="mt-3 space-y-1 font-mono text-[9px] tracking-[0.2em] text-gray-500 uppercase">
                <div className="flex items-center justify-between gap-2">
                  <span>Last scrape</span>
                  <span className="text-gray-400">
                    {promStats?.last_ts ? new Date(promStats.last_ts).toLocaleTimeString() : '--'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Next scrape</span>
                  <span className="text-gray-400">
                    {promStats?.next_ts ? new Date(promStats.next_ts).toLocaleTimeString() : '--'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/5 bg-black/20">
              <Activity className="h-5 w-5 text-[var(--color-accent-primary)]" />
            </div>
          </div>
        </div>
      </header>

      {sites.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {sites.map((site) => (
            <button
              key={site.id}
              onClick={() => setSelectedSiteId(site.id)}
              className={`rounded-full border px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase transition-colors ${
                selectedSiteId === site.id
                  ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                  : 'border-[var(--color-border)] bg-transparent text-gray-500 hover:text-[var(--color-text-base)]'
              }`}
            >
              {site.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="bg-rack-panel border-rack-border rounded-3xl border p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] tracking-[0.35em] text-gray-500 uppercase">
                Topology
              </div>
              <h2 className="text-lg font-bold tracking-[0.2em] text-gray-200 uppercase">Rooms</h2>
            </div>
            <div className="font-mono text-[11px] text-gray-500 uppercase">
              {roomSummaries.length} Rooms
            </div>
          </div>

          <div className="space-y-3">
            {roomSummaries.map(({ room, totals }) => (
              <Link
                key={room.id}
                to={`/room/${room.id}`}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-transparent bg-black/20 px-4 py-3 transition-colors hover:border-[var(--color-accent-primary)]/40"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-gray-200 transition-colors group-hover:text-[var(--color-accent-primary)]">
                    {room.name}
                  </span>
                  <span className="font-mono text-[10px] tracking-widest text-gray-500 uppercase">
                    {totals.total} racks
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px] uppercase">
                  <span className="text-status-crit">{totals.crit}</span>
                  <span className="text-status-warn">{totals.warn}</span>
                  <span className="text-status-ok">{totals.ok}</span>
                  <span className="text-gray-500">{totals.unknown}</span>
                  <ArrowUpRight className="h-3 w-3 text-gray-500 group-hover:text-[var(--color-accent-primary)]" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="bg-rack-panel border-rack-border rounded-3xl border p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] tracking-[0.35em] text-gray-500 uppercase">
                  Alerts
                </div>
                <h2 className="text-lg font-bold tracking-[0.2em] text-gray-200 uppercase">
                  Active Devices
                </h2>
              </div>
              <div className="font-mono text-[10px] text-gray-500 uppercase">
                {activeAlerts.length} total
              </div>
            </div>

            {deviceAlerts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center font-mono text-[11px] tracking-widest text-gray-500 uppercase">
                No active alerts
              </div>
            ) : (
              <div className="space-y-3">
                {deviceAlerts.map((item) => (
                  <Link
                    key={`${item.rack_id}-${item.node_id}`}
                    to={`/rack/${item.rack_id}`}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3 transition-colors hover:border-[var(--color-accent-primary)]/40"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-gray-200">
                        {item.device_name}
                      </div>
                      <div className="truncate font-mono text-[10px] tracking-widest text-gray-500 uppercase">
                        {item.site_name} / {item.room_name} / {item.rack_name}
                      </div>
                      <div className="font-mono text-[9px] tracking-widest text-gray-500 uppercase">
                        {item.node_id}
                      </div>
                    </div>
                    <div
                      className={`rounded-full border px-3 py-1 text-[10px] font-bold tracking-widest uppercase ${
                        item.state === 'CRIT'
                          ? 'border-status-crit/40 text-status-crit bg-status-crit/10'
                          : 'border-status-warn/40 text-status-warn bg-status-warn/10'
                      }`}
                    >
                      {item.state}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="bg-rack-panel border-rack-border rounded-3xl border p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] tracking-[0.35em] text-gray-500 uppercase">
                  Telemetry
                </div>
                <h2 className="text-lg font-bold tracking-[0.2em] text-gray-200 uppercase">
                  Prometheus
                </h2>
              </div>
              <div className="font-mono text-[10px] text-gray-500 uppercase">
                {telemetryStats?.in_flight ?? 0} in flight
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
              <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="text-[9px]">Queries</div>
                <div className="mt-2 text-lg font-black text-white">
                  {telemetryStats?.query_count ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="text-[9px]">Cache hits</div>
                <div className="text-status-ok mt-2 text-lg font-black">
                  {telemetryStats?.cache_hits ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="text-[9px]">Cache misses</div>
                <div className="text-status-warn mt-2 text-lg font-black">
                  {telemetryStats?.cache_misses ?? 0}
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="text-[9px]">Last batch</div>
                <div className="mt-2 font-mono text-[11px] text-gray-300">
                  {telemetryStats?.last_batch
                    ? `${telemetryStats.last_batch.total_ids} ids / ${telemetryStats.last_batch.query_count} q`
                    : '--'}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-6">
        <div className="bg-rack-panel border-rack-border rounded-2xl border px-5 py-4">
          <div className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">
            Rooms
          </div>
          <div className="mt-2 font-mono text-xl font-black text-white">
            {globalStats?.total_rooms || 0}
          </div>
        </div>
        <div className="bg-rack-panel border-rack-border rounded-2xl border px-5 py-4">
          <div className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">
            Racks
          </div>
          <div className="mt-2 font-mono text-xl font-black text-white">
            {globalStats?.total_racks || 0}
          </div>
        </div>
        <div className="bg-rack-panel border-rack-border rounded-2xl border px-5 py-4">
          <div className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">
            Critical
          </div>
          <div className="text-status-crit mt-2 font-mono text-xl font-black">
            {globalStats?.crit_count || 0}
          </div>
        </div>
        <div className="bg-rack-panel border-rack-border rounded-2xl border px-5 py-4">
          <div className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">
            Warning
          </div>
          <div className="text-status-warn mt-2 font-mono text-xl font-black">
            {globalStats?.warn_count || 0}
          </div>
        </div>
        <div className="bg-rack-panel border-rack-border rounded-2xl border px-5 py-4">
          <div className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">
            Checks
          </div>
          <div className="mt-2 font-mono text-xl font-black text-white">{checksTotal}</div>
        </div>
        <div className="bg-rack-panel border-rack-border rounded-2xl border px-5 py-4">
          <div className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">
            Active checks
          </div>
          <div className="text-status-warn mt-2 font-mono text-xl font-black">
            {activeAlerts.reduce(
              (acc, item) => acc + (Array.isArray(item?.checks) ? item.checks.length : 0),
              0
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Layout
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onReload={() => setReloadKey((prev) => prev + 1)}
        >
          <Routes>
            <Route
              path="/"
              element={<Dashboard searchQuery={searchQuery} reloadKey={reloadKey} />}
            />
            <Route
              path="/room/:roomId"
              element={<RoomPage searchQuery={searchQuery} reloadKey={reloadKey} />}
            />
            <Route path="/rack/:rackId" element={<RackPage reloadKey={reloadKey} />} />
            <Route path="/templates" element={<TemplatesLibraryPage />} />
            <Route path="/templates/editor" element={<TemplatesEditorPage />} />
            <Route path="/templates/editor/racks" element={<TemplatesRackEditorPage />} />
            <Route path="/checks/library" element={<ChecksLibraryEditorPage />} />
            <Route path="/topology/editor" element={<TopologyEditorPage />} />
            <Route path="/topology/racks/editor" element={<RackEditorPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
