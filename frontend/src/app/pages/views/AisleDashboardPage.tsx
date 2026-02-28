import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  RefreshCw,
  SlidersHorizontal,
  X,
  LayoutGrid,
  Thermometer,
  Zap,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Server,
  ChevronDown,
  GripVertical,
  Plus,
  Check,
  Rows3,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Room, Rack, DeviceTemplate, RackState, RackNodeState } from '../../../types';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageBreadcrumb } from '../templates/EmptyPage';
import { RackElevation } from '../../../components/RackVisualizer';

// ── Types ─────────────────────────────────────────────────────────────────────

type AisleEntry = {
  aisleId: string;
  aisleName: string;
  roomId: string;
  roomName: string;
  rackIds: string[];
};

type RackEntry = {
  rack: Rack | null;
  health: RackState | null;
  catalog: Record<string, DeviceTemplate>;
  loading: boolean;
  error: boolean;
};

type AisleConfig = {
  hiddenRacks: string[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const HC: Record<string, string> = {
  OK: '#10b981',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#6b7280',
};

const LS_KEY = (aisleId: string) => `rackscope.aisle-cfg.${aisleId}`;
const CUSTOM_KEY = 'rackscope.custom-dashboard';

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadAisleConfig(aisleId: string): AisleConfig {
  try {
    const raw = localStorage.getItem(LS_KEY(aisleId));
    if (raw) return JSON.parse(raw) as AisleConfig;
  } catch {
    /* ignore */
  }
  return { hiddenRacks: [] };
}

function saveAisleConfig(aisleId: string, cfg: AisleConfig) {
  try {
    localStorage.setItem(LS_KEY(aisleId), JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

function computeStats(entries: RackEntry[], hiddenRacks: string[], allRackIds: string[]) {
  const visibleIds = allRackIds.filter((id) => !hiddenRacks.includes(id));
  const visible = entries.filter((e) => e.rack && visibleIds.includes(e.rack.id));

  let ok = 0;
  let warn = 0;
  let crit = 0;
  let unknown = 0;
  let deviceCount = 0;
  let tempSum = 0;
  let tempCount = 0;
  let powerSum = 0;
  let powerCount = 0;

  for (const e of visible) {
    if (!e.rack) continue;
    deviceCount += e.rack.devices?.length ?? 0;
    const state = e.health?.state ?? 'UNKNOWN';
    if (state === 'OK') ok++;
    else if (state === 'WARN') warn++;
    else if (state === 'CRIT') crit++;
    else unknown++;

    const temp = e.health?.metrics?.temperature;
    if (temp != null && temp > 0) {
      tempSum += temp;
      tempCount++;
    }
    const power = e.health?.metrics?.power;
    if (power != null && power > 0) {
      powerSum += power;
      powerCount++;
    }
  }

  return {
    visibleCount: visible.length,
    deviceCount,
    ok,
    warn,
    crit,
    unknown,
    avgTemp: tempCount > 0 ? tempSum / tempCount : null,
    totalPower: powerCount > 0 ? powerSum : null,
  };
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

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

// ── Rack card skeleton ────────────────────────────────────────────────────────

const RackSkeleton = ({ height }: { height: number }) => (
  <div
    className="flex w-[280px] shrink-0 flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    style={{ minHeight: `${height}px` }}
  >
    <div className="flex-1 animate-pulse rounded-t-xl bg-gray-100 dark:bg-gray-800" />
    <div className="space-y-1.5 border-t border-gray-100 px-3 py-2.5 dark:border-gray-800">
      <div className="h-3.5 w-28 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      <div className="h-2.5 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  </div>
);

// ── Rack error card ───────────────────────────────────────────────────────────

const RackError = ({ rackId, height }: { rackId: string; height: number }) => (
  <div
    className="flex w-[280px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
    style={{ minHeight: `${height}px` }}
  >
    <XCircle className="h-6 w-6 text-red-400" />
    <p className="font-mono text-xs text-red-500">{rackId}</p>
    <p className="text-xs text-red-400">Failed to load</p>
  </div>
);

// ── Rack card ─────────────────────────────────────────────────────────────────

const RACK_W = 360;

const RackCard = ({
  entry,
  rackId,
  // Custom mode props
  customMode = false,
  isDragging = false,
  isDragOver = false,
  onRemove,
  onDragStart,
  onDragEnd,
  onDragOver: onDragOverCard,
  onDrop,
}: {
  entry: RackEntry;
  rackId: string;
  customMode?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onRemove?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) => {
  if (entry.loading) return <RackSkeleton height={280} />;
  if (entry.error || !entry.rack) return <RackError rackId={rackId} height={280} />;

  const { rack, health, catalog } = entry;
  const state = health?.state ?? 'UNKNOWN';
  const stateColor = HC[state] ?? HC.UNKNOWN;
  const nodes = (health?.nodes ?? {}) as Record<string, RackNodeState>;
  const pduMetrics = health?.infra_metrics?.pdu;

  const deviceCount = rack.devices?.length ?? 0;
  const temp = health?.metrics?.temperature;
  const power = health?.metrics?.power;

  return (
    <div
      draggable={customMode}
      onDragStart={customMode ? onDragStart : undefined}
      onDragEnd={customMode ? onDragEnd : undefined}
      onDragOver={customMode ? onDragOverCard : undefined}
      onDrop={customMode ? onDrop : undefined}
      className={[
        `group flex h-full shrink-0 flex-col rounded-xl border bg-white transition-all dark:bg-gray-900`,
        `w-[${RACK_W}px]`,
        customMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        isDragging ? 'opacity-40' : '',
        isDragOver
          ? 'border-brand-400 ring-brand-400/40 ring-2'
          : 'border-gray-200 dark:border-gray-800',
        !isDragOver && !isDragging
          ? 'hover:border-gray-300 hover:shadow-md dark:hover:border-gray-700'
          : '',
      ].join(' ')}
      style={{ width: RACK_W }}
      onClick={
        customMode
          ? undefined
          : () => {
              window.location.href = `/views/rack/${rack.id}`;
            }
      }
      role={customMode ? undefined : 'button'}
      tabIndex={customMode ? undefined : 0}
      onKeyDown={
        customMode
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ')
                window.location.href = `/views/rack/${rack.id}`;
            }
      }
    >
      {/* Health strip */}
      <div className="h-0.5 w-full rounded-t-xl" style={{ backgroundColor: stateColor }} />

      {/* Rack elevation — fills available height (flex-1), tooltip enabled */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#0f1117]">
        {/* Custom mode overlay — drag handle + remove */}
        {customMode && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-between p-1.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-black/50 text-white">
              <GripVertical className="h-3.5 w-3.5" />
            </div>
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="flex h-6 w-6 items-center justify-center rounded bg-red-500/80 text-white transition-colors hover:bg-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
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
          maxUPx={32}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-3 py-2.5 dark:border-gray-800">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
              {rack.name || rack.id}
            </p>
            <p className="font-mono text-[10px] text-gray-400 dark:text-gray-600">{rack.id}</p>
          </div>
          <span
            className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wide uppercase"
            style={{ backgroundColor: `${stateColor}20`, color: stateColor }}
          >
            {state}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <Server className="h-3 w-3" />
            {deviceCount} device{deviceCount !== 1 ? 's' : ''}
          </span>
          {temp != null && temp > 0 && (
            <span className="flex items-center gap-1">
              <Thermometer className="h-3 w-3 text-amber-400" />
              {temp.toFixed(1)}°C
            </span>
          )}
          {power != null && power > 0 && (
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-sky-400" />
              {power >= 1000 ? `${(power / 1000).toFixed(1)} kW` : `${Math.round(power)} W`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Config panel ──────────────────────────────────────────────────────────────

const ConfigPanel = ({
  open,
  onClose,
  aisleId,
  allRackIds,
  rackEntries,
  cfg,
  setCfg,
}: {
  open: boolean;
  onClose: () => void;
  aisleId: string | null;
  allRackIds: string[];
  rackEntries: Record<string, RackEntry>;
  cfg: AisleConfig;
  setCfg: (c: AisleConfig) => void;
}) => {
  const toggleRack = (rackId: string) => {
    const next = cfg.hiddenRacks.includes(rackId)
      ? { hiddenRacks: cfg.hiddenRacks.filter((id) => id !== rackId) }
      : { hiddenRacks: [...cfg.hiddenRacks, rackId] };
    setCfg(next);
    if (aisleId) saveAisleConfig(aisleId, next);
  };

  const showAll = () => {
    const next: AisleConfig = { hiddenRacks: [] };
    setCfg(next);
    if (aisleId) saveAisleConfig(aisleId, next);
  };

  const hideAll = () => {
    const next: AisleConfig = { hiddenRacks: [...allRackIds] };
    setCfg(next);
    if (aisleId) saveAisleConfig(aisleId, next);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-40 flex h-full w-80 flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 dark:border-gray-800 dark:bg-gray-950 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-500" />
            <span className="font-semibold text-gray-800 dark:text-white">Configure view</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {aisleId && allRackIds.length > 0 ? (
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Visible racks
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={showAll}
                    className="rounded px-2 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    Show all
                  </button>
                  <span className="text-gray-300 dark:text-gray-700">·</span>
                  <button
                    onClick={hideAll}
                    className="rounded px-2 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    Hide all
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                {allRackIds.map((rackId) => {
                  const entry = rackEntries[rackId];
                  const rack = entry?.rack;
                  const isVisible = !cfg.hiddenRacks.includes(rackId);
                  const deviceCount = rack?.devices?.length ?? 0;

                  return (
                    <div
                      key={rackId}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                          {rack?.name ?? rackId}
                        </p>
                        <p className="flex items-center gap-1 font-mono text-[10px] text-gray-400">
                          {rackId}
                          {deviceCount > 0 && (
                            <span className="rounded bg-gray-100 px-1 dark:bg-gray-800">
                              {deviceCount}d
                            </span>
                          )}
                        </p>
                      </div>
                      {/* Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleRack(rackId)}
                        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                          isVisible ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            isVisible ? 'left-0.5 translate-x-4' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <LayoutGrid className="h-8 w-8 text-gray-300 dark:text-gray-700" />
              <p className="text-sm text-gray-400">Select an aisle to configure visibility</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ── Aisle selector ────────────────────────────────────────────────────────────

const AisleSelector = ({
  aisleList,
  selectedId,
  onSelect,
}: {
  aisleList: AisleEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const selected = aisleList.find((a) => a.aisleId === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="dark:hover:bg-gray-750 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        <LayoutGrid className="h-4 w-4 shrink-0 text-gray-400" />
        {selected ? (
          <span className="max-w-[220px] truncate">
            <span className="text-gray-400">{selected.roomName} › </span>
            <span className="font-medium">{selected.aisleName}</span>
          </span>
        ) : (
          <span className="text-gray-400">Select aisle…</span>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-30 mt-1 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="max-h-72 overflow-y-auto py-1">
              {aisleList.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">No aisles found</p>
              ) : (
                aisleList.map((a) => (
                  <button
                    key={a.aisleId}
                    onClick={() => {
                      onSelect(a.aisleId);
                      setOpen(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
                      a.aisleId === selectedId
                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="text-xs text-gray-400">{a.roomName} › </span>
                    <span className="font-medium">{a.aisleName}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center gap-4 py-24">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <LayoutGrid className="h-8 w-8 text-gray-300 dark:text-gray-700" />
    </div>
    <div className="text-center">
      <p className="font-semibold text-gray-700 dark:text-gray-300">No aisle selected</p>
      <p className="mt-1 text-sm text-gray-400">
        Use the dropdown above to select an aisle and visualize its racks side by side.
      </p>
    </div>
  </div>
);

// ── RackPickerPanel ────────────────────────────────────────────────────────────

const RackPickerPanel = ({
  aisleList,
  allRacks, // all rooms with their aisle/rack hierarchy
  selectedIds,
  onToggle,
  onClose,
}: {
  aisleList: AisleEntry[];
  allRacks: Record<string, { name: string; roomName: string; aisleName: string }>;
  selectedIds: string[];
  onToggle: (rackId: string) => void;
  onClose: () => void;
}) => {
  const [search, setSearch] = useState('');

  const grouped = aisleList
    .map((aisle) => ({
      label: `${aisle.roomName} › ${aisle.aisleName}`,
      racks: aisle.rackIds
        .filter((id) => {
          if (!search.trim()) return true;
          const r = allRacks[id];
          return (
            (r?.name ?? id).toLowerCase().includes(search.toLowerCase()) ||
            id.toLowerCase().includes(search.toLowerCase())
          );
        })
        .map((id) => ({ id, name: allRacks[id]?.name ?? id })),
    }))
    .filter((g) => g.racks.length > 0);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 flex h-full w-[340px] flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Select racks</p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-600">
              {selectedIds.length} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="shrink-0 p-3">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search racks…"
            className="focus:border-brand-500 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm placeholder-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-600"
          />
        </div>

        {/* Rack list */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {grouped.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No racks found</p>
          ) : (
            <div className="space-y-3">
              {grouped.map((group) => (
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

// ── Main page ─────────────────────────────────────────────────────────────────

export const AisleDashboardPage = () => {
  usePageTitle('Cluster Dashboard');

  const [searchParams, setSearchParams] = useSearchParams();
  const [aisleList, setAisleList] = useState<AisleEntry[]>([]);
  const [selectedAisleId, setSelectedAisleId] = useState<string | null>(
    searchParams.get('aisleId')
  );
  const [rackEntries, setRackEntries] = useState<Record<string, RackEntry>>({});
  const [allRackIds, setAllRackIds] = useState<string[]>([]);
  const [cfg, setCfg] = useState<AisleConfig>({ hiddenRacks: [] });
  const [configPanelOpen, setConfigPanelOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // ── Custom view mode ────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'aisle' | 'custom'>('aisle');
  const [customRackIds, setCustomRackIds] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem(CUSTOM_KEY);
      return s ? (JSON.parse(s) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [rackPickerOpen, setRackPickerOpen] = useState(false);
  // DnD for custom reordering
  const dragSrcIdx = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // All rack meta (id → name/room/aisle) for picker
  const [allRackMeta, setAllRackMeta] = useState<
    Record<string, { name: string; roomName: string; aisleName: string }>
  >({});

  const saveCustomRacks = (ids: string[]) => {
    setCustomRackIds(ids);
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(ids));
    } catch {
      /* noop */
    }
  };

  const handleCustomDragStart = (idx: number) => {
    dragSrcIdx.current = idx;
  };
  const handleCustomDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleCustomDragEnd = () => {
    dragSrcIdx.current = null;
    setDragOverIdx(null);
  };
  const handleCustomDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragSrcIdx.current === null || dragSrcIdx.current === idx) return;
    const next = [...customRackIds];
    const [moved] = next.splice(dragSrcIdx.current, 1);
    next.splice(idx, 0, moved);
    saveCustomRacks(next);
    dragSrcIdx.current = null;
    setDragOverIdx(null);
  };

  const toggleCustomRack = (rackId: string) => {
    const ids = customRackIds.includes(rackId)
      ? customRackIds.filter((id) => id !== rackId)
      : [...customRackIds, rackId];
    saveCustomRacks(ids);
  };

  // Load rooms + build aisle list + rack meta on mount
  useEffect(() => {
    api
      .getRooms()
      .then((rooms: Room[]) => {
        const list: AisleEntry[] = [];
        const meta: Record<string, { name: string; roomName: string; aisleName: string }> = {};
        for (const room of rooms) {
          for (const aisle of room.aisles ?? []) {
            list.push({
              aisleId: aisle.id,
              aisleName: aisle.name,
              roomId: room.id,
              roomName: room.name,
              rackIds: aisle.racks.map((r) => r.id),
            });
            for (const rack of aisle.racks ?? []) {
              meta[rack.id] = {
                name: rack.name || rack.id,
                roomName: room.name,
                aisleName: aisle.name,
              };
            }
          }
        }
        setAisleList(list);
        setAllRackMeta(meta);
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => setLoadingRooms(false));
  }, []);

  // Load rack data when selected aisle changes
  const loadAisle = useCallback(
    async (aisleId: string) => {
      const entry = aisleList.find((a) => a.aisleId === aisleId);
      if (!entry) return;

      const ids = entry.rackIds;
      setAllRackIds(ids);

      // Initialize loading state for all racks
      setRackEntries(
        ids.reduce<Record<string, RackEntry>>((acc, id) => {
          acc[id] = { rack: null, health: null, catalog: {}, loading: true, error: false };
          return acc;
        }, {})
      );

      // Load catalog once, then all racks in parallel
      try {
        const [catalogData, ...rackResults] = await Promise.all([
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

        const next: Record<string, RackEntry> = {};
        for (const r of rackResults) {
          next[r.id] = {
            rack: r.rack as Rack | null,
            health: r.health as RackState | null,
            catalog: devCat,
            loading: false,
            error: r.error,
          };
        }
        setRackEntries(next);
      } catch {
        setRackEntries(
          ids.reduce<Record<string, RackEntry>>((acc, id) => {
            acc[id] = { rack: null, health: null, catalog: {}, loading: false, error: true };
            return acc;
          }, {})
        );
      }
    },
    [aisleList]
  );

  useEffect(() => {
    if (!selectedAisleId || aisleList.length === 0) return;
    const saved = loadAisleConfig(selectedAisleId);
    setCfg(saved);
    void loadAisle(selectedAisleId);
  }, [selectedAisleId, aisleList, loadAisle]);

  const handleAisleSelect = (id: string) => {
    setSelectedAisleId(id);
    setSearchParams({ aisleId: id }, { replace: true });
  };

  const handleRefresh = async () => {
    if (!selectedAisleId || refreshing) return;
    setRefreshing(true);
    try {
      await loadAisle(selectedAisleId);
    } finally {
      setRefreshing(false);
    }
  };

  // Load custom rack data when custom mode rack ids change
  const loadCustomRacks = useCallback(
    async (ids: string[]) => {
      const missing = ids.filter((id) => !rackEntries[id] || rackEntries[id].error);
      if (missing.length === 0) return;
      setRackEntries((prev) => {
        const next = { ...prev };
        missing.forEach((id) => {
          next[id] = { rack: null, health: null, catalog: {}, loading: true, error: false };
        });
        return next;
      });
      try {
        const [catalogData, ...results] = await Promise.all([
          api.getCatalog(),
          ...missing.map((id) =>
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
        /* noop */
      }
    },
    [rackEntries]
  );

  useEffect(() => {
    if (viewMode === 'custom' && customRackIds.length > 0) {
      void loadCustomRacks(customRackIds);
    }
  }, [viewMode, customRackIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedAisle = aisleList.find((a) => a.aisleId === selectedAisleId);
  const visibleRackIds = allRackIds.filter((id) => !cfg.hiddenRacks.includes(id));
  // Stats work for both modes
  const stats = computeStats(
    Object.values(rackEntries),
    viewMode === 'custom' ? [] : cfg.hiddenRacks,
    viewMode === 'custom' ? customRackIds : allRackIds
  );

  const anyLoading = Object.values(rackEntries).some((e) => e.loading);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Header ── */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-950">
        <PageBreadcrumb
          items={[
            { label: 'Home', href: '/cosmos' },
            { label: 'Infrastructure', href: '/views/worldmap' },
            { label: 'Cluster Dashboard' },
          ]}
        />
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Cluster Dashboard</h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {viewMode === 'custom'
                ? `${customRackIds.length} rack${customRackIds.length !== 1 ? 's' : ''} selected`
                : selectedAisle
                  ? `${selectedAisle.roomName} › ${selectedAisle.aisleName} · ${allRackIds.length} rack${allRackIds.length !== 1 ? 's' : ''}`
                  : 'Select an aisle or switch to custom mode'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Mode toggle */}
            <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-800">
              <button
                onClick={() => setViewMode('aisle')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'aisle'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Rows3 className="h-3.5 w-3.5" /> Aisle
              </button>
              <button
                onClick={() => setViewMode('custom')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'custom'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Custom
              </button>
            </div>

            {viewMode === 'aisle' && !loadingRooms && (
              <AisleSelector
                aisleList={aisleList}
                selectedId={selectedAisleId}
                onSelect={handleAisleSelect}
              />
            )}

            {viewMode === 'custom' && (
              <button
                onClick={() => setRackPickerOpen(true)}
                className="border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors"
              >
                <Plus className="h-4 w-4" /> Add racks
              </button>
            )}

            <button
              onClick={() => {
                void handleRefresh();
              }}
              disabled={refreshing || (viewMode === 'aisle' && !selectedAisleId)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {viewMode === 'aisle' && (
              <button
                onClick={() => setConfigPanelOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <SlidersHorizontal className="h-4 w-4" /> Configure
              </button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        {(viewMode === 'custom'
          ? customRackIds.length > 0
          : selectedAisleId && (allRackIds.length > 0 || anyLoading)) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatChip
              icon={Server}
              value={stats.visibleCount}
              label="racks"
              color="text-gray-500"
            />
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
              <StatChip
                icon={AlertTriangle}
                value={stats.warn}
                label="WARN"
                color="text-amber-500"
              />
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
            {stats.avgTemp != null && (
              <StatChip
                icon={Thermometer}
                value={`${stats.avgTemp.toFixed(1)}°C`}
                label="avg"
                color="text-amber-400"
              />
            )}
            {stats.totalPower != null && (
              <StatChip
                icon={Zap}
                value={
                  stats.totalPower >= 1000
                    ? `${(stats.totalPower / 1000).toFixed(1)} kW`
                    : `${Math.round(stats.totalPower)} W`
                }
                label="total"
                color="text-sky-400"
              />
            )}
          </div>
        )}
      </div>

      {/* ── Main rack grid ── */}
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        {viewMode === 'custom' ? (
          /* ── Custom mode ── */
          customRackIds.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#0a0c10]">
              <LayoutGrid className="h-10 w-10 text-gray-700" />
              <div className="text-center">
                <p className="font-semibold text-gray-400">No racks selected</p>
                <p className="mt-1 text-sm text-gray-600">
                  Click "Add racks" to pick racks from anywhere in your topology
                </p>
              </div>
              <button
                onClick={() => setRackPickerOpen(true)}
                className="bg-brand-500 hover:bg-brand-600 mt-2 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" /> Add racks
              </button>
            </div>
          ) : (
            <div className="flex h-full bg-[#0a0c10] p-6">
              <div className="flex h-full min-h-0 gap-5">
                {customRackIds.map((rackId, idx) => {
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
                      customMode
                      isDragging={dragSrcIdx.current === idx}
                      isDragOver={dragOverIdx === idx}
                      onRemove={() => saveCustomRacks(customRackIds.filter((id) => id !== rackId))}
                      onDragStart={() => handleCustomDragStart(idx)}
                      onDragEnd={handleCustomDragEnd}
                      onDragOver={(e) => handleCustomDragOver(e, idx)}
                      onDrop={(e) => handleCustomDrop(e, idx)}
                    />
                  );
                })}
              </div>
            </div>
          )
        ) : /* ── Aisle mode ── */
        !selectedAisleId ? (
          <EmptyState />
        ) : (
          <div className="flex h-full bg-[#0a0c10] p-6">
            <div className="flex h-full min-h-0 gap-5">
              {allRackIds.length === 0 ? (
                <div className="flex w-full items-center justify-center">
                  <p className="text-sm text-gray-600">This aisle has no racks configured.</p>
                </div>
              ) : (
                visibleRackIds.map((rackId) => {
                  const entry = rackEntries[rackId];
                  if (!entry) return null;
                  return <RackCard key={rackId} entry={entry} rackId={rackId} />;
                })
              )}
              {visibleRackIds.length === 0 && allRackIds.length > 0 && (
                <div className="flex w-full items-center justify-center">
                  <p className="text-sm text-gray-600">
                    All racks are hidden. Use Configure to show them.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Config panel (aisle mode) ── */}
      <ConfigPanel
        open={configPanelOpen}
        onClose={() => setConfigPanelOpen(false)}
        aisleId={selectedAisleId}
        allRackIds={allRackIds}
        rackEntries={rackEntries}
        cfg={cfg}
        setCfg={setCfg}
      />

      {/* ── Rack picker panel (custom mode) ── */}
      {rackPickerOpen && (
        <RackPickerPanel
          aisleList={aisleList}
          allRacks={allRackMeta}
          selectedIds={customRackIds}
          onToggle={toggleCustomRack}
          onClose={() => setRackPickerOpen(false)}
        />
      )}
    </div>
  );
};
