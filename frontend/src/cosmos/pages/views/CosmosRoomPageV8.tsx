import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw, ExternalLink } from 'lucide-react';
import { api } from '../../../services/api';
import type { Room, Rack, Aisle, DeviceTemplate, RackState } from '../../../types';

// ── Constants ──────────────────────────────────────────────────────────────

const HC: Record<string, string> = {
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

const PX_PER_U_MINI = 5;
const PX_PER_U_MAIN = 14;

// ── MiniRackElevation ──────────────────────────────────────────────────────

type MiniRackProps = {
  rack: Rack;
  health: string;
  catalog: Record<string, DeviceTemplate>;
  selected: boolean;
  onClick: () => void;
};

const MiniRackElevation = ({ rack, health, catalog, selected, onClick }: MiniRackProps) => {
  const uHeight = rack.u_height ?? 42;
  const totalPx = uHeight * PX_PER_U_MINI;
  const color = HC[health] ?? HC.UNKNOWN;

  const uMap = new Map<number, boolean>();
  rack.devices.forEach((dev) => {
    const h = catalog[dev.template_id]?.u_height ?? 1;
    for (let u = dev.u_position; u < dev.u_position + h; u++) {
      uMap.set(u, true);
    }
  });

  const slots = Array.from({ length: uHeight }, (_, i) => uHeight - i);

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 focus:outline-none">
      <div
        className="overflow-hidden rounded-sm"
        style={{
          width: 40,
          height: totalPx,
          border: `2px solid ${color}`,
          boxShadow: selected ? `0 0 0 2px ${color}40` : undefined,
          backgroundColor: '#0d1420',
        }}
      >
        {slots.map((u) => (
          <div
            key={u}
            style={{
              height: PX_PER_U_MINI,
              backgroundColor: uMap.get(u) ? color : undefined,
              opacity: uMap.get(u) ? 0.75 : 0.06,
            }}
          />
        ))}
      </div>
      <span className="font-mono text-[9px] text-gray-500">
        {rack.id.split('-').pop() ?? rack.id}
      </span>
      <span
        className="rounded px-1 py-0.5 text-[8px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {health}
      </span>
    </button>
  );
};

// ── RackElevationPanel ─────────────────────────────────────────────────────
// Full rack elevation rendered from catalog data (no external RackVisualizer dep)

type RackElevationPanelProps = {
  rack: Rack;
  health: string;
  catalog: Record<string, DeviceTemplate>;
  rackState: RackState | null;
};

const RackElevationPanel = ({ rack, health, catalog, rackState }: RackElevationPanelProps) => {
  const color = HC[health] ?? HC.UNKNOWN;
  const totalHeight = rack.u_height * PX_PER_U_MAIN;

  const deviceSlots = rack.devices
    .map((dev) => ({
      id: dev.id,
      name: dev.name,
      templateId: dev.template_id,
      uPos: dev.u_position,
      uH: catalog[dev.template_id]?.u_height ?? 1,
    }))
    .sort((a, b) => a.uPos - b.uPos);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-100">{rack.name}</h3>
          <p className="font-mono text-xs text-gray-500">
            {rack.id} · {rack.u_height}U · {rack.devices.length} devices
          </p>
        </div>
        <span
          className="rounded-lg px-2.5 py-1 text-xs font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {health}
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded-lg border"
        style={{
          height: Math.min(totalHeight, 560),
          borderColor: `${color}30`,
          backgroundColor: '#0a1020',
          overflowY: totalHeight > 560 ? 'auto' : 'hidden',
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
              style={{ height: PX_PER_U_MAIN, borderBottom: '1px solid #0d1929' }}
            >
              {(i + 1) % 5 === 0 && (
                <span className="font-mono text-[7px] text-gray-600">{i + 1}</span>
              )}
            </div>
          ))}
        </div>

        {/* Device area */}
        <div className="absolute inset-0 left-7">
          {/* Empty grid background */}
          {Array.from({ length: rack.u_height }).map((_, i) => (
            <div key={i} style={{ height: PX_PER_U_MAIN, borderBottom: '1px solid #0d1929' }} />
          ))}

          {/* Device blocks */}
          {deviceSlots.map((slot) => {
            const nodeHealth =
              (rackState?.nodes &&
                Object.values(rackState.nodes).find(
                  (n) => (n as { state?: string })?.state !== undefined
                )) ??
              null;
            const blockColor =
              nodeHealth && (nodeHealth as { state?: string })?.state
                ? (HC[(nodeHealth as { state: string }).state] ?? color)
                : color;

            return (
              <div
                key={slot.id}
                className="absolute right-1 left-1 rounded-sm"
                style={{
                  top: (slot.uPos - 1) * PX_PER_U_MAIN + 1,
                  height: slot.uH * PX_PER_U_MAIN - 2,
                  backgroundColor: `${blockColor}40`,
                  border: `1px solid ${blockColor}70`,
                }}
              >
                <span
                  className="block truncate px-1.5 font-mono text-[9px] font-semibold text-white"
                  style={{
                    lineHeight: `${Math.max(slot.uH * PX_PER_U_MAIN - 2, 12)}px`,
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  }}
                >
                  {slot.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Node health grid */}
      {rackState?.nodes && Object.keys(rackState.nodes).length > 0 && (
        <div>
          <p className="mb-1.5 font-mono text-[9px] font-bold tracking-wider text-gray-500 uppercase">
            Nodes ({Object.keys(rackState.nodes).length})
          </p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(rackState.nodes)
              .slice(0, 64)
              .map(([node, ns]) => {
                const s = (ns as { state?: string }).state ?? 'UNKNOWN';
                return (
                  <div
                    key={node}
                    title={`${node}: ${s}`}
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: HC[s] ?? HC.UNKNOWN }}
                  />
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── AisleTab ───────────────────────────────────────────────────────────────

type AisleTabProps = {
  aisle: Aisle;
  healthMap: Record<string, string>;
  active: boolean;
  onClick: () => void;
};

const AisleTab = ({ aisle, healthMap, active, onClick }: AisleTabProps) => {
  const worst = (aisle.racks ?? []).reduce((w, r) => {
    const s = healthMap[r.id] ?? 'UNKNOWN';
    return (SEVERITY_ORDER[s] ?? 0) > (SEVERITY_ORDER[w] ?? 0) ? s : w;
  }, 'OK');
  const color = HC[worst] ?? HC.UNKNOWN;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all focus:outline-none"
      style={{
        borderColor: active ? color : '#1e293b',
        backgroundColor: active ? `${color}20` : '#0c1525',
        color: active ? 'white' : '#94a3b8',
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {aisle.name}
      <span className="font-mono text-[9px] opacity-60">{aisle.racks?.length ?? 0}</span>
    </button>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────

export const CosmosRoomPageV8 = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, string>>({});
  const [catalog, setCatalog] = useState<Record<string, DeviceTemplate>>({});
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
        const [roomData, catalogData] = await Promise.all([
          api.getRoomLayout(roomId),
          api.getCatalog(),
        ]);
        if (!active) return;

        const tmap: Record<string, DeviceTemplate> = {};
        (catalogData.device_templates ?? []).forEach((t) => {
          tmap[t.id] = t;
        });
        setCatalog(tmap);
        setRoom(roomData);

        const firstAisle = roomData.aisles?.[0] ?? null;
        setSelectedAisle(firstAisle);
        const firstRack = firstAisle?.racks?.[0] ?? null;
        setSelectedRack(firstRack);

        setLoading(false);
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

  useEffect(() => {
    if (!selectedRack) return;
    let active = true;
    const fetch = async () => {
      try {
        const data = await api.getRackState(selectedRack.id, false);
        if (active) setRackState(data);
      } catch {
        if (active) setRackState(null);
      }
    };
    fetch();
    return () => {
      active = false;
    };
  }, [selectedRack]);

  // Auto-select worst rack when health loads
  useEffect(() => {
    if (!selectedAisle || Object.keys(healthMap).length === 0 || selectedRack) return;
    const racks = selectedAisle.racks ?? [];
    const sorted = [...racks].sort(
      (a, b) =>
        (SEVERITY_ORDER[healthMap[b.id] ?? 'UNKNOWN'] ?? 0) -
        (SEVERITY_ORDER[healthMap[a.id] ?? 'UNKNOWN'] ?? 0)
    );
    const best = sorted[0];
    if (best) {
      const tid = setTimeout(() => setSelectedRack(best), 0);
      return () => clearTimeout(tid);
    }
    return undefined;
  }, [healthMap, selectedAisle, selectedRack]);

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

  const aislesAll: Aisle[] = [
    ...(room.aisles ?? []),
    ...(room.standalone_racks && room.standalone_racks.length > 0
      ? [{ id: '_standalone', name: 'STANDALONE', racks: room.standalone_racks }]
      : []),
  ];

  const currentRacks = [...(selectedAisle?.racks ?? [])].sort(
    (a, b) =>
      (SEVERITY_ORDER[healthMap[b.id] ?? 'UNKNOWN'] ?? 0) -
      (SEVERITY_ORDER[healthMap[a.id] ?? 'UNKNOWN'] ?? 0)
  );

  const handleAisleSelect = (aisle: Aisle) => {
    setSelectedAisle(aisle);
    setRackState(null);
    const sorted = [...(aisle.racks ?? [])].sort(
      (a, b) =>
        (SEVERITY_ORDER[healthMap[b.id] ?? 'UNKNOWN'] ?? 0) -
        (SEVERITY_ORDER[healthMap[a.id] ?? 'UNKNOWN'] ?? 0)
    );
    setSelectedRack(sorted[0] ?? null);
  };

  return (
    <div className="flex flex-col gap-4" style={{ backgroundColor: '#070b14' }}>
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
          <p className="text-xs text-gray-500">Aisle Walk-Through — mini rack elevations</p>
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
        {aislesAll.map((aisle) => (
          <AisleTab
            key={aisle.id}
            aisle={aisle}
            healthMap={healthMap}
            active={selectedAisle?.id === aisle.id}
            onClick={() => handleAisleSelect(aisle)}
          />
        ))}
      </div>

      {/* Main layout: mini racks left + full elevation right */}
      <div className="flex gap-4">
        {/* Left: mini rack column */}
        <div className="flex shrink-0 flex-wrap gap-4 rounded-2xl border border-gray-800 bg-[#0a1020] p-4">
          <div className="w-full">
            <p className="mb-3 font-mono text-[9px] font-bold tracking-widest text-gray-600 uppercase">
              {selectedAisle?.name ?? 'Racks'} ({currentRacks.length})
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            {currentRacks.map((rack) => (
              <MiniRackElevation
                key={rack.id}
                rack={rack}
                health={healthMap[rack.id] ?? 'UNKNOWN'}
                catalog={catalog}
                selected={selectedRack?.id === rack.id}
                onClick={() => {
                  setSelectedRack(rack);
                  setRackState(null);
                }}
              />
            ))}
          </div>
        </div>

        {/* Right: full elevation */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-800 p-5">
          {selectedRack ? (
            <>
              <RackElevationPanel
                rack={selectedRack}
                health={healthMap[selectedRack.id] ?? 'UNKNOWN'}
                catalog={catalog}
                rackState={rackState}
              />
              <button
                onClick={() => navigate(`/cosmos/views/rack/${selectedRack.id}`)}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold text-white hover:opacity-90"
                style={{
                  backgroundColor: HC[healthMap[selectedRack.id] ?? 'UNKNOWN'] ?? HC.UNKNOWN,
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open full rack view
              </button>
            </>
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center text-gray-600">
              Select a rack to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
