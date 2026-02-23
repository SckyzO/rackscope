import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Settings2,
  X,
  Search,
  ChevronRight,
  Server,
  AlertTriangle,
  XCircle,
  CheckCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Grid3X3,
  Compass,
  DoorOpen,
  Ruler,
  SortAsc,
  Tag,
  ListFilter,
  ChevronDown,
  Minus,
  Plus,
  Maximize2,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Room, Aisle, Rack, RoomState, RackState, DeviceTemplate } from '../../../types';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { PageBreadcrumb } from '../templates/EmptyPage';
import { RackElevation } from '../../../components/RackVisualizer';

// ── Health ─────────────────────────────────────────────────────────────────

const HC: Record<string, string> = {
  OK: '#10b981',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#6b7280',
};

const HEALTH_PILL: Record<string, string> = {
  OK: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CRIT: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  UNKNOWN: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

// ── Door marker ─────────────────────────────────────────────────────────────

interface DoorMarkerProps {
  side: string;
  position: number;
  w: number;
  h: number;
  showLabel: boolean;
  doorLabel?: string | null;
}

const PADDING = 24;

const DoorMarker = ({ side, position, w, h, showLabel, doorLabel }: DoorMarkerProps) => {
  const iW = w - PADDING * 2;
  const iH = h - PADDING * 2;
  const label = doorLabel ?? 'Door';

  // Strip: 6px thick, 72px long, 12px from the canvas edge (center of outer padding gap)
  const THICK = 6;
  const LEN = 72;
  const MARGIN = 12;

  let stripStyle: React.CSSProperties = {};
  let labelClass = '';

  if (side === 'west' || side === 'left') {
    const cy = PADDING + iH * position;
    stripStyle = { left: MARGIN, top: cy - LEN / 2, width: THICK, height: LEN };
    labelClass = 'top-1/2 left-5 -translate-y-1/2';
  } else if (side === 'east' || side === 'right') {
    const cy = PADDING + iH * position;
    stripStyle = { right: MARGIN, top: cy - LEN / 2, width: THICK, height: LEN };
    labelClass = 'top-1/2 right-5 -translate-y-1/2';
  } else if (side === 'south' || side === 'bottom') {
    const cx = PADDING + iW * position;
    stripStyle = { bottom: MARGIN, left: cx - LEN / 2, height: THICK, width: LEN };
    labelClass = '-bottom-8 left-1/2 -translate-x-1/2';
  } else {
    // north / top
    const cx = PADDING + iW * position;
    stripStyle = { top: MARGIN, left: cx - LEN / 2, height: THICK, width: LEN };
    labelClass = '-top-8 left-1/2 -translate-x-1/2';
  }

  return (
    <div
      className="group bg-brand-500/70 absolute z-30 cursor-default rounded-full"
      style={{ ...stripStyle, boxShadow: '0 0 18px rgba(70,95,255,0.5)' }}
      title={label}
    >
      {showLabel && (
        <span
          className={`pointer-events-none absolute rounded-md border border-white/10 bg-black/80 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.18em] whitespace-nowrap text-gray-100 uppercase opacity-0 shadow-[0_8px_20px_rgba(0,0,0,0.4)] transition-opacity group-hover:opacity-100 ${labelClass}`}
        >
          {label}
        </span>
      )}
    </div>
  );
};

// ── Rack cell ─────────────────────────────────────────────────────────────────

interface RackCellProps {
  rack: Rack;
  state: string;
  isSelected: boolean;
  isHighlighted: boolean | null;
  showLabel: boolean;
  searchMatch: boolean;
  onClick: () => void;
}

const RackCell = ({
  rack,
  state,
  isSelected,
  isHighlighted,
  showLabel,
  searchMatch,
  onClick,
}: RackCellProps) => {
  const color = HC[state] ?? HC.UNKNOWN;
  const dimmed = isHighlighted === false;
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
      }
      setShowTooltip(true);
    }, 1000);
  };
  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowTooltip(false);
  };

  const deviceCount = rack.devices?.length ?? 0;
  const occupancy = Math.min(100, (deviceCount / (rack.u_height / 2)) * 100);

  const tooltip = showTooltip
    ? createPortal(
        <div
          className="pointer-events-none fixed z-[9999] min-w-[240px] overflow-hidden rounded-xl bg-gray-900 shadow-[0_8px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/10 dark:bg-gray-800"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y - 8,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {/* Colored header */}
          <div
            className="px-3.5 pt-3 pb-2.5"
            style={{
              background: `linear-gradient(135deg, ${color}22 0%, transparent 80%)`,
              borderBottom: `1px solid ${color}25`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-tight font-bold text-white">{rack.name}</p>
              <span
                className="mt-0.5 shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide uppercase"
                style={{ backgroundColor: `${color}30`, color }}
              >
                {state}
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] text-gray-500">{rack.id}</p>
          </div>

          {/* Stats */}
          <div className="space-y-2.5 px-3.5 py-3">
            {/* Occupancy bar */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs text-gray-400">Occupancy</span>
                <span className="font-mono text-xs text-gray-300">
                  {deviceCount} device{deviceCount !== 1 ? 's' : ''} / {rack.u_height}U
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${occupancy}%`, backgroundColor: color }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-gray-700/50 pt-2.5">
              <span className="text-xs text-gray-400">Height</span>
              <span className="text-right font-mono text-xs text-gray-200">{rack.u_height}U</span>
              {deviceCount > 0 && (
                <>
                  <span className="text-xs text-gray-400">Devices</span>
                  <span className="text-right text-xs font-semibold text-gray-200">
                    {deviceCount}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[6px] border-t-[6px] border-x-transparent border-t-gray-900 dark:border-t-gray-800" />
        </div>,
        document.body
      )
    : null;

  return (
    <div
      ref={wrapperRef}
      className="relative flex flex-col items-center gap-1.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Rack body */}
      <button
        onClick={onClick}
        className={`relative h-24 w-20 rounded border-2 transition-all ${
          isSelected ? 'ring-brand-500 ring-2 ring-offset-1 dark:ring-offset-gray-900' : ''
        } ${searchMatch ? 'ring-2 ring-yellow-400 ring-offset-1' : ''} ${
          dimmed ? 'opacity-25' : ''
        }`}
        style={{ backgroundColor: `${color}18`, borderColor: color }}
      >
        {/* Fill bar */}
        <div
          className="absolute right-0 bottom-0 left-0 rounded-sm"
          style={{ backgroundColor: color, height: `${occupancy}%`, opacity: 0.3 }}
        />
        {/* State dot */}
        <div
          className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      </button>

      {/* Rack name — 2 lines max, consistent min-height for grid alignment */}
      <p
        className="w-20 text-center text-[11px] leading-tight text-gray-700 dark:text-gray-300"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          wordBreak: 'break-word',
          minHeight: '2.4em',
        }}
      >
        {rack.name}
      </p>

      {/* Short ID label — badge style */}
      {showLabel && (
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-mono text-[9px] text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          {rack.id}
        </span>
      )}

      {tooltip}
    </div>
  );
};

// ── Aisle band ────────────────────────────────────────────────────────────────

interface AisleBandProps {
  aisle: Aisle;
  rackStates: Record<string, string>;
  selectedRackId: string | null;
  highlight: string | null;
  showRackLabels: boolean;
  searchQuery: string;
  onRackClick: (rack: Rack, aisle: Aisle) => void;
  onBadgeClick: (state: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  rackAlign: 'left' | 'right';
}

const AisleBand = ({
  aisle,
  rackStates,
  selectedRackId,
  highlight,
  showRackLabels,
  searchQuery,
  onRackClick,
  onBadgeClick,
  collapsed,
  onToggleCollapse,
  rackAlign,
}: AisleBandProps) => {
  const critCount = aisle.racks.filter((r) => rackStates[r.id] === 'CRIT').length;
  const warnCount = aisle.racks.filter((r) => rackStates[r.id] === 'WARN').length;
  const allOk = critCount === 0 && warnCount === 0;

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/30">
      <div className={`flex items-center justify-between ${collapsed ? '' : 'mb-3'}`}>
        <button
          onClick={onToggleCollapse}
          className="hover:text-brand-500 dark:hover:text-brand-400 flex items-center gap-1.5 text-left transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          )}
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {aisle.name}
          </span>
          <span className="text-[10px] text-gray-400">({aisle.racks.length})</span>
        </button>
        <div className="flex items-center gap-1.5">
          {critCount > 0 && (
            <button
              onClick={() => onBadgeClick('CRIT')}
              className="flex cursor-pointer items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 transition-colors hover:bg-red-200 dark:bg-red-500/15 dark:text-red-400"
            >
              <XCircle className="h-2.5 w-2.5" />
              {critCount} CRIT
            </button>
          )}
          {warnCount > 0 && (
            <button
              onClick={() => onBadgeClick('WARN')}
              className="flex cursor-pointer items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600 transition-colors hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-400"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              {warnCount} WARN
            </button>
          )}
          {allOk && (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-600 dark:bg-green-500/15 dark:text-green-400">
              <CheckCircle className="h-2.5 w-2.5" /> OK
            </span>
          )}
          <span className="text-[10px] text-gray-400">{aisle.racks.length} racks</span>
        </div>
      </div>

      {!collapsed && (
        <div
          className={`mt-3 flex flex-wrap gap-3 ${rackAlign === 'right' ? 'justify-end' : 'justify-start'}`}
        >
          {aisle.racks.map((rack) => {
            const state = rackStates[rack.id] ?? 'UNKNOWN';
            const isHighlighted = highlight ? state === highlight : null;
            const searchMatch =
              searchQuery.length > 1 &&
              (rack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                rack.id.toLowerCase().includes(searchQuery.toLowerCase()));
            return (
              <RackCell
                key={rack.id}
                rack={rack}
                state={state}
                isSelected={selectedRackId === rack.id}
                isHighlighted={isHighlighted}
                showLabel={showRackLabels}
                searchMatch={searchMatch}
                onClick={() => onRackClick(rack, aisle)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Rack drawer ───────────────────────────────────────────────────────────────

interface DrawerRack {
  rack: Rack;
  aisle: Aisle;
  state: string;
}

const RackDrawer = ({
  selected,
  onClose,
  navigate,
}: {
  selected: DrawerRack | null;
  onClose: () => void;
  navigate: (path: string) => void;
}) => {
  const [visible, setVisible] = useState(false);
  const [isRearView, setIsRearView] = useState(false);
  const [catalog, setCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [health, setHealth] = useState<RackState | null>(null);
  // Start as loading=true — component is remounted (via key) when rack changes,
  // so synchronous state resets are not needed.
  const [loadingRack, setLoadingRack] = useState(true);

  useEffect(() => {
    if (!selected) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => {
      cancelAnimationFrame(raf);
      setVisible(false);
    };
  }, [selected]);

  const rackId = selected?.rack.id;
  useEffect(() => {
    if (!rackId) return;
    let cancelled = false;
    Promise.all([api.getCatalog(), api.getRackState(rackId, true)])
      .then(([catalogData, rackState]) => {
        if (cancelled) return;
        const devCat: Record<string, DeviceTemplate> = {};
        (catalogData?.device_templates ?? []).forEach((t: DeviceTemplate) => {
          devCat[t.id] = t;
        });
        setCatalog(devCat);
        setHealth(rackState);
        setLoadingRack(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingRack(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rackId]);

  const [alertsOpen, setAlertsOpen] = useState(false);

  if (!selected) return null;
  const { rack, aisle, state } = selected;
  const color = HC[state] ?? HC.UNKNOWN;
  const StateIcon = state === 'CRIT' ? XCircle : state === 'WARN' ? AlertTriangle : CheckCircle;

  // Collect CRIT / WARN nodes
  const critNodes: string[] = [];
  const warnNodes: string[] = [];
  if (health?.nodes) {
    for (const [nodeId, nodeState] of Object.entries(health.nodes)) {
      if (nodeState.state === 'CRIT') critNodes.push(nodeId);
      else if (nodeState.state === 'WARN') warnNodes.push(nodeId);
    }
  }
  const alertCount = critNodes.length + warnNodes.length;
  const alertColor = critNodes.length > 0 ? '#ef4444' : warnNodes.length > 0 ? '#f59e0b' : null;

  return (
    <>
      <div className="fixed inset-0 z-[9990]" onClick={onClose} />
      {/* Outer — animates its width when alerts panel opens */}
      <div
        className={`fixed top-[72px] right-0 z-[9991] flex h-[calc(100vh-72px)] flex-row overflow-hidden border-l border-gray-200 bg-white shadow-2xl transition-all duration-300 ease-out dark:border-gray-800 dark:bg-gray-900 ${visible ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: alertsOpen ? 720 : 380 }}
      >
        {/* ── Left panel — rack info + elevation ────────────────────────── */}
        <div className="flex h-full w-[380px] shrink-0 flex-col">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-gray-900 dark:text-white">{rack.name}</h3>
              <p className="truncate text-xs text-gray-400">
                {aisle.name} · {rack.id}
              </p>
            </div>
            <div className="ml-2 flex shrink-0 items-center gap-1.5">
              <span
                className={`rounded-lg px-2 py-0.5 text-xs font-bold ${HEALTH_PILL[state] ?? HEALTH_PILL.UNKNOWN}`}
              >
                {state}
              </span>

              {/* Alert bell — pulses when alerts exist, highlights when panel open */}
              {alertCount > 0 && alertColor && (
                <button
                  onClick={() => setAlertsOpen((o) => !o)}
                  title={`${alertCount} alert${alertCount > 1 ? 's' : ''}`}
                  className={`relative rounded-lg p-1.5 transition-colors ${
                    alertsOpen ? 'bg-opacity-20' : 'hover:bg-gray-100 dark:hover:bg-white/5'
                  }`}
                  style={alertsOpen ? { backgroundColor: `${alertColor}25` } : {}}
                >
                  <AlertTriangle className="h-4 w-4" style={{ color: alertColor }} />
                  {/* Pulsing dot — hidden when panel is open */}
                  {!alertsOpen && (
                    <span
                      className="absolute top-0.5 right-0.5 h-2 w-2 animate-pulse rounded-full"
                      style={{ backgroundColor: alertColor }}
                    />
                  )}
                  {/* Count badge */}
                  <span
                    className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                    style={{ backgroundColor: alertColor }}
                  >
                    {alertCount}
                  </span>
                </button>
              )}

              <button
                onClick={onClose}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="shrink-0 divide-y divide-gray-100 border-b border-gray-100 dark:divide-gray-800 dark:border-gray-800">
            {[
              { icon: Ruler, label: 'Height', value: `${rack.u_height}U` },
              { icon: Server, label: 'Devices', value: rack.devices?.length ?? 0 },
              { icon: StateIcon, label: 'Health', value: state, style: { color } },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <s.icon className="h-3.5 w-3.5 shrink-0" style={s.style ?? {}} />
                  {s.label}
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {s.value}
                </span>
              </div>
            ))}
          </div>

          {/* Rack elevation — takes all remaining height */}
          <div className="flex min-h-0 flex-1 flex-col">
            {/* Toggle bar */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-800">
              <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                Rack View
              </p>
              <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                {(['FRONT', 'REAR'] as const).map((side) => (
                  <button
                    key={side}
                    onClick={() => setIsRearView(side === 'REAR')}
                    className={`px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                      (side === 'REAR') === isRearView
                        ? 'bg-brand-500 text-white'
                        : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5'
                    }`}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>

            {/* Elevation viewport — RackElevation is %-based so it fills the flex-1 container */}
            <div className="min-h-0 flex-1">
              {loadingRack ? (
                <div className="flex h-full items-center justify-center">
                  <div className="border-t-brand-500 h-6 w-6 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
                </div>
              ) : (
                <div className="h-full">
                  <RackElevation
                    rack={rack}
                    catalog={catalog}
                    health={health?.state ?? state}
                    nodesData={health?.nodes}
                    isRearView={isRearView}
                    infraComponents={[]}
                    sideComponents={[]}
                    allowInfraOverlap={isRearView}
                    pduMetrics={health?.infra_metrics?.pdu}
                    onDeviceClick={() => {}}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-gray-100 p-3 dark:border-gray-800">
            <button
              onClick={() => navigate(`/cosmos/views/rack/${rack.id}`)}
              className="bg-brand-500 hover:bg-brand-600 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Open Rack <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Right panel — alerts (slides in) ──────────────────────────── */}
        <div
          className={`flex flex-col overflow-hidden border-l border-gray-200 transition-all duration-300 ease-out dark:border-gray-700 ${alertsOpen ? 'w-[340px]' : 'w-0'}`}
        >
          {/* Fixed inner — 340px wide so content doesn't reflow during animation */}
          <div className="flex h-full w-[340px] flex-col bg-white dark:bg-gray-900">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" style={{ color: alertColor ?? '#6b7280' }} />
                <span className="font-semibold text-gray-900 dark:text-white">
                  Alerts
                  <span className="ml-1.5 text-sm font-normal text-gray-400">({alertCount})</span>
                </span>
              </div>
              <button
                onClick={() => setAlertsOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-4">
              {critNodes.length > 0 && (
                <>
                  <p className="mb-2 text-[10px] font-semibold tracking-wider text-red-400 uppercase">
                    Critical ({critNodes.length})
                  </p>
                  {critNodes.map((nodeId) => (
                    <div
                      key={nodeId}
                      className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-500/10"
                    >
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-red-700 dark:text-red-400">
                        {nodeId}
                      </span>
                      <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600 dark:bg-red-500/20 dark:text-red-400">
                        CRIT
                      </span>
                    </div>
                  ))}
                </>
              )}
              {warnNodes.length > 0 && (
                <>
                  <p
                    className={`mb-2 text-[10px] font-semibold tracking-wider text-amber-400 uppercase ${critNodes.length > 0 ? 'mt-4' : ''}`}
                  >
                    Warning ({warnNodes.length})
                  </p>
                  {warnNodes.map((nodeId) => (
                    <div
                      key={nodeId}
                      className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-500/10"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-amber-700 dark:text-amber-400">
                        {nodeId}
                      </span>
                      <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                        WARN
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Customize panel ────────────────────────────────────────────────────────────

interface Settings {
  showGrid: boolean;
  showCardinalEdges: boolean;
  showDoor: boolean;
  showDoorLabel: boolean;
  showDimensions: boolean;
  showRackLabels: boolean;
  showLegend: boolean;
  sortBySeverity: boolean;
  rackAlign: 'left' | 'right';
  aisleAlign: 'top' | 'bottom';
  hiddenAisles: Set<string>;
}

const CustomizePanel = ({
  settings,
  setSettings,
  aisles,
  onClose,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
  aisles: Aisle[];
  onClose: () => void;
}) => {
  const toggle = (key: keyof Omit<Settings, 'hiddenAisles'>) =>
    setSettings({ ...settings, [key]: !settings[key] });

  const toggleAisle = (id: string) => {
    const next = new Set(settings.hiddenAisles);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSettings({ ...settings, hiddenAisles: next });
  };

  const rows: {
    key: keyof Omit<Settings, 'hiddenAisles'>;
    icon: React.ElementType;
    label: string;
    indent?: boolean;
  }[] = [
    { key: 'showGrid', icon: Grid3X3, label: 'Grid overlay' },
    { key: 'showCardinalEdges', icon: Compass, label: 'Cardinal edges (N/S/E/O)' },
    { key: 'showDoor', icon: DoorOpen, label: 'Door indicator' },
    { key: 'showDoorLabel', icon: DoorOpen, label: 'Door label', indent: true },
    { key: 'showDimensions', icon: Ruler, label: 'Room dimensions' },
    { key: 'showRackLabels', icon: Tag, label: 'Rack labels' },
    { key: 'showLegend', icon: Eye, label: 'Health legend' },
    { key: 'sortBySeverity', icon: SortAsc, label: 'Sort aisles by severity' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[9990]" onClick={onClose} />
      <div className="fixed top-[72px] right-0 z-[9991] flex h-[calc(100vh-72px)] w-72 flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Customize</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Display
            </p>
            <div className="space-y-1">
              {rows.map(({ key, icon: Icon, label, indent }) => (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-100 px-3 py-2 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
                >
                  {/* Icon + label — indent shifts only this side, toggle stays right-aligned */}
                  <div className={`flex items-center gap-2.5 ${indent ? 'pl-4' : ''}`}>
                    <Icon
                      className={`h-3.5 w-3.5 ${indent ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400'}`}
                    />
                    <span
                      className={`${indent ? 'text-xs text-gray-500 dark:text-gray-400' : 'text-sm text-gray-700 dark:text-gray-300'}`}
                    >
                      {label}
                    </span>
                  </div>
                  <div
                    className={`relative h-5 w-9 rounded-full transition-colors ${
                      settings[key] ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        settings[key] ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Rack alignment */}
          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Rack Alignment
            </p>
            <div className="inline-flex overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              {(['left', 'right'] as const).map((val) => (
                <button
                  key={val}
                  onClick={() => setSettings({ ...settings, rackAlign: val })}
                  className={`px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
                    settings.rackAlign === val
                      ? 'bg-brand-500 text-white'
                      : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* Aisle alignment */}
          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Aisle Alignment
            </p>
            <div className="inline-flex overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              {(['top', 'bottom'] as const).map((val) => (
                <button
                  key={val}
                  onClick={() => setSettings({ ...settings, aisleAlign: val })}
                  className={`px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
                    settings.aisleAlign === val
                      ? 'bg-brand-500 text-white'
                      : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {aisles.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ListFilter className="h-3.5 w-3.5 text-gray-400" />
                  <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                    Filter Aisles
                  </p>
                </div>
                {settings.hiddenAisles.size > 0 && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                    {settings.hiddenAisles.size} hidden
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {aisles.map((a) => {
                  const hidden = settings.hiddenAisles.has(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleAisle(a.id)}
                      className="flex w-full items-center gap-2.5 rounded-xl border border-gray-100 px-3 py-2 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
                    >
                      {hidden ? (
                        <EyeOff className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                      ) : (
                        <Eye className="text-brand-500 h-4 w-4" />
                      )}
                      <span
                        className={`text-sm ${
                          hidden ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {a.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const CosmosRoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const [room, setRoom] = useState<Room | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedRack, setSelectedRack] = useState<DrawerRack | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [collapsedAisles, setCollapsedAisles] = useState<Set<string>>(new Set());

  const [settings, setSettings] = useState<Settings>({
    showGrid: false,
    showCardinalEdges: true,
    showDoor: true,
    showDoorLabel: true,
    showDimensions: true,
    showRackLabels: false,
    showLegend: true,
    sortBySeverity: false,
    rackAlign: 'left',
    aisleAlign: 'top',
    hiddenAisles: new Set(),
  });

  // ── Zoom / pan ─────────────────────────────────────────────────────────────
  const [viewport, setViewport] = useState({ zoom: 1, panX: 0, panY: 0 });
  const { zoom, panX, panY } = viewport;
  const [isDragging, setIsDragging] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  // Keep viewport in a ref so wheel/drag callbacks avoid stale closures
  const vpRef = useRef(viewport);
  vpRef.current = viewport;
  const dragRef = useRef<{
    sx: number;
    sy: number;
    spx: number;
    spy: number;
    active: boolean;
  } | null>(null);
  // Track whether we've auto-fitted for the current room
  const fittedRef = useRef(false);

  const fitToCanvas = useCallback(() => {
    if (!contentRef.current || canvasSize.w === 0 || canvasSize.h === 0) return;
    const naturalH = contentRef.current.scrollHeight;
    const naturalW = contentRef.current.scrollWidth;
    // Use (canvas - 2×PADDING) so content stays inside the dashed room walls,
    // not just inside the canvas container. PADDING=24 is the inset of the dashed border.
    const usableH = canvasSize.h - 2 * PADDING;
    const usableW = canvasSize.w - 2 * PADDING;
    const fitZoom = Math.min(usableH / naturalH, usableW / naturalW, 1);
    setViewport({ zoom: Math.max(0.15, fitZoom), panX: 0, panY: 0 });
  }, [canvasSize]);

  // Reset fit flag when room changes
  useEffect(() => {
    fittedRef.current = false;
  }, [room?.id]);

  // Auto-fit once room is loaded and canvas is measured
  useEffect(() => {
    if (!room || canvasSize.w === 0 || fittedRef.current) return;
    const t = setTimeout(() => {
      fitToCanvas();
      fittedRef.current = true;
    }, 200);
    return () => clearTimeout(t);
  }, [room, canvasSize.w, fitToCanvas]);

  // Scroll wheel zoom (non-passive, centered on cursor)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const { zoom: z, panX: px, panY: py } = vpRef.current;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newZoom = Math.max(0.15, Math.min(3, z * factor));
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const ratio = newZoom / z;
      setViewport({ zoom: newZoom, panX: mx - ratio * (mx - px), panY: my - ratio * (my - py) });
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, [room]); // re-attach once canvas is mounted

  // Global mouse move/up for pan
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.sx;
      const dy = e.clientY - dragRef.current.sy;
      if (!dragRef.current.active && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      dragRef.current.active = true;
      setIsDragging(true);
      setViewport({
        ...vpRef.current,
        panX: dragRef.current.spx + dx,
        panY: dragRef.current.spy + dy,
      });
    };
    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setIsDragging(false);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, spx: panX, spy: panY, active: false };
  };

  const load = useCallback(
    async (silent = false) => {
      if (!roomId) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const [roomData, stateData] = await Promise.all([
          api.getRoomLayout(roomId),
          api.getRoomState(roomId),
        ]);
        setRoom(roomData as Room);
        setRoomState(stateData as RoomState);
      } catch {
        // ignore
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [roomId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Attach ResizeObserver once the canvas is in the DOM (after loading completes)
  useEffect(() => {
    if (!canvasRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ w: width, h: height });
    });
    obs.observe(canvasRef.current);
    return () => obs.disconnect();
  }, [room]); // re-run when room data arrives (canvas rendered for first time)

  usePageTitle(room?.name ?? 'Room');

  const rackStates: Record<string, string> = {};
  if (roomState?.racks) {
    for (const [id, val] of Object.entries(roomState.racks)) {
      rackStates[id] =
        typeof val === 'string' ? val : ((val as { state?: string }).state ?? 'UNKNOWN');
    }
  }

  const allAisles = room?.aisles ?? [];
  const visibleAisles = allAisles.filter((a) => !settings.hiddenAisles.has(a.id));
  const sortedAisles = settings.sortBySeverity
    ? [...visibleAisles].sort((a, b) => {
        const score = (aisle: Aisle) =>
          aisle.racks.some((r) => rackStates[r.id] === 'CRIT')
            ? 2
            : aisle.racks.some((r) => rackStates[r.id] === 'WARN')
              ? 1
              : 0;
        return score(b) - score(a);
      })
    : visibleAisles;

  const allRacks = allAisles.flatMap((a) => a.racks);
  const critTotal = allRacks.filter((r) => rackStates[r.id] === 'CRIT').length;
  const warnTotal = allRacks.filter((r) => rackStates[r.id] === 'WARN').length;
  const okTotal = allRacks.filter((r) => rackStates[r.id] === 'OK').length;

  const handleRackClick = (rack: Rack, aisle: Aisle) => {
    const state = rackStates[rack.id] ?? 'UNKNOWN';
    setSelectedRack({ rack, aisle, state });
    setDrawerOpen(true);
    setCustomizeOpen(false);
  };

  const handleBadgeClick = (state: string) => {
    setHighlight((prev) => (prev === state ? null : state));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="border-t-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
      </div>
    );
  }

  if (!room) {
    return <div className="p-6 text-sm text-gray-400">Room not found: {roomId}</div>;
  }

  const layout = room.layout;
  const doorSide = layout?.door?.side ?? 'west';
  const doorPos = layout?.door?.position ?? 0.25;
  const doorLabel = layout?.door?.label ?? null;
  const north = layout?.orientation?.north ?? 'top';
  const W = layout?.size?.width ?? 24;
  const H = layout?.size?.height ?? 16;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* ── Top bar ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{room.name}</h2>
          <PageBreadcrumb
            items={[
              { label: 'Home', href: '/cosmos' },
              { label: 'Monitoring', href: '/cosmos/views/worldmap' },
              { label: room.name },
            ]}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search rack…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="focus:border-brand-500 w-48 rounded-xl border border-gray-200 bg-white py-2 pr-3 pl-8 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Zoom controls — inline-flex group, same height as other topbar buttons */}
          <div className="flex overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewport((v) => ({ ...v, zoom: Math.max(0.15, v.zoom * 0.8) }))}
              className="flex items-center border-r border-gray-200 px-2.5 py-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              title="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={fitToCanvas}
              className="flex min-w-[3.5rem] items-center justify-center border-r border-gray-200 px-3 py-2 font-mono text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              title="Fit to canvas"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={fitToCanvas}
              className="flex items-center border-r border-gray-200 px-2.5 py-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              title="Fit all"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewport((v) => ({ ...v, zoom: Math.min(3, v.zoom * 1.25) }))}
              className="flex items-center px-2.5 py-2 text-gray-500 transition-colors hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5"
              title="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setCustomizeOpen((o) => !o);
              setDrawerOpen(false);
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              customizeOpen
                ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-700/50 dark:bg-brand-500/10 dark:text-brand-400'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5'
            }`}
          >
            <Settings2 className="h-4 w-4" /> Customize
          </button>
          <button
            onClick={() => void load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="flex items-center gap-3 text-xs">
        <span className="text-gray-500 dark:text-gray-400">{allRacks.length} racks</span>
        <span className="text-gray-200 dark:text-gray-700">·</span>
        {critTotal > 0 && (
          <button
            onClick={() => handleBadgeClick('CRIT')}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-bold transition-colors ${
              highlight === 'CRIT'
                ? 'bg-red-500 text-white'
                : 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-500/15 dark:text-red-400'
            }`}
          >
            <XCircle className="h-3 w-3" />
            {critTotal} CRIT
          </button>
        )}
        {warnTotal > 0 && (
          <button
            onClick={() => handleBadgeClick('WARN')}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-bold transition-colors ${
              highlight === 'WARN'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-400'
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            {warnTotal} WARN
          </button>
        )}
        {okTotal > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-bold text-green-600 dark:bg-green-500/15 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            {okTotal} OK
          </span>
        )}
        {highlight && (
          <button
            onClick={() => setHighlight(null)}
            className="ml-auto text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Room canvas ── */}
      <div
        ref={canvasRef}
        className="relative flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          backgroundImage: settings.showGrid
            ? `linear-gradient(to right, rgb(156 163 175 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgb(156 163 175 / 0.08) 1px, transparent 1px)`
            : undefined,
          backgroundSize: settings.showGrid
            ? `${layout?.grid?.cell ?? 28}px ${layout?.grid?.cell ?? 28}px`
            : undefined,
        }}
        onMouseDown={handleCanvasMouseDown}
      >
        {/* ── Zoomable layer — everything inside scales together ── */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Room inner border */}
          <div
            className="absolute rounded-xl border border-dashed border-gray-200 dark:border-gray-700"
            style={{ inset: PADDING }}
          />

          {/* Door marker */}
          {settings.showDoor && canvasSize.w > 0 && (
            <DoorMarker
              side={doorSide}
              position={doorPos}
              w={canvasSize.w}
              h={canvasSize.h}
              showLabel={settings.showDoorLabel}
              doorLabel={doorLabel}
            />
          )}

          {/* Cardinal edge labels */}
          {settings.showCardinalEdges &&
            (() => {
              const labels: Record<string, string> =
                north === 'right'
                  ? { top: 'O', right: 'N', bottom: 'E', left: 'S' }
                  : north === 'bottom'
                    ? { top: 'S', right: 'O', bottom: 'N', left: 'E' }
                    : north === 'left'
                      ? { top: 'E', right: 'S', bottom: 'O', left: 'N' }
                      : { top: 'N', right: 'E', bottom: 'S', left: 'O' };

              const chip = (label: string) => (
                <span
                  className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    label === 'N'
                      ? 'border-brand-300 text-brand-600 dark:border-brand-700/50 dark:text-brand-400 bg-white dark:bg-gray-900'
                      : 'border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500'
                  }`}
                >
                  {label}
                </span>
              );
              const half = PADDING / 2;
              return (
                <>
                  <div
                    className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
                    style={{ top: half }}
                  >
                    {chip(labels.top)}
                  </div>
                  <div
                    className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 translate-y-1/2"
                    style={{ bottom: half }}
                  >
                    {chip(labels.bottom)}
                  </div>
                  <div
                    className="pointer-events-none absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: half }}
                  >
                    {chip(labels.left)}
                  </div>
                  <div
                    className="pointer-events-none absolute top-1/2 z-20 translate-x-1/2 -translate-y-1/2"
                    style={{ right: half }}
                  >
                    {chip(labels.right)}
                  </div>
                </>
              );
            })()}

          {/* Aisles — no overflow-y-auto, zoom handles fitting */}
          <div
            ref={contentRef}
            className={`relative z-10 flex h-full flex-col gap-3 p-8 ${settings.aisleAlign === 'bottom' ? 'justify-end' : 'justify-start'}`}
          >
            {sortedAisles.map((aisle) => (
              <AisleBand
                key={aisle.id}
                aisle={aisle}
                rackStates={rackStates}
                selectedRackId={selectedRack?.rack.id ?? null}
                highlight={highlight}
                showRackLabels={settings.showRackLabels}
                searchQuery={search}
                onRackClick={handleRackClick}
                onBadgeClick={handleBadgeClick}
                collapsed={collapsedAisles.has(aisle.id)}
                rackAlign={settings.rackAlign}
                onToggleCollapse={() => {
                  setCollapsedAisles((prev) => {
                    const next = new Set(prev);
                    if (next.has(aisle.id)) next.delete(aisle.id);
                    else next.add(aisle.id);
                    return next;
                  });
                }}
              />
            ))}
            {sortedAisles.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <HelpCircle className="h-8 w-8 text-gray-200 dark:text-gray-700" />
                <p className="text-sm text-gray-400">No aisles visible</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Fixed overlays (don't zoom) ── */}

        {/* Legend + Dimensions — bottom-right corner */}
        {(settings.showLegend || settings.showDimensions) && (
          <div className="pointer-events-none absolute right-4 bottom-4 z-30 flex flex-col items-end gap-2">
            {settings.showDimensions && (
              <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
                {W}m × {H}m
              </span>
            )}
            {settings.showLegend && (
              <div className="flex items-center gap-3">
                {(
                  [
                    ['OK', '#10b981'],
                    ['WARN', '#f59e0b'],
                    ['CRIT', '#ef4444'],
                    ['UNKNOWN', '#6b7280'],
                  ] as [string, string][]
                ).map(([label, color]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Drawers ── */}
      {drawerOpen && selectedRack && (
        <RackDrawer
          key={selectedRack.rack.id}
          selected={selectedRack}
          onClose={() => setDrawerOpen(false)}
          navigate={navigate}
        />
      )}
      {customizeOpen && (
        <CustomizePanel
          settings={settings}
          setSettings={setSettings}
          aisles={allAisles}
          onClose={() => setCustomizeOpen(false)}
        />
      )}
    </div>
  );
};
