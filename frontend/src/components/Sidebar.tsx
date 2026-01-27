import { useState, useEffect, useMemo } from 'react';
import type { ComponentType } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { RoomSummary, AisleSummary, Site, PrometheusStats } from '../types';
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
  BookOpen,
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
  const [promStats, setPromStats] = useState<PrometheusStats>({});
  const [refreshSeconds, setRefreshSeconds] = useState(30);
  const [now, setNow] = useState(() => Date.now());
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    topology: false,
    catalog: false,
    editors: false,
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
      })
      .catch(console.error);
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

  const formatCountdown = (ts?: number | null, nextTs?: number | null) => {
    if (!ts) return '--';
    const intervalMs = refreshSeconds * 1000;
    if (!intervalMs) return '--';
    let target = nextTs ?? ts + intervalMs;
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
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
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
              if (
                matchesText(device.name, normalizedQuery) ||
                matchesText(device.id, normalizedQuery)
              ) {
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
            if (
              matchesText(device.name, normalizedQuery) ||
              matchesText(device.id, normalizedQuery)
            ) {
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
    return sites.reduce(
      (acc, site) => {
        acc[site.id] = rooms.filter((room) => room.site_id === site.id);
        return acc;
      },
      {} as Record<string, RoomSummary[]>
    );
  }, [rooms, sites]);

  const filteredRoomsBySite = useMemo(() => {
    if (!hasQuery) return roomsBySite;
    return sites.reduce(
      (acc, site) => {
        const siteMatch =
          matchesText(site.name, normalizedQuery) || matchesText(site.id, normalizedQuery);
        const roomsForSite = roomsBySite[site.id] || [];

        const filteredRooms = roomsForSite
          .map((room) => {
            const roomMatch =
              siteMatch ||
              matchesText(room.name, normalizedQuery) ||
              matchesText(room.id, normalizedQuery);
            if (!room.aisles || roomMatch) {
              return room;
            }

            const filteredAisles = room.aisles
              .map((aisle) => {
                const aisleMatch =
                  roomMatch ||
                  matchesText(aisle.name, normalizedQuery) ||
                  matchesText(aisle.id, normalizedQuery);
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
      },
      {} as Record<string, RoomSummary[]>
    );
  }, [hasQuery, normalizedQuery, roomsBySite, rackIdsWithDeviceMatch, sites]);

  if (collapsed) {
    return (
      <div className="z-50 flex h-screen w-20 shrink-0 flex-col overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-bg-panel)]">
        <div className="flex items-center justify-center border-b border-[var(--color-border)] p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/20">
            <Activity className="h-4 w-4 text-[var(--color-accent)]" />
          </div>
        </div>
        <nav className="flex flex-1 flex-col items-center gap-2 py-4">
          <CollapsedLink to="/" icon={LayoutDashboard} label="Overview" />
          <CollapsedLink to="/room" icon={Globe} label="Topology" />
          <CollapsedLink to="/templates" icon={Folder} label="Catalog" />
          <CollapsedLink to="/templates/editor" icon={Component} label="Editors" />
          <CollapsedLink to="/settings" icon={Settings} label="Settings" />
        </nav>
        <div className="flex items-center justify-center border-t border-[var(--color-border)] p-3">
          <div className="bg-status-ok h-2 w-2 animate-pulse rounded-full shadow-[0_0_8px_var(--color-status-ok)]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="z-50 flex h-screen w-72 shrink-0 flex-col overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-bg-panel)]">
      {/* Branding */}
      <div className="flex h-20 items-center border-b border-[var(--color-border)] p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/20">
            <Activity className="h-5 w-5 text-[var(--color-accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-[var(--color-text-base)] uppercase">
              RACKSCOPE
            </h1>
            <p className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
              Datacenter Overview
            </p>
          </div>
        </div>
      </div>

      <nav className="custom-scrollbar flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
        <SidebarLink to="/" icon={LayoutDashboard} label="Overview" />
        <div className="my-2 h-px bg-[var(--color-border)]/40"></div>

        <NavToggle
          icon={Globe}
          label="Topology"
          expanded={expandedSections.topology}
          onToggle={() => toggleSection('topology')}
        />
        {expandedSections.topology && (
          <div className="space-y-1.5">
            <div className="px-3 font-mono text-[9px] tracking-[0.25em] text-gray-500/70 uppercase">
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
        <div className="my-2 h-px bg-[var(--color-border)]/40"></div>

        <NavToggle
          icon={Folder}
          label="Catalog"
          expanded={expandedSections.catalog}
          onToggle={() => toggleSection('catalog')}
        />
        {expandedSections.catalog && (
          <div className="space-y-1">
            <SidebarLink
              to="/templates#templates-devices"
              icon={Component}
              label="Devices"
              depth={1}
            />
            <SidebarLink to="/templates#templates-racks" icon={Component} label="Racks" depth={1} />
            <SidebarLink to="/checks/library" icon={BookOpen} label="Checks" depth={1} />
          </div>
        )}
        <div className="my-2 h-px bg-[var(--color-border)]/40"></div>

        <NavToggle
          icon={Component}
          label="Editors"
          expanded={expandedSections.editors}
          onToggle={() => toggleSection('editors')}
        />
        {expandedSections.editors && (
          <div className="space-y-1">
            <SidebarLink to="/topology/editor" icon={Columns2} label="Topology Editor" depth={1} />
            <SidebarLink
              to="/topology/racks/editor"
              icon={Columns2}
              label="Rack Editor"
              depth={1}
            />
            <SidebarLink
              to="/templates/editor"
              icon={Component}
              label="Template Editor"
              depth={1}
            />
            <SidebarLink to="/checks/library" icon={BookOpen} label="Checks Editor" depth={1} />
          </div>
        )}
        <div className="my-2 h-px bg-[var(--color-border)]/40"></div>

        <NavToggle
          icon={Settings}
          label="Settings"
          expanded={expandedSections.settings}
          onToggle={() => toggleSection('settings')}
        />
        {expandedSections.settings && (
          <div className="space-y-1">
            <SidebarLink
              to="/settings#configuration"
              icon={SlidersHorizontal}
              label="Application"
              depth={1}
            />
            <SidebarLink to="/settings#appearance" icon={Palette} label="Appearance" depth={1} />
            <SidebarLink to="/settings#simulator" icon={Activity} label="Simulator" depth={1} />
            <SidebarLink to="/settings#telemetry" icon={Activity} label="Telemetry" depth={1} />
            <SidebarLink to="/settings#system" icon={FileText} label="Logs" depth={1} />
          </div>
        )}
      </nav>

      {/* Footer Status */}
      <div className="relative z-10 border-t border-[var(--color-border)] bg-[var(--color-bg-panel)]/70 p-4 backdrop-blur-sm">
        <div className="space-y-1 px-3 pb-3 font-mono text-[9px] tracking-[0.2em] text-gray-500 uppercase">
          <div className="flex items-center justify-between">
            <span>Next Prometheus scrape</span>
            <span className="text-gray-400">
              {formatCountdown(promStats.last_ts, promStats.next_ts)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Prometheus latency</span>
            <span className="text-gray-400">
              {promStats.avg_ms ? `${Math.round(promStats.avg_ms)} ms` : '--'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-[var(--color-accent)]/15 bg-[var(--color-accent)]/8 px-3 py-2">
          <div className="bg-status-ok h-2 w-2 animate-pulse rounded-full shadow-[0_0_8px_var(--color-status-ok)]"></div>
          <span className="font-mono text-[9px] font-bold tracking-tighter text-[var(--color-accent)] uppercase">
            System Online
          </span>
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
  icon: ComponentType<{ className?: string }>;
  label: string;
  depth?: number;
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const padding = depth === 0 ? 'pl-3' : depth === 1 ? 'pl-6' : depth === 2 ? 'pl-9' : 'pl-12';

  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 py-2 pr-3 ${padding} rounded-lg text-[12px] font-semibold transition-all duration-200 ${
        isActive
          ? 'border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/12 text-[var(--color-accent)]'
          : 'text-gray-500 hover:bg-white/5 hover:text-[var(--color-text-base)]'
      }`}
    >
      <Icon className={`h-4 w-4 ${isActive ? 'text-[var(--color-accent)]' : 'opacity-60'}`} />
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
  icon: ComponentType<{ className?: string }>;
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
      className={`flex w-full items-center justify-between py-2 pr-3 ${padding} rounded-lg text-[12px] font-semibold transition-all duration-200 ${
        disabled
          ? 'cursor-default text-gray-600'
          : 'text-gray-500 hover:bg-white/5 hover:text-[var(--color-text-base)]'
      }`}
    >
      <span className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 opacity-60" />
        {label}
      </span>
      {!disabled &&
        (expanded ? (
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 opacity-50" />
        ))}
    </button>
  );
};

const TreeLabel = ({ label }: { label: string }) => (
  <div className="px-3 font-mono text-[9px] tracking-[0.25em] text-gray-500/70 uppercase">
    {label}
  </div>
);

const CollapsedLink = ({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      title={label}
      aria-label={label}
      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
        isActive
          ? 'border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
          : 'text-gray-500 hover:bg-white/5 hover:text-[var(--color-text-base)]'
      }`}
    >
      <Icon className="h-4 w-4" />
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
  const [isExpanded, setIsExpanded] = useState(false);
  const expanded = forceExpanded || isExpanded;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            if (!forceExpanded) setIsExpanded(!isExpanded);
          }}
          className="flex flex-1 items-center gap-2 rounded-lg py-2 pr-3 pl-3 text-[12px] font-semibold text-gray-500 transition-all hover:bg-white/5 hover:text-[var(--color-text-base)]"
        >
          <Globe className="h-4 w-4 opacity-50" />
          <span className="truncate">{site.name}</span>
        </button>
        <button
          onClick={() => {
            if (!forceExpanded) setIsExpanded(!isExpanded);
          }}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-[var(--color-text-base)]"
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3 opacity-60" />
          ) : (
            <ChevronRight className="h-3 w-3 opacity-60" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-1 ml-3 space-y-1 border-l border-[var(--color-border)] pl-2">
          <TreeLabel label="Rooms" />
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
  const [isExpanded, setIsExpanded] = useState(false);
  const expanded = forceExpanded || isExpanded;
  const isActive = roomId === room.id;

  return (
    <div className="space-y-1">
      <div className="group flex items-center gap-1">
        <Link
          to={`/room/${room.id}`}
          className={`flex flex-1 items-center gap-2 rounded-lg py-2 pr-3 pl-3 text-[12px] font-semibold transition-all ${
            isActive
              ? 'border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/12 text-[var(--color-accent)]'
              : 'text-gray-500 hover:bg-white/5 hover:text-[var(--color-text-base)]'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-gray-500/40"></span>
          <Home className={`h-4 w-4 ${isActive ? 'text-[var(--color-accent)]' : 'opacity-50'}`} />
          <span className="truncate">{room.name}</span>
        </Link>
        <button
          onClick={() => {
            if (!forceExpanded) setIsExpanded(!isExpanded);
          }}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/5 hover:text-[var(--color-text-base)]"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-1 ml-3 space-y-1 border-l border-[var(--color-border)] pl-2">
          <TreeLabel label="Aisles" />
          {room.aisles?.map((aisle) => (
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
  const [isExpanded, setIsExpanded] = useState(false);
  const expanded = forceExpanded || isExpanded;

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (!forceExpanded) setIsExpanded(!isExpanded);
        }}
        className="group flex w-full items-center justify-between rounded-lg py-1.5 pr-3 pl-3 text-[9px] font-bold text-gray-500 uppercase transition-all hover:bg-white/5 hover:text-[var(--color-text-base)]"
      >
        <span className="flex items-center gap-2 tracking-[0.15em]">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-500/40"></span>
          <Columns2 className="h-3 w-3 opacity-50" />
          {aisle.name}
        </span>
        {expanded ? (
          <ChevronDown className="h-3 w-3 opacity-50" />
        ) : (
          <ChevronRight className="h-3 w-3 opacity-50" />
        )}
      </button>

      {expanded && (
        <div className="animate-in slide-in-from-top-1 mt-1 ml-3 space-y-0.5 border-l border-[var(--color-border)] pl-2 duration-200">
          <TreeLabel label="Racks" />
          {aisle.racks.map((rack) => (
            <Link
              key={rack.id}
              to={`/rack/${rack.id}`}
              className="group/rack block flex items-center gap-2 rounded-lg px-3 py-1.5 text-[10px] font-semibold text-gray-500 transition-all hover:bg-[var(--color-accent)]/5 hover:text-[var(--color-accent)]"
            >
              <Component className="h-3 w-3 opacity-30 group-hover/rack:opacity-100" />
              <span className="truncate">{rack.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
