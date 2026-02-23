import { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import { api } from '../../../services/api';
import type { Room, Aisle, Rack, RoomState } from '../../../types';
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

// ── Door arc ────────────────────────────────────────────────────────────────

interface DoorArcProps {
  side: string;
  position: number;
  w: number;
  h: number;
}

const PADDING = 24;

const DoorArc = ({ side, position, w, h }: DoorArcProps) => {
  const iW = w - PADDING * 2;
  const iH = h - PADDING * 2;
  const r = 36;
  let x = 0,
    y = 0,
    arc = '',
    lineStyle: React.CSSProperties = {};

  if (side === 'west' || side === 'left') {
    x = PADDING;
    y = PADDING + iH * position - r / 2;
    lineStyle = { left: x - 1, top: y, width: 3, height: r, backgroundColor: '#465fff' };
    arc = `M ${x} ${y} Q ${x + r} ${y} ${x + r} ${y + r / 2} Q ${x + r} ${y + r} ${x} ${y + r}`;
  } else if (side === 'east' || side === 'right') {
    x = PADDING + iW;
    y = PADDING + iH * position - r / 2;
    lineStyle = { left: x - 2, top: y, width: 3, height: r, backgroundColor: '#465fff' };
    arc = `M ${x} ${y} Q ${x - r} ${y} ${x - r} ${y + r / 2} Q ${x - r} ${y + r} ${x} ${y + r}`;
  } else if (side === 'south' || side === 'bottom') {
    x = PADDING + iW * position - r / 2;
    y = PADDING + iH;
    lineStyle = { left: x, top: y - 2, width: r, height: 3, backgroundColor: '#465fff' };
    arc = `M ${x} ${y} Q ${x} ${y - r} ${x + r / 2} ${y - r} Q ${x + r} ${y - r} ${x + r} ${y}`;
  } else {
    x = PADDING + iW * position - r / 2;
    y = PADDING;
    lineStyle = { left: x, top: y - 1, width: r, height: 3, backgroundColor: '#465fff' };
    arc = `M ${x} ${y} Q ${x} ${y + r} ${x + r / 2} ${y + r} Q ${x + r} ${y + r} ${x + r} ${y}`;
  }

  return (
    <>
      <div className="pointer-events-none absolute z-20" style={lineStyle} />
      <svg
        className="pointer-events-none absolute inset-0 z-20"
        width={w}
        height={h}
        style={{ overflow: 'visible' }}
      >
        <path d={arc} fill="none" stroke="#465fff" strokeWidth={1.5} strokeDasharray="4 2" />
      </svg>
      <div
        className="text-brand-500 pointer-events-none absolute z-20 font-mono text-[8px] font-bold"
        style={{ left: lineStyle.left, top: (lineStyle.top as number) - 13 }}
      >
        DOOR
      </div>
    </>
  );
};

// ── Compass rose ─────────────────────────────────────────────────────────────

const CompassRose = ({ north }: { north: string }) => {
  const rotate = north === 'right' ? 90 : north === 'bottom' ? 180 : north === 'left' ? 270 : 0;
  return (
    <div
      className="pointer-events-none absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-9 w-9">
        <circle
          cx="18"
          cy="18"
          r="17"
          stroke="currentColor"
          strokeWidth="1"
          className="text-gray-300 dark:text-gray-600"
        />
        <polygon points="18,4 21,18 18,15 15,18" fill="#465fff" />
        <polygon
          points="18,32 15,18 18,21 21,18"
          fill="currentColor"
          className="text-gray-400 dark:text-gray-500"
        />
        <polygon
          points="4,18 18,15 15,18 18,21"
          fill="currentColor"
          className="text-gray-300 dark:text-gray-600"
        />
        <polygon
          points="32,18 18,21 21,18 18,15"
          fill="currentColor"
          className="text-gray-300 dark:text-gray-600"
        />
        <text x="18" y="11" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#465fff">
          N
        </text>
      </svg>
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
  return (
    <div className="group relative flex flex-col items-center gap-0.5">
      <button
        onClick={onClick}
        title={rack.name}
        className={`relative h-14 w-8 rounded-sm border-2 transition-all ${
          isSelected ? 'ring-brand-500 ring-2 ring-offset-1 dark:ring-offset-gray-900' : ''
        } ${searchMatch ? 'ring-2 ring-yellow-400 ring-offset-1' : ''} ${
          dimmed ? 'opacity-25' : ''
        }`}
        style={{
          backgroundColor: `${color}22`,
          borderColor: color,
        }}
      >
        <div
          className="absolute right-0 bottom-0 left-0 rounded-sm"
          style={{
            backgroundColor: color,
            height: `${Math.min(100, ((rack.devices?.length ?? 0) / (rack.u_height / 2)) * 100)}%`,
            opacity: 0.4,
          }}
        />
        <div
          className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      </button>
      {showLabel && (
        <span className="w-8 truncate text-center font-mono text-[8px] text-gray-400 dark:text-gray-600">
          {rack.id.split('-').pop()}
        </span>
      )}
      <div className="pointer-events-none absolute -top-8 left-1/2 z-50 hidden -translate-x-1/2 rounded-lg bg-gray-900 px-2 py-1 text-[10px] whitespace-nowrap text-white shadow-lg group-hover:block dark:bg-gray-700">
        {rack.name}
      </div>
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
}: AisleBandProps) => {
  const critCount = aisle.racks.filter((r) => rackStates[r.id] === 'CRIT').length;
  const warnCount = aisle.racks.filter((r) => rackStates[r.id] === 'WARN').length;
  const allOk = critCount === 0 && warnCount === 0;

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/30">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{aisle.name}</span>
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

      <div className="flex flex-wrap gap-2">
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
  if (!selected) return null;
  const { rack, aisle, state } = selected;
  const color = HC[state] ?? HC.UNKNOWN;

  const StateIcon = state === 'CRIT' ? XCircle : state === 'WARN' ? AlertTriangle : CheckCircle;

  return (
    <>
      <div className="fixed inset-0 z-[9990]" onClick={onClose} />
      <div className="fixed top-[72px] right-0 z-[9991] flex h-[calc(100vh-72px)] w-80 flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{rack.name}</h3>
            <p className="text-xs text-gray-400">
              {aisle.name} · {rack.id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-lg px-2 py-0.5 text-xs font-bold ${HEALTH_PILL[state] ?? HEALTH_PILL.UNKNOWN}`}
            >
              {state}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-2 border-b border-gray-100 p-4 dark:border-gray-800">
          {[
            { icon: Ruler, label: 'Height', value: `${rack.u_height}U`, colored: false },
            { icon: Server, label: 'Devices', value: rack.devices?.length ?? 0, colored: false },
            { icon: StateIcon, label: 'State', value: state, colored: true },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-gray-100 p-2.5 text-center dark:border-gray-800"
            >
              <s.icon
                className="mx-auto mb-1 h-4 w-4 text-gray-400"
                style={s.colored ? { color } : {}}
              />
              <p className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-[9px] text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Rack View
          </p>
          <div style={{ height: Math.max(200, rack.u_height * 6) }}>
            <RackElevation
              rack={rack}
              catalog={{}}
              health={state}
              nodesData={{}}
              isRearView={false}
              infraComponents={[]}
              sideComponents={[]}
              allowInfraOverlap={false}
              pduMetrics={undefined}
              onDeviceClick={() => {}}
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-100 p-4 dark:border-gray-800">
          <button
            onClick={() => navigate(`/cosmos/views/rack/${rack.id}`)}
            className="bg-brand-500 hover:bg-brand-600 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors"
          >
            Open Rack <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
};

// ── Customize panel ────────────────────────────────────────────────────────────

interface Settings {
  showGrid: boolean;
  showCompass: boolean;
  showDoor: boolean;
  showDimensions: boolean;
  showRackLabels: boolean;
  showLegend: boolean;
  sortBySeverity: boolean;
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
  }[] = [
    { key: 'showGrid', icon: Grid3X3, label: 'Grid overlay' },
    { key: 'showCompass', icon: Compass, label: 'Compass rose' },
    { key: 'showDoor', icon: DoorOpen, label: 'Door indicator' },
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
              {rows.map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-100 px-3 py-2 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
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

          {aisles.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                Aisles
              </p>
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

  const [settings, setSettings] = useState<Settings>({
    showGrid: false,
    showCompass: true,
    showDoor: true,
    showDimensions: true,
    showRackLabels: false,
    showLegend: true,
    sortBySeverity: false,
    hiddenAisles: new Set(),
  });

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

  useEffect(() => {
    if (!canvasRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ w: width, h: height });
    });
    obs.observe(canvasRef.current);
    return () => obs.disconnect();
  }, []);

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
          backgroundImage: settings.showGrid
            ? `linear-gradient(to right, rgb(229 231 235 / 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgb(229 231 235 / 0.5) 1px, transparent 1px)`
            : undefined,
          backgroundSize: settings.showGrid
            ? `${layout?.grid?.cell ?? 28}px ${layout?.grid?.cell ?? 28}px`
            : undefined,
        }}
      >
        {/* Room inner border */}
        <div
          className="absolute rounded-xl border border-dashed border-gray-200 dark:border-gray-700"
          style={{ inset: PADDING }}
        />

        {/* Door arc */}
        {settings.showDoor && canvasSize.w > 0 && (
          <DoorArc side={doorSide} position={doorPos} w={canvasSize.w} h={canvasSize.h} />
        )}

        {/* Compass */}
        {settings.showCompass && <CompassRose north={north} />}

        {/* Dimensions */}
        {settings.showDimensions && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 font-mono text-[9px] text-gray-400 dark:text-gray-600">
            {W}m × {H}m
          </div>
        )}

        {/* Aisles content */}
        <div className="relative z-10 flex h-full flex-col justify-center gap-3 overflow-y-auto p-8">
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
            />
          ))}
          {sortedAisles.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <HelpCircle className="h-8 w-8 text-gray-200 dark:text-gray-700" />
              <p className="text-sm text-gray-400">No aisles visible</p>
            </div>
          )}
        </div>

        {/* Legend */}
        {settings.showLegend && (
          <div className="absolute right-4 bottom-2 z-10 flex items-center gap-2">
            {(
              [
                ['OK', '#10b981'],
                ['WARN', '#f59e0b'],
                ['CRIT', '#ef4444'],
                ['UNKNOWN', '#6b7280'],
              ] as [string, string][]
            ).map(([label, color]) => (
              <div key={label} className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                <span className="font-mono text-[8px] text-gray-400 dark:text-gray-600">
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Drawers ── */}
      {drawerOpen && selectedRack && (
        <RackDrawer
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
