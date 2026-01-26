import { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationHeader } from './components/NotificationHeader';
import { RoomPage } from './pages/RoomPage';
import { RackPage } from './pages/RackPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import type { RoomSummary, Site } from './types';
import { expandInstanceMatches, matchesText } from './utils/search';
import { Activity, AlertTriangle, Map as MapIcon, ArrowUpRight, Search, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

// Layout global
const Layout = ({
  children,
  searchQuery,
  onSearchChange,
}: {
  children: React.ReactNode;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}) => {
  const [stale, setStale] = useState(api.isStale());
  const [lastSyncText, setLastSyncText] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const blurTimer = useRef<number | null>(null);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;

  useEffect(() => {
    const interval = setInterval(() => {
      setStale(api.isStale());
      const ts = api.getLastSuccessTs();
      if (!ts) {
        setLastSyncText(null);
        return;
      }
      const diffMs = Date.now() - ts;
      const min = Math.floor(diffMs / 60000);
      if (min < 1) {
        setLastSyncText('just now');
        return;
      }
      if (min < 60) {
        setLastSyncText(`${min} min`);
        return;
      }
      const hours = Math.floor(min / 60);
      if (hours < 24) {
        setLastSyncText(`${hours} h`);
        return;
      }
      const days = Math.floor(hours / 24);
      setLastSyncText(`${days} d`);
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
      } catch (e) {
        console.error(e);
      }
    };
    loadSites();
    return () => {
      active = false;
    };
  }, []);

  const searchResults = useMemo(() => {
    if (!hasQuery) return [];
    const results: Array<{
      id: string;
      type: 'datacenter' | 'room' | 'aisle' | 'rack' | 'device' | 'instance';
      label: string;
      sublabel: string;
      to: string;
    }> = [];
    const seen = new Set<string>();
    const pushResult = (item: typeof results[number]) => {
      if (seen.has(item.id)) return;
      seen.add(item.id);
      results.push(item);
    };

    for (const site of sites) {
      if (matchesText(site.name, normalizedQuery) || matchesText(site.id, normalizedQuery)) {
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
        if (matchesText(room.name, normalizedQuery) || matchesText(room.id, normalizedQuery)) {
          pushResult({
            id: room.id,
            type: 'room',
            label: room.name || room.id,
            sublabel: `${site.name || site.id} / Room`,
            to: `/room/${room.id}`,
          });
        }

        for (const aisle of room.aisles || []) {
          if (matchesText(aisle.name, normalizedQuery) || matchesText(aisle.id, normalizedQuery)) {
            pushResult({
              id: `${room.id}:${aisle.id}`,
              type: 'aisle',
              label: aisle.name || aisle.id,
              sublabel: `${site.name || site.id} / ${room.name || room.id} / Aisle`,
              to: `/room/${room.id}`,
            });
          }

          for (const rack of aisle.racks || []) {
            const rackMatches = matchesText(rack.name, normalizedQuery) || matchesText(rack.id, normalizedQuery);
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
              if (matchesText(device.name, normalizedQuery) || matchesText(device.id, normalizedQuery)) {
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
          const rackMatches = matchesText(rack.name, normalizedQuery) || matchesText(rack.id, normalizedQuery);
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
            if (matchesText(device.name, normalizedQuery) || matchesText(device.id, normalizedQuery)) {
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
  }, [hasQuery, normalizedQuery, sites]);

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
    <div className="flex h-screen bg-rack-dark text-gray-100 overflow-hidden font-sans">
      <Sidebar collapsed={sidebarCollapsed} searchQuery={searchQuery} />
      <main className="flex-1 overflow-hidden relative bg-[var(--color-bg-base)] text-[var(--color-text-base)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
        <header className="h-20 px-5 border-b border-[var(--color-border)] bg-[var(--color-bg-panel)]/80 backdrop-blur-xl flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4 min-w-[240px]">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(prev => !prev)}
              className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-black/30 flex items-center justify-center text-gray-400 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30 transition-colors"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-[#0b1f3a] border border-white/10 flex items-center justify-center shadow-[0_0_16px_rgba(59,130,246,0.35)]">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.35em] text-gray-500">RackScope</div>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${stale ? 'bg-status-crit' : 'bg-status-ok'} shadow-[0_0_8px_var(--color-status-ok)]`}></div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">{stale ? 'Stale' : 'Live'}</span>
              </div>
            </div>
          </div>
          <div className="flex-1 px-6 max-w-[700px]">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                placeholder="Search datacenter / room / rack / device"
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-black/30 border border-[var(--color-border)] text-[13px] text-gray-300 placeholder:text-gray-500 focus:outline-none focus:border-[var(--color-accent)]/50"
              />
              {searchOpen && hasQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--color-bg-panel)]/95 border border-[var(--color-border)] rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl overflow-hidden z-50">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-[11px] text-gray-400 font-mono uppercase tracking-[0.2em]">
                      No matches found
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {searchResults.map((result) => (
                        <Link
                          key={result.id}
                          to={result.to}
                          className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]/60 hover:bg-white/5 transition-colors"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => setSearchOpen(false)}
                        >
                          <div>
                            <div className="text-[12px] font-semibold text-gray-100">{result.label}</div>
                            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-gray-500">{result.sublabel}</div>
                          </div>
                          <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--color-accent)]">
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
          <div className="flex items-center gap-3 min-w-[240px] justify-end">
            <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
              Last sync: {lastSyncText || '--'}
            </div>
            <NotificationHeader />
            <Link to="/settings" className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-black/30 flex items-center justify-center text-gray-400 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/30 transition-colors">
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </header>
        <div className="h-[calc(100%-5rem)]">
          {children}
        </div>
      </main>
    </div>
  );
};

/**
 * Dashboard Component (Overview)
 * 
 * Central monitoring hub providing a high-level view of the entire infrastructure.
 */
const Dashboard = ({ searchQuery = '' }: { searchQuery?: string }) => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomStates, setRoomStates] = useState<Record<string, any>>({});
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [promStats, setPromStats] = useState<any>(null);
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
      } catch (e) {
        console.error(e);
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
        const [roomsData, stats, sitesData, alertsData, promData] = await Promise.all([
            api.getRooms(),
            api.getGlobalStats(),
            api.getSites(),
            api.getActiveAlerts(),
            api.getPrometheusStats(),
        ]);
        const safeRooms = Array.isArray(roomsData) ? roomsData : [];
        const safeSites = Array.isArray(sitesData) ? sitesData : [];
        setRooms(safeRooms);
        setGlobalStats(stats);
        setSites(safeSites);
        setActiveAlerts(Array.isArray(alertsData?.alerts) ? alertsData.alerts : []);
        setPromStats(promData || null);
        if (!selectedSiteId && safeSites.length > 0) {
          setSelectedSiteId(safeSites[0].id);
        }
        
        const states: Record<string, any> = {};
        await Promise.all(safeRooms.map(async (r) => {
            try {
                const s = await api.getRoomState(r.id);
                states[r.id] = s;
            } catch (e) {
                states[r.id] = { state: 'UNKNOWN' };
            }
        }));
        setRoomStates(states);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, refreshMs);
    return () => clearInterval(interval);
  }, [refreshMs]);

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

  const rackMetaById = useMemo(() => {
    const map = new Map<string, { rackName: string; roomId: string; roomName: string }>();
    for (const room of rooms) {
      for (const aisle of room.aisles || []) {
        for (const rack of aisle.racks || []) {
          map.set(rack.id, { rackName: rack.name, roomId: room.id, roomName: room.name });
        }
      }
    }
    return map;
  }, [rooms]);

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
        const state = typeof rawState === 'string' ? rawState : rawState?.state || 'UNKNOWN';
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

  const alertItems = useMemo(() => {
    const items: Array<{ rackId: string; rackName: string; roomName: string; state: string }> = [];
    for (const room of rooms) {
      const rackStates = roomStates[room.id]?.racks || {};
      for (const [rackId, rawState] of Object.entries(rackStates)) {
        const state = typeof rawState === 'string' ? rawState : (rawState as any)?.state || 'UNKNOWN';
        if (state !== 'CRIT' && state !== 'WARN') continue;
        const meta = rackMetaById.get(rackId);
        items.push({
          rackId,
          rackName: meta?.rackName || rackId,
          roomName: meta?.roomName || room.name,
          state,
        });
      }
    }
    const weight = (state: string) => (state === 'CRIT' ? 2 : state === 'WARN' ? 1 : 0);
    return items.sort((a, b) => weight(b.state) - weight(a.state)).slice(0, 6);
  }, [rooms, roomStates, rackMetaById]);

  const deviceAlerts = useMemo(() => {
    const weight = (state: string) => (state === 'CRIT' ? 2 : state === 'WARN' ? 1 : 0);
    return [...activeAlerts]
      .filter((item) => item?.state === 'CRIT' || item?.state === 'WARN')
      .sort((a, b) => weight(b.state) - weight(a.state))
      .slice(0, 10);
  }, [activeAlerts]);

  if (loading) {
    return <div className="p-12 font-mono animate-pulse text-blue-500">LDR :: AGGREGATING_GLOBAL_METRICS...</div>;
  }

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <header className="flex flex-col gap-6 mb-10">
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.45em] text-gray-500">Wallboard</div>
          <h1 className="text-4xl font-black tracking-tight uppercase text-[var(--color-accent-primary)]">Overview</h1>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono uppercase tracking-[0.3em] text-gray-500">
            <span>Global Infrastructure Status</span>
            {currentSite && (
              <span className="flex items-center gap-2 text-gray-400">
                <span className="h-1 w-1 rounded-full bg-gray-600"></span>
                {currentSite.name}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-rack-panel border border-rack-border rounded-2xl px-6 py-5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Global Status</div>
              <div className={`mt-2 text-2xl font-black font-mono ${
                globalStats?.status === 'CRIT' ? 'text-status-crit' :
                globalStats?.status === 'WARN' ? 'text-status-warn' :
                'text-status-ok'
              }`}>
                {globalStats?.status === 'CRIT' ? 'CRITICAL' : globalStats?.status === 'WARN' ? 'WARNING' : 'OPTIMAL'}
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl border border-white/5 bg-black/20 flex items-center justify-center">
              <Activity className="h-5 w-5 text-[var(--color-accent-primary)]" />
            </div>
          </div>
          <div className="bg-rack-panel border border-rack-border rounded-2xl px-6 py-5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Active Alerts</div>
              <div className="mt-2 flex items-center gap-4">
                <div className="text-2xl font-black font-mono text-white">{globalStats?.active_alerts || 0}</div>
                <div className="text-[11px] font-mono uppercase text-gray-500">
                  <span className="text-status-crit">{globalStats?.crit_count || 0}</span> CRIT /{' '}
                  <span className="text-status-warn">{globalStats?.warn_count || 0}</span> WARN
                </div>
              </div>
            </div>
            <div className="h-12 w-12 rounded-2xl border border-white/5 bg-black/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-status-warn" />
            </div>
          </div>
          <div className="bg-rack-panel border border-rack-border rounded-2xl px-6 py-5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Managed Racks</div>
              <div className="mt-2 text-2xl font-black font-mono text-white">{globalStats?.total_racks || 0}</div>
            </div>
            <div className="h-12 w-12 rounded-2xl border border-white/5 bg-black/20 flex items-center justify-center">
              <MapIcon className="h-5 w-5 text-[var(--color-accent-primary)]" />
            </div>
          </div>
          <div className="bg-rack-panel border border-rack-border rounded-2xl px-6 py-5 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">Prometheus</div>
              <div className="mt-2 text-2xl font-black font-mono text-white">
                {promStats?.avg_ms ? `${Math.round(promStats.avg_ms)} ms` : '--'}
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mt-1">
                {promStats?.last_ms ? `last ${Math.round(promStats.last_ms)} ms` : 'no samples'}
              </div>
              <div className="mt-3 text-[9px] font-mono uppercase tracking-[0.2em] text-gray-500 space-y-1">
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
            <div className="h-12 w-12 rounded-2xl border border-white/5 bg-black/20 flex items-center justify-center">
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
              className={`px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-widest border transition-colors ${
                selectedSiteId === site.id
                  ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/30'
                  : 'bg-transparent text-gray-500 border-[var(--color-border)] hover:text-[var(--color-text-base)]'
              }`}
            >
              {site.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-8">
        <section className="bg-rack-panel border border-rack-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.35em] text-gray-500">Topology</div>
              <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-gray-200">Rooms</h2>
            </div>
            <div className="text-[11px] font-mono uppercase text-gray-500">
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
                  <span className="text-sm font-semibold text-gray-200 group-hover:text-[var(--color-accent-primary)] transition-colors">{room.name}</span>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">{totals.total} racks</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono uppercase">
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

        <aside className="bg-rack-panel border border-rack-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.35em] text-gray-500">Alerts</div>
              <h2 className="text-lg font-bold uppercase tracking-[0.2em] text-gray-200">Active Devices</h2>
            </div>
            <div className="text-[10px] font-mono uppercase text-gray-500">
              {activeAlerts.length} total
            </div>
          </div>

          {deviceAlerts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-[11px] font-mono uppercase tracking-widest text-gray-500">
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
                    <div className="text-sm font-semibold text-gray-200 truncate">{item.device_name}</div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500 truncate">
                      {item.site_name} / {item.room_name} / {item.rack_name}
                    </div>
                    <div className="text-[9px] font-mono uppercase tracking-widest text-gray-500">
                      {item.node_id}
                    </div>
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                    item.state === 'CRIT'
                      ? 'border-status-crit/40 text-status-crit bg-status-crit/10'
                      : 'border-status-warn/40 text-status-warn bg-status-warn/10'
                  }`}>
                    {item.state}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>

      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-rack-panel border border-rack-border rounded-2xl px-5 py-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Rooms</div>
          <div className="mt-2 text-xl font-black font-mono text-white">{globalStats?.total_rooms || 0}</div>
        </div>
        <div className="bg-rack-panel border border-rack-border rounded-2xl px-5 py-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Racks</div>
          <div className="mt-2 text-xl font-black font-mono text-white">{globalStats?.total_racks || 0}</div>
        </div>
        <div className="bg-rack-panel border border-rack-border rounded-2xl px-5 py-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Critical</div>
          <div className="mt-2 text-xl font-black font-mono text-status-crit">{globalStats?.crit_count || 0}</div>
        </div>
        <div className="bg-rack-panel border border-rack-border rounded-2xl px-5 py-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Warning</div>
          <div className="mt-2 text-xl font-black font-mono text-status-warn">{globalStats?.warn_count || 0}</div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Layout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
          <Routes>
            <Route path="/" element={<Dashboard searchQuery={searchQuery} />} />
            <Route path="/room/:roomId" element={<RoomPage searchQuery={searchQuery} />} />
            <Route path="/rack/:rackId" element={<RackPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
