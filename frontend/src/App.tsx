import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationHeader } from './components/NotificationHeader';
import { RoomPage } from './pages/RoomPage';
import { RackPage } from './pages/RackPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import type { RoomSummary, Site } from './types';
import { Activity, Zap, Thermometer, AlertTriangle, Map as MapIcon, ArrowUpRight, Search, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

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
                placeholder="Search datacenter / room / rack / device"
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-black/30 border border-[var(--color-border)] text-[13px] text-gray-300 placeholder:text-gray-500 focus:outline-none focus:border-[var(--color-accent)]/50"
              />
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
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [refreshMs, setRefreshMs] = useState(60000);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;

  useEffect(() => {
    let active = true;
    const loadConfig = async () => {
      try {
        const configData = await api.getConfig();
        const nextRefresh = Number(configData?.refresh?.room_state_seconds) || 60;
        if (active) {
          setRefreshMs(Math.max(60000, nextRefresh * 1000));
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
        const [roomsData, stats, sitesData] = await Promise.all([
            api.getRooms(),
            api.getGlobalStats(),
            api.getSites()
        ]);
        const safeRooms = Array.isArray(roomsData) ? roomsData : [];
        const safeSites = Array.isArray(sitesData) ? sitesData : [];
        setRooms(safeRooms);
        setGlobalStats(stats);
        setSites(safeSites);
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

  if (loading) return <div className="p-12 font-mono animate-pulse text-blue-500">LDR :: AGGREGATING_GLOBAL_METRICS...</div>;

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

  return (
    <div className="p-12 h-full overflow-y-auto custom-scrollbar">
      <header className="mb-12">
        <h1 className="text-5xl font-black tracking-tighter mb-2 uppercase italic text-[var(--color-accent-primary)]">Overview</h1>
        <p className="text-gray-500 font-mono text-sm uppercase tracking-[0.3em]">Global Infrastructure Status</p>
      </header>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-rack-panel border border-rack-border p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-2 text-gray-500">
                <Zap className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Global Status</span>
            </div>
            <div className={`text-3xl font-black font-mono ${globalStats?.status === 'CRIT' ? 'text-status-crit' : globalStats?.status === 'WARN' ? 'text-status-warn' : 'text-status-ok'}`}>
                {globalStats?.status === 'CRIT' ? 'CRITICAL' : globalStats?.status === 'WARN' ? 'WARNING' : 'OPTIMAL'}
            </div>
        </div>
        <div className="bg-rack-panel border border-rack-border p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-2 text-gray-500">
                <AlertTriangle className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Active Alerts</span>
            </div>
            <div className={`text-3xl font-black font-mono ${globalStats?.active_alerts > 0 ? 'text-status-warn' : 'text-white'}`}>
                {globalStats?.active_alerts || 0}
            </div>
        </div>
        <div className="bg-rack-panel border border-rack-border p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-2 text-gray-500">
                <MapIcon className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Managed Racks</span>
            </div>
            <div className="text-3xl font-black font-mono text-white">{globalStats?.total_racks || 0}</div>
        </div>
        <div className="bg-rack-panel border border-rack-border p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-2 text-gray-500">
                <Activity className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Telemetry Pulse</span>
            </div>
            <div className="text-3xl font-black font-mono text-status-ok animate-pulse">LIVE</div>
        </div>
      </div>

      {/* Site Selector */}
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

      {/* Room Grid */}
      <h2 className="text-xs font-bold text-gray-600 uppercase tracking-[0.4em] mb-6 border-b border-white/5 pb-2">Datacenter Locations</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredRooms.map(room => (
            <Link 
                key={room.id} 
                to={`/room/${room.id}`}
                className="group relative bg-rack-panel border border-rack-border rounded-3xl p-8 hover:border-[var(--color-accent-primary)] transition-all hover:shadow-[0_0_40px_rgba(59,130,246,0.05)] overflow-hidden"
            >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                    <MapIcon className="w-24 h-24 -rotate-12" />
                </div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase group-hover:text-[var(--color-accent-primary)] transition-colors">{room.name}</h3>
                            <p className="text-[10px] font-mono text-gray-500 uppercase mt-1 tracking-widest">Site ID: {room.site_id}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                            roomStates[room.id]?.state === 'OK' ? 'bg-status-ok/10 text-status-ok border-status-ok/20' :
                            roomStates[room.id]?.state === 'CRIT' ? 'bg-status-crit/10 text-status-crit border-status-crit/20 animate-pulse' :
                            'bg-status-warn/10 text-status-warn border-status-warn/20'
                        }`}>
                            {roomStates[room.id]?.state || 'UNKNOWN'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-12">
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-gray-600 uppercase font-bold tracking-tighter">Inventory</span>
                            <span className="text-xl font-mono text-gray-300">{room.aisles?.length || 0} Aisles</span>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                            <span className="text-[9px] text-gray-600 uppercase font-bold tracking-tighter">Inspection</span>
                            <div className="flex items-center gap-1 text-[var(--color-accent-primary)] font-bold text-xs uppercase">
                                Open Map <ArrowUpRight className="w-3 h-3" />
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        ))}
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
            <Route path="/room/:roomId" element={<RoomPage />} />
            <Route path="/rack/:rackId" element={<RackPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
