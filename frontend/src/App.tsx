import { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { CosmosRouter } from './cosmos/CosmosRouter';
import { Sidebar } from './components/Sidebar';
import { PluginRoute } from './components/PluginRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PluginsMenuProvider } from './context/PluginsMenuContext';
import { NotificationHeader } from './components/NotificationHeader';
import { ThemeSelector } from './components/ThemeSelector';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { RoomPage } from './pages/RoomPage';
import { RackPage } from './pages/RackPage';
import { DevicePage } from './pages/DevicePage';
import { SettingsPage } from './pages/SettingsPage';
import { TemplatesLibraryPage } from './pages/TemplatesLibraryPage';
import { TemplatesEditorPage } from './pages/TemplatesEditorPage';
import { TemplatesRackEditorPage } from './pages/TemplatesRackEditorPage';
import { ChecksLibraryEditorPage } from './pages/ChecksLibraryEditorPage';
import { TopologyEditorPage } from './pages/TopologyEditorPage';
import { RackEditorPage } from './pages/RackEditorPage';
import { WorldMapPage } from './pages/WorldMapPage';
import { SlurmRoomPage } from './pages/SlurmRoomPage';
import { SlurmOverviewPage } from './pages/SlurmOverviewPage';
import { SlurmPartitionsPage } from './pages/SlurmPartitionsPage';
import { SlurmNodesPage } from './pages/SlurmNodesPage';
import { SlurmAlertsPage } from './pages/SlurmAlertsPage';
import { SimulatorControlPanelPage } from './pages/SimulatorControlPanelPage';
import { api } from './services/api';
import type { Site } from './types';
import { expandInstanceMatches, matchesText } from './utils/search';
import { Search, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const blurTimer = useRef<number | null>(null);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;

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
                  to: `/rack/${rack.id}/device/${device.id}`,
                });
              }
              const instanceMatches = expandInstanceMatches(searchQuery, device.instance, 50);
              for (const value of instanceMatches) {
                pushResult({
                  id: `${rack.id}:${device.id}:${value}`,
                  type: 'instance',
                  label: value,
                  sublabel: `${rack.name || rack.id} / Instance`,
                  to: `/rack/${rack.id}/device/${device.id}?instance=${encodeURIComponent(value)}`,
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
                to: `/rack/${rack.id}/device/${device.id}`,
              });
            }
            const instanceMatches = expandInstanceMatches(searchQuery, device.instance, 50);
            for (const value of instanceMatches) {
              pushResult({
                id: `${rack.id}:${device.id}:${value}`,
                type: 'instance',
                label: value,
                sublabel: `${rack.name || rack.id} / Instance`,
                to: `/rack/${rack.id}/device/${device.id}?instance=${encodeURIComponent(value)}`,
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
          <div className="flex items-center gap-4">
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
          <div className="flex items-center justify-end gap-3">
            <ThemeSelector />
            <NotificationHeader />
          </div>
        </header>
        <div className="h-[calc(100%-5rem)]">{children}</div>
      </main>
    </div>
  );
};

// Rackscope main app — Layout + all existing routes
const RackscopeApp = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [reloadKey] = useState(0);

  return (
    <PluginsMenuProvider>
      <Layout searchQuery={searchQuery} onSearchChange={setSearchQuery}>
        <Routes>
          <Route
            path="/"
            element={<DashboardOverview searchQuery={searchQuery} reloadKey={reloadKey} />}
          />
          <Route
            path="/room/:roomId"
            element={<RoomPage searchQuery={searchQuery} reloadKey={reloadKey} />}
          />
          <Route path="/topology/map" element={<WorldMapPage />} />
          <Route
            path="/simulator"
            element={
              <PluginRoute pluginId="simulator">
                <SimulatorControlPanelPage />
              </PluginRoute>
            }
          />
          <Route
            path="/slurm"
            element={
              <PluginRoute pluginId="workload">
                <SlurmOverviewPage />
              </PluginRoute>
            }
          />
          <Route
            path="/slurm/overview"
            element={
              <PluginRoute pluginId="workload">
                <SlurmOverviewPage />
              </PluginRoute>
            }
          />
          <Route
            path="/slurm/wallboard"
            element={
              <PluginRoute pluginId="workload">
                <SlurmRoomPage />
              </PluginRoute>
            }
          />
          <Route
            path="/slurm/room/:roomId"
            element={
              <PluginRoute pluginId="workload">
                <SlurmRoomPage />
              </PluginRoute>
            }
          />
          <Route
            path="/slurm/partitions"
            element={
              <PluginRoute pluginId="workload">
                <SlurmPartitionsPage />
              </PluginRoute>
            }
          />
          <Route
            path="/slurm/nodes"
            element={
              <PluginRoute pluginId="workload">
                <SlurmNodesPage />
              </PluginRoute>
            }
          />
          <Route
            path="/slurm/alerts"
            element={
              <PluginRoute pluginId="workload">
                <SlurmAlertsPage />
              </PluginRoute>
            }
          />
          <Route path="/rack/:rackId/device/:deviceId" element={<DevicePage />} />
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
    </PluginsMenuProvider>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {/* Cosmos theme: nested routing context so relative paths work correctly */}
          <Route path="/cosmos/*" element={<CosmosRouter />} />
          {/* Rackscope main app */}
          <Route path="/*" element={<RackscopeApp />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
