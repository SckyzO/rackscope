import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw, ExternalLink } from 'lucide-react';
import { api } from '../../../services/api';
import type { Room, Rack, Aisle, DeviceTemplate } from '../../../types';

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

// ── Helpers ────────────────────────────────────────────────────────────────

const computeUsedU = (rack: Rack, catalog: Record<string, DeviceTemplate>): number =>
  rack.devices.reduce((acc, dev) => acc + (catalog[dev.template_id]?.u_height ?? 1), 0);

const worstHealth = (racks: Rack[], healthMap: Record<string, string>): string =>
  racks.reduce((worst, r) => {
    const s = healthMap[r.id] ?? 'UNKNOWN';
    return (SEVERITY_ORDER[s] ?? 0) > (SEVERITY_ORDER[worst] ?? 0) ? s : worst;
  }, 'OK');

// ── SegmentedBar ───────────────────────────────────────────────────────────

type SegmentedBarProps = {
  rack: Rack;
  catalog: Record<string, DeviceTemplate>;
  health: string;
};

const SegmentedBar = ({ rack, catalog, health }: SegmentedBarProps) => {
  const color = HC[health] ?? HC.UNKNOWN;
  const totalU = rack.u_height;
  if (totalU === 0) return null;

  const segments = rack.devices
    .map((dev) => ({
      id: dev.id,
      name: dev.name,
      uPos: dev.u_position,
      uH: catalog[dev.template_id]?.u_height ?? 1,
    }))
    .sort((a, b) => a.uPos - b.uPos);

  return (
    <div
      className="flex h-4 w-full overflow-hidden rounded"
      style={{ border: `1px solid ${color}50`, backgroundColor: '#0d1729' }}
    >
      {segments.map((seg) => (
        <div
          key={seg.id}
          title={`${seg.name} (${seg.uH}U)`}
          style={{
            width: `${(seg.uH / totalU) * 100}%`,
            backgroundColor: `${color}cc`,
            borderRight: '1px solid #0d1729',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
};

// ── RackCapacityCard ───────────────────────────────────────────────────────

type RackCapacityCardProps = {
  rack: Rack;
  health: string;
  catalog: Record<string, DeviceTemplate>;
  selected: boolean;
  onClick: () => void;
};

const RackCapacityCard = ({ rack, health, catalog, selected, onClick }: RackCapacityCardProps) => {
  const color = HC[health] ?? HC.UNKNOWN;
  const usedU = computeUsedU(rack, catalog);
  const fillPct = rack.u_height > 0 ? Math.round((usedU / rack.u_height) * 100) : 0;
  const isCrit = health === 'CRIT';

  return (
    <button
      onClick={onClick}
      className="group relative w-full rounded-xl border px-4 py-3 text-left transition-all duration-150 focus:outline-none"
      style={{
        borderColor: selected ? color : `${color}25`,
        backgroundColor: selected ? `${color}10` : '#0c1525',
        borderLeftWidth: isCrit ? 4 : 1,
        borderLeftColor: color,
        boxShadow: selected ? `0 0 0 1px ${color}50` : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Health indicator + rack ID */}
        <div className="flex w-36 shrink-0 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${isCrit ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: color }}
            />
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold text-white"
              style={{ backgroundColor: color }}
            >
              {health}
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-gray-100">{rack.id}</span>
          <span className="font-mono text-[9px] text-gray-500">
            {rack.name !== rack.id ? rack.name : `${rack.u_height}U rack`}
          </span>
        </div>

        {/* Segmented fill bar */}
        <div className="flex flex-1 flex-col gap-1.5">
          <SegmentedBar rack={rack} catalog={catalog} health={health} />
          <div className="flex items-center gap-1 text-[9px] text-gray-500">
            <span>{rack.devices.length} devices</span>
            <span>·</span>
            <span>
              {usedU}/{rack.u_height}U occupied
            </span>
          </div>
        </div>

        {/* Fill % + U count */}
        <div className="flex w-16 shrink-0 flex-col items-end">
          <span className="font-mono text-xl font-bold" style={{ color }}>
            {fillPct}%
          </span>
          <span className="font-mono text-[9px] text-gray-500">{rack.u_height - usedU}U free</span>
        </div>
      </div>
    </button>
  );
};

// ── AisleSection ───────────────────────────────────────────────────────────

type AisleSectionProps = {
  aisle: Aisle;
  healthMap: Record<string, string>;
  catalog: Record<string, DeviceTemplate>;
  selectedRackId: string | null;
  onSelect: (rack: Rack) => void;
};

const AisleSection = ({
  aisle,
  healthMap,
  catalog,
  selectedRackId,
  onSelect,
}: AisleSectionProps) => {
  const sortedRacks = [...(aisle.racks ?? [])].sort(
    (a, b) =>
      (SEVERITY_ORDER[healthMap[b.id] ?? 'UNKNOWN'] ?? 0) -
      (SEVERITY_ORDER[healthMap[a.id] ?? 'UNKNOWN'] ?? 0)
  );

  const worst = worstHealth(aisle.racks ?? [], healthMap);
  const worstColor = HC[worst] ?? HC.UNKNOWN;

  const totalU = sortedRacks.reduce((s, r) => s + r.u_height, 0);
  const usedUSum = sortedRacks.reduce((s, r) => s + computeUsedU(r, catalog), 0);
  const aisleFill = totalU > 0 ? Math.round((usedUSum / totalU) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="h-4 w-1 rounded-full" style={{ backgroundColor: worstColor }} />
        <h3 className="font-mono text-xs font-bold tracking-widest text-gray-300 uppercase">
          {aisle.name}
        </h3>
        <span className="font-mono text-[10px] text-gray-500">
          {sortedRacks.length} racks · {aisleFill}% fill
        </span>
        <div className="h-px flex-1 bg-gray-800" />
      </div>

      <div className="flex flex-col gap-1.5">
        {sortedRacks.map((rack) => (
          <RackCapacityCard
            key={rack.id}
            rack={rack}
            health={healthMap[rack.id] ?? 'UNKNOWN'}
            catalog={catalog}
            selected={selectedRackId === rack.id}
            onClick={() => onSelect(rack)}
          />
        ))}
      </div>
    </div>
  );
};

// ── SidePanelDetail ────────────────────────────────────────────────────────

type SidePanelDetailProps = {
  rack: Rack;
  health: string;
  catalog: Record<string, DeviceTemplate>;
  onNavigate: () => void;
  onClose: () => void;
};

const SidePanelDetail = ({ rack, health, catalog, onNavigate, onClose }: SidePanelDetailProps) => {
  const color = HC[health] ?? HC.UNKNOWN;
  const usedU = computeUsedU(rack, catalog);
  const fillPct = rack.u_height > 0 ? Math.round((usedU / rack.u_height) * 100) : 0;

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border p-5"
      style={{ borderColor: `${color}40`, backgroundColor: '#0c1525' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-100">{rack.name}</h3>
          <p className="font-mono text-xs text-gray-500">{rack.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-lg px-2.5 py-1 text-xs font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {health}
          </span>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-700 px-2 py-1 text-[10px] text-gray-400 hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total', value: `${rack.u_height}U` },
          { label: 'Used', value: `${usedU}U · ${fillPct}%` },
          { label: 'Free', value: `${rack.u_height - usedU}U` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-gray-800/60 py-2 text-center">
            <p className="font-mono text-[9px] text-gray-400">{label}</p>
            <p className="font-mono text-sm font-bold" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        {rack.devices.slice(0, 8).map((dev) => {
          const uH = catalog[dev.template_id]?.u_height ?? 1;
          return (
            <div
              key={dev.id}
              className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-1.5"
            >
              <span className="font-mono text-[10px] text-gray-300">{dev.name}</span>
              <span className="font-mono text-[9px] text-gray-500">{uH}U</span>
            </div>
          );
        })}
        {rack.devices.length > 8 && (
          <p className="text-center font-mono text-[9px] text-gray-500">
            +{rack.devices.length - 8} more
          </p>
        )}
      </div>

      <button
        onClick={onNavigate}
        className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold text-white hover:opacity-90"
        style={{ backgroundColor: color }}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Open rack view
      </button>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────

export const CosmosRoomPageV6 = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, string>>({});
  const [catalog, setCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('cosmos-room-variant', 'room-v6');
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
        setRoom(roomData);
        const tmap: Record<string, DeviceTemplate> = {};
        (catalogData.device_templates ?? []).forEach((t) => {
          tmap[t.id] = t;
        });
        setCatalog(tmap);
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

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-green-500" />
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

  const aisles: Aisle[] = [
    ...(room.aisles ?? []),
    ...(room.standalone_racks && room.standalone_racks.length > 0
      ? [{ id: '_standalone', name: 'STANDALONE', racks: room.standalone_racks }]
      : []),
  ];

  const totalU = allRacks.reduce((s, r) => s + r.u_height, 0);
  const usedUTotal = allRacks.reduce((s, r) => s + computeUsedU(r, catalog), 0);
  const fillPct = totalU > 0 ? Math.round((usedUTotal / totalU) * 100) : 0;

  const summary = allRacks.reduce(
    (acc, rack) => {
      const s = healthMap[rack.id] ?? 'UNKNOWN';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex flex-col gap-5 bg-[#080f1e] p-1">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-start gap-4">
        <div className="flex-1">
          <nav className="mb-1 flex items-center gap-1 text-xs">
            <Link to="/cosmos/views/worldmap" className="text-green-400 hover:underline">
              World Map
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
            <span className="font-semibold text-gray-200">{room.name}</span>
          </nav>
          <h2 className="text-xl font-bold text-white">{room.name}</h2>
          <p className="text-xs text-gray-500">Capacity Bars — segmented U fill per rack</p>
        </div>

        {/* Global stats */}
        <div className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-2">
          {[
            { label: 'Racks', value: allRacks.length, color: '#94a3b8' },
            { label: 'Total', value: `${totalU}U`, color: '#94a3b8' },
            { label: 'Used', value: `${usedUTotal}U`, color: '#f59e0b' },
            {
              label: 'Fill',
              value: `${fillPct}%`,
              color: fillPct > 80 ? '#ef4444' : fillPct > 60 ? '#f59e0b' : '#22c55e',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center">
              <span className="font-mono text-[9px] text-gray-500 uppercase">{label}</span>
              <span className="font-mono text-sm font-bold" style={{ color }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {(['CRIT', 'WARN', 'OK', 'UNKNOWN'] as const)
              .filter((s) => (summary[s] ?? 0) > 0)
              .map((s) => (
                <span
                  key={s}
                  className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold text-white"
                  style={{ backgroundColor: `${HC[s]}cc` }}
                >
                  {summary[s]} {s}
                </span>
              ))}
          </div>

          <div className="inline-flex overflow-hidden rounded-lg border border-gray-700">
            {VARIANTS.map((v) => (
              <button
                key={v.label}
                onClick={() => navigate(`/cosmos/views/${v.path}/${roomId}`)}
                className={`px-2 py-1.5 text-xs font-medium transition-colors ${
                  v.path === 'room-v6'
                    ? 'bg-green-600 text-white'
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

      {/* Main content */}
      <div className="flex gap-5">
        <div className="flex flex-1 flex-col gap-6">
          {aisles.map((aisle) => (
            <AisleSection
              key={aisle.id}
              aisle={aisle}
              healthMap={healthMap}
              catalog={catalog}
              selectedRackId={selectedRack?.id ?? null}
              onSelect={(rack) => setSelectedRack((prev) => (prev?.id === rack.id ? null : rack))}
            />
          ))}
        </div>

        {selectedRack && (
          <div className="w-72 shrink-0">
            <SidePanelDetail
              rack={selectedRack}
              health={healthMap[selectedRack.id] ?? 'UNKNOWN'}
              catalog={catalog}
              onNavigate={() => navigate(`/cosmos/views/rack/${selectedRack.id}`)}
              onClose={() => setSelectedRack(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
