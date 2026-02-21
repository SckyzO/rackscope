import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw, Database } from 'lucide-react';
import { api } from '../../../services/api';
import type { Room, Rack, Aisle, DeviceTemplate } from '../../../types';

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

// ── Helpers ────────────────────────────────────────────────────────────────

const computeUsedU = (rack: Rack, templateMap: Record<string, DeviceTemplate>): number =>
  rack.devices.reduce((acc, dev) => {
    const tpl = templateMap[dev.template_id];
    return acc + (tpl?.u_height ?? 1);
  }, 0);

const worstHealth = (racks: Rack[], healthMap: Record<string, string>): string =>
  racks.reduce((worst, r) => {
    const s = healthMap[r.id] ?? 'UNKNOWN';
    return (SEVERITY_ORDER[s] ?? 0) > (SEVERITY_ORDER[worst] ?? 0) ? s : worst;
  }, 'OK');

// ── ProgressBar ────────────────────────────────────────────────────────────

type ProgressBarProps = {
  value: number;
  max: number;
  color: string;
  label: string;
  valueLabel: string;
};

const ProgressBar = ({ value, max, color, label, valueLabel }: ProgressBarProps) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono font-semibold text-gray-300">{valueLabel}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

// ── RackCapacityCard ───────────────────────────────────────────────────────

type RackCapacityCardProps = {
  rack: Rack;
  health: string;
  usedU: number;
  selected: boolean;
  onClick: () => void;
};

const RackCapacityCard = ({ rack, health, usedU, selected, onClick }: RackCapacityCardProps) => {
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN;
  const fillPct = rack.u_height > 0 ? Math.round((usedU / rack.u_height) * 100) : 0;
  const deviceCount = rack.devices.length;
  const maxDevices = Math.max(rack.u_height, 1);

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-xl border px-4 py-3 text-left transition-all duration-150 hover:shadow-lg focus:outline-none"
      style={{
        borderColor: selected ? color : `${color}30`,
        backgroundColor: selected ? `${color}12` : '#0f172a',
        boxShadow: selected ? `0 0 0 1px ${color}60, inset 0 0 20px ${color}08` : undefined,
      }}
    >
      <div className="flex items-start gap-4">
        {/* Health badge + rack ID */}
        <div className="flex w-32 shrink-0 flex-col gap-1">
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold text-white"
            style={{ backgroundColor: color }}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full bg-white ${health === 'CRIT' ? 'animate-pulse' : ''}`}
            />
            {health}
          </span>
          <span className="font-mono text-[10px] font-semibold text-gray-200">{rack.id}</span>
          <span className="font-mono text-[9px] text-gray-500">{rack.u_height}U rack</span>
        </div>

        {/* Bars */}
        <div className="flex flex-1 flex-col gap-2">
          <ProgressBar
            value={usedU}
            max={rack.u_height}
            color={color}
            label="U Fill"
            valueLabel={`${fillPct}%  (${usedU}/${rack.u_height}U)`}
          />
          <ProgressBar
            value={deviceCount}
            max={maxDevices}
            color={`${color}80`}
            label="Devices"
            valueLabel={`${deviceCount}`}
          />
        </div>

        {/* Free U badge */}
        <div className="flex w-14 shrink-0 flex-col items-end gap-0.5">
          <span className="font-mono text-lg font-bold" style={{ color }}>
            {rack.u_height - usedU}
          </span>
          <span className="text-[9px] text-gray-500">U free</span>
        </div>
      </div>
    </button>
  );
};

// ── AisleSection ───────────────────────────────────────────────────────────

type AisleSectionProps = {
  aisle: Aisle;
  healthMap: Record<string, string>;
  templateMap: Record<string, DeviceTemplate>;
  selectedRackId: string | null;
  onSelect: (rack: Rack) => void;
};

const AisleSection = ({
  aisle,
  healthMap,
  templateMap,
  selectedRackId,
  onSelect,
}: AisleSectionProps) => {
  const sortedRacks = [...(aisle.racks ?? [])].sort((a, b) => {
    const ha = healthMap[a.id] ?? 'UNKNOWN';
    const hb = healthMap[b.id] ?? 'UNKNOWN';
    return (SEVERITY_ORDER[hb] ?? 0) - (SEVERITY_ORDER[ha] ?? 0);
  });

  const worst = worstHealth(aisle.racks ?? [], healthMap);
  const worstColor = HEALTH_COLOR[worst] ?? HEALTH_COLOR.UNKNOWN;

  const totalU = sortedRacks.reduce((s, r) => s + r.u_height, 0);
  const usedUSum = sortedRacks.reduce((s, r) => s + computeUsedU(r, templateMap), 0);
  const aisleFill = totalU > 0 ? Math.round((usedUSum / totalU) * 100) : 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="h-3 w-1 rounded-full" style={{ backgroundColor: worstColor }} />
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
            usedU={computeUsedU(rack, templateMap)}
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
  usedU: number;
  onNavigate: () => void;
  onClose: () => void;
};

const SidePanelDetail = ({ rack, health, usedU, onNavigate, onClose }: SidePanelDetailProps) => {
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN;
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

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Total', value: `${rack.u_height}U`, sub: 'capacity' },
          { label: 'Used', value: `${usedU}U`, sub: `${fillPct}% fill` },
          { label: 'Free', value: `${rack.u_height - usedU}U`, sub: 'available' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-lg bg-gray-800/60 py-2 text-center">
            <p className="font-mono text-xs text-gray-400">{label}</p>
            <p className="font-mono text-base font-bold" style={{ color }}>
              {value}
            </p>
            <p className="font-mono text-[9px] text-gray-500">{sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        {rack.devices.slice(0, 8).map((dev) => (
          <div
            key={dev.id}
            className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-1.5"
          >
            <span className="font-mono text-[10px] text-gray-300">{dev.name}</span>
            <span className="font-mono text-[9px] text-gray-500">{dev.template_id}</span>
          </div>
        ))}
        {rack.devices.length > 8 && (
          <p className="text-center font-mono text-[9px] text-gray-500">
            +{rack.devices.length - 8} more devices
          </p>
        )}
      </div>

      <button
        onClick={onNavigate}
        className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
        style={{ backgroundColor: color }}
      >
        <Database className="h-3.5 w-3.5" />
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
  const [templateMap, setTemplateMap] = useState<Record<string, DeviceTemplate>>({});
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
        setTemplateMap(tmap);
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

  const totalU = allRacks.reduce((s, r) => s + r.u_height, 0);
  const usedU = allRacks.reduce((s, r) => s + computeUsedU(r, templateMap), 0);
  const freeU = totalU - usedU;
  const fillPct = totalU > 0 ? Math.round((usedU / totalU) * 100) : 0;

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
    <div className="flex min-h-full flex-col gap-5 bg-[#080f1e] p-1">
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
          <p className="text-xs text-gray-500">Capacity View — physical utilization</p>
        </div>

        {/* Global stats */}
        <div className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-2 text-xs">
          {[
            { label: 'Total', value: `${totalU}U`, color: '#94a3b8' },
            { label: 'Used', value: `${usedU}U`, color: '#f59e0b' },
            { label: 'Free', value: `${freeU}U`, color: '#22c55e' },
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
          {/* Health summary pills */}
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
        {/* Aisle list */}
        <div className="flex flex-1 flex-col gap-6">
          {aisles.map((aisle) => (
            <AisleSection
              key={aisle.id}
              aisle={aisle}
              healthMap={healthMap}
              templateMap={templateMap}
              selectedRackId={selectedRack?.id ?? null}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Side panel */}
        {selectedRack && (
          <div className="w-72 shrink-0">
            <SidePanelDetail
              rack={selectedRack}
              health={healthMap[selectedRack.id] ?? 'UNKNOWN'}
              usedU={computeUsedU(selectedRack, templateMap)}
              onNavigate={() => navigate(`/cosmos/views/rack/${selectedRack.id}`)}
              onClose={() => setSelectedRack(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
