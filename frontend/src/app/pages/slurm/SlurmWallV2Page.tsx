/**
 * SlurmWallV2Page — New Slurm Wallboard
 *
 * Multi-room, 3 views (compact dots / rack physical / columns),
 * layout modes (scroll / wrap / wrap-auto), configure panel.
 *
 * Route:      /slurm/wall
 * Persisted:  rackscope.slurmwall.config
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  LayoutGrid,
  Columns,
  Server as ServerIcon,
  SlidersHorizontal,
  X,
  ChevronRight,
} from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb } from '../templates/EmptyPage';
import { HUDTooltip } from '../../../components/HUDTooltip';
import { RackElevation } from '../../../components/RackVisualizer';
import { api } from '../../../services/api';
import type { Device, DeviceTemplate, Room, RoomSummary, RackNodeState } from '../../../types';

// ── Types ──────────────────────────────────────────────────────────────────────

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

type RackEntry = {
  rack: Room['aisles'][0]['racks'][0];
  roomName: string;
  aisleName: string;
};

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

// ── Constants ─────────────────────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  OK: '#22c55e',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#374151',
};

const CARD_WIDTHS: Record<CardSize, number> = { sm: 180, md: 260, lg: 340 };

const LS_CONFIG = 'rackscope.slurmwall.config';

const DEFAULT_CONFIG: WallConfig = {
  view: 'compact',
  layout: 'wrap',
  cardSize: 'md',
  groupByAisle: true,
  autoRefreshMs: 30000,
};

const REFRESH_OPTIONS = [
  { label: 'Off', ms: 0 },
  { label: '15s', ms: 15000 },
  { label: '30s', ms: 30000 },
  { label: '1m', ms: 60000 },
  { label: '2m', ms: 120000 },
  { label: '5m', ms: 300000 },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadConfig(): WallConfig {
  try {
    const raw = localStorage.getItem(LS_CONFIG);
    if (raw) return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<WallConfig>) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_CONFIG };
}
function saveConfig(cfg: WallConfig) {
  try {
    localStorage.setItem(LS_CONFIG, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

function expandPattern(pattern: string): string[] {
  const m = pattern.match(/^(.*)\[(\d+)-(\d+)\](.*)$/);
  if (!m) return [pattern];
  const [, pre, s, e, suf] = m;
  const start = parseInt(s, 10),
    end = parseInt(e, 10);
  const w = Math.max(s.length, e.length);
  const res: string[] = [];
  for (let v = Math.min(start, end); v <= Math.max(start, end); v++)
    res.push(`${pre}${String(v).padStart(w, '0')}${suf}`);
  return res;
}

function buildSlotMap(device: Device, template?: DeviceTemplate): Record<number, string> {
  const instance = device.instance || device.nodes;
  if (!instance) return {};
  if (typeof instance === 'object' && !Array.isArray(instance))
    return Object.entries(instance as Record<string, string>).reduce<Record<number, string>>(
      (acc, [k, v]) => {
        if (typeof v === 'string') acc[Number(k)] = v;
        return acc;
      },
      {}
    );
  if (!template) return {};
  const layout =
    template.type === 'storage' && template.disk_layout ? template.disk_layout : template.layout;
  if (!layout?.matrix) return {};
  const slots = layout.matrix.flat().filter((s) => s > 0);
  const expanded = Array.isArray(instance) ? instance : expandPattern(instance as string);
  return slots.reduce<Record<number, string>>((acc, slot, idx) => {
    if (expanded[idx]) acc[slot] = expanded[idx];
    return acc;
  }, {});
}

function worstSeverity(nodes: Record<string, { severity: string }>): string {
  let worst = 'UNKNOWN';
  for (const n of Object.values(nodes)) {
    if (n.severity === 'CRIT') return 'CRIT';
    if (n.severity === 'WARN') worst = 'WARN';
    else if (worst === 'UNKNOWN' && n.severity === 'OK') worst = 'OK';
  }
  return worst;
}

// ── Configure Panel ────────────────────────────────────────────────────────────

const SegBtns = <T,>({
  opts,
  cur,
  onChange,
}: {
  opts: { label: string; val: T }[];
  cur: T;
  onChange: (v: T) => void;
}) => (
  <div className="flex gap-1">
    {opts.map(({ label, val }) => (
      <button
        key={String(val)}
        onClick={() => onChange(val)}
        className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
          cur === val
            ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
            : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

const SecLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-4 mb-1.5 text-[10px] font-bold tracking-widest text-gray-400 uppercase first:mt-0">
    {children}
  </p>
);

const ConfigPanel = ({
  cfg,
  onChange,
  onClose,
}: {
  cfg: WallConfig;
  onChange: (c: WallConfig) => void;
  onClose: () => void;
}) => {
  const set = <K extends keyof WallConfig>(k: K, v: WallConfig[K]) => onChange({ ...cfg, [k]: v });

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <span className="text-sm font-semibold text-gray-800 dark:text-white">Configure</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <SecLabel>View</SecLabel>
        <SegBtns
          opts={[
            { label: 'Dots', val: 'compact' as WallView },
            { label: 'Rack', val: 'rack' as WallView },
            { label: 'Grid', val: 'columns' as WallView },
          ]}
          cur={cfg.view}
          onChange={(v) => set('view', v)}
        />

        <SecLabel>Layout</SecLabel>
        <SegBtns
          opts={[
            { label: 'Scroll →', val: 'scroll' as WallLayout },
            { label: 'Wrap', val: 'wrap' as WallLayout },
            { label: 'Auto', val: 'wrap-auto' as WallLayout },
          ]}
          cur={cfg.layout}
          onChange={(v) => set('layout', v)}
        />

        <SecLabel>Card size</SecLabel>
        <SegBtns
          opts={[
            { label: 'S', val: 'sm' as CardSize },
            { label: 'M', val: 'md' as CardSize },
            { label: 'L', val: 'lg' as CardSize },
          ]}
          cur={cfg.cardSize}
          onChange={(v) => set('cardSize', v)}
        />

        <SecLabel>Grouping</SecLabel>
        <div className="flex flex-col gap-1">
          {(
            [
              { label: 'By aisle', val: true },
              { label: 'All flat', val: false },
            ] as const
          ).map(({ label, val }) => (
            <button
              key={label}
              onClick={() => set('groupByAisle', val)}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                cfg.groupByAisle === val
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700'
              }`}
            >
              {label}
              {cfg.groupByAisle === val && (
                <span className="bg-brand-500 h-1.5 w-1.5 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <SecLabel>Auto-refresh</SecLabel>
        <div className="grid grid-cols-3 gap-1">
          {REFRESH_OPTIONS.map(({ label, ms }) => (
            <button
              key={ms}
              onClick={() => set('autoRefreshMs', ms)}
              className={`rounded-lg border py-1.5 text-xs font-semibold transition-colors ${
                cfg.autoRefreshMs === ms
                  ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Compact view — colored dot grid ───────────────────────────────────────────

const CompactRackCard = ({
  entry,
  catalog,
  slurmNodes,
  slurmRoles,
  includeUnlabeled,
  cardWidth,
  onHover,
}: {
  entry: RackEntry;
  catalog: Record<string, DeviceTemplate>;
  slurmNodes: Record<string, { severity: string; status: string; partitions: string[] }>;
  slurmRoles: string[];
  includeUnlabeled: boolean;
  cardWidth: number;
  onHover: (p: HoverPayload | null) => void;
}) => {
  const { rack } = entry;
  const allNodes: { name: string; severity: string; status: string; partitions: string[] }[] = [];

  rack.devices.forEach((dev) => {
    const tpl = catalog[dev.template_id];
    if (!tpl) return;
    const role = tpl.role?.toLowerCase();
    if (!role && !includeUnlabeled) return;
    if (role && !slurmRoles.includes(role)) return;
    const slots = buildSlotMap(dev, tpl);
    Object.values(slots).forEach((nodeName) => {
      const sn = slurmNodes[nodeName];
      allNodes.push({
        name: nodeName,
        severity: sn?.severity ?? 'UNKNOWN',
        status: sn?.status ?? 'unknown',
        partitions: sn?.partitions ?? [],
      });
    });
  });

  if (allNodes.length === 0) return null;
  const worst = allNodes.some((n) => n.severity === 'CRIT')
    ? 'CRIT'
    : allNodes.some((n) => n.severity === 'WARN')
      ? 'WARN'
      : allNodes.every((n) => n.severity === 'OK')
        ? 'OK'
        : 'UNKNOWN';
  const borderColor = SEV_COLOR[worst];

  return (
    <div
      className="flex flex-col gap-1.5 rounded-xl border-2 bg-white p-2 dark:bg-gray-900"
      style={{ width: cardWidth, borderColor }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-mono text-[9px] font-bold text-gray-500">{rack.id}</span>
        <span className="text-[9px] font-bold uppercase" style={{ color: borderColor }}>
          {worst}
        </span>
      </div>
      <div className="flex flex-wrap gap-[2px]">
        {allNodes.map((n) => (
          <div
            key={n.name}
            className="h-[6px] w-[6px] rounded-[1px] transition-transform hover:scale-125"
            style={{
              backgroundColor: SEV_COLOR[n.severity],
              opacity: n.severity === 'UNKNOWN' ? 0.3 : 1,
              cursor: 'help',
            }}
            onMouseEnter={(e) =>
              onHover({
                node: n.name,
                status: n.status,
                severity: n.severity,
                partitions: n.partitions,
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
                severity: n.severity,
                partitions: n.partitions,
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
      <span className="truncate text-center text-[9px] text-gray-400">{rack.name}</span>
    </div>
  );
};

// ── Rack physical view — RackElevation with Slurm overlay ─────────────────────

const RackPhysicalCard = ({
  entry,
  catalog,
  slurmNodes,
  slurmRoles,
  cardWidth,
  navigate,
}: {
  entry: RackEntry;
  catalog: Record<string, DeviceTemplate>;
  slurmNodes: Record<string, { severity: string; status: string; partitions: string[] }>;
  slurmRoles: string[];
  cardWidth: number;
  navigate: (path: string) => void;
}) => {
  const { rack } = entry;

  // Build nodesData for RackElevation from Slurm states
  const nodesData = useMemo(() => {
    const result: Record<string, RackNodeState> = {};
    rack.devices.forEach((dev) => {
      const tpl = catalog[dev.template_id];
      if (!tpl) return;
      const role = tpl.role?.toLowerCase();
      if (role && !slurmRoles.includes(role)) return;
      const slots = buildSlotMap(dev, tpl);
      Object.values(slots).forEach((nodeName) => {
        const sn = slurmNodes[nodeName];
        result[nodeName] = { state: sn?.severity ?? 'UNKNOWN' };
      });
    });
    return result;
  }, [rack, catalog, slurmNodes, slurmRoles]);

  const worst = worstSeverity(nodesData);
  const borderColor = SEV_COLOR[worst];

  return (
    <div
      className="flex shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl border-2 bg-white transition-all hover:shadow-md dark:bg-gray-900"
      style={{ width: cardWidth, borderColor }}
      onClick={() => navigate(`/views/rack/${rack.id}`)}
      title={`${rack.name} — Click to open rack view`}
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
          style={{ backgroundColor: `${borderColor}20`, color: borderColor }}
        >
          {worst}
        </span>
      </div>
      <div className="flex-1 bg-gray-950 p-1">
        <RackElevation
          rack={rack as never}
          catalog={catalog}
          health={worst}
          nodesData={nodesData}
          disableZoom
          disableTooltip={false}
          fullWidth
        />
      </div>
      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-1.5 dark:border-gray-800">
        <span className="flex items-center gap-1 text-[10px] text-gray-400">
          <ServerIcon className="h-3 w-3" />
          {rack.devices.length}
        </span>
        <ChevronRight className="h-3 w-3 text-gray-300" />
      </div>
    </div>
  );
};

// ── Columns view — physical slot grid (from existing wallboard) ───────────────

const NodeCell = ({
  slot,
  slotMap,
  slurmNodes,
  rackName,
  deviceName,
  onHover,
}: {
  slot: number;
  slotMap: Record<number, string>;
  slurmNodes: Record<string, { severity: string; status: string; partitions: string[] }>;
  rackName: string;
  deviceName: string;
  onHover: (p: HoverPayload | null) => void;
}) => {
  const nodeName = slotMap[slot];
  const sn = nodeName ? slurmNodes[nodeName] : undefined;
  const severity = sn?.severity ?? 'UNKNOWN';
  const color = SEV_COLOR[severity];
  return (
    <div
      className="h-full w-full rounded-[2px] border border-black/10 transition-transform hover:scale-110"
      style={{
        backgroundColor: color,
        opacity: nodeName ? 1 : 0.15,
        cursor: nodeName ? 'help' : 'default',
      }}
      onMouseEnter={(e) => {
        if (!nodeName) return;
        onHover({
          node: nodeName,
          status: sn?.status ?? 'unknown',
          severity,
          partitions: sn?.partitions ?? [],
          rackName,
          deviceName,
          x: e.clientX,
          y: e.clientY,
        });
      }}
      onMouseMove={(e) => {
        if (!nodeName) return;
        onHover({
          node: nodeName,
          status: sn?.status ?? 'unknown',
          severity,
          partitions: sn?.partitions ?? [],
          rackName,
          deviceName,
          x: e.clientX,
          y: e.clientY,
        });
      }}
      onMouseLeave={() => onHover(null)}
    />
  );
};

const ColumnsRackCard = ({
  entry,
  catalog,
  slurmNodes,
  slurmRoles,
  includeUnlabeled,
  cardWidth,
  onHover,
}: {
  entry: RackEntry;
  catalog: Record<string, DeviceTemplate>;
  slurmNodes: Record<string, { severity: string; status: string; partitions: string[] }>;
  slurmRoles: string[];
  includeUnlabeled: boolean;
  cardWidth: number;
  onHover: (p: HoverPayload | null) => void;
}) => {
  const { rack } = entry;
  const rackHeight = rack.u_height ?? 42;

  const visibleDevices = rack.devices
    .slice()
    .sort((a, b) => a.u_position - b.u_position)
    .filter((dev) => {
      const tpl = catalog[dev.template_id];
      if (!tpl) return false;
      const role = tpl.role?.toLowerCase();
      if (!role && !includeUnlabeled) return false;
      if (role && !slurmRoles.includes(role)) return false;
      return Object.keys(buildSlotMap(dev, tpl)).length > 0;
    });

  if (visibleDevices.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ width: cardWidth }}>
      <span className="font-mono text-[10px] font-semibold text-gray-500">{rack.id}</span>
      <div
        className="relative grid w-full overflow-hidden rounded-md border border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-950"
        style={{
          gridTemplateRows: `repeat(${rackHeight}, minmax(0, 1fr))`,
          height: `${rackHeight * 14}px`,
        }}
      >
        {visibleDevices.map((dev) => {
          const tpl = catalog[dev.template_id];
          if (!tpl) return null;
          const layout = tpl.type === 'storage' && tpl.disk_layout ? tpl.disk_layout : tpl.layout;
          if (!layout) return null;
          const slotMap = buildSlotMap(dev, tpl);
          const gridRowStart = rackHeight - (dev.u_position + tpl.u_height) + 2;
          return (
            <div
              key={dev.id}
              className="rounded-[1px] border border-white/10 bg-white/5 p-[1px]"
              style={{ gridRow: `${gridRowStart} / span ${tpl.u_height}` }}
            >
              <div
                className="grid h-full w-full gap-[1px]"
                style={{
                  gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                  gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
                }}
              >
                {layout.matrix.flat().map((slot, idx) => (
                  <NodeCell
                    key={idx}
                    slot={slot}
                    slotMap={slotMap}
                    slurmNodes={slurmNodes}
                    rackName={rack.name}
                    deviceName={dev.name}
                    onHover={onHover}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <span className="max-w-full truncate text-center text-[9px] text-gray-400">{rack.name}</span>
    </div>
  );
};

// ── Group header ──────────────────────────────────────────────────────────────

const GroupHeader = ({ label, count }: { label: string; count: number }) => (
  <div className="mb-3 flex items-center gap-2">
    <span className="bg-brand-500 h-1.5 w-1.5 rounded-full opacity-60" />
    <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">{label}</h3>
    <span className="text-[10px] text-gray-400">
      ({count} rack{count !== 1 ? 's' : ''})
    </span>
  </div>
);

// ── Layout wrapper ────────────────────────────────────────────────────────────

const LayoutWrapper = ({ layout, children }: { layout: WallLayout; children: React.ReactNode }) => {
  if (layout === 'scroll')
    return <div className="flex flex-nowrap items-end gap-4 overflow-x-auto pb-2">{children}</div>;
  if (layout === 'wrap') return <div className="flex flex-wrap items-end gap-4">{children}</div>;
  // wrap-auto: same as wrap but fills viewport
  return <div className="flex flex-wrap items-end gap-4">{children}</div>;
};

// ── Main page ─────────────────────────────────────────────────────────────────

export const SlurmWallV2Page = () => {
  usePageTitle('Slurm Wall');
  const navigate = useNavigate();

  const [cfg, setCfg] = useState<WallConfig>(loadConfig);
  const [showCfg, setShowCfg] = useState(false);

  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomLayouts, setRoomLayouts] = useState<Record<string, Room>>({});
  const [catalog, setCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [slurmNodes, setSlurmNodes] = useState<
    Record<string, { severity: string; status: string; partitions: string[] }>
  >({});
  const [slurmRoles, setSlurmRoles] = useState<string[]>(['compute', 'visu']);
  const [includeUnlabeled, setIncludeUnlabeled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<HoverPayload | null>(null);

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateCfg = (c: WallConfig) => {
    setCfg(c);
    saveConfig(c);
  };

  const loadData = async () => {
    try {
      const [roomsList, catalogData, config, slurmData] = await Promise.all([
        api.getRooms(),
        api.getCatalog(),
        api.getConfig(),
        api.getSlurmNodes(),
      ]);

      setRooms(Array.isArray(roomsList) ? roomsList : []);

      const catMap: Record<string, DeviceTemplate> = {};
      catalogData.device_templates.forEach((t) => {
        catMap[t.id] = t;
      });
      setCatalog(catMap);

      const roles = config?.plugins?.slurm?.roles;
      if (Array.isArray(roles) && roles.length > 0)
        setSlurmRoles(roles.map((r: string) => r.toLowerCase()));
      if (typeof config?.plugins?.slurm?.include_unlabeled === 'boolean')
        setIncludeUnlabeled(config.plugins.slurm.include_unlabeled);

      const nodesMap: Record<string, { severity: string; status: string; partitions: string[] }> =
        {};
      for (const node of slurmData?.nodes ?? []) {
        nodesMap[node.node] = {
          severity: node.severity,
          status: node.status,
          partitions: node.partitions ?? [],
        };
      }
      setSlurmNodes(nodesMap);

      // Load room layouts in parallel
      if (Array.isArray(roomsList) && roomsList.length > 0) {
        const layouts = await Promise.all(
          roomsList.map((r) => api.getRoomLayout(r.id).catch(() => null))
        );
        const layoutMap: Record<string, Room> = {};
        roomsList.forEach((r, i) => {
          if (layouts[i]) layoutMap[r.id] = layouts[i]!;
        });
        setRoomLayouts(layoutMap);
      }

      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    if (cfg.autoRefreshMs > 0)
      refreshTimerRef.current = setInterval(() => void loadData(), cfg.autoRefreshMs);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [cfg.autoRefreshMs]);

  // Build flat list of all rack entries across rooms
  const allRackEntries = useMemo((): { groupKey: string; entries: RackEntry[] }[] => {
    const groups: Map<string, RackEntry[]> = new Map();

    for (const room of rooms) {
      const layout = roomLayouts[room.id];
      if (!layout) continue;

      for (const aisle of layout.aisles) {
        for (const rack of aisle.racks) {
          // Only show racks that have Slurm-managed devices
          const hasSlurmDevices = rack.devices.some((dev) => {
            const tpl = catalog[dev.template_id];
            if (!tpl) return false;
            const role = tpl.role?.toLowerCase();
            if (!role && !includeUnlabeled) return false;
            if (role && !slurmRoles.includes(role)) return false;
            return Object.keys(buildSlotMap(dev, tpl)).length > 0;
          });
          if (!hasSlurmDevices) continue;

          const entry: RackEntry = { rack, roomName: room.name, aisleName: aisle.name };
          const key = cfg.groupByAisle ? `${room.name} › ${aisle.name}` : 'All Racks';

          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(entry);
        }
      }
    }

    return Array.from(groups.entries()).map(([groupKey, entries]) => ({ groupKey, entries }));
  }, [rooms, roomLayouts, catalog, slurmRoles, includeUnlabeled, cfg.groupByAisle]);

  // Stats
  const stats = useMemo(() => {
    const vals = Object.values(slurmNodes);
    return {
      total: vals.length,
      crit: vals.filter((n) => n.severity === 'CRIT').length,
      warn: vals.filter((n) => n.severity === 'WARN').length,
      ok: vals.filter((n) => n.severity === 'OK').length,
    };
  }, [slurmNodes]);

  const cardWidth = CARD_WIDTHS[cfg.cardSize];

  const renderRack = (entry: RackEntry) => {
    const key = entry.rack.id;
    if (cfg.view === 'compact')
      return (
        <CompactRackCard
          key={key}
          entry={entry}
          catalog={catalog}
          slurmNodes={slurmNodes}
          slurmRoles={slurmRoles}
          includeUnlabeled={includeUnlabeled}
          cardWidth={cardWidth}
          onHover={setHover}
        />
      );
    if (cfg.view === 'rack')
      return (
        <RackPhysicalCard
          key={key}
          entry={entry}
          catalog={catalog}
          slurmNodes={slurmNodes}
          slurmRoles={slurmRoles}
          cardWidth={cardWidth}
          navigate={navigate}
        />
      );
    return (
      <ColumnsRackCard
        key={key}
        entry={entry}
        catalog={catalog}
        slurmNodes={slurmNodes}
        slurmRoles={slurmRoles}
        includeUnlabeled={includeUnlabeled}
        cardWidth={cardWidth}
        onHover={setHover}
      />
    );
  };

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="shrink-0">
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
          actions={
            <div className="flex items-center gap-2">
              {/* Stats */}
              {stats.crit > 0 && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400">
                  {stats.crit} CRIT
                </span>
              )}
              {stats.warn > 0 && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                  {stats.warn} WARN
                </span>
              )}
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                {stats.total} nodes
              </span>

              {/* View toggle */}
              <div className="flex items-center rounded-xl border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-900">
                {[
                  { id: 'compact' as WallView, Icon: LayoutGrid, label: 'Dots' },
                  { id: 'rack' as WallView, Icon: ServerIcon, label: 'Rack' },
                  { id: 'columns' as WallView, Icon: Columns, label: 'Grid' },
                ].map(({ id, Icon, label }) => (
                  <button
                    key={id}
                    title={label}
                    onClick={() => updateCfg({ ...cfg, view: id })}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                      cfg.view === id
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => void loadData()}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => setShowCfg(true)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Configure
              </button>
            </div>
          }
        />
      </div>

      {/* Legend */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {[
          { label: 'OK / Idle', color: SEV_COLOR.OK },
          { label: 'WARN / Mixed', color: SEV_COLOR.WARN },
          { label: 'CRIT / Down', color: SEV_COLOR.CRIT },
          { label: 'Unknown', color: SEV_COLOR.UNKNOWN },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[2px]" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="border-t-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
          </div>
        ) : allRackEntries.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-gray-400">
            <ServerIcon className="h-8 w-8 opacity-30" />
            <p>No Slurm nodes found across all rooms</p>
          </div>
        ) : (
          <div className="space-y-8">
            {allRackEntries.map(({ groupKey, entries }) => (
              <div key={groupKey}>
                {cfg.groupByAisle && <GroupHeader label={groupKey} count={entries.length} />}
                <LayoutWrapper layout={cfg.layout}>{entries.map(renderRack)}</LayoutWrapper>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tooltip */}
      {hover && (
        <HUDTooltip
          title={hover.node}
          subtitle="Slurm Node"
          status={hover.severity}
          details={[
            { label: 'Rack', value: hover.rackName },
            { label: 'Status', value: hover.status },
            { label: 'Partitions', value: hover.partitions.join(', ') || '—', italic: true },
          ]}
          mousePos={{ x: hover.x, y: hover.y }}
        />
      )}

      {/* Configure panel overlay */}
      {showCfg && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowCfg(false)} />
          <ConfigPanel cfg={cfg} onChange={updateCfg} onClose={() => setShowCfg(false)} />
        </>
      )}
    </div>
  );
};
