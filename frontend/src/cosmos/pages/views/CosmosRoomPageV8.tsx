import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { api } from '../../../services/api';
import type { Room, Rack, Aisle, RackState } from '../../../types';

// ── Constants ──────────────────────────────────────────────────────────────

const HEALTH_COLOR: Record<string, string> = {
  OK: '#22c55e',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#374151',
};

const SEVERITY_ORDER: Record<string, number> = { CRIT: 4, WARN: 3, UNKNOWN: 2, OK: 1 };

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

// ── HealthIcon ─────────────────────────────────────────────────────────────

const HealthIcon = ({ health, size = 14 }: { health: string; size?: number }) => {
  if (health === 'CRIT')
    return <AlertTriangle style={{ width: size, height: size, color: HEALTH_COLOR.CRIT }} />;
  if (health === 'WARN')
    return <AlertTriangle style={{ width: size, height: size, color: HEALTH_COLOR.WARN }} />;
  if (health === 'OK')
    return <CheckCircle2 style={{ width: size, height: size, color: HEALTH_COLOR.OK }} />;
  return <HelpCircle style={{ width: size, height: size, color: HEALTH_COLOR.UNKNOWN }} />;
};

// ── RackListCard ───────────────────────────────────────────────────────────

type RackListCardProps = {
  rack: Rack;
  health: string;
  selected: boolean;
  onClick: () => void;
};

const RackListCard = ({ rack, health, selected, onClick }: RackListCardProps) => {
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN;
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-100 hover:border-gray-600 focus:outline-none"
      style={{
        borderColor: selected ? color : '#1e293b',
        backgroundColor: selected ? `${color}15` : 'transparent',
      }}
    >
      <HealthIcon health={health} size={13} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs font-semibold text-gray-200">{rack.id}</p>
        <p className="font-mono text-[9px] text-gray-500">
          {rack.u_height}U · {rack.devices.length} dev
        </p>
      </div>
      {selected && <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />}
    </button>
  );
};

// ── RackElevationMini ─────────────────────────────────────────────────────
// Simplified elevation showing devices as colored U-blocks

type RackElevationMiniProps = {
  rack: Rack;
  health: string;
  rackState: RackState | null;
};

const RackElevationMini = ({ rack, health, rackState }: RackElevationMiniProps) => {
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN;
  const PX_PER_U = 14;
  const totalHeight = rack.u_height * PX_PER_U;

  // Build U-slot occupancy map
  const slots: Array<{
    id: string;
    name: string;
    start: number;
    height: number;
    nodeHealth: string;
  }> = [];
  rack.devices.forEach((dev) => {
    const uStart = dev.u_position ?? 1;
    const uH = 1; // We don't have template info here, default 1U
    slots.push({
      id: dev.id,
      name: dev.name,
      start: uStart,
      height: uH,
      nodeHealth: health,
    });
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Rack header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-100">{rack.name}</h3>
          <p className="font-mono text-xs text-gray-500">
            {rack.id} · {rack.u_height}U
          </p>
        </div>
        <span
          className="rounded-lg px-2.5 py-1 text-xs font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {health}
        </span>
      </div>

      {/* Elevation chassis */}
      <div
        className="relative overflow-hidden rounded-lg border"
        style={{
          height: Math.min(totalHeight, 560),
          borderColor: `${color}30`,
          backgroundColor: '#0a1020',
        }}
      >
        {/* U ruler */}
        <div
          className="absolute top-0 bottom-0 left-0 w-7 border-r"
          style={{ borderColor: '#1e293b', backgroundColor: '#070c15' }}
        >
          {Array.from({ length: rack.u_height }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-end pr-1"
              style={{ height: PX_PER_U, borderBottom: '1px solid #0d1929' }}
            >
              {(i + 1) % 5 === 0 && (
                <span className="font-mono text-[7px] text-gray-600">{i + 1}</span>
              )}
            </div>
          ))}
        </div>

        {/* Device slots */}
        <div className="absolute inset-0 left-7">
          {/* Empty background grid */}
          {Array.from({ length: rack.u_height }).map((_, i) => (
            <div
              key={i}
              style={{
                height: PX_PER_U,
                borderBottom: '1px solid #0d1929',
              }}
            />
          ))}

          {/* Devices */}
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="absolute right-1 left-1 rounded-sm"
              style={{
                top: (slot.start - 1) * PX_PER_U + 1,
                height: slot.height * PX_PER_U - 2,
                backgroundColor: `${color}40`,
                border: `1px solid ${color}60`,
              }}
            >
              <span
                className="block truncate px-1.5 font-mono text-[8px] font-semibold text-white"
                style={{
                  lineHeight: `${slot.height * PX_PER_U - 2}px`,
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                }}
              >
                {slot.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Node health dots if available */}
      {rackState?.nodes && Object.keys(rackState.nodes).length > 0 && (
        <div>
          <p className="mb-1.5 font-mono text-[9px] font-bold tracking-wider text-gray-500 uppercase">
            Nodes ({Object.keys(rackState.nodes).length})
          </p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(rackState.nodes)
              .slice(0, 48)
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
    </div>
  );
};

// ── AisleStats ─────────────────────────────────────────────────────────────

type AisleStatsProps = {
  aisle: Aisle;
  healthMap: Record<string, string>;
};

const AisleStats = ({ aisle, healthMap }: AisleStatsProps) => {
  const counts = (aisle.racks ?? []).reduce(
    (acc, r) => {
      const s = healthMap[r.id] ?? 'UNKNOWN';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/40 px-4 py-2 text-[10px]">
      <span className="font-mono font-bold text-gray-400 uppercase">{aisle.name}</span>
      <span className="text-gray-600">|</span>
      {(['CRIT', 'WARN', 'OK', 'UNKNOWN'] as const).map((s) =>
        (counts[s] ?? 0) > 0 ? (
          <span key={s} className="flex items-center gap-1" style={{ color: HEALTH_COLOR[s] }}>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: HEALTH_COLOR[s] }} />
            {counts[s]} {s}
          </span>
        ) : null
      )}
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────

export const CosmosRoomPageV8 = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, string>>({});
  const [selectedAisle, setSelectedAisle] = useState<Aisle | null>(null);
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [rackState, setRackState] = useState<RackState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('cosmos-room-variant', 'room-v8');
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
        if (!active) return;
        setRoom(roomData);
        setLoading(false);
        // Auto-select first aisle
        const firstAisle = roomData.aisles?.[0] ?? null;
        setSelectedAisle(firstAisle);
        // Auto-select first CRIT rack or first rack
        if (firstAisle) {
          const racks = firstAisle.racks ?? [];
          const critRack = racks.find((r) => (healthMap[r.id] ?? 'UNKNOWN') === 'CRIT');
          setSelectedRack(critRack ?? racks[0] ?? null);
        }
      } catch {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Auto-select worst rack when health loads
  useEffect(() => {
    if (!selectedAisle || Object.keys(healthMap).length === 0) return;
    const racks = selectedAisle.racks ?? [];
    const sorted = [...racks].sort(
      (a, b) =>
        (SEVERITY_ORDER[healthMap[b.id] ?? 'UNKNOWN'] ?? 0) -
        (SEVERITY_ORDER[healthMap[a.id] ?? 'UNKNOWN'] ?? 0)
    );
    if (sorted[0] && !selectedRack) setSelectedRack(sorted[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthMap, selectedAisle]);

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

  useEffect(() => {
    if (!selectedRack) return;
    let active = true;
    const fetchRackState = async () => {
      try {
        const data = await api.getRackState(selectedRack.id, false);
        if (active) setRackState(data);
      } catch {
        if (active) setRackState(null);
      }
    };
    fetchRackState();
    return () => {
      active = false;
    };
  }, [selectedRack]);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-blue-400" />
      </div>
    );

  if (!room)
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">Room not found</div>
    );

  const aislesWithStandalone: Aisle[] = [
    ...(room.aisles ?? []),
    ...(room.standalone_racks && room.standalone_racks.length > 0
      ? [{ id: '_standalone', name: 'STANDALONE', racks: room.standalone_racks }]
      : []),
  ];

  const currentRacks = selectedAisle?.racks ?? [];
  const sortedRacks = [...currentRacks].sort(
    (a, b) =>
      (SEVERITY_ORDER[healthMap[b.id] ?? 'UNKNOWN'] ?? 0) -
      (SEVERITY_ORDER[healthMap[a.id] ?? 'UNKNOWN'] ?? 0)
  );

  const handleAisleSelect = (aisle: Aisle) => {
    setSelectedAisle(aisle);
    const racks = aisle.racks ?? [];
    const sorted = [...racks].sort(
      (a, b) =>
        (SEVERITY_ORDER[healthMap[b.id] ?? 'UNKNOWN'] ?? 0) -
        (SEVERITY_ORDER[healthMap[a.id] ?? 'UNKNOWN'] ?? 0)
    );
    setSelectedRack(sorted[0] ?? null);
    setRackState(null);
  };

  return (
    <div className="flex min-h-full flex-col gap-4" style={{ backgroundColor: '#070b14' }}>
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <div className="flex-1">
          <nav className="mb-1 flex items-center gap-1 text-xs">
            <Link to="/cosmos/views/worldmap" className="text-blue-400 hover:underline">
              World Map
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
            <span className="font-semibold text-gray-200">{room.name}</span>
          </nav>
          <h2 className="text-xl font-bold text-white">{room.name}</h2>
          <p className="text-xs text-gray-500">Aisle Walk-Through — navigate aisle by aisle</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-700">
            {VARIANTS.map((v) => (
              <button
                key={v.label}
                onClick={() => navigate(`/cosmos/views/${v.path}/${roomId}`)}
                className={`px-2 py-1.5 text-xs font-medium transition-colors ${
                  v.path === 'room-v8' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-white/5'
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

      {/* Aisle tabs */}
      <div className="flex shrink-0 flex-wrap gap-2">
        {aislesWithStandalone.map((aisle) => {
          const worst = (aisle.racks ?? []).reduce((w, r) => {
            const s = healthMap[r.id] ?? 'UNKNOWN';
            return (SEVERITY_ORDER[s] ?? 0) > (SEVERITY_ORDER[w] ?? 0) ? s : w;
          }, 'OK');
          const color = HEALTH_COLOR[worst] ?? HEALTH_COLOR.UNKNOWN;
          const isActive = selectedAisle?.id === aisle.id;

          return (
            <button
              key={aisle.id}
              onClick={() => handleAisleSelect(aisle)}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all focus:outline-none"
              style={{
                borderColor: isActive ? color : '#1e293b',
                backgroundColor: isActive ? `${color}20` : '#0c1525',
                color: isActive ? 'white' : '#94a3b8',
              }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              {aisle.name}
              <span className="font-mono text-[9px] opacity-60">{aisle.racks?.length ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Aisle stats */}
      {selectedAisle && <AisleStats aisle={selectedAisle} healthMap={healthMap} />}

      {/* Main content: rack list + elevation */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Rack list */}
        <div className="flex w-48 shrink-0 flex-col gap-1.5 overflow-y-auto">
          <p className="font-mono text-[9px] font-bold tracking-widest text-gray-600 uppercase">
            Racks ({sortedRacks.length})
          </p>
          {sortedRacks.map((rack) => (
            <RackListCard
              key={rack.id}
              rack={rack}
              health={healthMap[rack.id] ?? 'UNKNOWN'}
              selected={selectedRack?.id === rack.id}
              onClick={() => {
                setSelectedRack(rack);
                setRackState(null);
              }}
            />
          ))}
        </div>

        {/* Rack elevation detail */}
        <div
          className="flex-1 overflow-y-auto rounded-2xl border border-gray-800 p-5"
          style={{ backgroundColor: '#0a1020' }}
        >
          {selectedRack ? (
            <>
              <RackElevationMini
                rack={selectedRack}
                health={healthMap[selectedRack.id] ?? 'UNKNOWN'}
                rackState={rackState}
              />
              <button
                onClick={() => navigate(`/cosmos/views/rack/${selectedRack.id}`)}
                className="mt-4 w-full rounded-lg py-2.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
                style={{
                  backgroundColor:
                    HEALTH_COLOR[healthMap[selectedRack.id] ?? 'UNKNOWN'] ?? '#374151',
                }}
              >
                Open full rack view
              </button>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-600">
              Select a rack to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
