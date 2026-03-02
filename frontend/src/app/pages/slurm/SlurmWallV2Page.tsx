/**
 * SlurmWallV2Page — Slurm Wallboard V2
 * Design mirrors ClusterPage exactly.
 * Route: /slurm/wall  |  Persisted: rackscope.slurmwall.config
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SlidersHorizontal,
  X,
  RefreshCw,
  ChevronDown,
  Check,
  Server as ServerIcon,
  AlertTriangle,
  XCircle,
  CheckCircle,
} from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb } from '../templates/EmptyPage';
import { HUDTooltip } from '../../../components/HUDTooltip';
import { RackElevation } from '../../../components/RackVisualizer';
import { api } from '../../../services/api';
import type { Device, DeviceTemplate, Room, RoomSummary, RackNodeState } from '../../../types';

type WallView = 'compact' | 'rack' | 'columns';
type WallLayout = 'scroll' | 'wrap' | 'wrap-auto';
type CardSize = 'sm' | 'md' | 'lg';
interface WallConfig {
  view: WallView;
  layout: WallLayout;
  cardSize: CardSize;
  groupByAisle: boolean;
  autoRefreshMs: number;
}
type RackEntry = { rack: Room['aisles'][0]['racks'][0]; roomName: string; aisleName: string };
type HoverPayload = {
  node: string;
  status: string;
  severity: string;
  partitions: string[];
  rackName: string;
  deviceName: string;
  x: number;
  y: number;
};

const SEV: Record<string, string> = {
  OK: '#22c55e',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#374151',
};
const CARD_W: Record<CardSize, number> = { sm: 180, md: 260, lg: 340 };
const LS = 'rackscope.slurmwall.config';
const DEF: WallConfig = {
  view: 'compact',
  layout: 'scroll',
  cardSize: 'md',
  groupByAisle: true,
  autoRefreshMs: 30000,
};
const REFRESH_OPTS = [
  { label: 'Off', ms: 0 },
  { label: '15s', ms: 15000 },
  { label: '30s', ms: 30000 },
  { label: '1m', ms: 60000 },
  { label: '2m', ms: 120000 },
  { label: '5m', ms: 300000 },
] as const;

function loadCfg(): WallConfig {
  try {
    const r = localStorage.getItem(LS);
    if (r) return { ...DEF, ...(JSON.parse(r) as Partial<WallConfig>) };
  } catch {
    /**/
  }
  return { ...DEF };
}
function saveCfg(c: WallConfig) {
  try {
    localStorage.setItem(LS, JSON.stringify(c));
  } catch {
    /**/
  }
}

function expand(p: string): string[] {
  const m = p.match(/^(.*)\[(\d+)-(\d+)\](.*)$/);
  if (!m) return [p];
  const [, pre, s, e, suf] = m;
  const w = Math.max(s.length, e.length);
  const res: string[] = [];
  for (let v = Math.min(+s, +e); v <= Math.max(+s, +e); v++)
    res.push(`${pre}${String(v).padStart(w, '0')}${suf}`);
  return res;
}
function getSlotMap(device: Device, tpl?: DeviceTemplate): Record<number, string> {
  const inst = device.instance || device.nodes;
  if (!inst) return {};
  if (typeof inst === 'object' && !Array.isArray(inst))
    return Object.entries(inst as Record<string, string>).reduce<Record<number, string>>(
      (a, [k, v]) => {
        if (typeof v === 'string') a[+k] = v;
        return a;
      },
      {}
    );
  if (!tpl) return {};
  const lay = tpl.type === 'storage' && tpl.disk_layout ? tpl.disk_layout : tpl.layout;
  if (!lay?.matrix) return {};
  const slots = lay.matrix.flat().filter((s) => s > 0);
  const exp = Array.isArray(inst) ? inst : expand(inst as string);
  return slots.reduce<Record<number, string>>((a, sl, i) => {
    if (exp[i]) a[sl] = exp[i];
    return a;
  }, {});
}
function worstState(nodes: Record<string, RackNodeState>): string {
  let w = 'UNKNOWN';
  for (const n of Object.values(nodes)) {
    if (n.state === 'CRIT') return 'CRIT';
    if (n.state === 'WARN') w = 'WARN';
    else if (w === 'UNKNOWN' && n.state === 'OK') w = 'OK';
  }
  return w;
}

// StatChip — identical to ClusterPage
const StatChip = ({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  color?: string;
}) => (
  <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-800 dark:bg-gray-900">
    <Icon className={`h-3.5 w-3.5 shrink-0 ${color ?? 'text-gray-400'}`} />
    <span className={`font-semibold tabular-nums ${color ?? 'text-gray-700 dark:text-gray-200'}`}>
      {value}
    </span>
    <span className="text-xs text-gray-400 dark:text-gray-600">{label}</span>
  </div>
);

// RefreshButton — split button identical to ClusterPage
const RefreshButton = ({
  refreshing,
  autoMs,
  onRefresh,
  onInterval,
}: {
  refreshing: boolean;
  autoMs: number;
  onRefresh: () => void;
  onInterval: (ms: number) => void;
}) => {
  const [open, setOpen] = useState(false);
  const lbl = REFRESH_OPTS.find((o) => o.ms === autoMs)?.label ?? '?';
  return (
    <div className="relative flex items-stretch overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        <span>Refresh</span>
        {autoMs > 0 && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            {lbl}
          </span>
        )}
      </button>
      <div className="w-px self-stretch bg-gray-200 dark:bg-gray-700" />
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-full items-center px-2 text-gray-400 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-700"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <div className="absolute top-full right-0 z-30 mt-1 w-28 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
              {REFRESH_OPTS.map((o) => (
                <button
                  key={o.ms}
                  onClick={() => {
                    onInterval(o.ms);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${autoMs === o.ms ? 'text-brand-600 dark:text-brand-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {o.label}
                  {autoMs === o.ms && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Configure panel — slide-in, identical structure to ClusterPage
const SLbl = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-5 mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase first:mt-0 dark:text-gray-600">
    {children}
  </p>
);
function OptBtns<T>({
  opts,
  cur,
  onChange,
}: {
  opts: { val: T; label: string; desc: string }[];
  cur: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      {opts.map(({ val, label, desc }) => (
        <button
          key={String(val)}
          onClick={() => onChange(val)}
          className={`flex w-full flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors ${cur === val ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5'}`}
        >
          <span
            className={`text-sm font-semibold ${cur === val ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}
          >
            {label}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-600">{desc}</span>
        </button>
      ))}
    </div>
  );
}
function SegBtns<T>({
  opts,
  cur,
  onChange,
}: {
  opts: { label: string; val: T }[];
  cur: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {opts.map(({ label, val }) => (
        <button
          key={String(val)}
          onClick={() => onChange(val)}
          className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${cur === val ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
const ConfigPanel = ({
  open,
  cfg,
  onChange,
  onClose,
}: {
  open: boolean;
  cfg: WallConfig;
  onChange: (c: WallConfig) => void;
  onClose: () => void;
}) => {
  const set = <K extends keyof WallConfig>(k: K, v: WallConfig[K]) => onChange({ ...cfg, [k]: v });
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 right-0 z-40 flex h-full w-80 flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 dark:border-gray-800 dark:bg-gray-950 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-500" />
            <span className="font-semibold text-gray-800 dark:text-white">Display settings</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <SLbl>View</SLbl>
          <OptBtns
            opts={[
              {
                val: 'compact' as WallView,
                label: '· Compact dots',
                desc: 'Colored dot per node — fast status scan',
              },
              {
                val: 'rack' as WallView,
                label: '⊞ Rack physical',
                desc: 'Full rack elevation with Slurm colors',
              },
              {
                val: 'columns' as WallView,
                label: '≡ Slot grid',
                desc: 'Physical slot grid, exact U positions',
              },
            ]}
            cur={cfg.view}
            onChange={(v) => set('view', v)}
          />
          <SLbl>Layout</SLbl>
          <OptBtns
            opts={[
              {
                val: 'scroll' as WallLayout,
                label: '→ Horizontal scroll',
                desc: 'Single row, fills full height',
              },
              {
                val: 'wrap' as WallLayout,
                label: '⊞ Wrap + scroll',
                desc: 'Multiple rows, vertical scroll',
              },
              {
                val: 'wrap-auto' as WallLayout,
                label: '⊡ Wrap + autosize',
                desc: 'Fits all racks in viewport',
              },
            ]}
            cur={cfg.layout}
            onChange={(v) => set('layout', v)}
          />
          <SLbl>Card size</SLbl>
          <SegBtns
            opts={[
              { label: 'S', val: 'sm' as CardSize },
              { label: 'M', val: 'md' as CardSize },
              { label: 'L', val: 'lg' as CardSize },
            ]}
            cur={cfg.cardSize}
            onChange={(v) => set('cardSize', v)}
          />
          <SLbl>Grouping</SLbl>
          <OptBtns
            opts={[
              { val: true as boolean, label: 'By aisle', desc: 'Sections per room and aisle' },
              {
                val: false as boolean,
                label: 'All flat',
                desc: 'All racks in one continuous list',
              },
            ]}
            cur={cfg.groupByAisle}
            onChange={(v) => set('groupByAisle', v)}
          />
        </div>
      </div>
    </>
  );
};

// Compact card — V1 dot design
const CompactCard = ({
  entry,
  catalog,
  nodes,
  roles,
  unlabeled,
  width,
  onHover,
}: {
  entry: RackEntry;
  catalog: Record<string, DeviceTemplate>;
  nodes: Record<string, { severity: string; status: string; partitions: string[] }>;
  roles: string[];
  unlabeled: boolean;
  width: number;
  onHover: (p: HoverPayload | null) => void;
}) => {
  const { rack } = entry;
  const list: { name: string; sev: string; status: string; parts: string[] }[] = [];
  rack.devices.forEach((dev) => {
    const tpl = catalog[dev.template_id];
    if (!tpl) return;
    const role = tpl.role?.toLowerCase();
    if (!role && !unlabeled) return;
    if (role && !roles.includes(role)) return;
    Object.values(getSlotMap(dev, tpl)).forEach((name) => {
      const n = nodes[name];
      list.push({
        name,
        sev: n?.severity ?? 'UNKNOWN',
        status: n?.status ?? 'unknown',
        parts: n?.partitions ?? [],
      });
    });
  });
  if (list.length === 0) return null;
  const hasCrit = list.some((n) => n.sev === 'CRIT');
  const hasWarn = !hasCrit && list.some((n) => n.sev === 'WARN');
  const bc = hasCrit ? SEV.CRIT : hasWarn ? SEV.WARN : list.length > 0 ? SEV.OK : SEV.UNKNOWN;
  return (
    <div
      className="rounded-xl border-2 bg-white p-2.5 dark:bg-gray-900"
      style={{ borderColor: bc, width }}
    >
      <p className="mb-1.5 truncate font-mono text-[10px] font-semibold text-gray-700 dark:text-gray-300">
        {rack.id}
      </p>
      <p className="mb-1.5 truncate text-[10px] text-gray-500 dark:text-gray-400">{rack.name}</p>
      <div className="flex flex-wrap gap-0.5">
        {list.map((n, i) => (
          <div
            key={i}
            className="h-3.5 w-3.5 cursor-help rounded-sm transition-transform hover:scale-125"
            style={{ backgroundColor: SEV[n.sev] ?? SEV.UNKNOWN }}
            onMouseEnter={(e) =>
              onHover({
                node: n.name,
                status: n.status,
                severity: n.sev,
                partitions: n.parts,
                rackName: rack.name,
                deviceName: '',
                x: e.clientX,
                y: e.clientY,
              })
            }
            onMouseMove={(e) =>
              onHover({
                node: n.name,
                status: n.status,
                severity: n.sev,
                partitions: n.parts,
                rackName: rack.name,
                deviceName: '',
                x: e.clientX,
                y: e.clientY,
              })
            }
            onMouseLeave={() => onHover(null)}
          />
        ))}
      </div>
    </div>
  );
};

// Rack physical card
const RackCard = ({
  entry,
  catalog,
  nodes,
  roles,
  width,
  nav,
}: {
  entry: RackEntry;
  catalog: Record<string, DeviceTemplate>;
  nodes: Record<string, { severity: string; status: string; partitions: string[] }>;
  roles: string[];
  width: number;
  nav: (p: string) => void;
}) => {
  const { rack } = entry;
  const nodesData = useMemo(() => {
    const r: Record<string, RackNodeState> = {};
    rack.devices.forEach((dev) => {
      const tpl = catalog[dev.template_id];
      if (!tpl) return;
      const role = tpl.role?.toLowerCase();
      if (role && !roles.includes(role)) return;
      Object.values(getSlotMap(dev, tpl)).forEach((name) => {
        r[name] = { state: nodes[name]?.severity ?? 'UNKNOWN' };
      });
    });
    return r;
  }, [rack, catalog, nodes, roles]);
  const w = worstState(nodesData);
  return (
    <div
      className="flex shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl border-2 bg-white transition-all hover:shadow-md dark:bg-gray-900"
      style={{ width, borderColor: SEV[w] }}
      onClick={() => nav(`/views/rack/${rack.id}`)}
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-gray-800 dark:text-white">
            {rack.name}
          </p>
          <p className="font-mono text-[9px] text-gray-400">{rack.id}</p>
        </div>
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
          style={{ backgroundColor: `${SEV[w]}20`, color: SEV[w] }}
        >
          {w}
        </span>
      </div>
      <div className="bg-gray-950 p-1" style={{ height: `${(rack.u_height ?? 42) * 14}px` }}>
        <RackElevation
          rack={rack as never}
          catalog={catalog}
          health={w}
          nodesData={nodesData}
          disableZoom
          disableTooltip={false}
          fullWidth
        />
      </div>
    </div>
  );
};

// Grid slot card
const NodeDot = ({
  slot,
  sm,
  nodes,
  rackName,
  devName,
  onHover,
}: {
  slot: number;
  sm: Record<number, string>;
  nodes: Record<string, { severity: string; status: string; partitions: string[] }>;
  rackName: string;
  devName: string;
  onHover: (p: HoverPayload | null) => void;
}) => {
  const name = sm[slot];
  const n = name ? nodes[name] : undefined;
  const sev = n?.severity ?? 'UNKNOWN';
  return (
    <div
      className="h-full w-full rounded-[2px] border border-black/10 transition-transform hover:scale-110"
      style={{
        backgroundColor: SEV[sev],
        opacity: name ? 1 : 0.15,
        cursor: name ? 'help' : 'default',
      }}
      onMouseEnter={(e) => {
        if (!name) return;
        onHover({
          node: name,
          status: n?.status ?? 'unknown',
          severity: sev,
          partitions: n?.partitions ?? [],
          rackName,
          deviceName: devName,
          x: e.clientX,
          y: e.clientY,
        });
      }}
      onMouseMove={(e) => {
        if (!name) return;
        onHover({
          node: name,
          status: n?.status ?? 'unknown',
          severity: sev,
          partitions: n?.partitions ?? [],
          rackName,
          deviceName: devName,
          x: e.clientX,
          y: e.clientY,
        });
      }}
      onMouseLeave={() => onHover(null)}
    />
  );
};
const GridCard = ({
  entry,
  catalog,
  nodes,
  roles,
  unlabeled,
  width,
  onHover,
}: {
  entry: RackEntry;
  catalog: Record<string, DeviceTemplate>;
  nodes: Record<string, { severity: string; status: string; partitions: string[] }>;
  roles: string[];
  unlabeled: boolean;
  width: number;
  onHover: (p: HoverPayload | null) => void;
}) => {
  const { rack } = entry;
  const h = rack.u_height ?? 42;
  const vis = rack.devices
    .slice()
    .sort((a, b) => a.u_position - b.u_position)
    .filter((dev) => {
      const tpl = catalog[dev.template_id];
      if (!tpl) return false;
      const role = tpl.role?.toLowerCase();
      if (!role && !unlabeled) return false;
      if (role && !roles.includes(role)) return false;
      return Object.keys(getSlotMap(dev, tpl)).length > 0;
    });
  if (vis.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-1.5" style={{ width }}>
      <span className="font-mono text-[10px] font-semibold text-gray-400">{rack.id}</span>
      <div
        className="relative grid w-full overflow-hidden rounded-md border border-gray-700 bg-gray-950"
        style={{ gridTemplateRows: `repeat(${h}, minmax(0, 1fr))`, height: `${h * 14}px` }}
      >
        {vis.map((dev) => {
          const tpl = catalog[dev.template_id];
          if (!tpl) return null;
          const lay = tpl.type === 'storage' && tpl.disk_layout ? tpl.disk_layout : tpl.layout;
          if (!lay) return null;
          const sm = getSlotMap(dev, tpl);
          const gs = h - (dev.u_position + tpl.u_height) + 2;
          return (
            <div
              key={dev.id}
              className="rounded-[1px] border border-white/10 bg-white/5 p-[1px]"
              style={{ gridRow: `${gs} / span ${tpl.u_height}` }}
            >
              <div
                className="grid h-full w-full gap-[1px]"
                style={{
                  gridTemplateRows: `repeat(${lay.rows}, 1fr)`,
                  gridTemplateColumns: `repeat(${lay.cols}, 1fr)`,
                }}
              >
                {lay.matrix.flat().map((slot, i) => (
                  <NodeDot
                    key={i}
                    slot={slot}
                    sm={sm}
                    nodes={nodes}
                    rackName={rack.name}
                    devName={dev.name}
                    onHover={onHover}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <span className="max-w-full truncate text-center text-[9px] text-gray-500">{rack.name}</span>
    </div>
  );
};

// Main page
export const SlurmWallV2Page = () => {
  usePageTitle('Slurm Wall');
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<WallConfig>(loadCfg);
  const [configOpen, setConfigOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [layouts, setLayouts] = useState<Record<string, Room>>({});
  const [catalog, setCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [slurmNodes, setSlurmNodes] = useState<
    Record<string, { severity: string; status: string; partitions: string[] }>
  >({});
  const [roles, setRoles] = useState<string[]>(['compute', 'visu']);
  const [unlabeled, setUnlabeled] = useState(false);
  const [severityColors, setSeverityColors] = useState<Record<string, string>>(SEV);
  const [statusMap, setStatusMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<HoverPayload | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerH, setContainerH] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((e) => setContainerH(e[0].contentRect.height));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const update = (c: WallConfig) => {
    setCfg(c);
    saveCfg(c);
  };

  const load = async () => {
    setRefreshing(true);
    try {
      const [roomList, cat, appCfg, slurm] = await Promise.all([
        api.getRooms(),
        api.getCatalog(),
        api.getConfig(),
        api.getSlurmNodes(),
      ]);
      setRooms(Array.isArray(roomList) ? roomList : []);
      const cm: Record<string, DeviceTemplate> = {};
      cat.device_templates.forEach((t) => {
        cm[t.id] = t;
      });
      setCatalog(cm);
      const r = appCfg?.plugins?.slurm?.roles;
      if (Array.isArray(r) && r.length > 0) setRoles(r.map((x: string) => x.toLowerCase()));
      if (typeof appCfg?.plugins?.slurm?.include_unlabeled === 'boolean')
        setUnlabeled(appCfg.plugins.slurm.include_unlabeled);
      if (appCfg?.plugins?.slurm?.severity_colors)
        setSeverityColors({ ...SEV, ...appCfg.plugins.slurm.severity_colors });
      if (appCfg?.plugins?.slurm?.status_map) setStatusMap(appCfg.plugins.slurm.status_map);
      const nm: Record<string, { severity: string; status: string; partitions: string[] }> = {};
      for (const n of slurm?.nodes ?? [])
        nm[n.node] = { severity: n.severity, status: n.status, partitions: n.partitions ?? [] };
      setSlurmNodes(nm);
      if (Array.isArray(roomList) && roomList.length > 0) {
        const lays = await Promise.all(
          roomList.map((r) => api.getRoomLayout(r.id).catch(() => null))
        );
        const lm: Record<string, Room> = {};
        roomList.forEach((r, i) => {
          if (lays[i]) lm[r.id] = lays[i]!;
        });
        setLayouts(lm);
      }
      setLoading(false);
    } catch {
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (cfg.autoRefreshMs > 0) timerRef.current = setInterval(() => void load(), cfg.autoRefreshMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cfg.autoRefreshMs]);

  const groups = useMemo(() => {
    const map = new Map<string, RackEntry[]>();
    for (const room of rooms) {
      const lay = layouts[room.id];
      if (!lay) continue;
      for (const aisle of lay.aisles) {
        for (const rack of aisle.racks) {
          const has = rack.devices.some((dev) => {
            const tpl = catalog[dev.template_id];
            if (!tpl) return false;
            const role = tpl.role?.toLowerCase();
            if (!role && !unlabeled) return false;
            if (role && !roles.includes(role)) return false;
            return Object.keys(getSlotMap(dev, tpl)).length > 0;
          });
          if (!has) continue;
          const key = cfg.groupByAisle ? `${room.name} \u203a ${aisle.name}` : '_all';
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push({ rack, roomName: room.name, aisleName: aisle.name });
        }
      }
    }
    return Array.from(map.entries()).map(([k, e]) => ({ key: k, entries: e }));
  }, [rooms, layouts, catalog, roles, unlabeled, cfg.groupByAisle]);

  const stats = useMemo(() => {
    const v = Object.values(slurmNodes);
    return {
      total: v.length,
      crit: v.filter((n) => n.severity === 'CRIT').length,
      warn: v.filter((n) => n.severity === 'WARN').length,
      ok: v.filter((n) => n.severity === 'OK').length,
    };
  }, [slurmNodes]);

  const cardW = CARD_W[cfg.cardSize];
  const scrollH = containerH > 0 ? Math.min(Math.max(200, containerH - 40), 900) : 700;

  const renderRack = (e: RackEntry) => {
    const k = e.rack.id;
    if (cfg.view === 'compact')
      return (
        <CompactCard
          key={k}
          entry={e}
          catalog={catalog}
          nodes={slurmNodes}
          roles={roles}
          unlabeled={unlabeled}
          width={cardW}
          onHover={setHover}
        />
      );
    if (cfg.view === 'rack')
      return (
        <RackCard
          key={k}
          entry={e}
          catalog={catalog}
          nodes={slurmNodes}
          roles={roles}
          width={cardW}
          nav={navigate}
        />
      );
    return (
      <GridCard
        key={k}
        entry={e}
        catalog={catalog}
        nodes={slurmNodes}
        roles={roles}
        unlabeled={unlabeled}
        width={cardW}
        onHover={setHover}
      />
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      <PageHeader
        title="Slurm Wall"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Slurm', href: '/slurm/overview' },
              { label: 'Wall' },
            ]}
          />
        }
        description={`${stats.total} nodes \u00b7 ${rooms.length} room${rooms.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setConfigOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Configure
            </button>
            <RefreshButton
              refreshing={refreshing}
              autoMs={cfg.autoRefreshMs}
              onRefresh={() => void load()}
              onInterval={(ms) => update({ ...cfg, autoRefreshMs: ms })}
            />
          </div>
        }
      />
      {!loading && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {stats.ok > 0 && (
            <StatChip icon={CheckCircle} value={stats.ok} label="OK" color="text-green-500" />
          )}
          {stats.warn > 0 && (
            <StatChip icon={AlertTriangle} value={stats.warn} label="WARN" color="text-amber-500" />
          )}
          {stats.crit > 0 && (
            <StatChip icon={XCircle} value={stats.crit} label="CRIT" color="text-red-500" />
          )}
          <StatChip icon={ServerIcon} value={stats.total} label="nodes" color="text-gray-400" />
          <div className="ml-2 flex items-center gap-3 border-l border-gray-200 pl-3 dark:border-gray-700">
            {(['ok', 'warn', 'crit', 'info'] as const)
              .filter((sev) => severityColors[sev] && (statusMap[sev]?.length ?? 0) > 0)
              .map((sev) => {
                const color = severityColors[sev] ?? SEV.UNKNOWN;
                const examples = (statusMap[sev] ?? []).slice(0, 2).join(' / ');
                return (
                  <div key={sev} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-[2px]"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium uppercase">{sev}</span>
                      {examples && (
                        <span className="ml-1 text-gray-400 dark:text-gray-600">({examples})</span>
                      )}
                    </span>
                  </div>
                );
              })}
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-[2px]"
                style={{ backgroundColor: SEV.UNKNOWN }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">Unknown</span>
            </div>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-[#0a0c10] dark:border-gray-800"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="border-t-brand-500 h-10 w-10 animate-spin rounded-full border-2 border-gray-800" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-600">
            <ServerIcon className="h-10 w-10 opacity-20" />
            <p>No Slurm nodes found</p>
          </div>
        ) : cfg.layout === 'scroll' ? (
          <div className="flex h-full items-center overflow-x-auto overflow-y-hidden">
            <div className="flex min-h-0 gap-5 p-5" style={{ height: scrollH }}>
              {groups.flatMap(({ entries }) => entries).map(renderRack)}
            </div>
          </div>
        ) : cfg.layout === 'wrap' ? (
          <div className="h-full overflow-y-auto">
            <div className="flex flex-wrap content-start gap-5 p-5">
              {groups.map(({ key, entries }) => (
                <div key={key} className="w-full">
                  {cfg.groupByAisle && key !== '_all' && (
                    <div className="mb-3 flex items-center gap-2">
                      <span className="bg-brand-500 h-1.5 w-1.5 rounded-full opacity-60" />
                      <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                        {key}
                      </h3>
                      <span className="text-[10px] text-gray-500">({entries.length})</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-5">{entries.map(renderRack)}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-wrap content-start gap-5 overflow-hidden p-5">
            {groups.flatMap(({ entries }) => entries).map(renderRack)}
          </div>
        )}
      </div>
      {hover && (
        <HUDTooltip
          title={hover.node}
          subtitle="Slurm Node"
          status={hover.severity}
          enclosure={hover.rackName}
          reasons={
            hover.status !== 'idle' && hover.status !== 'allocated'
              ? [{ label: hover.status, severity: hover.severity }]
              : undefined
          }
          details={[
            { label: 'Status', value: hover.status, italic: true },
            { label: 'Partitions', value: hover.partitions.join(', ') || '\u2014', italic: true },
          ]}
          mousePos={{ x: hover.x, y: hover.y }}
        />
      )}
      <ConfigPanel
        open={configOpen}
        cfg={cfg}
        onChange={update}
        onClose={() => setConfigOpen(false)}
      />
    </div>
  );
};
