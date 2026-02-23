import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';
import type { ComponentType } from 'react';
import type { RoomSummary, Site, AisleSummary, RackSummary } from '../../types';
import {
  Activity,
  BarChart2,
  Globe,
  AlertTriangle,
  List,
  Bell,
  User,
  LayoutDashboard,
  Network,
  MapPin,
  GitBranch,
  Server,
  Layers,
  ShieldCheck,
  Settings,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface NavItemProps {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
  end?: boolean;
  depth?: boolean;
}

const NavItem = ({
  to,
  icon: Icon,
  label,
  collapsed,
  end = false,
  depth = false,
}: NavItemProps) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
        depth ? 'py-1.5' : 'py-2.5'
      } ${
        isActive
          ? 'bg-brand-500 text-white'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5'
      }`
    }
  >
    <Icon className={`shrink-0 ${depth ? 'h-4 w-4' : 'h-5 w-5'}`} />
    <span className={`whitespace-nowrap ${collapsed ? 'hidden group-hover:inline' : ''}`}>
      {label}
    </span>
  </NavLink>
);

// Section label: BOTH SVG dots AND text always in the DOM.
// CSS controls visibility so hover expand works correctly.
const SectionLabel = ({ label, collapsed }: { label: string; collapsed: boolean }) => (
  <>
    {/* 3-dots: shown when collapsed, hidden on group-hover */}
    <div className={`flex justify-center py-2 ${collapsed ? 'group-hover:hidden' : 'hidden'}`}>
      <svg
        className="fill-current text-gray-400 dark:text-gray-600"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M5.99915 10.2451C6.96564 10.2451 7.74915 11.0286 7.74915 11.9951V12.0051C7.74915 12.9716 6.96564 13.7551 5.99915 13.7551C5.03265 13.7551 4.24915 12.9716 4.24915 12.0051V11.9951C4.24915 11.0286 5.03265 10.2451 5.99915 10.2451ZM17.9991 10.2451C18.9656 10.2451 19.7491 11.0286 19.7491 11.9951V12.0051C19.7491 12.9716 18.9656 13.7551 17.9991 13.7551C17.0326 13.7551 16.2491 12.9716 16.2491 12.0051V11.9951C16.2491 11.0286 17.0326 10.2451 17.9991 10.2451ZM13.7491 11.9951C13.7491 11.0286 12.9656 10.2451 11.9991 10.2451C11.0326 10.2451 10.2491 11.0286 10.2491 11.9951V12.0051C10.2491 12.9716 11.0326 13.7551 11.9991 13.7551C12.9656 13.7551 13.7491 12.9716 13.7491 12.0051V11.9951Z"
        />
      </svg>
    </div>
    {/* Full text label: hidden when collapsed, shown on hover */}
    <p
      className={`mb-1.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500 ${
        collapsed ? 'mt-2 hidden group-hover:block' : 'mt-6'
      }`}
    >
      {label}
    </p>
  </>
);

// ── Infrastructure tree ────────────────────────────────────────────────────
//
// Visual style: nested border-l lines create the | tree indicators
//
//   Infrastructure          ← SectionLabel
//   ▼ DataCenter 1          ← site (Globe icon + chevron)
//   |  ▼ Room A             ← room (no icon, link + chevron)
//   |  |  ▶ Aisle 01        ← aisle (no icon, muted, chevron)
//   |  |  |  Rack 01        ← rack (no icon, text-only link)
//   |  |  |  Rack 02

const ACTIVE = 'bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400';
const INACTIVE = 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5';

/** Collapsible tree row — icon optional, no icon for rooms/aisles/racks */
const TreeNode = ({
  label,
  expanded,
  onToggle,
  children,
  isActive = false,
  icon: Icon,
  hasLink = false,
  onLinkClick,
  collapsed: sidebarCollapsed,
  muted = false,
  primary = false,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
  isActive?: boolean;
  icon?: ComponentType<{ className?: string }>;
  hasLink?: boolean;
  onLinkClick?: () => void;
  collapsed: boolean;
  /** Muted style for aisles */
  muted?: boolean;
  /** Primary style — matches NavItem (World Map, Notifications) for site-level nodes */
  primary?: boolean;
}) => (
  <div>
    {/* Row: always in DOM — CSS controls visibility like NavItem */}
    <div className="flex items-center">
      <button
        onClick={hasLink ? onLinkClick : onToggle}
        title={sidebarCollapsed ? label : undefined}
        className={`flex min-w-0 flex-1 items-center text-left font-medium transition-colors ${
          primary ? 'gap-3 rounded-lg px-3 py-2.5 text-sm' : 'gap-2 rounded-lg px-2 py-1.5 text-xs'
        } ${
          isActive
            ? ACTIVE
            : muted
              ? 'text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-white/5'
              : INACTIVE
        }`}
      >
        {/* Icon — always visible (anchors the row in collapsed mode) */}
        {Icon && (
          <Icon
            className={`shrink-0 ${primary ? 'h-5 w-5' : 'h-3.5 w-3.5'} ${isActive ? 'text-brand-500' : 'opacity-60'}`}
          />
        )}
        {/* Label — hidden when collapsed, visible on hover (same as NavItem) */}
        <span
          className={`min-w-0 flex-1 truncate whitespace-nowrap ${sidebarCollapsed ? 'hidden group-hover:inline' : ''}`}
        >
          {label}
        </span>
      </button>
      {/* Chevron — hidden when collapsed, visible on hover */}
      <button
        onClick={onToggle}
        className={`shrink-0 rounded p-1 text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400 ${
          sidebarCollapsed ? 'hidden group-hover:block' : ''
        }`}
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
    </div>
    {/* Children: hidden when collapsed (even expanded), shown on hover or in full mode */}
    {expanded && children && (
      <div
        className={`ml-3 flex flex-col gap-0 border-l border-gray-200 pl-2 dark:border-gray-700 ${
          sidebarCollapsed ? 'hidden group-hover:flex' : ''
        }`}
      >
        {children}
      </div>
    )}
  </div>
);

/** Rack leaf link — no icon, compact text */
const RackLink = ({
  rack,
  collapsed,
  navigate,
  isActive,
}: {
  rack: RackSummary;
  collapsed: boolean;
  navigate: (path: string) => void;
  isActive: boolean;
}) => (
  /* Always in DOM — hidden when collapsed, shown on hover (CSS group-hover) */
  <button
    onClick={() => navigate(`/cosmos/views/rack/${rack.id}`)}
    title={collapsed ? rack.name : undefined}
    className={`flex w-full items-center rounded-lg px-2 py-1 text-left text-xs transition-colors ${
      isActive ? ACTIVE : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
    } ${collapsed ? 'hidden group-hover:flex' : ''}`}
  >
    <span className="min-w-0 flex-1 truncate whitespace-nowrap">{rack.name}</span>
  </button>
);

// ── Helpers ────────────────────────────────────────────────────────────────

const VALID_ROOM_VARIANTS = new Set(['room', 'room-v2', 'room-v3']);

function getRoomVariant(): string {
  const stored = localStorage.getItem('cosmos-room-variant') ?? 'room';
  if (!VALID_ROOM_VARIANTS.has(stored)) {
    localStorage.setItem('cosmos-room-variant', 'room');
    return 'room';
  }
  return stored;
}

// ── Sidebar ────────────────────────────────────────────────────────────────

interface CosmosSidebarProps {
  collapsed: boolean;
}

export const CosmosSidebar = ({ collapsed }: CosmosSidebarProps) => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [expandedAisles, setExpandedAisles] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    Promise.all([api.getRooms(), api.getSites()])
      .then(([roomsData, sitesData]) => {
        setRooms(Array.isArray(roomsData) ? roomsData : []);
        setSites(Array.isArray(sitesData) ? sitesData : []);
      })
      .catch(() => {});
  }, []);

  return (
    <aside
      className={`cosmos-sidebar cosmos-scrollbar group dark:bg-gray-dark flex shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white px-5 transition-[width] duration-300 ease-linear dark:border-gray-800 ${
        collapsed ? 'w-[90px] hover:w-[290px]' : 'w-[290px]'
      }`}
    >
      {/* Logo */}
      <div className="flex h-[72px] shrink-0 items-center">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white">
            <Activity className="h-5 w-5" />
          </div>
          <span
            className={`overflow-hidden text-base font-bold tracking-tight whitespace-nowrap text-gray-900 transition-all duration-300 dark:text-white ${
              collapsed
                ? 'max-w-0 opacity-0 group-hover:max-w-[200px] group-hover:opacity-100'
                : 'max-w-[200px] opacity-100'
            }`}
          >
            Cosmos
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <SectionLabel label="Menu" collapsed={collapsed} />
        <NavItem to="/cosmos" icon={BarChart2} label="Dashboard" collapsed={collapsed} end />

        <SectionLabel label="Monitoring" collapsed={collapsed} />
        <NavItem to="/cosmos/views/worldmap" icon={Globe} label="World Map" collapsed={collapsed} />
        <NavItem
          to="/cosmos/notifications"
          icon={Bell}
          label="Notifications"
          collapsed={collapsed}
        />

        {/* Infrastructure tree — own section, dynamic based on declared sites */}
        {(rooms.length > 0 || sites.length > 0) && (
          <>
            <SectionLabel label="Infrastructure" collapsed={collapsed} />
            <div className="space-y-0.5">
              {sites.map((site) => {
                const siteRooms = rooms.filter((r) => r.site_id === site.id);
                if (siteRooms.length === 0) return null;
                const siteExpanded = expandedSites.has(site.id);
                return (
                  <TreeNode
                    key={site.id}
                    label={site.name}
                    expanded={siteExpanded}
                    onToggle={() => {
                      setExpandedSites((prev) => {
                        const next = new Set(prev);
                        if (next.has(site.id)) {
                          next.delete(site.id);
                        } else {
                          next.add(site.id);
                        }
                        return next;
                      });
                    }}
                    icon={Globe}
                    primary
                    collapsed={collapsed}
                    navigate={navigate}
                  >
                    {siteRooms.map((room) => {
                      const roomExpanded = expandedRooms.has(room.id);
                      const roomPath = `/cosmos/views/${getRoomVariant()}/${room.id}`;
                      const isRoomActive = location.pathname === roomPath;
                      return (
                        <TreeNode
                          key={room.id}
                          label={room.name}
                          expanded={roomExpanded}
                          onToggle={() => {
                            setExpandedRooms((prev) => {
                              const next = new Set(prev);
                              if (next.has(room.id)) {
                                next.delete(room.id);
                              } else {
                                next.add(room.id);
                              }
                              return next;
                            });
                            navigate(roomPath);
                          }}
                          isActive={isRoomActive}
                          collapsed={collapsed}
                          navigate={navigate}
                        >
                          {room.aisles?.map((aisle: AisleSummary) => {
                            const aisleExpanded = expandedAisles.has(aisle.id);
                            return (
                              <TreeNode
                                key={aisle.id}
                                label={aisle.name}
                                muted
                                expanded={aisleExpanded}
                                onToggle={() => {
                                  setExpandedAisles((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(aisle.id)) {
                                      next.delete(aisle.id);
                                    } else {
                                      next.add(aisle.id);
                                    }
                                    return next;
                                  });
                                }}
                                collapsed={collapsed}
                                navigate={navigate}
                              >
                                {aisle.racks.map((rack: RackSummary) => (
                                  <RackLink
                                    key={rack.id}
                                    rack={rack}
                                    collapsed={collapsed}
                                    navigate={navigate}
                                    isActive={location.pathname.includes(`/rack/${rack.id}`)}
                                  />
                                ))}
                              </TreeNode>
                            );
                          })}
                        </TreeNode>
                      );
                    })}
                  </TreeNode>
                );
              })}
              {/* Rooms without a matching site */}
              {rooms
                .filter((r) => !sites.some((s) => s.id === r.site_id))
                .map((room) => {
                  const roomExpanded = expandedRooms.has(room.id);
                  const roomPath = `/cosmos/views/room/${room.id}`;
                  return (
                    <TreeNode
                      key={room.id}
                      label={room.name}
                      expanded={roomExpanded}
                      onToggle={() => {
                        setExpandedRooms((prev) => {
                          const next = new Set(prev);
                          if (next.has(room.id)) {
                            next.delete(room.id);
                          } else {
                            next.add(room.id);
                          }
                          return next;
                        });
                        navigate(roomPath);
                      }}
                      isActive={location.pathname === roomPath}
                      collapsed={collapsed}
                      navigate={navigate}
                    >
                      {room.aisles?.map((aisle: AisleSummary) => (
                        <TreeNode
                          key={aisle.id}
                          label={aisle.name}
                          muted
                          expanded={expandedAisles.has(aisle.id)}
                          onToggle={() => {
                            setExpandedAisles((prev) => {
                              const next = new Set(prev);
                              if (next.has(aisle.id)) {
                                next.delete(aisle.id);
                              } else {
                                next.add(aisle.id);
                              }
                              return next;
                            });
                          }}
                          collapsed={collapsed}
                          navigate={navigate}
                        >
                          {aisle.racks.map((rack: RackSummary) => (
                            <RackLink
                              key={rack.id}
                              rack={rack}
                              collapsed={collapsed}
                              navigate={navigate}
                              isActive={location.pathname.includes(`/rack/${rack.id}`)}
                            />
                          ))}
                        </TreeNode>
                      ))}
                    </TreeNode>
                  );
                })}
            </div>
          </>
        )}

        <SectionLabel label="Slurm" collapsed={collapsed} />
        <NavItem
          to="/cosmos/slurm/overview"
          icon={LayoutDashboard}
          label="Overview"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/slurm/partitions"
          icon={Network}
          label="Partitions"
          collapsed={collapsed}
        />
        <NavItem to="/cosmos/slurm/nodes" icon={List} label="Nodes" collapsed={collapsed} />
        <NavItem
          to="/cosmos/slurm/alerts"
          icon={AlertTriangle}
          label="Alerts"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/slurm/wallboard/room-a"
          icon={MapPin}
          label="Wallboard V1"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/slurm/wallboard-v2/room-a"
          icon={MapPin}
          label="Wallboard V2"
          collapsed={collapsed}
        />

        <SectionLabel label="Editors" collapsed={collapsed} />
        <NavItem
          to="/cosmos/editors/topology"
          icon={GitBranch}
          label="Topology V1"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/editors/topology-v2"
          icon={GitBranch}
          label="Topology V2"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/editors/topology-v3"
          icon={GitBranch}
          label="Topology V3"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/editors/topology-v4"
          icon={GitBranch}
          label="Topology V4"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/editors/topology-v5"
          icon={GitBranch}
          label="Topology V5"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/editors/rack"
          icon={Server}
          label="Rack Editor"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/editors/rack-templates"
          icon={Layers}
          label="Rack Templates"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/editors/templates"
          icon={Layers}
          label="Device Templates"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/editors/checks"
          icon={ShieldCheck}
          label="Checks Library"
          collapsed={collapsed}
        />
      </nav>

      {/* Bottom sticky — UI Library, Profile, Settings */}
      <div className="shrink-0 border-t border-gray-200 py-2 dark:border-gray-800">
        <NavItem to="/cosmos/ui" icon={Layers} label="UI Library" collapsed={collapsed} />
        <NavItem to="/cosmos/profile" icon={User} label="Profile" collapsed={collapsed} />
        <NavItem to="/cosmos/settings" icon={Settings} label="Settings" collapsed={collapsed} />
      </div>

      {/* Footer */}
      <div
        className={`shrink-0 overflow-hidden border-t border-gray-200 transition-all duration-300 dark:border-gray-800 ${
          collapsed ? 'max-h-0 group-hover:max-h-[48px]' : 'max-h-[48px]'
        }`}
      >
        <div className="px-5 py-3">
          <a
            href="/"
            className="hover:text-brand-500 dark:hover:text-brand-400 text-xs whitespace-nowrap text-gray-400 transition-colors dark:text-gray-500"
          >
            ← Back to Rackscope
          </a>
        </div>
      </div>
    </aside>
  );
};
