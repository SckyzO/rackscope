import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw, Thermometer, Wind } from 'lucide-react';
import { api } from '../../../services/api';
import type { Room, Rack, Aisle } from '../../../types';

// ── Constants ──────────────────────────────────────────────────────────────

const HEALTH_COLOR: Record<string, string> = {
  OK: '#22c55e',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#374151',
};

const VARIANTS = [
  { label: 'V1', path: 'room' },
  { label: 'V2', path: 'room-v2' },
  { label: 'V3', path: 'room-v3' },
  { label: 'V4', path: 'room-v4' },
  { label: 'V5', path: 'room-v5' },
  { label: 'V6', path: 'room-v6' },
  { label: 'V7', path: 'room-v7' },
  { label: 'V8', path: 'room-v8' },
  { label: 'V9', path: 'room-v9' },
  { label: 'V10', path: 'room-v10' },
] as const;

// ── Hot/Cold corridor types ───────────────────────────────────────────────

type AisleOrientation = 'face-right' | 'face-left';

// ── RackTower ─────────────────────────────────────────────────────────────
// Represents a single rack in the hot/cold corridor view.
// orientation determines which side is "front" (health colored)

type RackTowerProps = {
  rack: Rack;
  health: string;
  orientation: AisleOrientation;
  selected: boolean;
  onClick: () => void;
};

const TOWER_W = 48;
const TOWER_H_PER_U = 2.2;

const RackTower = ({ rack, health, orientation, selected, onClick }: RackTowerProps) => {
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN;
  const h = Math.max(36, Math.min(110, rack.u_height * TOWER_H_PER_U));
  const isCrit = health === 'CRIT';

  // Front face = health color, rear face = darker
  const frontColor = `${color}cc`;
  const rearColor = `${color}44`;
  const frontBorder = selected ? 'white' : color;

  const front = (
    <div
      className={`flex flex-col items-center justify-end ${isCrit ? 'animate-pulse' : ''}`}
      style={{
        width: TOWER_W,
        height: h,
        backgroundColor: frontColor,
        border: `1.5px solid ${frontBorder}`,
        borderRadius: '3px 3px 0 0',
        boxShadow: selected
          ? `0 0 0 2px white, 0 0 16px ${color}`
          : isCrit
            ? `0 0 12px ${color}80`
            : undefined,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Rack ventilation lines */}
      {Array.from({ length: Math.floor(h / 8) }).map((_, i) => (
        <div
          key={i}
          className="pointer-events-none absolute w-full"
          style={{ top: i * 8, height: 1, backgroundColor: 'rgba(0,0,0,0.15)' }}
        />
      ))}
      <span
        className="relative z-10 w-full truncate px-0.5 pb-1 text-center font-mono text-[7px] font-bold text-white"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
      >
        {rack.id.split('-').pop()}
      </span>
    </div>
  );

  const rear = (
    <div
      style={{
        width: TOWER_W,
        height: h,
        backgroundColor: rearColor,
        border: `1px solid ${color}30`,
        borderRadius: '3px 3px 0 0',
        flexShrink: 0,
      }}
    />
  );

  return (
    <button
      onClick={onClick}
      title={`${rack.id} (${health}) — ${orientation === 'face-right' ? 'front→' : '←front'}`}
      className="flex flex-col items-center focus:outline-none"
      style={{ gap: 0 }}
    >
      {/* Base */}
      <div className="flex" style={{ gap: 2 }}>
        {orientation === 'face-right' ? (
          <>
            {front}
            {rear}
          </>
        ) : (
          <>
            {rear}
            {front}
          </>
        )}
      </div>
      {/* Footer base plate */}
      <div
        style={{
          width: TOWER_W * 2 + 2,
          height: 4,
          backgroundColor: `${color}55`,
          borderRadius: '0 0 2px 2px',
          borderTop: `1px solid ${color}40`,
        }}
      />
    </button>
  );
};

// ── ColdAisleCorridor ─────────────────────────────────────────────────────

const ColdAisleCorridor = ({ label }: { label: string }) => (
  <div
    className="flex items-center justify-center gap-3 rounded-lg py-2"
    style={{
      background: 'linear-gradient(90deg, #0c2340 0%, #0e2f52 50%, #0c2340 100%)',
      border: '1px solid #1a4a7a',
    }}
  >
    <Wind className="h-3.5 w-3.5 text-blue-400" />
    <span className="font-mono text-[9px] font-bold tracking-widest text-blue-300 uppercase">
      ← Cold Aisle · {label} · Cold Intake →
    </span>
    <Thermometer className="h-3.5 w-3.5 text-blue-400" />
  </div>
);

// ── HotAisleCorridor ──────────────────────────────────────────────────────

const HotAisleCorridor = () => (
  <div
    className="flex items-center justify-center gap-3 rounded-lg py-2"
    style={{
      background: 'linear-gradient(90deg, #2d0e06 0%, #4a1208 50%, #2d0e06 100%)',
      border: '1px solid #7a2010',
    }}
  >
    <Thermometer className="h-3.5 w-3.5 text-orange-400" />
    <span className="font-mono text-[9px] font-bold tracking-widest text-orange-300 uppercase">
      → Hot Aisle · Exhaust Heat ←
    </span>
    <Thermometer className="h-3.5 w-3.5 text-red-400" />
  </div>
);

// ── AisleRackRow ──────────────────────────────────────────────────────────

type AisleRackRowProps = {
  aisle: Aisle;
  healthMap: Record<string, string>;
  orientation: AisleOrientation;
  selectedRackId: string | null;
  onSelect: (rack: Rack) => void;
};

const AisleRackRow = ({
  aisle,
  healthMap,
  orientation,
  selectedRackId,
  onSelect,
}: AisleRackRowProps) => {
  const racks = aisle.racks ?? [];

  return (
    <div className="flex flex-col gap-1.5">
      {/* Aisle label */}
      <div className="flex items-center gap-2 px-2">
        <span
          className="font-mono text-[10px] font-bold tracking-widest text-gray-400 uppercase"
          style={{ minWidth: 80 }}
        >
          {aisle.name}
        </span>
        <span className="font-mono text-[9px] text-gray-600">
          {orientation === 'face-right' ? 'front →' : '← front'} · {racks.length} racks
        </span>
      </div>

      {/* Rack row */}
      <div
        className="flex flex-wrap gap-3 rounded-xl px-4 py-3"
        style={{
          justifyContent: orientation === 'face-right' ? 'flex-start' : 'flex-start',
          backgroundColor: '#0b1220',
          border: '1px solid #1a2535',
        }}
      >
        {racks.map((rack) => (
          <RackTower
            key={rack.id}
            rack={rack}
            health={healthMap[rack.id] ?? 'UNKNOWN'}
            orientation={orientation}
            selected={selectedRackId === rack.id}
            onClick={() => onSelect(rack)}
          />
        ))}
      </div>
    </div>
  );
};

// ── RackInfoTooltip ────────────────────────────────────────────────────────

type RackInfoTooltipProps = {
  rack: Rack;
  health: string;
  onNavigate: () => void;
  onClose: () => void;
};

const RackInfoTooltip = ({ rack, health, onNavigate, onClose }: RackInfoTooltipProps) => {
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN;
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4"
      style={{ borderColor: `${color}40`, backgroundColor: '#0c1525' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-100">{rack.name}</p>
          <p className="font-mono text-[10px] text-gray-500">{rack.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-lg px-2 py-0.5 text-xs font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {health}
          </span>
          <button
            onClick={onClose}
            className="rounded border border-gray-700 px-2 py-0.5 text-[10px] text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-gray-800/60 py-2">
          <p className="font-mono text-[9px] text-gray-500">Height</p>
          <p className="font-mono text-sm font-bold text-gray-200">{rack.u_height}U</p>
        </div>
        <div className="rounded-lg bg-gray-800/60 py-2">
          <p className="font-mono text-[9px] text-gray-500">Devices</p>
          <p className="font-mono text-sm font-bold text-gray-200">{rack.devices.length}</p>
        </div>
      </div>

      <button
        onClick={onNavigate}
        className="rounded-lg py-2 text-xs font-semibold text-white hover:opacity-90"
        style={{ backgroundColor: color }}
      >
        Open rack view
      </button>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────

export const CosmosRoomPageV10 = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, string>>({});
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('cosmos-room-variant', 'room-v10');
  }, []);

  const loadHealth = async (id: string) => {
    try {
      const state = await api.getRoomState(id);
      const map: Record<string, string> = {};
      Object.entries(state?.racks ?? {}).forEach(([rId, s]) => {
        map[rId] = typeof s === 'string' ? s : ((s as { state?: string })?.state ?? 'UNKNOWN');
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
      if (active) await loadHealth(roomId);
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [roomId, loading]);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-orange-400" />
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

  const aisles: Aisle[] = [
    ...(room.aisles ?? []),
    ...(room.standalone_racks && room.standalone_racks.length > 0
      ? [{ id: '_standalone', name: 'STANDALONE', racks: room.standalone_racks }]
      : []),
  ];

  const handleSelect = (rack: Rack) => {
    setSelectedRack((prev) => (prev?.id === rack.id ? null : rack));
  };

  // Build interleaved aisle + corridor view
  // Pairs of aisles share a hot aisle between them
  // [cold] [aisle A face-right] [hot] [aisle B face-left] [cold]
  const corridorBlocks: Array<
    | { type: 'cold'; label: string }
    | { type: 'hot' }
    | { type: 'aisle'; aisle: Aisle; orientation: AisleOrientation }
  > = [];

  aisles.forEach((aisle, i) => {
    const orientation: AisleOrientation = i % 2 === 0 ? 'face-right' : 'face-left';
    if (i === 0) {
      corridorBlocks.push({ type: 'cold', label: `Cold Aisle ${Math.floor(i / 2) + 1}` });
    }
    corridorBlocks.push({ type: 'aisle', aisle, orientation });
    if (i % 2 === 0 && i + 1 < aisles.length) {
      corridorBlocks.push({ type: 'hot' });
    } else if (i % 2 === 1) {
      corridorBlocks.push({ type: 'cold', label: `Cold Aisle ${Math.floor(i / 2) + 2}` });
    } else if (i === aisles.length - 1 && i % 2 === 0) {
      corridorBlocks.push({ type: 'cold', label: `Cold Aisle ${Math.floor(i / 2) + 2}` });
    }
  });

  return (
    <div className="flex min-h-full flex-col gap-5" style={{ backgroundColor: '#060a12' }}>
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex-1">
          <nav className="mb-1 flex items-center gap-1 text-xs">
            <Link to="/cosmos/views/worldmap" className="text-orange-400 hover:underline">
              World Map
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
            <span className="font-semibold text-gray-200">{room.name}</span>
          </nav>
          <h2 className="text-xl font-bold text-white">{room.name}</h2>
          <p className="text-xs text-gray-500">
            Hot/Cold Aisle View — datacenter airflow architecture
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-3 rounded-lg border border-gray-800 px-3 py-1.5 text-[9px]">
            <span className="flex items-center gap-1.5 text-blue-300">
              <span
                className="inline-block h-2.5 w-4 rounded-sm"
                style={{ background: 'linear-gradient(90deg, #0c2340, #0e2f52)' }}
              />
              Cold aisle
            </span>
            <span className="flex items-center gap-1.5 text-orange-300">
              <span
                className="inline-block h-2.5 w-4 rounded-sm"
                style={{ background: 'linear-gradient(90deg, #2d0e06, #4a1208)' }}
              />
              Hot aisle
            </span>
            <span className="flex items-center gap-1.5 text-gray-400">
              Front face = health color
            </span>
          </div>

          {/* Health summary */}
          <div className="flex items-center gap-1">
            {(['CRIT', 'WARN', 'OK', 'UNKNOWN'] as const)
              .filter((s) => (summary[s] ?? 0) > 0)
              .map((s) => (
                <span
                  key={s}
                  className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold text-white"
                  style={{ backgroundColor: `${HEALTH_COLOR[s]}cc` }}
                >
                  {summary[s]} {s}
                </span>
              ))}
          </div>

          {/* Variant switcher */}
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-700">
            {VARIANTS.map((v) => (
              <button
                key={v.label}
                onClick={() => navigate(`/cosmos/views/${v.path}/${roomId}`)}
                className={`px-2 py-1.5 text-xs font-medium transition-colors ${
                  v.path === 'room-v10'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-500 hover:bg-white/5'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => roomId && loadHealth(roomId)}
            className="rounded-lg border border-gray-700 p-1.5 text-gray-400 hover:text-gray-200"
            title="Refresh"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Corridor view */}
      <div className="flex gap-5">
        <div className="flex flex-1 flex-col gap-3">
          {corridorBlocks.map((block, idx) => {
            if (block.type === 'cold') {
              return <ColdAisleCorridor key={`cold-${idx}`} label={block.label} />;
            }
            if (block.type === 'hot') {
              return <HotAisleCorridor key={`hot-${idx}`} />;
            }
            return (
              <AisleRackRow
                key={block.aisle.id}
                aisle={block.aisle}
                healthMap={healthMap}
                orientation={block.orientation}
                selectedRackId={selectedRack?.id ?? null}
                onSelect={handleSelect}
              />
            );
          })}

          {/* Architecture note */}
          <div
            className="rounded-xl border border-gray-800 px-4 py-3 text-[10px] text-gray-600"
            style={{ backgroundColor: '#080c15' }}
          >
            <span className="font-bold text-gray-500">Airflow pattern:</span> Cold air is drawn into
            the front of each rack from cold aisles. Hot exhaust exits the rear into hot aisles.
            Racks in alternating rows face each other to create dedicated hot corridors.
          </div>
        </div>

        {/* Rack info panel */}
        {selectedRack && (
          <div className="w-56 shrink-0">
            <RackInfoTooltip
              rack={selectedRack}
              health={healthMap[selectedRack.id] ?? 'UNKNOWN'}
              onNavigate={() => navigate(`/cosmos/views/rack/${selectedRack.id}`)}
              onClose={() => setSelectedRack(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
