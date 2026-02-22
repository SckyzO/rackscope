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
      `flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all ${
        depth ? 'py-1.5' : 'py-2.5'
      } ${
        isActive
          ? 'bg-brand-500 text-white'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5'
      }`
    }
  >
    <Icon className={`shrink-0 ${depth ? 'h-4 w-4' : 'h-5 w-5'}`} />
    <span
      className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
        collapsed
          ? 'max-w-0 opacity-0 group-hover:max-w-[200px] group-hover:opacity-100'
          : 'max-w-[200px] opacity-100'
      }`}
    >
      {label}
    </span>
  </NavLink>
);

// Section label: 3-dots SVG icon when collapsed (TailAdmin style), full label when expanded
const SectionLabel = ({ label, collapsed }: { label: string; collapsed: boolean }) =>
  collapsed ? (
    <div className="mt-4 mb-4 flex justify-center group-hover:hidden">
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
  ) : (
    <p className="mt-6 mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
      {label}
    </p>
  );

interface CosmosSidebarProps {
  collapsed: boolean;
}

export const CosmosSidebar = ({ collapsed }: CosmosSidebarProps) => {
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
      className={`cosmos-sidebar cosmos-scrollbar group dark:bg-gray-dark flex shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-300 ease-in-out dark:border-gray-800 ${
        collapsed ? 'w-[90px] hover:w-[290px]' : 'w-[290px]'
      }`}
    >
      {/* Logo */}
      <div className="flex h-[72px] shrink-0 items-center border-b border-gray-200 px-4 dark:border-gray-800">
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
      <nav className="flex-1 overflow-y-auto px-4 py-4">
        <SectionLabel label="Menu" collapsed={collapsed} />
        <NavItem to="/cosmos" icon={BarChart2} label="Dashboard" collapsed={collapsed} end />

        <SectionLabel label="UI Elements" collapsed={collapsed} />
        <button
          onClick={() => setUiOpen((p) => !p)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
        >
          <LayoutGrid className="h-5 w-5 shrink-0" />
          <span
            className={`flex-1 overflow-hidden text-left whitespace-nowrap transition-all duration-200 ${
              collapsed
                ? 'max-w-0 opacity-0 group-hover:max-w-[160px] group-hover:opacity-100'
                : 'max-w-[160px] opacity-100'
            }`}
          >
            Components
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-all duration-200 ${uiOpen ? 'rotate-180' : ''} ${
              collapsed
                ? 'max-w-0 opacity-0 group-hover:max-w-[16px] group-hover:opacity-100'
                : 'max-w-[16px] opacity-100'
            }`}
          />
        </button>
        {uiOpen && (
          <div
            className={`mt-1 ml-3 space-y-0.5 border-l-2 border-gray-200 pl-3 dark:border-gray-800 ${
              collapsed ? 'hidden group-hover:block' : ''
            }`}
          >
            {uiItems.map((item) => (
              <NavItem key={item.to} {...item} collapsed={false} depth />
            ))}
          </div>
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
            <p
              className={`mt-2 mb-1 px-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-600 ${
                collapsed ? 'hidden group-hover:block' : ''
              }`}
            >
              Rooms
            </p>
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => {
                  const variant = localStorage.getItem('cosmos-room-variant') ?? 'room';
                  navigate(`/cosmos/views/${variant}/${room.id}`);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
              >
                <MapPin className="h-4 w-4 shrink-0" />
                <span
                  className={`truncate overflow-hidden whitespace-nowrap transition-all duration-200 ${
                    collapsed
                      ? 'max-w-0 opacity-0 group-hover:max-w-[160px] group-hover:opacity-100'
                      : 'max-w-[160px] opacity-100'
                  }`}
                >
                  {room.name}
                </span>
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
