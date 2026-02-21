import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw, Layers } from 'lucide-react';
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

// ── IsoRack ────────────────────────────────────────────────────────────────

type IsoRackProps = {
  rackId: string;
  health: string;
  uHeight: number;
  selected: boolean;
  flat: boolean;
  onClick: () => void;
};

const IsoRack = ({ rackId, health, uHeight, selected, flat, onClick }: IsoRackProps) => {
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN;
  const h = Math.max(28, Math.min(72, uHeight * 1.4));
  const isCrit = health === 'CRIT';

  if (flat) {
    return (
      <button
        onClick={onClick}
        title={`${rackId} — ${health}`}
        className={`rounded border transition-all duration-150 hover:scale-105 focus:outline-none ${isCrit ? 'animate-pulse' : ''}`}
        style={{
          width: 44,
          height: 56,
          backgroundColor: `${color}88`,
          borderColor: selected ? 'white' : color,
          borderWidth: selected ? 2 : 1,
          boxShadow: selected ? `0 0 0 2px white, 0 0 12px ${color}80` : undefined,
        }}
      >
        <span
          className="block truncate px-0.5 pt-1 text-center font-mono text-[7px] font-bold text-white"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          {rackId.split('-').pop()}
        </span>
      </button>
    );
  }

  // Isometric 3-face box
  const W = 44;
  const SIDE = 14;
  const TOP = 10;

  return (
    <button
      onClick={onClick}
      title={`${rackId} — ${health}`}
      className={`relative focus:outline-none ${isCrit ? 'animate-pulse' : ''}`}
      style={{ width: W + SIDE, height: h + TOP, flexShrink: 0 }}
    >
      {/* Top face */}
      <div
        className="absolute"
        style={{
          width: W,
          height: TOP,
          backgroundColor: `${color}dd`,
          transform: 'skewX(-30deg)',
          top: 0,
          left: SIDE,
          borderTop: selected ? '2px solid white' : `1px solid ${color}`,
          boxShadow: selected ? `0 0 12px ${color}` : undefined,
        }}
      />
      {/* Front face */}
      <div
        className="absolute"
        style={{
          width: W,
          height: h,
          backgroundColor: `${color}66`,
          top: TOP,
          left: 0,
          borderLeft: selected ? '2px solid white' : `1px solid ${color}50`,
          borderBottom: `1px solid ${color}50`,
        }}
      >
        <span
          className="block pt-1 text-center font-mono text-[7px] font-bold text-white"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
        >
          {rackId.split('-').pop()}
        </span>
      </div>
      {/* Side face */}
      <div
        className="absolute"
        style={{
          width: SIDE,
          height: h,
          backgroundColor: `${color}33`,
          top: TOP,
          left: W,
          transform: 'skewY(-60deg) translateY(-7px)',
          borderRight: `1px solid ${color}30`,
        }}
      />
    </button>
  );
};

// ── AisleIsoRow ────────────────────────────────────────────────────────────

type AisleIsoRowProps = {
  aisle: Aisle;
  healthMap: Record<string, string>;
  selectedRackId: string | null;
  flat: boolean;
  onSelect: (rack: Rack) => void;
};

const AisleIsoRow = ({ aisle, healthMap, selectedRackId, flat, onSelect }: AisleIsoRowProps) => (
  <div className="flex items-end gap-1">
    <div className="flex w-24 shrink-0 flex-col justify-end pb-1" style={{ alignSelf: 'flex-end' }}>
      <span className="font-mono text-[9px] font-bold tracking-widest text-gray-500 uppercase">
        {aisle.name}
      </span>
      <span className="font-mono text-[8px] text-gray-600">{aisle.racks?.length ?? 0} racks</span>
    </div>
    <div className="flex flex-wrap items-end gap-2">
      {(aisle.racks ?? []).map((rack) => (
        <IsoRack
          key={rack.id}
          rackId={rack.id}
          health={healthMap[rack.id] ?? 'UNKNOWN'}
          uHeight={rack.u_height}
          selected={selectedRackId === rack.id}
          flat={flat}
          onClick={() => onSelect(rack)}
        />
      ))}
    </div>
  </div>
);

// ── InfoPanel ──────────────────────────────────────────────────────────────

type InfoPanelProps = {
  rack: Rack;
  health: string;
  onNavigate: () => void;
  onClose: () => void;
};

const InfoPanel = ({ rack, health, onNavigate, onClose }: InfoPanelProps) => {
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
        className="rounded-lg py-2 text-xs font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        Open rack
      </button>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────

export const CosmosRoomPageV7 = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, string>>({});
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [flat, setFlat] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('cosmos-room-variant', 'room-v7');
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-yellow-400" />
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

  const aisles = [
    ...(room.aisles ?? []),
    ...(room.standalone_racks && room.standalone_racks.length > 0
      ? [{ id: '_standalone', name: 'STANDALONE', racks: room.standalone_racks }]
      : []),
  ];

  const handleSelect = (rack: Rack) => {
    setSelectedRack((prev) => (prev?.id === rack.id ? null : rack));
  };

  return (
    <div className="flex min-h-full flex-col gap-5" style={{ backgroundColor: '#06080f' }}>
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex-1">
          <nav className="mb-1 flex items-center gap-1 text-xs">
            <Link to="/cosmos/views/worldmap" className="text-yellow-400 hover:underline">
              World Map
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
            <span className="font-semibold text-gray-200">{room.name}</span>
          </nav>
          <h2 className="text-xl font-bold text-white">{room.name}</h2>
          <p className="text-xs text-gray-500">
            Isometric View — {aisles.length} aisles · {allRacks.length} racks
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px]">
            {(['OK', 'WARN', 'CRIT', 'UNKNOWN'] as const)
              .filter((s) => (summary[s] ?? 0) > 0)
              .map((s) => (
                <span key={s} className="flex items-center gap-1 text-gray-400">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: HEALTH_COLOR[s] }}
                  />
                  {summary[s]} {s}
                </span>
              ))}
          </div>

          {/* Tilt toggle */}
          <button
            onClick={() => setFlat((f) => !f)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              flat
                ? 'border-gray-700 text-gray-400 hover:text-gray-200'
                : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            {flat ? 'Flat' : 'Isometric'}
          </button>

          {/* Variant switcher */}
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-700">
            {VARIANTS.map((v) => (
              <button
                key={v.label}
                onClick={() => navigate(`/cosmos/views/${v.path}/${roomId}`)}
                className={`px-2 py-1.5 text-xs font-medium transition-colors ${
                  v.path === 'room-v7'
                    ? 'bg-yellow-500 text-black'
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

      {/* Isometric scene */}
      <div className="flex gap-5">
        <div
          className="flex-1 overflow-auto rounded-2xl border border-gray-800 p-8"
          style={{ backgroundColor: '#0a0d16' }}
        >
          <div className="flex flex-col gap-8">
            {aisles.map((aisle) => (
              <AisleIsoRow
                key={aisle.id}
                aisle={aisle}
                healthMap={healthMap}
                selectedRackId={selectedRack?.id ?? null}
                flat={flat}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="mt-8 flex items-center gap-4 border-t border-gray-800 pt-4">
            {Object.entries(HEALTH_COLOR).map(([state, color]) => (
              <span
                key={state}
                className="flex items-center gap-1.5 font-mono text-[9px] text-gray-400"
              >
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                {state}
              </span>
            ))}
            <span className="ml-auto font-mono text-[9px] text-gray-600">
              Heights proportional to rack U size
            </span>
          </div>
        </div>

        {/* Info panel */}
        {selectedRack && (
          <div className="w-56 shrink-0">
            <InfoPanel
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
