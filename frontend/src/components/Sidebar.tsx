import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { RoomSummary, AisleSummary, Site } from '../types';
import { matchesInstanceValue, matchesText } from '../utils/search';
import {
  LayoutDashboard,
  ChevronRight,
  ChevronDown,
  Activity,
  Component,
  Folder,
  Settings,
  Globe,
  Home,
  Columns2,
  SlidersHorizontal,
  Palette,
  FileText,
} from 'lucide-react';

export const Sidebar = ({
  collapsed,
  searchQuery = '',
}: {
  collapsed?: boolean;
  searchQuery?: string;
}) => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [promStats, setPromStats] = useState<{
    last_ms?: number | null;
    avg_ms?: number | null;
    last_ts?: number | null;
    next_ts?: number | null;
    heartbeat_seconds?: number | null;
  }>({});
  const [refreshSeconds, setRefreshSeconds] = useState(30);
  const [now, setNow] = useState(Date.now());
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    topology: false,
    templates: false,
    settings: false,
  });

  useEffect(() => {
    Promise.all([api.getRooms(), api.getSites(), api.getConfig()])
      .then(([roomsData, sitesData, configData]) => {
        const safeRooms = Array.isArray(roomsData) ? roomsData : [];
        const safeSites = Array.isArray(sitesData) ? sitesData : [];
        setRooms(safeRooms);
        setSites(safeSites);
        const nextRefresh = Number(configData?.telemetry?.prometheus_heartbeat_seconds) || 30;
        setRefreshSeconds(Math.max(10, nextRefresh));
        if (!selectedSiteId && safeSites.length > 0) {
          setSelectedSiteId(safeSites[0].id);
        }
      }).catch(console.error);
  }, []);

  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      try {
        const stats = await api.getPrometheusStats();
        if (active) {
          setPromStats(stats || {});
          if (stats?.heartbeat_seconds) {
            setRefreshSeconds(Math.max(10, Number(stats.heartbeat_seconds)));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadStats();
    const intervalMs = Math.max(10000, refreshSeconds * 1000);
    const interval = setInterval(loadStats, intervalMs);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [refreshSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatAge = (ts?: number | null) => {
    if (!ts) return '--';
    const diffMs = Date.now() - ts;
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min} min`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.floor(hours / 24);
    return `${days} d`;
  };

  const formatCountdown = (ts?: number | null, nextTs?: number | null) => {
    if (!ts) return '--';
    const intervalMs = refreshSeconds * 1000;
    if (!intervalMs) return '--';
    let target = nextTs ?? (ts + intervalMs);
    if (target <= now) {
      const cycles = Math.floor((now - ts) / intervalMs) + 1;
      target = ts + cycles * intervalMs;
    }
    const nextMs = target - now;
    if (nextMs <= 0) return '0s';
    const totalSeconds = Math.ceil(nextMs / 1000);
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    if (min >= 60) {
      const hours = Math.floor(min / 60);
      const remMin = min % 60;
      return `${hours}h ${remMin}m`;
    }
    if (min >= 1) return `${min}m ${sec}s`;
    return `${sec}s`;
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasQuery = normalizedQuery.length > 0;

  const rackIdsWithDeviceMatch = useMemo(() => {
    if (!hasQuery) return new Set<string>();
    const rackIds = new Set<string>();

    for (const site of sites) {
      for (const room of site.rooms || []) {
        for (const aisle of room.aisles || []) {
          for (const rack of aisle.racks || []) {
            for (const device of rack.devices || []) {
              if (matchesText(device.name, normalizedQuery) || matchesText(device.id, normalizedQuery)) {
                rackIds.add(rack.id);
              }
              if (matchesInstanceValue(normalizedQuery, device.instance)) {
                rackIds.add(rack.id);
              }
            }
          }
        }
        for (const rack of room.standalone_racks || []) {
          for (const device of rack.devices || []) {
            if (matchesText(device.name, normalizedQuery) || matchesText(device.id, normalizedQuery)) {
              rackIds.add(rack.id);
            }
            if (matchesInstanceValue(normalizedQuery, device.instance)) {
              rackIds.add(rack.id);
            }
          }
        }
      }
    }

    return rackIds;
  }, [hasQuery, normalizedQuery, sites]);

  const roomsBySite = useMemo(() => {
    return sites.reduce((acc, site) => {
      acc[site.id] = rooms.filter(room => room.site_id === site.id);
      return acc;
    }, {} as Record<string, RoomSummary[]>);
  }, [rooms, sites]);

  const filteredRoomsBySite = useMemo(() => {
    if (!hasQuery) return roomsBySite;
    return sites.reduce((acc, site) => {
      const siteMatch = matchesText(site.name, normalizedQuery) || matchesText(site.id, normalizedQuery);
      const roomsForSite = roomsBySite[site.id] || [];

      const filteredRooms = roomsForSite
        .map((room) => {
          const roomMatch = siteMatch || matchesText(room.name, normalizedQuery) || matchesText(room.id, normalizedQuery);
          if (!room.aisles || roomMatch) {
            return room;
          }

          const filteredAisles = room.aisles
            .map((aisle) => {
              const aisleMatch = roomMatch || matchesText(aisle.name, normalizedQuery) || matchesText(aisle.id, normalizedQuery);
              if (aisleMatch) return aisle;

              const filteredRacks = aisle.racks.filter((rack) => {
                return (
                  matchesText(rack.name, normalizedQuery) ||
                  matchesText(rack.id, normalizedQuery) ||
                  rackIdsWithDeviceMatch.has(rack.id)
                );
              });

              if (filteredRacks.length === 0) return null;
              return { ...aisle, racks: filteredRacks };
            })
            .filter(Boolean) as AisleSummary[];

          if (filteredAisles.length === 0) return null;
          return { ...room, aisles: filteredAisles };
        })
        .filter(Boolean) as RoomSummary[];

      if (filteredRooms.length > 0) {
        acc[site.id] = filteredRooms;
      }
      return acc;
    }, {} as Record<string, RoomSummary[]>);
  }, [hasQuery, normalizedQuery, roomsBySite, rackIdsWithDeviceMatch, sites]);

  if (collapsed) {
    return (
      <div className="w-20 h-screen bg-[var(--color-bg-panel)] border-r border-[var(--color-border)] flex flex-col overflow-hidden shrink-0 z-50">
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-center">
          <div className="h-9 w-9 rounded-xl bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-[var(--color-accent)]" />
          </div>
        </div>
        <nav className="flex-1 flex flex-col gap-2 items-center py-4">
          <CollapsedLink to="/" icon={LayoutDashboard} label="Overview" />
          <CollapsedLink to="/room" icon={Globe} label="Topology" />
          <CollapsedLink to="/templates" icon={Folder} label="Templates" />
          <CollapsedLink to="/settings" icon={Settings} label="Settings" />
        </nav>
        <div className="p-3 border-t border-[var(--color-border)] flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-status-ok animate-pulse shadow-[0_0_8px_var(--color-status-ok)]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 h-screen bg-[var(--color-bg-panel)] border-r border-[var(--color-border)] flex flex-col overflow-hidden shrink-0 z-50">
      {/* Branding */}
      <div className="h-20 p-5 border-b border-[var(--color-border)] flex items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-[var(--color-text-base)] uppercase">
              RACKSCOPE
            </h1>
            <p className="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em]">Datacenter Overview</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar px-3 space-y-1.5">
        <SidebarLink to="/" icon={LayoutDashboard} label="Overview" />
        <div className="h-px bg-[var(--color-border)]/40 my-2"></div>

        <NavToggle
          icon={Globe}
          label="Topology"
          expanded={expandedSections.topology}
          onToggle={() => toggleSection('topology')}
        />
        {expandedSections.topology && (
          <div className="space-y-1.5">
            <div className="px-3 text-[9px] font-mono uppercase tracking-[0.25em] text-gray-500/70">
              Datacenters
            </div>
            {sites
              .filter((site) => (filteredRoomsBySite[site.id] || []).length > 0)
              .map((site) => (
                <SiteTreeItem
                  key={site.id}
                  site={site}
                  rooms={filteredRoomsBySite[site.id] || []}
                  forceExpanded={hasQuery}
                />
              ))}
          </div>
        )}
        <div className="h-px bg-[var(--color-border)]/40 my-2"></div>

        <NavToggle
          icon={Folder}
          label="Templates"
          expanded={expandedSections.templates}
          onToggle={() => toggleSection('templates')}
        />
        {expandedSections.templates && (
          <div className="space-y-1">
            <SidebarLink to="/templates" icon={Folder} label="Library" depth={1} />
            <SidebarLink to="/templates/editor" icon={Component} label="Device Editor" depth={1} />
            <SidebarLink to="/templates/editor/racks" icon={Component} label="Rack Editor" depth={1} />
          </div>
        )}
        <div className="h-px bg-[var(--color-border)]/40 my-2"></div>

        <NavToggle
          icon={Settings}
          label="Settings"
          expanded={expandedSections.settings}
          onToggle={() => toggleSection('settings')}
        />
        {expandedSections.settings && (
          <div className="space-y-1">
            <SidebarLink to="/settings#configuration" icon={SlidersHorizontal} label="Application Settings" depth={1} />
            <SidebarLink to="/settings#appearance" icon={Palette} label="Theme Settings" depth={1} />
            <SidebarLink to="/settings#system" icon={FileText} label="System & Logs" depth={1} />
            <SidebarLink to="/settings#environment" icon={Globe} label="Environment" depth={1} />
            <SidebarLink to="/settings#simulator" icon={Activity} label="Simulator" depth={1} />
          </div>
        )}
      </nav>

      {/* Footer Status */}
      <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-panel)]/70 backdrop-blur-sm relative z-10">
        <div className="px-3 pb-3 space-y-1 text-[9px] font-mono uppercase tracking-[0.2em] text-gray-500">
          <div className="flex items-center justify-between">
            <span>Last Prometheus scrape</span>
            <span className="text-gray-400">{formatAge(promStats.last_ts)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Next Prometheus scrape</span>
            <span className="text-gray-400">{formatCountdown(promStats.last_ts, promStats.next_ts)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Prometheus latency</span>
            <span className="text-gray-400">
              {promStats.avg_ms ? `${Math.round(promStats.avg_ms)} ms` : '--'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 rounded-full bg-[var(--color-accent)]/8 border border-[var(--color-accent)]/15">
          <div className="w-2 h-2 rounded-full bg-status-ok animate-pulse shadow-[0_0_8px_var(--color-status-ok)]"></div>
          <span className="text-[9px] font-mono font-bold text-[var(--color-accent)] uppercase tracking-tighter">System Online</span>
        </div>
      </div>
    </div>
  );
};

const SidebarLink = ({
  to,
  icon: Icon,
  label,
  depth = 0,
}: {
  to: string;
  icon: any;
  label: string;
  depth?: number;
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const padding = depth === 0 ? 'pl-3' : depth === 1 ? 'pl-6' : depth === 2 ? 'pl-9' : 'pl-12';

  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 pr-3 py-2 ${padding} rounded-lg text-[12px] font-semibold transition-all duration-200 ${
        isActive
          ? 'bg-[var(--color-accent)]/12 text-[var(--color-accent)] border border-[var(--color-accent)]/20'
          : 'text-gray-500 hover:bg-white/5 hover:text-[var(--color-text-base)]'
      }`}
    >
      <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--color-accent)]' : 'opacity-60'}`} />
      {label}
    </Link>
  );
};

const NavToggle = ({
  icon: Icon,
  label,
  expanded,
  onToggle,
  depth = 0,
  disabled = false,
}: {
  icon: any;
  label: string;
  expanded: boolean;
  onToggle: () => void;
  depth?: number;
  disabled?: boolean;
}) => {
  const padding = depth === 0 ? 'pl-3' : depth === 1 ? 'pl-6' : depth === 2 ? 'pl-9' : 'pl-12';
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      className={`w-full flex items-center justify-between pr-3 py-2 ${padding} rounded-lg text-[12px] font-semibold transition-all duration-200 ${
        disabled
          ? 'text-gray-600 cursor-default'
          : 'text-gray-500 hover:bg-white/5 hover:text-[var(--color-text-base)]'
      }`}
    >
      <span className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 opacity-60" />
        {label}
      </span>
      {!disabled && (expanded ? <ChevronDown className="w-3.5 h-3.5 opacity-50" /> : <ChevronRight className="w-3.5 h-3.5 opacity-50" />)}
    </button>
  );
};

const NavItem = ({
  icon: Icon,
  label,
  depth = 0,
}: {
  icon: any;
  label: string;
  depth?: number;
}) => {
  const padding = depth === 0 ? 'pl-3' : depth === 1 ? 'pl-6' : depth === 2 ? 'pl-9' : 'pl-12';
  return (
    <div className={`flex items-center gap-2.5 pr-3 py-2 ${padding} rounded-lg text-[12px] font-semibold text-gray-500`}>
      {Icon && <Icon className="w-3.5 h-3.5 opacity-40" />}
      <span className="truncate">{label}</span>
    </div>
  );
};

const CollapsedLink = ({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: any;
  label: string;
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      title={label}
      aria-label={label}
      className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
        isActive
          ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)] border border-[var(--color-accent)]/30'
          : 'text-gray-500 hover:text-[var(--color-text-base)] hover:bg-white/5'
      }`}
    >
      <Icon className="w-4 h-4" />
    </Link>
  );
};

const SiteTreeItem = ({
  site,
  rooms,
  forceExpanded = false,
}: {
  site: Site;
  rooms: RoomSummary[];
  forceExpanded?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(forceExpanded);

  useEffect(() => {
    if (forceExpanded) {
      setIsExpanded(true);
    }
  }, [forceExpanded]);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center gap-2 pr-3 py-2 pl-3 rounded-lg text-[12px] font-semibold text-gray-500 hover:text-[var(--color-text-base)] hover:bg-white/5 transition-all"
        >
          <Globe className="w-4 h-4 opacity-50" />
          <span className="truncate">{site.name}</span>
        </button>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-[var(--color-text-base)] transition-colors"
        >
          {isExpanded ? <ChevronDown className="w-3 h-3 opacity-60" /> : <ChevronRight className="w-3 h-3 opacity-60" />}
        </button>
      </div>

      {isExpanded && (
        <div className="pl-2 ml-3 border-l border-[var(--color-border)] space-y-1 mt-1">
          {rooms.map((room) => (
            <RoomTreeItem key={room.id} room={room} forceExpanded={forceExpanded} />
          ))}
        </div>
      )}
    </div>
  );
};

const RoomTreeItem = ({
  room,
  forceExpanded = false,
}: {
  room: RoomSummary;
  forceExpanded?: boolean;
}) => {
  const { roomId } = useParams();
  const [isExpanded, setIsExpanded] = useState(forceExpanded);
  const isActive = roomId === room.id;

  useEffect(() => {
    if (forceExpanded) {
      setIsExpanded(true);
    }
  }, [forceExpanded]);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 group">
          <Link
            to={`/room/${room.id}`}
            className={`flex-1 flex items-center gap-2 pr-3 py-2 pl-3 rounded-lg text-[12px] font-semibold transition-all ${
              isActive 
              ? 'bg-[var(--color-accent)]/12 text-[var(--color-accent)] border border-[var(--color-accent)]/20' 
              : 'text-gray-500 hover:text-[var(--color-text-base)] hover:bg-white/5'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500/40"></span>
            <Home className={`w-4 h-4 ${isActive ? 'text-[var(--color-accent)]' : 'opacity-50'}`} />
            <span className="truncate">{room.name}</span>
          </Link>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-[var(--color-text-base)] transition-colors"
          >
             {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
      </div>
      
      {isExpanded && (
        <div className="pl-2 ml-3 border-l border-[var(--color-border)] space-y-1 mt-1">
          {room.aisles?.map(aisle => (
            <AisleTreeItem key={aisle.id} aisle={aisle} forceExpanded={forceExpanded} />
          ))}
        </div>
      )}
    </div>
  );
};

const AisleTreeItem = ({
  aisle,
  forceExpanded = false,
}: {
  aisle: AisleSummary;
  forceExpanded?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(forceExpanded);

  useEffect(() => {
    if (forceExpanded) {
      setIsExpanded(true);
    }
  }, [forceExpanded]);
  
  return (
    <div className="relative">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full pr-3 py-1.5 pl-3 text-[9px] font-bold text-gray-500 hover:text-[var(--color-text-base)] uppercase flex items-center justify-between group transition-all rounded-lg hover:bg-white/5"
      >
        <span className="flex items-center gap-2 tracking-[0.15em]">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500/40"></span>
          <Columns2 className="w-3 h-3 opacity-50" />
          {aisle.name}
        </span>
        {isExpanded ? <ChevronDown className="w-3 h-3 opacity-50" /> : <ChevronRight className="w-3 h-3 opacity-50" />}
      </button>

      {isExpanded && (
        <div className="pl-2 ml-3 border-l border-[var(--color-border)] mt-1 space-y-0.5 animate-in slide-in-from-top-1 duration-200">
          {aisle.racks.map(rack => (
            <Link 
              key={rack.id}
              to={`/rack/${rack.id}`} 
              className="flex items-center gap-2 py-1.5 px-3 text-[10px] font-semibold text-gray-500 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 rounded-lg transition-all block group/rack"
            >
              <Component className="w-3 h-3 opacity-30 group-hover/rack:opacity-100" />
              <span className="truncate">{rack.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
