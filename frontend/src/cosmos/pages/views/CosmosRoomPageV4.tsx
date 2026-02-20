import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw, ExternalLink, Thermometer, Zap } from 'lucide-react';
import { api } from '../../../services/api';
import type { Room, Rack, RackState } from '../../../types';

// ── Constants ──────────────────────────────────────────────────────────────

const HEALTH_COLOR: Record<string, string> = {
  OK: '#22c55e',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#374151',
};

const HEALTH_GLOW: Record<string, string> = {
  OK: '0 0 12px #22c55e40',
  WARN: '0 0 12px #f59e0b40',
  CRIT: '0 0 18px #ef444460',
  UNKNOWN: 'none',
};

const VARIANTS = [
  { label: 'V1', path: 'room' },
  { label: 'V2', path: 'room-v2' },
  { label: 'V3', path: 'room-v3' },
  { label: 'V4', path: 'room-v4' },
  { label: 'V5', path: 'room-v5' },
] as const;

// ── RackSquare ─────────────────────────────────────────────────────────────

type RackSquareProps = {
  rack: Rack;
  health: string;
  selected: boolean;
  onClick: () => void;
};

const RackSquare = ({ rack, health, selected, onClick }: RackSquareProps) => {
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN;
  const isCrit = health === 'CRIT';

  return (
    <button
      onClick={onClick}
      title={`${rack.name} — ${health}`}
      className={`relative flex flex-col items-center justify-end overflow-hidden rounded-md transition-all duration-150 hover:scale-110 focus:outline-none ${isCrit ? 'animate-pulse' : ''}`}
      style={{
        width: 56,
        height: 72,
        backgroundColor: color,
        opacity: health === 'UNKNOWN' ? 0.4 : 0.85,
        boxShadow: selected
          ? `0 0 0 2px white, ${HEALTH_GLOW[health] ?? 'none'}`
          : isCrit
            ? HEALTH_GLOW.CRIT
            : undefined,
      }}
    >
      {/* Inner sheen */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(160deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 60%)',
        }}
      />

      {/* Rack ID label */}
      <span
        className="relative z-10 w-full truncate px-1 pb-1.5 text-center font-mono text-[8px] font-bold text-white"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
      >
        {rack.id}
      </span>
    </button>
  );
};

// ── AisleRow ───────────────────────────────────────────────────────────────

type AisleRowProps = {
  name: string;
  racks: Rack[];
  healthMap: Record<string, string>;
  selectedRackId: string | null;
  onSelect: (rack: Rack) => void;
};

const AisleRow = ({ name, racks, healthMap, selectedRackId, onSelect }: AisleRowProps) => {
  const worstState = racks.reduce<string>((worst, r) => {
    const s = healthMap[r.id] ?? 'UNKNOWN';
    const order = { CRIT: 4, WARN: 3, UNKNOWN: 2, OK: 1 };
    return (order[s as keyof typeof order] ?? 0) > (order[worst as keyof typeof order] ?? 0)
      ? s
      : worst;
  }, 'OK');

  const rowTint = HEALTH_COLOR[worstState] ?? HEALTH_COLOR.UNKNOWN;

  return (
    <div
      className="flex items-center gap-4 rounded-xl px-4 py-3"
      style={{
        backgroundColor: `${rowTint}08`,
        border: `1px solid ${rowTint}18`,
      }}
    >
      {/* Aisle label */}
      <div className="flex w-28 shrink-0 flex-col">
        <span className="font-mono text-[9px] font-semibold tracking-widest text-gray-400 uppercase">
          {name}
        </span>
        <span className="mt-0.5 font-mono text-[8px] text-gray-500">{racks.length} racks</span>
      </div>

      {/* Rack squares */}
      <div className="flex flex-wrap gap-2">
        {racks.map((rack) => (
          <RackSquare
            key={rack.id}
            rack={rack}
            health={healthMap[rack.id] ?? 'UNKNOWN'}
            selected={selectedRackId === rack.id}
            onClick={() => onSelect(rack)}
          />
        ))}
      </div>
    </div>
  );
};

// ── RackDetailPanel ────────────────────────────────────────────────────────

type RackDetailPanelProps = {
  rack: Rack;
  health: RackState | null;
  onNavigate: () => void;
  onClose: () => void;
};

const RackDetailPanel = ({ rack, health, onNavigate, onClose }: RackDetailPanelProps) => {
  const state = health?.state ?? 'UNKNOWN';
  const color = HEALTH_COLOR[state] ?? HEALTH_COLOR.UNKNOWN;

  return (
    <div
      className="flex flex-col gap-4 overflow-y-auto rounded-2xl border p-5"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}06` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{rack.name}</h3>
          <p className="font-mono text-xs text-gray-400">{rack.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-lg px-2.5 py-1 text-xs font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {state}
          </span>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] text-gray-400 hover:text-gray-600 dark:border-gray-700"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Metrics */}
      {health?.metrics && (
        <div className="grid grid-cols-2 gap-2">
          {(health.metrics.temperature ?? 0) > 0 && (
            <div className="rounded-lg bg-white/60 px-3 py-2.5 dark:bg-gray-900/60">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Thermometer className="h-3.5 w-3.5 text-blue-400" />
                Temperature
              </div>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                {Math.round(health.metrics.temperature ?? 0)}°C
              </p>
            </div>
          )}
          {(health.metrics.power ?? 0) > 0 && (
            <div className="rounded-lg bg-white/60 px-3 py-2.5 dark:bg-gray-900/60">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Zap className="h-3.5 w-3.5 text-yellow-400" />
                Power
              </div>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                {((health.metrics.power ?? 0) / 1000).toFixed(1)} kW
              </p>
            </div>
          )}
        </div>
      )}

      {/* Node health dots */}
      {health?.nodes && Object.keys(health.nodes).length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Nodes ({Object.keys(health.nodes).length})
          </p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(health.nodes)
              .slice(0, 30)
              .map(([node, ns]) => {
                const s = (ns as { state?: string }).state ?? 'UNKNOWN';
                return (
                  <div
                    key={node}
                    title={`${node}: ${s}`}
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: HEALTH_COLOR[s] ?? HEALTH_COLOR.UNKNOWN }}
                  />
                );
              })}
          </div>
        </div>
      )}

      {/* Open button */}
      <button
        onClick={onNavigate}
        className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white transition-colors"
        style={{ backgroundColor: color }}
      >
        View full rack
        <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────

export const CosmosRoomPageV4 = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, string>>({});
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [selectedHealth, setSelectedHealth] = useState<RackState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRoomHealth = async (id: string) => {
    try {
      const state = await api.getRoomState(id);
      const map: Record<string, string> = {};
      Object.entries(state?.racks ?? {}).forEach(([rackId, s]) => {
        map[rackId] = typeof s === 'string' ? s : ((s as { state?: string })?.state ?? 'UNKNOWN');
      });
      setHealthMap(map);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    const load = async () => {
      try {
        const roomData = await api.getRoomLayout(roomId);
        if (active) {
          setRoom(roomData);
          setLoading(false);
        }
      } catch {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || loading) return;
    let active = true;
    const poll = async () => {
      if (active) await loadRoomHealth(roomId);
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [roomId, loading]);

  useEffect(() => {
    if (!selectedRack) return;
    let active = true;
    const fetchHealth = async () => {
      try {
        const data = await api.getRackState(selectedRack.id, true);
        if (active) setSelectedHealth(data);
      } catch {
        if (active) setSelectedHealth(null);
      }
    };
    fetchHealth();
    return () => {
      active = false;
    };
  }, [selectedRack]);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="border-t-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
      </div>
    );

  if (!room)
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">Room not found</div>
    );

  const allRacks = [
    ...(room.aisles?.flatMap((a) => a.racks ?? []) ?? []),
    ...(room.standalone_racks ?? []),
  ];

  const summary = allRacks.reduce(
    (acc, rack) => {
      const s = healthMap[rack.id] ?? 'UNKNOWN';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleSelect = (rack: Rack) => {
    setSelectedRack((prev) => (prev?.id === rack.id ? null : rack));
  };

  return (
    <div
      className="flex min-h-full flex-col gap-4"
      style={{ backgroundColor: 'var(--color-bg, transparent)' }}
    >
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex-1">
          <nav className="mb-1 flex items-center gap-1 text-xs">
            <Link to="/cosmos/views/worldmap" className="text-brand-500 hover:underline">
              World Map
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-white">{room.name}</span>
          </nav>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{room.name}</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-2 text-[10px]">
            {(['OK', 'WARN', 'CRIT', 'UNKNOWN'] as const).map((s) => (
              <span key={s} className="flex items-center gap-1 text-gray-400">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: HEALTH_COLOR[s], opacity: 0.85 }}
                />
                {s}
                {(summary[s] ?? 0) > 0 && (
                  <span className="font-bold text-gray-600 dark:text-gray-300">({summary[s]})</span>
                )}
              </span>
            ))}
          </div>

          {/* Variant switcher */}
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            {VARIANTS.map((v) => (
              <button
                key={v.label}
                onClick={() => navigate(`/cosmos/views/${v.path}/${roomId}`)}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  v.path === 'room-v4'
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => roomId && loadRoomHealth(roomId)}
            className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:text-gray-600 dark:border-gray-700"
            title="Refresh"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Heat map */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="space-y-3">
          {(room.aisles ?? []).map((aisle) => (
            <AisleRow
              key={aisle.id}
              name={aisle.name}
              racks={aisle.racks ?? []}
              healthMap={healthMap}
              selectedRackId={selectedRack?.id ?? null}
              onSelect={handleSelect}
            />
          ))}

          {(room.standalone_racks ?? []).length > 0 && (
            <AisleRow
              name="Standalone"
              racks={room.standalone_racks ?? []}
              healthMap={healthMap}
              selectedRackId={selectedRack?.id ?? null}
              onSelect={handleSelect}
            />
          )}
        </div>
      </div>

      {/* Detail panel (shown when rack selected) */}
      {selectedRack && (
        <div className="w-full xl:w-80">
          <RackDetailPanel
            rack={selectedRack}
            health={selectedHealth}
            onNavigate={() => navigate(`/cosmos/views/rack/${selectedRack.id}`)}
            onClose={() => setSelectedRack(null)}
          />
        </div>
      )}
    </div>
  );
};
