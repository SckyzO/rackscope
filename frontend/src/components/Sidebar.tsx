import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { RoomSummary, AisleSummary, DeviceTemplate, Site } from '../types';
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

export const Sidebar = ({ collapsed }: { collapsed?: boolean }) => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [deviceTemplates, setDeviceTemplates] = useState<DeviceTemplate[]>([]);
  const [rackTemplates, setRackTemplates] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    topology: false,
    templates: false,
    settings: false,
  });

  useEffect(() => {
    Promise.all([api.getRooms(), api.getCatalog(), api.getSites()])
      .then(([roomsData, catalogData, sitesData]) => {
        const safeRooms = Array.isArray(roomsData) ? roomsData : [];
        const safeSites = Array.isArray(sitesData) ? sitesData : [];
        setRooms(safeRooms);
        setDeviceTemplates(catalogData.device_templates || []);
        setRackTemplates(catalogData.rack_templates || []);
        setSites(safeSites);
        if (!selectedSiteId && safeSites.length > 0) {
          setSelectedSiteId(safeSites[0].id);
        }
      }).catch(console.error);
  }, []);

  const groupedDevices = useMemo(() => {
    return deviceTemplates.reduce((acc, t) => {
      const type = t.type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(t);
      return acc;
    }, {} as Record<string, DeviceTemplate[]>);
  }, [deviceTemplates]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const roomsBySite = useMemo(() => {
    return sites.reduce((acc, site) => {
      acc[site.id] = rooms.filter(room => room.site_id === site.id);
      return acc;
    }, {} as Record<string, RoomSummary[]>);
  }, [rooms, sites]);

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
      <div className="p-5 border-b border-[var(--color-border)]">
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
            {sites.map((site) => (
              <SiteTreeItem key={site.id} site={site} rooms={roomsBySite[site.id] || []} />
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
            <NavToggle icon={Component} label="Racks" depth={1} expanded onToggle={() => undefined} disabled />
            {rackTemplates.map((t: any) => (
              <NavItem key={t.id} label={t.name} depth={2} />
            ))}
            <NavToggle icon={Component} label="Devices" depth={1} expanded onToggle={() => undefined} disabled />
            {Object.values(groupedDevices).flat().map((t) => (
              <NavItem key={t.id} label={t.name} depth={2} />
            ))}
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
            <SidebarLink to="/settings" icon={SlidersHorizontal} label="Application Settings" depth={1} />
            <NavItem icon={Globe} label="Topology Settings" depth={1} />
            <NavItem icon={Palette} label="Theme Settings" depth={1} />
            <NavItem icon={FileText} label="Logs" depth={1} />
          </div>
        )}
      </nav>

      {/* Footer Status */}
      <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-panel)]/70 backdrop-blur-sm relative z-10">
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

const SiteTreeItem = ({ site, rooms }: { site: Site; rooms: RoomSummary[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

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
            <RoomTreeItem key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
};

const RoomTreeItem = ({ room }: { room: RoomSummary }) => {
  const { roomId } = useParams();
  const [isExpanded, setIsExpanded] = useState(false);
  const isActive = roomId === room.id;

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
            <AisleTreeItem key={aisle.id} aisle={aisle} />
          ))}
        </div>
      )}
    </div>
  );
};

const AisleTreeItem = ({ aisle }: { aisle: AisleSummary }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
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
