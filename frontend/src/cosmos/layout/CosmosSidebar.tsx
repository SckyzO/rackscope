import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { ComponentType } from 'react';
import {
  Activity,
  BarChart2,
  LineChart,
  HeartPulse,
  Globe,
  LayoutGrid,
  Tag,
  AlertTriangle,
  CreditCard,
  Image as ImageIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
  List,
  MessageSquare,
  Bell,
  MoreHorizontal,
  Gauge,
  Award,
  Loader2,
  PanelTop,
  Info,
  Home,
  Table2,
  LogIn,
  UserPlus,
  FormInput,
  User,
  CalendarDays,
  Users,
  Columns,
  Rows,
  LayoutDashboard,
  Network,
  MapPin,
  GitBranch,
  Server,
  Layers,
  ShieldCheck,
  Settings,
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
      `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
        depth ? 'py-1.5' : 'py-2.5'
      } ${
        isActive
          ? 'bg-brand-500 text-white'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5'
      }`
    }
  >
    <Icon className={`shrink-0 ${depth ? 'h-4 w-4' : 'h-5 w-5'}`} />
    {!collapsed && <span>{label}</span>}
  </NavLink>
);

const SectionLabel = ({ label, collapsed }: { label: string; collapsed: boolean }) =>
  collapsed ? (
    <div className="my-3 h-px bg-gray-200 dark:bg-gray-800" />
  ) : (
    <p className="mt-6 mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
      {label}
    </p>
  );

interface CosmosSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const CosmosSidebar = ({ collapsed, onToggleCollapse }: CosmosSidebarProps) => {
  const [uiOpen, setUiOpen] = useState(false);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getRooms()
      .then((data) =>
        setRooms(Array.isArray(data) ? data.map((r) => ({ id: r.id, name: r.name })) : [])
      )
      .catch(() => {});
  }, []);

  const uiItems: Array<{ to: string; icon: ComponentType<{ className?: string }>; label: string }> =
    [
      { to: '/cosmos/ui/buttons-group', icon: LayoutGrid, label: 'Buttons Group' },
      { to: '/cosmos/ui/badges', icon: Tag, label: 'Badges' },
      { to: '/cosmos/ui/alerts', icon: AlertTriangle, label: 'Alerts' },
      { to: '/cosmos/ui/cards', icon: CreditCard, label: 'Cards' },
      { to: '/cosmos/ui/carousel', icon: ImageIcon, label: 'Carousel' },
      { to: '/cosmos/ui/dropdowns', icon: ChevronDown, label: 'Dropdowns' },
      { to: '/cosmos/ui/links', icon: LinkIcon, label: 'Links' },
      { to: '/cosmos/ui/list', icon: List, label: 'List' },
      { to: '/cosmos/ui/modals', icon: MessageSquare, label: 'Modals' },
      { to: '/cosmos/ui/notifications', icon: Bell, label: 'Notifications' },
      { to: '/cosmos/ui/pagination', icon: MoreHorizontal, label: 'Pagination' },
      { to: '/cosmos/ui/popovers', icon: MessageSquare, label: 'Popovers' },
      { to: '/cosmos/ui/progress-bar', icon: Gauge, label: 'Progress Bar' },
      { to: '/cosmos/ui/ribbons', icon: Award, label: 'Ribbons' },
      { to: '/cosmos/ui/spinners', icon: Loader2, label: 'Spinners' },
      { to: '/cosmos/ui/tabs', icon: PanelTop, label: 'Tabs' },
      { to: '/cosmos/ui/tooltips', icon: Info, label: 'Tooltips' },
      { to: '/cosmos/ui/form-elements', icon: FormInput, label: 'Form Elements' },
      { to: '/cosmos/ui/avatars', icon: Users, label: 'Avatars' },
      // New generic
      { to: '/cosmos/ui/accordion', icon: ChevronDown, label: 'Accordion' },
      { to: '/cosmos/ui/stepper', icon: MoreHorizontal, label: 'Stepper' },
      { to: '/cosmos/ui/timeline', icon: Activity, label: 'Timeline' },
      { to: '/cosmos/ui/skeleton', icon: Loader2, label: 'Skeleton' },
      { to: '/cosmos/ui/empty-state', icon: Info, label: 'Empty State' },
      { to: '/cosmos/ui/toast', icon: Bell, label: 'Toast' },
      { to: '/cosmos/ui/drawer', icon: PanelTop, label: 'Drawer' },
      { to: '/cosmos/ui/stats-cards', icon: BarChart2, label: 'Stats Cards' },
      { to: '/cosmos/ui/tag-input', icon: Tag, label: 'Tag Input' },
      { to: '/cosmos/ui/range-slider', icon: Gauge, label: 'Range Slider' },
      { to: '/cosmos/ui/otp-input', icon: FormInput, label: 'OTP Input' },
    ];

  return (
    <aside
      className={`cosmos-scrollbar dark:bg-gray-dark flex flex-col overflow-y-auto border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-800 ${
        collapsed ? 'w-[90px]' : 'w-[290px]'
      }`}
    >
      {/* Logo + collapse toggle */}
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="bg-brand-500 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white">
            <Activity className="h-5 w-5" />
          </div>
          {!collapsed && (
            <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
              Cosmos
            </span>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4">
        <SectionLabel label="Menu" collapsed={collapsed} />
        <NavItem to="/cosmos" icon={BarChart2} label="Dashboard" collapsed={collapsed} end />

        <SectionLabel label="UI Elements" collapsed={collapsed} />
        {!collapsed ? (
          <>
            <button
              onClick={() => setUiOpen((p) => !p)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <LayoutGrid className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-left">Components</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${uiOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {uiOpen && (
              <div className="mt-1 ml-3 space-y-0.5 border-l-2 border-gray-200 pl-3 dark:border-gray-800">
                {uiItems.map((item) => (
                  <NavItem key={item.to} {...item} collapsed={false} depth />
                ))}
              </div>
            )}
          </>
        ) : (
          <NavItem
            to="/cosmos/ui/buttons-group"
            icon={LayoutGrid}
            label="UI"
            collapsed={collapsed}
          />
        )}

        <SectionLabel label="Navigation" collapsed={collapsed} />
        <NavItem to="/cosmos/ui/breadcrumb" icon={Home} label="Breadcrumb" collapsed={collapsed} />

        <SectionLabel label="Monitoring" collapsed={collapsed} />
        <NavItem to="/cosmos/views/worldmap" icon={Globe} label="World Map" collapsed={collapsed} />
        <NavItem
          to="/cosmos/notifications"
          icon={Bell}
          label="Notifications"
          collapsed={collapsed}
        />

        {rooms.length > 0 && (
          <>
            {!collapsed && (
              <p className="mt-2 mb-1 px-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-600">
                Rooms
              </p>
            )}
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => {
                  const variant = localStorage.getItem('cosmos-room-variant') ?? 'room';
                  navigate(`/cosmos/views/${variant}/${room.id}`);
                }}
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
              >
                <MapPin className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{room.name}</span>}
              </button>
            ))}
          </>
        )}

        <SectionLabel label="Rack Variants" collapsed={collapsed} />
        <NavItem
          to="/cosmos/views/rack-v1/r01-01"
          icon={LayoutGrid}
          label="V1 · Maximized"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/views/rack-v2/r01-01"
          icon={Columns}
          label="V2 · Workbench"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/views/rack-v3/r01-01"
          icon={Rows}
          label="V3 · Side by Side"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/views/rack-v4/r01-01"
          icon={List}
          label="V4 · USlot List"
          collapsed={collapsed}
        />

        <SectionLabel label="Rackscope" collapsed={collapsed} />
        <NavItem
          to="/cosmos/rackscope/health"
          icon={HeartPulse}
          label="Health Status"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/rackscope/alerts"
          icon={AlertTriangle}
          label="Alert Feed"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/rackscope/metrics"
          icon={BarChart2}
          label="Metrics"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/rackscope/infra-nav"
          icon={Home}
          label="Infra Navigation"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/rackscope/slurm"
          icon={Activity}
          label="Slurm (design)"
          collapsed={collapsed}
        />

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
          to="/cosmos/editors/templates"
          icon={Layers}
          label="Templates"
          collapsed={collapsed}
        />
        <NavItem
          to="/cosmos/editors/checks"
          icon={ShieldCheck}
          label="Checks Library"
          collapsed={collapsed}
        />
        <NavItem to="/cosmos/settings" icon={Settings} label="Settings" collapsed={collapsed} />

        <SectionLabel label="Charts" collapsed={collapsed} />
        <NavItem to="/cosmos/charts" icon={LineChart} label="Charts" collapsed={collapsed} />

        <SectionLabel label="Tables" collapsed={collapsed} />
        <NavItem to="/cosmos/tables" icon={Table2} label="Data Tables" collapsed={collapsed} />

        <SectionLabel label="Pages" collapsed={collapsed} />
        <NavItem to="/cosmos/profile" icon={User} label="Profile" collapsed={collapsed} />
        <NavItem to="/cosmos/calendar" icon={CalendarDays} label="Calendar" collapsed={collapsed} />
        <NavItem
          to="/cosmos/notifications"
          icon={Bell}
          label="Notifications"
          collapsed={collapsed}
        />
        <NavItem to="/cosmos/ui/avatars" icon={Users} label="Avatars" collapsed={collapsed} />

        <SectionLabel label="Auth" collapsed={collapsed} />
        <NavItem to="/cosmos/auth/signin" icon={LogIn} label="Sign In" collapsed={collapsed} />
        <NavItem to="/cosmos/auth/signup" icon={UserPlus} label="Sign Up" collapsed={collapsed} />
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="shrink-0 border-t border-gray-200 px-5 py-3 dark:border-gray-800">
          <a
            href="/"
            className="hover:text-brand-500 dark:hover:text-brand-400 text-xs text-gray-400 transition-colors dark:text-gray-500"
          >
            ← Back to Rackscope
          </a>
        </div>
      )}
    </aside>
  );
};
