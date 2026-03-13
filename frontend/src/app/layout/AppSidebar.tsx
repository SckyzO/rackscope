import React, { useState, useEffect } from 'react';
import { StadeToulousainOverlay } from '../components/StadeToulousainOverlay';
import { AppIcon, getIconContainerClass, getIconSize } from '../components/AppIcon';
import { useTheme } from '@src/context/ThemeContext';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppConfigSafe } from '../contexts/AppConfigContext';
import { api } from '@src/services/api';
import type { ComponentType } from 'react';
import type { RoomSummary, Site, AisleSummary, RackSummary } from '@src/types';
import {
  BarChart2,
  Globe,
  AlertTriangle,
  List,
  Bell,
  User,
  LayoutDashboard,
  LayoutGrid,
  Network,
  GitBranch,
  Server,
  Layers,
  ShieldCheck,
  Settings,
  ChevronRight,
  ChevronDown,
  MonitorPlay,
} from 'lucide-react';

interface NavItemProps {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
  end?: boolean;
  depth?: boolean;
}

// NavItem uses CSS class toggling (not conditional rendering) for active/inactive state.
// NavLink's className render prop receives isActive at runtime, so both active and
// inactive elements exist in the DOM simultaneously during navigation — screen readers
// always have a stable element to describe.
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

// Dual-DOM pattern: both collapsed (dots) and expanded (text) are rendered,
// visibility toggled via CSS. Avoids layout shift on transition.
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
        collapsed ? 'mt-1 hidden group-hover:block' : 'mt-4'
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
  navigate: _navigate,
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
  /** Passed through from parent but not used directly; navigation is handled via onToggle/onLinkClick */
  navigate?: (path: string) => void;
}) => (
  <div>
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
        {Icon && (
          <Icon
            className={`shrink-0 ${primary ? 'h-5 w-5' : 'h-3.5 w-3.5'} ${isActive ? 'text-brand-500' : 'opacity-60'}`}
          />
        )}
        <span
          className={`min-w-0 flex-1 truncate whitespace-nowrap ${sidebarCollapsed ? 'hidden group-hover:inline' : ''}`}
        >
          {label}
        </span>
      </button>
      <button
        onClick={onToggle}
        className={`shrink-0 rounded p-1 text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400 ${
          sidebarCollapsed ? 'hidden group-hover:block' : ''
        }`}
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
    </div>
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
  <button
    onClick={() => navigate(`/views/rack/${rack.id}`)}
    title={collapsed ? rack.name : undefined}
    className={`flex w-full items-center rounded-lg px-2 py-1 text-left text-xs transition-colors ${
      isActive ? ACTIVE : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5'
    } ${collapsed ? 'hidden group-hover:flex' : ''}`}
  >
    <span className="min-w-0 flex-1 truncate whitespace-nowrap">{rack.name}</span>
  </button>
);

// ── Helpers ────────────────────────────────────────────────────────────────

// ── Easter egg: Matrix rain ────────────────────────────────────────────────

const MATRIX_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()アイウエオカキクケコサシスセソ';

const MatrixRainOverlay = ({ onClose }: { onClose: () => void }) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const fontSize = 14;
    let cols = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(cols).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f0';
      ctx.font = `${fontSize}px monospace`;

      cols = Math.floor(canvas.width / fontSize);
      if (drops.length < cols) drops.push(...Array(cols - drops.length).fill(1));

      for (let i = 0; i < cols; i++) {
        const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[99999] bg-black" onClick={onClose}>
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
        <p className="font-mono text-2xl font-bold text-green-400 drop-shadow-[0_0_8px_#0f0]">
          RACKSCOPE MATRIX
        </p>
        <p className="font-mono text-sm text-green-600">Click anywhere or press Esc to exit</p>
      </div>
    </div>
  );
};

// ── Easter egg: ASCII boot ─────────────────────────────────────────────────

const BOOT_LINES = [
  'BIOS v2.6.1  © Rackscope Industries',
  '─────────────────────────────────────────',
  'CPU: Rack-Core i∞ @ 3.14GHz ... OK',
  'MEM: Checking 1337 TB ECC RAM ... OK',
  'NET: Detecting 10GbE interfaces ... FOUND [eth0, eth1, ib0]',
  'PDU: Power distribution check ... OK [A: 9.8kW / B: 10.1kW]',
  'HBA: Scanning storage adapters ... OK [HBA-0, HBA-1]',
  'TEMP: Cooling system check ... 23.4°C NOMINAL',
  'PROM: Prometheus heartbeat ... OK [http://prometheus:9090]',
  '─────────────────────────────────────────',
  'Loading Rackscope kernel modules...',
  '  [topology_loader]  OK',
  '  [check_engine]     OK',
  '  [planner]          OK',
  '  [slurm_plugin]     OK',
  '─────────────────────────────────────────',
  'All systems nominal. Welcome to Rackscope.',
  'Have a great shift, operator o7',
];

const AsciiBootOverlay = ({ onClose }: { onClose: () => void }) => {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const next = () => {
      if (i >= BOOT_LINES.length) {
        setDone(true);
        return;
      }
      setLines((prev) => [...prev, BOOT_LINES[i++]]);
      setTimeout(next, 80 + Math.random() * 60);
    };
    const t = setTimeout(next, 200);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/95 p-8"
      onClick={done ? onClose : undefined}
    >
      <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl border border-green-800 bg-black p-6 font-mono text-sm leading-relaxed text-green-400 shadow-[0_0_40px_rgba(0,255,0,0.1)]">
        {lines.map((line, idx) => (
          <div key={idx} className={line.startsWith('─') ? 'text-green-800' : ''}>
            {line}
          </div>
        ))}
        {!done && <span className="inline-block h-4 w-2 animate-pulse bg-green-400" />}
        {done && (
          <div className="mt-4 text-xs text-green-700">Click anywhere or press Esc to close</div>
        )}
      </div>
    </div>
  );
};

// ── Easter egg: Hidden terminal ────────────────────────────────────────────

const HELP_COMMANDS = [
  { cmd: 'help', out: "You're looking at it." },
  {
    cmd: 'ls /rack/r01-01/',
    out: 'compute001/  compute002/  compute003/  ...  [Permission: denied on r01-01-pdu01]',
  },
  {
    cmd: 'df -h /dev/datacenter',
    out: 'Filesystem: /dev/datacenter  Size: ∞  Used: 99%  Avail: ε  Use%: fine, probably.',
  },
  { cmd: 'sudo rm -rf /incidents/*', out: 'Permission denied. Nice try though.' },
  {
    cmd: 'git blame --follow .',
    out: 'dev@rackscope, 3 years ago: "TODO: refactor this someday"',
  },
  { cmd: 'ssh compute001', out: 'ssh: connect to host compute001: Connection timed out. Classic.' },
  {
    cmd: 'systemctl status everything',
    out: '● everything.service — Active (running, mostly)  [some things may be lying]',
  },
  {
    cmd: 'coffee --extra-shot --infinite',
    out: 'Error: FEATURE_NOT_IMPLEMENTED. Filed as ticket #4096. ETA: never.',
  },
  { cmd: 'prometheus --query "up"', out: '1 (optimistic)' },
  { cmd: 'reboot --datacenter --force', out: 'lol. no.' },
  { cmd: 'blame @management', out: 'Segfault. Core dumped.' },
  { cmd: 'exit', out: 'exit: not found. There is no escape.' },
];

const HelpTerminalOverlay = ({ onClose }: { onClose: () => void }) => {
  const [visible, setVisible] = useState<number>(0);

  useEffect(() => {
    let i = 0;
    const next = () => {
      if (i >= HELP_COMMANDS.length) return;
      i++;
      setVisible(i);
      setTimeout(next, 120 + Math.random() * 80);
    };
    const t = setTimeout(next, 300);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-700 bg-gray-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-gray-800 bg-gray-900 px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <div className="h-3 w-3 rounded-full bg-amber-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <span className="ml-2 font-mono text-xs text-gray-400">
            rackscope-terminal — bash — 80×24
          </span>
        </div>
        {/* Content */}
        <div className="max-h-[60vh] overflow-auto p-5 font-mono text-sm">
          <p className="mb-3 text-green-500">
            Welcome to Rackscope Terminal v1.33.7 — type carefully.
          </p>
          <p className="mb-4 text-gray-500">$ help</p>
          <p className="mb-4 font-bold text-yellow-400">AVAILABLE COMMANDS:</p>
          {HELP_COMMANDS.slice(0, visible).map((c, i) => (
            <div key={i} className="mb-2">
              <p className="text-green-400">
                <span className="text-gray-600">$ </span>
                {c.cmd}
              </p>
              <p className="ml-2 text-gray-400">{c.out}</p>
            </div>
          ))}
          {visible < HELP_COMMANDS.length && (
            <span className="inline-block h-4 w-2 animate-pulse bg-green-500" />
          )}
          {visible >= HELP_COMMANDS.length && (
            <p className="mt-4 text-gray-600">
              Press <span className="text-gray-400">Esc</span> or click outside to close.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Sidebar ────────────────────────────────────────────────────────────────

interface AppSidebarProps {
  collapsed: boolean;
}

export const AppSidebar = ({ collapsed }: AppSidebarProps) => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set());
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [expandedAisles, setExpandedAisles] = useState<Set<string>>(new Set());
  // ── Easter egg state ────────────────────────────────────────────────────
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [matrixActive, setMatrixActive] = useState(false);
  const [bootActive, setBootActive] = useState(false);
  const [helpActive, setHelpActive] = useState(false);
  const [toulouseActive, setToulouseActive] = useState(false);
  const logoClickTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const helpProgress = React.useRef(0);
  const helpTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toulouseProgress = React.useRef(0);
  const toulouseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Easter egg: typing 'help' triggers a retro terminal overlay.
  // Easter egg: typing 'toulouse' triggers the Stade Toulousain overlay.
  // Sequences are detected via keydown accumulation with 1.5s timeout.
  useEffect(() => {
    const HELP = ['h', 'e', 'l', 'p'];
    const TOULOUSE = ['t', 'o', 'u', 'l', 'o', 'u', 's', 'e'];
    const anyActive = matrixActive || bootActive || helpActive || toulouseActive;
    const onKey = (e: KeyboardEvent) => {
      if (anyActive) return;
      const k = e.key.toLowerCase();

      // 'help' sequence
      if (k === HELP[helpProgress.current]) {
        helpProgress.current += 1;
        if (helpProgress.current === HELP.length) {
          helpProgress.current = 0;
          if (helpTimer.current) clearTimeout(helpTimer.current);
          setHelpActive(true);
        } else {
          if (helpTimer.current) clearTimeout(helpTimer.current);
          helpTimer.current = setTimeout(() => {
            helpProgress.current = 0;
          }, 1500);
        }
      } else {
        helpProgress.current = k === 'h' ? 1 : 0;
      }

      // 'toulouse' sequence
      if (k === TOULOUSE[toulouseProgress.current]) {
        toulouseProgress.current += 1;
        if (toulouseProgress.current === TOULOUSE.length) {
          toulouseProgress.current = 0;
          if (toulouseTimer.current) clearTimeout(toulouseTimer.current);
          setToulouseActive(true);
        } else {
          if (toulouseTimer.current) clearTimeout(toulouseTimer.current);
          toulouseTimer.current = setTimeout(() => {
            toulouseProgress.current = 0;
          }, 2000);
        }
      } else {
        toulouseProgress.current = k === 't' ? 1 : 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [matrixActive, bootActive, helpActive, toulouseActive]);
  const navigate = useNavigate();
  const location = useLocation();
  const { features, plugins, config } = useAppConfigSafe();
  const { iconId, iconBg } = useTheme();
  // Slurm plugin registers its menu section as id="workload", not "slurm"
  const slurmActive = plugins.slurm;

  useEffect(() => {
    Promise.all([api.getRooms(), api.getSites()])
      .then(([roomsData, sitesData]) => {
        setRooms(Array.isArray(roomsData) ? roomsData : []);
        setSites(Array.isArray(sitesData) ? sitesData : []);
      })
      .catch(() => {
        /* noop */
      });
  }, []);

  return (
    <aside
      className={`rs-sidebar rs-scrollbar group dark:bg-gray-dark flex shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white px-5 transition-[width] duration-300 ease-linear dark:border-gray-800 ${
        collapsed ? 'w-[90px] hover:w-[290px]' : 'w-[290px]'
      }`}
    >
      {/* ── Easter egg overlays ───────────────────────────────────────── */}
      {matrixActive && <MatrixRainOverlay onClose={() => setMatrixActive(false)} />}
      {bootActive && <AsciiBootOverlay onClose={() => setBootActive(false)} />}
      {helpActive && <HelpTerminalOverlay onClose={() => setHelpActive(false)} />}
      {toulouseActive && <StadeToulousainOverlay onClose={() => setToulouseActive(false)} />}

      <div className="flex h-[72px] shrink-0 items-center">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`${getIconContainerClass(iconBg)} cursor-pointer`}
            onClick={(e) => {
              if (e.shiftKey) {
                setBootActive(true);
                return;
              }
              if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
              const next = logoClickCount + 1;
              setLogoClickCount(next);
              if (next >= 5) {
                setLogoClickCount(0);
                setMatrixActive(true);
              } else {
                logoClickTimer.current = setTimeout(() => setLogoClickCount(0), 1500);
                void navigate('/');
              }
            }}
            title="Go to Dashboard"
          >
            <AppIcon id={iconId} className={getIconSize(iconBg)} />
          </div>
          <button
            onClick={() => navigate('/')}
            className={`min-w-0 overflow-hidden text-left transition-all duration-300 ${
              collapsed
                ? 'max-w-0 opacity-0 group-hover:max-w-[200px] group-hover:opacity-100'
                : 'max-w-[200px] opacity-100'
            }`}
          >
            <p className="truncate text-base font-bold tracking-tight whitespace-nowrap text-gray-900 dark:text-white">
              {config?.app?.name ?? 'Rackscope'}
            </p>
            {config?.app?.description && (
              <p className="truncate text-xs whitespace-nowrap text-gray-400 dark:text-gray-500">
                {config.app.description}
              </p>
            )}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto pt-2 pb-4">
        <SectionLabel label="Main" collapsed={collapsed} />
        <NavItem to="/" icon={BarChart2} label="Dashboard" collapsed={collapsed} end />
        {features.playlist && (
          <NavItem to="/playlist" icon={MonitorPlay} label="Playlist" collapsed={collapsed} />
        )}

        <SectionLabel label="Monitoring" collapsed={collapsed} />
        {features.worldmap && (
          <NavItem to="/views/worldmap" icon={Globe} label="World Map" collapsed={collapsed} />
        )}
        {features.notifications && (
          <NavItem to="/notifications" icon={Bell} label="Notifications" collapsed={collapsed} />
        )}
        {features.aisle_dashboard && (
          <NavItem
            to="/views/cluster"
            icon={LayoutGrid}
            label="Cluster Overview"
            collapsed={collapsed}
          />
        )}

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
                    hasLink
                    onLinkClick={() => {
                      void navigate(`/views/site/${site.id}`);
                      setExpandedSites((prev) => {
                        const next = new Set(prev);
                        next.add(site.id);
                        return next;
                      });
                    }}
                    isActive={location.pathname === `/views/site/${site.id}`}
                    collapsed={collapsed}
                    navigate={navigate}
                  >
                    {siteRooms.map((room) => {
                      const roomExpanded = expandedRooms.has(room.id);
                      const roomPath = `/views/room/${room.id}`;
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
                            void navigate(roomPath);
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
                  const roomPath = `/views/room/${room.id}`;
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
                        void navigate(roomPath);
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

        {slurmActive && (
          <>
            <SectionLabel label="Slurm" collapsed={collapsed} />
            <NavItem
              to="/slurm/overview"
              icon={LayoutDashboard}
              label="Overview"
              collapsed={collapsed}
            />
            <NavItem
              to="/slurm/partitions"
              icon={Network}
              label="Partitions"
              collapsed={collapsed}
            />
            <NavItem to="/slurm/nodes" icon={List} label="Nodes" collapsed={collapsed} />
            <NavItem to="/slurm/alerts" icon={AlertTriangle} label="Alerts" collapsed={collapsed} />
            <NavItem
              to="/slurm/wallboard"
              icon={LayoutGrid}
              label="Wallboard"
              collapsed={collapsed}
            />
          </>
        )}

        <SectionLabel label="Editors" collapsed={collapsed} />
        <NavItem
          to="/editors/datacenter"
          icon={GitBranch}
          label="Datacenter"
          collapsed={collapsed}
        />
        <NavItem to="/editors/rack" icon={Server} label="Rack Editor" collapsed={collapsed} />
        <NavItem
          to="/editors/rack-templates"
          icon={Layers}
          label="Rack Templates"
          collapsed={collapsed}
        />
        <NavItem
          to="/editors/templates"
          icon={Layers}
          label="Device Templates"
          collapsed={collapsed}
        />
        <NavItem
          to="/editors/checks"
          icon={ShieldCheck}
          label="Checks Library"
          collapsed={collapsed}
        />
        <NavItem
          to="/editors/metrics"
          icon={BarChart2}
          label="Metrics Library"
          collapsed={collapsed}
        />
      </nav>

      {/* Bottom sticky — Profile, Settings, UI Library (dev only) */}
      <div className="shrink-0 border-t border-gray-200 py-2 dark:border-gray-800">
        {features.dev_tools && (
          <NavItem to="/ui-library" icon={Layers} label="UI Library" collapsed={collapsed} />
        )}
        <NavItem to="/profile" icon={User} label="Profile" collapsed={collapsed} />
        <NavItem to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
        <NavItem to="/about" icon={GitBranch} label="About" collapsed={collapsed} />
      </div>
    </aside>
  );
};
