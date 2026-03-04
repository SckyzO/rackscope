/**
 * ClusterPage — Small Cluster Overview
 *
 * Wallboard-style view for small clusters of a few racks.
 * No aisle notion — freely pick any racks from the topology,
 * reorder by drag-and-drop, and monitor them side-by-side.
 *
 * Route:     /views/cluster
 * Persisted: rackscope.cluster-racks   (selection, explicit Save)
 *            rackscope.cluster-display  (display prefs, auto-saved)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  RefreshCw,
  SlidersHorizontal,
  X,
  LayoutGrid,
  Thermometer,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Server,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Plus,
  Check,
  Save,
  Pencil,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Room, Rack, DeviceTemplate, RackState, RackNodeState } from '../../../types';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageHeader, PageBreadcrumb } from '../templates/EmptyPage';
import { RackElevation } from '../../../components/RackVisualizer';
import { Drawer } from '../../components/layout/Drawer';
import { DrawerHeader } from '../../components/layout/DrawerHeader';

// ── Types ──────────────────────────────────────────────────────────────────────

type RackEntry = {
  rack: Rack | null;
  health: RackState | null;
  catalog: Record<string, DeviceTemplate>;
  loading: boolean;
  error: boolean;
};

type AisleGroup = {
  label: string;
  racks: { id: string; name: string }[];
};

type DisplayConfig = {
  rackWidth: number;
  uSize: 'auto' | number;
  /** scroll = single horizontal row | wrap = multi-row full height rows | wrap-auto = fit all in viewport */
  layout: 'scroll' | 'wrap' | 'wrap-auto';
  footerPosition: 'top' | 'bottom';
  showDeviceCount: boolean;
  showHealthBadge: boolean;
  showRackId: boolean;
  autoRefreshMs: number;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const HC: Record<string, string> = {
  OK: '#10b981',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#6b7280',
};

const LS_RACKS = 'rackscope.cluster-racks';
const LS_DISPLAY = 'rackscope.cluster-display';

const DEFAULT_DISPLAY: DisplayConfig = {
  rackWidth: 360,
  uSize: 'auto',
  layout: 'scroll',
  footerPosition: 'bottom',
  showDeviceCount: true,
  showHealthBadge: true,
  showRackId: true,
  autoRefreshMs: 60000,
};

const REFRESH_OPTIONS = [
  { label: 'Off', ms: 0 },
  { label: '15s', ms: 15000 },
  { label: '30s', ms: 30000 },
  { label: '1m', ms: 60000 },
  { label: '2m', ms: 120000 },
  { label: '5m', ms: 300000 },
  { label: '10m', ms: 600000 },
] as const;

// ── Storage helpers ────────────────────────────────────────────────────────────

function loadRacks(): string[] {
  try {
    const raw = localStorage.getItem(LS_RACKS);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }
  return [];
}

function saveRacks(ids: string[]) {
  try {
    localStorage.setItem(LS_RACKS, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

function loadDisplay(): DisplayConfig {
  try {
    const raw = localStorage.getItem(LS_DISPLAY);
    if (raw) return { ...DEFAULT_DISPLAY, ...(JSON.parse(raw) as Partial<DisplayConfig>) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_DISPLAY };
}

function saveDisplay(cfg: DisplayConfig) {
  try {
    localStorage.setItem(LS_DISPLAY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

// ── Stats ──────────────────────────────────────────────────────────────────────

function computeStats(rackIds: string[], entries: Record<string, RackEntry>) {
  let ok = 0,
    warn = 0,
    crit = 0,
    unknown = 0,
    deviceCount = 0;

  for (const id of rackIds) {
    const e = entries[id];
    if (!e?.rack) continue;
    deviceCount += e.rack.devices?.length ?? 0;
    const state = e.health?.state ?? 'UNKNOWN';
    if (state === 'OK') ok++;
    else if (state === 'WARN') warn++;
    else if (state === 'CRIT') crit++;
    else unknown++;
  }

  return { total: rackIds.length, deviceCount, ok, warn, crit, unknown };
}

// ── Shared UI atoms ────────────────────────────────────────────────────────────

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

const Toggle = ({
  checked,
  onChange,
  label,
  disabled,
  note,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
  note?: string;
}) => (
  <div className={`flex items-center justify-between gap-3 py-2 ${disabled ? 'opacity-40' : ''}`}>
    <div>
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      {note && <p className="text-[10px] text-gray-400 dark:text-gray-600">{note}</p>}
    </div>
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      disabled={disabled}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        disabled ? 'cursor-not-allowed' : ''
      } ${checked && !disabled ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked && !disabled ? 'left-0.5 translate-x-4' : 'left-0.5'}`}
      />
    </button>
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-5 mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase first:mt-0 dark:text-gray-600">
    {children}
  </p>
);

function SegmentBtns<T>({
  options,
  current,
  onChange,
}: {
  options: { label: string; value: T }[];
  current: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map(({ label, value }) => (
        <button
          key={String(label)}
          onClick={() => onChange(value)}
          className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
            current === value
              ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
              : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Rack card ──────────────────────────────────────────────────────────────────

const RackCard = ({
  entry,
  rackId,
  displayConfig,
  wrapHeight,
  editMode,
  isDragging,
  isDragOver,
  onRemove,
  onDragStart,
  onDragEnd,
  onDragOver: onDragOverCard,
  onDrop,
}: {
  entry: RackEntry;
  rackId: string;
  displayConfig: DisplayConfig;
  wrapHeight?: number;
  editMode: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) => {
  const cardStyle: React.CSSProperties = {
    width: displayConfig.rackWidth,
    ...(wrapHeight !== undefined ? { height: wrapHeight } : {}),
  };

  if (entry.loading) {
    return (
      <div
        className="flex shrink-0 flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        style={cardStyle}
      >
        <div className="flex-1 animate-pulse rounded-t-2xl bg-gray-100 dark:bg-gray-800" />
        <div className="space-y-1.5 border-t border-gray-100 px-3 py-2.5 dark:border-gray-800">
          <div className="h-3.5 w-28 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-2.5 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  if (entry.error || !entry.rack) {
    return (
      <div
        className="flex shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
        style={cardStyle}
      >
        <XCircle className="h-6 w-6 text-red-400" />
        <p className="font-mono text-xs text-red-500">{rackId}</p>
        <p className="text-xs text-red-400">Failed to load</p>
      </div>
    );
  }

  const { rack, health, catalog } = entry;
  const state = health?.state ?? 'UNKNOWN';
  const stateColor = HC[state] ?? HC.UNKNOWN;
  const nodes = (health?.nodes ?? {}) as Record<string, RackNodeState>;
  const pduMetrics = health?.infra_metrics?.pdu;
  const deviceCount = rack.devices?.length ?? 0;
  const maxUPx = displayConfig.uSize === 'auto' ? undefined : (displayConfig.uSize as number);

  return (
    <div
      draggable={editMode}
      onDragStart={editMode ? onDragStart : undefined}
      onDragEnd={editMode ? onDragEnd : undefined}
      onDragOver={editMode ? onDragOverCard : undefined}
      onDrop={editMode ? onDrop : undefined}
      className={[
        'group flex shrink-0 flex-col overflow-hidden rounded-2xl border bg-white transition-all dark:bg-gray-900',
        editMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        isDragging ? 'scale-[0.97] opacity-40' : '',
        isDragOver
          ? 'border-brand-400 ring-brand-400/40 ring-2'
          : 'border-gray-200 dark:border-gray-800',
        !isDragOver && !isDragging
          ? 'hover:border-gray-300 hover:shadow-md dark:hover:border-gray-700'
          : '',
      ].join(' ')}
      style={cardStyle}
      onClick={
        !editMode
          ? () => {
              window.location.href = `/views/rack/${rack.id}`;
            }
          : undefined
      }
      role={!editMode ? 'button' : undefined}
      tabIndex={!editMode ? 0 : undefined}
      onKeyDown={
        !editMode
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ')
                window.location.href = `/views/rack/${rack.id}`;
            }
          : undefined
      }
    >
      {/* Health strip — always at top */}
      <div
        className="h-0.5 w-full shrink-0 rounded-t-2xl"
        style={{ backgroundColor: stateColor }}
      />

      {/* Info bar (footer) — top position */}
      {displayConfig.footerPosition === 'top' && (
        <div className="shrink-0 border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                {rack.name || rack.id}
              </p>
              {displayConfig.showRackId && (
                <p className="font-mono text-[10px] text-gray-400 dark:text-gray-600">{rack.id}</p>
              )}
            </div>
            {displayConfig.showHealthBadge && (
              <span
                className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide uppercase"
                style={{ backgroundColor: `${stateColor}20`, color: stateColor }}
              >
                {state}
              </span>
            )}
          </div>
          {displayConfig.showDeviceCount && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-600">
              <Server className="h-3 w-3" />
              {deviceCount} device{deviceCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Rack elevation */}
      <div
        className={`relative min-h-0 flex-1 overflow-hidden bg-[#0f1117] ${displayConfig.footerPosition === 'bottom' ? '' : 'rounded-b-2xl'}`}
      >
        {/* Edit mode overlay: drag handle + remove button */}
        {editMode && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-between p-2 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
            <div className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-black/50 text-white/60">
              <GripVertical className="h-3.5 w-3.5" />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onRemove();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-600/60 bg-gray-900/80 text-gray-400 transition-all hover:border-red-500/60 hover:bg-red-950/60 hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <RackElevation
          rack={rack}
          catalog={catalog}
          health={state}
          nodesData={nodes}
          infraComponents={[]}
          sideComponents={[]}
          pduMetrics={pduMetrics}
          fullWidth
          disableZoom
          rackWidth={displayConfig.rackWidth}
          maxUPx={maxUPx}
        />
      </div>

      {/* Info bar (footer) — bottom position */}
      {displayConfig.footerPosition === 'bottom' && (
        <div className="shrink-0 rounded-b-2xl border-t border-gray-100 px-3 py-2.5 dark:border-gray-800">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                {rack.name || rack.id}
              </p>
              {displayConfig.showRackId && (
                <p className="font-mono text-[10px] text-gray-400 dark:text-gray-600">{rack.id}</p>
              )}
            </div>
            {displayConfig.showHealthBadge && (
              <span
                className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide uppercase"
                style={{ backgroundColor: `${stateColor}20`, color: stateColor }}
              >
                {state}
              </span>
            )}
          </div>
          {displayConfig.showDeviceCount && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-600">
              <Server className="h-3 w-3" />
              {deviceCount} device{deviceCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Configure panel ────────────────────────────────────────────────────────────

const ConfigurePanel = ({
  open,
  onClose,
  displayConfig,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  displayConfig: DisplayConfig;
  onChange: (cfg: DisplayConfig) => void;
}) => {
  const upd = <K extends keyof DisplayConfig>(key: K, value: DisplayConfig[K]) =>
    onChange({ ...displayConfig, [key]: value });

  return (
    <Drawer open={open} onClose={onClose} width={320}>
      <DrawerHeader title="Display settings" onClose={onClose} icon={SlidersHorizontal} />
      <div className="flex-1 overflow-y-auto p-5">
          <SectionLabel>Card width</SectionLabel>
          <SegmentBtns
            options={[
              { label: 'S', value: 280 },
              { label: 'M', value: 360 },
              { label: 'L', value: 440 },
            ]}
            current={displayConfig.rackWidth}
            onChange={(v) => upd('rackWidth', v)}
          />

          <SectionLabel>Rack height (U size)</SectionLabel>
          <SegmentBtns
            options={[
              { label: 'Auto', value: 'auto' as const },
              { label: 'S', value: 24 },
              { label: 'M', value: 32 },
              { label: 'L', value: 48 },
            ]}
            current={displayConfig.uSize}
            onChange={(v) => upd('uSize', v)}
          />
          <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-600">
            Auto fills available height. S/M/L sets a fixed max U pixel size.
          </p>

          <SectionLabel>Layout</SectionLabel>
          <div className="space-y-2">
            {(
              [
                {
                  value: 'scroll',
                  label: '→ Horizontal scroll',
                  desc: 'Single row, fills full height',
                },
                { value: 'wrap', label: '⊞ Wrap + scroll', desc: 'Multiple rows, vertical scroll' },
                {
                  value: 'wrap-auto',
                  label: '⊡ Wrap + autosize',
                  desc: 'Fits all racks in viewport, no scroll',
                },
              ] as const
            ).map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => upd('layout', value)}
                className={`flex w-full flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  displayConfig.layout === value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5'
                }`}
              >
                <span
                  className={`text-sm font-semibold ${displayConfig.layout === value ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  {label}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-gray-600">{desc}</span>
              </button>
            ))}
          </div>

          <SectionLabel>Metrics</SectionLabel>
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-700/30 dark:bg-amber-500/5">
            <Thermometer className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Temperature &amp; power metrics — <span className="font-semibold">next feature</span>
            </p>
          </div>
          <Toggle
            label="Temperature"
            checked={false}
            onChange={() => {
              /* noop */
            }}
            disabled
          />
          <Toggle
            label="Power"
            checked={false}
            onChange={() => {
              /* noop */
            }}
            disabled
          />

          <SectionLabel>Info bar position</SectionLabel>
          <SegmentBtns
            options={[
              { label: '↑ Top', value: 'top' as const },
              { label: '↓ Bottom', value: 'bottom' as const },
            ]}
            current={displayConfig.footerPosition}
            onChange={(v) => upd('footerPosition', v)}
          />

          <SectionLabel>Card display</SectionLabel>
          <Toggle
            label="Device count"
            checked={displayConfig.showDeviceCount}
            onChange={() => upd('showDeviceCount', !displayConfig.showDeviceCount)}
          />
          <Toggle
            label="Health badge"
            checked={displayConfig.showHealthBadge}
            onChange={() => upd('showHealthBadge', !displayConfig.showHealthBadge)}
          />
          <Toggle
            label="Rack ID"
            checked={displayConfig.showRackId}
            onChange={() => upd('showRackId', !displayConfig.showRackId)}
          />
        </div>
      </Drawer>
  );
};

// ── Rack picker panel ──────────────────────────────────────────────────────────

const RackPickerPanel = ({
  aisleGroups,
  selectedIds,
  onToggle,
  onClose,
}: {
  aisleGroups: AisleGroup[];
  selectedIds: string[];
  onToggle: (rackId: string) => void;
  onClose: () => void;
}) => {
  const [search, setSearch] = useState('');

  const filtered = aisleGroups
    .map((g) => ({
      ...g,
      racks: g.racks.filter(({ id, name }) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return name.toLowerCase().includes(q) || id.toLowerCase().includes(q);
      }),
    }))
    .filter((g) => g.racks.length > 0);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 flex h-full w-[340px] flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Add racks</p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-600">
              {selectedIds.length} rack{selectedIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 p-3">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search racks…"
            className="focus:border-brand-500 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-600"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No racks found</p>
          ) : (
            <div className="space-y-4">
              {filtered.map((group) => (
                <div key={group.label}>
                  <p className="mb-1.5 px-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-600">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.racks.map(({ id, name }) => {
                      const isSelected = selectedIds.includes(id);
                      return (
                        <button
                          key={id}
                          onClick={() => onToggle(id)}
                          className={[
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
                            isSelected
                              ? 'bg-brand-50 dark:bg-brand-500/10'
                              : 'hover:bg-gray-50 dark:hover:bg-white/5',
                          ].join(' ')}
                        >
                          <div
                            className={[
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
                              isSelected
                                ? 'border-brand-500 bg-brand-500'
                                : 'border-gray-300 dark:border-gray-600',
                            ].join(' ')}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm font-medium ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}
                            >
                              {name}
                            </p>
                            <p className="font-mono text-[10px] text-gray-400 dark:text-gray-600">
                              {id}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ── Refresh split button ───────────────────────────────────────────────────────

const RefreshButton = ({
  refreshing,
  autoRefreshMs,
  onRefresh,
  onIntervalChange,
}: {
  refreshing: boolean;
  autoRefreshMs: number;
  onRefresh: () => void;
  onIntervalChange: (ms: number) => void;
}) => {
  const [dropOpen, setDropOpen] = useState(false);
  const currentLabel = REFRESH_OPTIONS.find((o) => o.ms === autoRefreshMs)?.label ?? '?';
  const isAutoActive = autoRefreshMs > 0;

  return (
    <div className="relative flex items-stretch rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Left: manual refresh */}
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        <span>Refresh</span>
        {isAutoActive && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            {currentLabel}
          </span>
        )}
      </button>

      {/* Divider */}
      <div className="w-px self-stretch bg-gray-200 dark:bg-gray-700" />

      {/* Right: interval dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropOpen((v) => !v)}
          className="flex h-full items-center rounded-r-lg px-2 text-gray-400 transition-colors hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-700"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>

        {dropOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setDropOpen(false)} />
            <div className="absolute top-full right-0 z-30 mt-1 w-28 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
              {REFRESH_OPTIONS.map((opt) => (
                <button
                  key={opt.ms}
                  onClick={() => {
                    onIntervalChange(opt.ms);
                    setDropOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
                    autoRefreshMs === opt.ms
                      ? 'text-brand-600 dark:text-brand-400 font-semibold'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {opt.label}
                  {autoRefreshMs === opt.ms && <Check className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────────

export const ClusterPage = () => {
  usePageTitle('Cluster Overview');

  // Rack selection — explicit Save + editMode
  const [rackIds, setRackIds] = useState<string[]>(loadRacks);
  const [savedDigest, setSavedDigest] = useState(() => JSON.stringify(loadRacks()));
  const [editMode, setEditMode] = useState(false);
  const isDirty = JSON.stringify(rackIds) !== savedDigest;

  // Display config — auto-saved on change
  const [displayConfig, setDisplayConfig] = useState<DisplayConfig>(loadDisplay);

  // Rack data
  const [rackEntries, setRackEntries] = useState<Record<string, RackEntry>>({});

  // Topology meta (for picker)
  const [aisleGroups, setAisleGroups] = useState<AisleGroup[]>([]);

  // UI state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // DnD reorder
  const dragSrcIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Container ref for wrap-auto sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDims, setContainerDims] = useState({ w: 0, h: 0 });

  // ── Scroll nav arrows (scroll mode only) ──────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scrollBy = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const step = displayConfig.rackWidth + 20;
    el.scrollBy({ left: direction === 'right' ? step : -step, behavior: 'smooth' });
  }, [displayConfig.rackWidth]);

  // ── Container size tracking for wrap-auto ──────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setContainerDims({ w: rect.width, h: rect.height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Recompute arrow visibility after rack list or layout changes
  useEffect(() => {
    // Small delay — DOM needs to settle after racks render/resize
    const t = setTimeout(updateScrollArrows, 60);
    return () => clearTimeout(t);
  }, [rackIds, displayConfig.layout, displayConfig.rackWidth, updateScrollArrows]);

  // ── Load topology for picker ──────────────────────────────────────────────

  useEffect(() => {
    api
      .getRooms()
      .then((rooms: Room[]) => {
        const groups: AisleGroup[] = [];
        for (const room of rooms) {
          for (const aisle of room.aisles ?? []) {
            groups.push({
              label: `${room.name} › ${aisle.name}`,
              racks: aisle.racks.map((r) => ({ id: r.id, name: r.name || r.id })),
            });
          }
        }
        setAisleGroups(groups);
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  // ── Load rack data ────────────────────────────────────────────────────────

  const loadRackData = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    setRackEntries((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        if (!next[id] || next[id].error) {
          next[id] = { rack: null, health: null, catalog: {}, loading: true, error: false };
        }
      });
      return next;
    });

    try {
      const [catalogData, ...results] = await Promise.all([
        api.getCatalog(),
        ...ids.map((id) =>
          Promise.all([api.getRack(id), api.getRackState(id, true)])
            .then(([rack, health]) => ({ id, rack, health, error: false }))
            .catch(() => ({ id, rack: null, health: null, error: true }))
        ),
      ]);

      const devCat: Record<string, DeviceTemplate> = {};
      (catalogData?.device_templates ?? []).forEach((t: DeviceTemplate) => {
        devCat[t.id] = t;
      });

      setRackEntries((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          next[r.id] = {
            rack: r.rack as Rack | null,
            health: r.health as RackState | null,
            catalog: devCat,
            loading: false,
            error: r.error,
          };
        });
        return next;
      });
    } catch {
      setRackEntries((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          next[id] = { rack: null, health: null, catalog: {}, loading: false, error: true };
        });
        return next;
      });
    }
  }, []); // initial load only

  useEffect(() => {
    if (rackIds.length > 0) void loadRackData(rackIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: run once on mount only

  // ── Auto-refresh ──────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    if (refreshing || rackIds.length === 0) return;
    setRefreshing(true);
    try {
      await loadRackData(rackIds);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, rackIds, loadRackData]);

  useEffect(() => {
    const ms = displayConfig.autoRefreshMs;
    if (ms === 0 || rackIds.length === 0) return;
    const timer = setInterval(() => {
      void refresh();
    }, ms);
    return () => clearInterval(timer);
  }, [displayConfig.autoRefreshMs, rackIds.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Display config persistence ────────────────────────────────────────────

  const handleDisplayChange = (cfg: DisplayConfig) => {
    setDisplayConfig(cfg);
    saveDisplay(cfg);
  };

  // ── Rack selection actions ────────────────────────────────────────────────

  const handleSave = () => {
    saveRacks(rackIds);
    setSavedDigest(JSON.stringify(rackIds));
    setEditMode(false);
  };

  const handleAddRack = () => {
    setEditMode(true);
    setPickerOpen(true);
  };

  const toggleRack = (id: string) => {
    setRackIds((prev) => {
      const next = prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id];
      if (!rackEntries[id]) void loadRackData([id]);
      return next;
    });
  };

  const removeRack = (id: string) => {
    setRackIds((prev) => prev.filter((r) => r !== id));
  };

  // ── DnD reorder ──────────────────────────────────────────────────────────

  const handleDragStart = (idx: number) => {
    dragSrcIdx.current = idx;
  };
  const handleDragEnd = () => {
    dragSrcIdx.current = null;
    setDragOverIdx(null);
  };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragSrcIdx.current === null || dragSrcIdx.current === idx) return;
    const next = [...rackIds];
    const [moved] = next.splice(dragSrcIdx.current, 1);
    next.splice(idx, 0, moved);
    setRackIds(next);
    dragSrcIdx.current = null;
    setDragOverIdx(null);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = computeStats(rackIds, rackEntries);

  // ── Wrap card heights ──────────────────────────────────────────────────────

  // scroll: cap at 900px max to avoid oversized racks at 2K+ resolutions
  const scrollCardHeight =
    containerDims.h > 0 ? Math.min(Math.max(200, containerDims.h - 40), 900) : 700;

  // wrap + scroll: each row fills the container height (same visual height as scroll mode)
  const wrapScrollCardHeight =
    containerDims.h > 0 ? Math.min(Math.max(200, containerDims.h - 40), 900) : 480;

  // wrap-auto: all cards sized to fit the container with no scrolling
  const autoCardHeight = useMemo(() => {
    if (displayConfig.layout !== 'wrap-auto' || rackIds.length === 0 || containerDims.w === 0) {
      return 400;
    }
    const gap = 20;
    const padding = 48;
    const usableW = Math.max(1, containerDims.w - padding);
    const usableH = Math.max(1, containerDims.h - padding);
    const cardsPerRow = Math.max(1, Math.floor((usableW + gap) / (displayConfig.rackWidth + gap)));
    const rows = Math.ceil(rackIds.length / cardsPerRow);
    const cardH = Math.floor((usableH - (rows - 1) * gap) / rows);
    return Math.max(160, cardH);
  }, [displayConfig.layout, displayConfig.rackWidth, rackIds.length, containerDims]);

  // ── Shared rack list render ───────────────────────────────────────────────

  const renderRacks = (wrapHeight?: (entry: RackEntry) => number) =>
    rackIds.map((rackId, idx) => {
      const entry = rackEntries[rackId] ?? {
        rack: null,
        health: null,
        catalog: {},
        loading: true,
        error: false,
      };
      return (
        <RackCard
          key={rackId}
          entry={entry}
          rackId={rackId}
          displayConfig={displayConfig}
          wrapHeight={wrapHeight ? wrapHeight(entry) : undefined}
          editMode={editMode}
          isDragging={dragSrcIdx.current === idx}
          isDragOver={dragOverIdx === idx}
          onRemove={() => removeRack(rackId)}
          onDragStart={() => handleDragStart(idx)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={(e) => handleDrop(e, idx)}
        />
      );
    });

  // ── Toolbar actions ──────────────────────────────────────────────────────

  const toolbarActions = (
    <div className="flex shrink-0 items-center gap-2">
      {/* Edit racks hint when not in editMode and has racks */}
      {!editMode && rackIds.length > 0 && (
        <button
          onClick={() => setEditMode(true)}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          title="Enter edit mode to add/remove/reorder racks"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      )}

      <button
        onClick={handleAddRack}
        className="border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add rack
      </button>

      {/* Save — only visible in editMode */}
      {editMode && (
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
            isDirty
              ? 'border-brand-500 bg-brand-500 hover:bg-brand-600 text-white'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
          }`}
        >
          <Save className="h-4 w-4" />
          Save{isDirty ? ' *' : ''}
        </button>
      )}

      <button
        onClick={() => setConfigOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Configure
      </button>

      <RefreshButton
        refreshing={refreshing}
        autoRefreshMs={displayConfig.autoRefreshMs}
        onRefresh={() => {
          void refresh();
        }}
        onIntervalChange={(ms) => handleDisplayChange({ ...displayConfig, autoRefreshMs: ms })}
      />
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Header using PageHeader ── */}
      <PageHeader
        title="Cluster Overview"
        breadcrumb={
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/' },
              { label: 'Monitoring', href: '/views/worldmap' },
              { label: 'Cluster Overview' },
            ]}
          />
        }
        description={
          rackIds.length === 0
            ? 'No racks selected — click "+ Add rack" to get started'
            : `${rackIds.length} rack${rackIds.length !== 1 ? 's' : ''} selected${editMode ? ' — edit mode' : ''}`
        }
        actions={toolbarActions}
      />

      {/* Stats bar */}
      {rackIds.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatChip icon={Server} value={stats.total} label="racks" color="text-gray-500" />
          <StatChip
            icon={LayoutGrid}
            value={stats.deviceCount}
            label="devices"
            color="text-gray-500"
          />
          {stats.ok > 0 && (
            <StatChip icon={CheckCircle} value={stats.ok} label="OK" color="text-green-500" />
          )}
          {stats.warn > 0 && (
            <StatChip icon={AlertTriangle} value={stats.warn} label="WARN" color="text-amber-500" />
          )}
          {stats.crit > 0 && (
            <StatChip icon={XCircle} value={stats.crit} label="CRIT" color="text-red-500" />
          )}
          {stats.unknown > 0 && (
            <StatChip
              icon={HelpCircle}
              value={stats.unknown}
              label="UNKNOWN"
              color="text-gray-400"
            />
          )}
        </div>
      )}

      {/* ── Main rack area ── */}
      <div
        ref={containerRef}
        className="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-[#0a0c10] dark:border-gray-800"
      >
        {rackIds.length === 0 ? (
          /* Empty state */
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-800 bg-gray-900">
              <LayoutGrid className="h-8 w-8 text-gray-700" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-400">No racks configured</p>
              <p className="mt-1 text-sm text-gray-600">
                Add racks to visualize your cluster side-by-side.
              </p>
            </div>
            <button
              onClick={handleAddRack}
              className="bg-brand-500 hover:bg-brand-600 mt-2 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add rack
            </button>
          </div>
        ) : displayConfig.layout === 'scroll' ? (
          /* Scroll — single horizontal row with overlay navigation arrows */
          <div className="relative flex h-full items-center overflow-hidden">
            {/* Left arrow */}
            <button
              onClick={() => scrollBy('left')}
              aria-label="Scroll left"
              className={`absolute left-0 top-0 z-10 flex h-full w-12 items-center justify-center transition-all duration-200 ${
                canScrollLeft
                  ? 'bg-gradient-to-r from-black/50 to-transparent opacity-100 hover:from-black/70 cursor-pointer'
                  : 'pointer-events-none opacity-0'
              }`}
            >
              <ChevronLeft className="h-6 w-6 text-white drop-shadow-lg" />
            </button>

            {/* Rack row — scrolls horizontally, no native scrollbar */}
            <div
              ref={scrollRef}
              onScroll={updateScrollArrows}
              className="flex h-full w-full items-center overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex min-h-0 gap-5 p-5">{renderRacks(() => scrollCardHeight)}</div>
            </div>

            {/* Right arrow */}
            <button
              onClick={() => scrollBy('right')}
              aria-label="Scroll right"
              className={`absolute right-0 top-0 z-10 flex h-full w-12 items-center justify-center transition-all duration-200 ${
                canScrollRight
                  ? 'bg-gradient-to-l from-black/50 to-transparent opacity-100 hover:from-black/70 cursor-pointer'
                  : 'pointer-events-none opacity-0'
              }`}
            >
              <ChevronRight className="h-6 w-6 text-white drop-shadow-lg" />
            </button>
          </div>
        ) : displayConfig.layout === 'wrap' ? (
          /* Wrap + scroll — multi-row, vertical scroll, capped card height */
          <div className="h-full overflow-y-auto">
            <div className="flex flex-wrap content-start gap-5 p-5">
              {renderRacks(() => wrapScrollCardHeight)}
            </div>
          </div>
        ) : (
          /* Wrap autosize — all racks fit in viewport, no scroll */
          <div className="flex h-full flex-wrap content-start gap-5 overflow-hidden p-5">
            {renderRacks(() => autoCardHeight)}
          </div>
        )}
      </div>

      {/* ── Panels ── */}
      <ConfigurePanel
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        displayConfig={displayConfig}
        onChange={handleDisplayChange}
      />

      {pickerOpen && (
        <RackPickerPanel
          aisleGroups={aisleGroups}
          selectedIds={rackIds}
          onToggle={toggleRack}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
};
