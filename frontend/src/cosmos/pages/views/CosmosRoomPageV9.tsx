import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw, AlertOctagon, Server, Zap } from 'lucide-react';
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

const formatTime = (d: Date) =>
  d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

// ── AlertFeedItem ──────────────────────────────────────────────────────────

type AlertFeedItemProps = {
  rackId: string;
  health: string;
  aisleName: string;
  onClick: () => void;
};

const AlertFeedItem = ({ rackId, health, aisleName, onClick }: AlertFeedItemProps) => {
  const color = HC[health] ?? HC.UNKNOWN;
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg border-l-4 px-3 py-2 text-left transition-colors hover:bg-white/5 focus:outline-none"
      style={{ borderLeftColor: color, backgroundColor: `${color}08` }}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${health === 'CRIT' ? 'animate-pulse' : ''}`}
        style={{ backgroundColor: color }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs font-bold text-gray-200">{rackId}</p>
        <p className="font-mono text-[9px] text-gray-500">{aisleName}</p>
      </div>
      <span
        className="shrink-0 rounded px-1 py-0.5 font-mono text-[8px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {health}
      </span>
    </button>
  );
};

// ── HeatCell ───────────────────────────────────────────────────────────────

type HeatCellProps = {
  rack: Rack;
  health: string;
  selected: boolean;
  onClick: () => void;
};

const HeatCell = ({ rack, health, selected, onClick }: HeatCellProps) => {
  const color = HC[health] ?? HC.UNKNOWN;
  const isCrit = health === 'CRIT';

  return (
    <button
      onClick={onClick}
      title={`${rack.id} — ${health}`}
      className={`relative flex flex-col items-center justify-end overflow-hidden rounded transition-all duration-100 hover:scale-105 focus:outline-none ${isCrit ? 'animate-pulse' : ''}`}
      style={{
        width: 80,
        height: 100,
        backgroundColor: `${color}88`,
        border: `1.5px solid ${selected ? 'white' : color}`,
        boxShadow: selected
          ? `0 0 0 2px white, 0 0 16px ${color}`
          : isCrit
            ? `0 0 16px ${color}60`
            : undefined,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.2) 100%)',
        }}
      />
      <span
        className="relative z-10 w-full truncate px-1 pb-2 text-center font-mono text-[8px] font-bold text-white"
        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
      >
        {rack.id}
      </span>
    </button>
  );
};

// ── HeatMapGrid ────────────────────────────────────────────────────────────

type HeatMapGridProps = {
  aisles: Aisle[];
  healthMap: Record<string, string>;
  selectedRackId: string | null;
  onSelect: (rack: Rack) => void;
};

const HeatMapGrid = ({ aisles, healthMap, selectedRackId, onSelect }: HeatMapGridProps) => (
  <div className="flex flex-col gap-5">
    {aisles.map((aisle) => {
      const worst = (aisle.racks ?? []).reduce((w, r) => {
        const s = healthMap[r.id] ?? 'UNKNOWN';
        return (SEVERITY_ORDER[s] ?? 0) > (SEVERITY_ORDER[w] ?? 0) ? s : w;
      }, 'OK');
      const worstColor = HC[worst] ?? HC.UNKNOWN;

      return (
        <div key={aisle.id} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: worstColor }} />
            <span className="font-mono text-[10px] font-bold tracking-widest text-gray-400 uppercase">
              {aisle.name}
            </span>
            <span className="font-mono text-[9px] text-gray-600">
              {aisle.racks?.length ?? 0} racks
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(aisle.racks ?? []).map((rack) => (
              <HeatCell
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
    })}
  </div>
);

// ── AisleMiniBar ───────────────────────────────────────────────────────────

type AisleMiniBarProps = {
  aisle: Aisle;
  healthMap: Record<string, string>;
};

const AisleMiniBar = ({ aisle, healthMap }: AisleMiniBarProps) => {
  const counts = (aisle.racks ?? []).reduce(
    (acc, r) => {
      const s = healthMap[r.id] ?? 'UNKNOWN';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const hasCrit = (counts['CRIT'] ?? 0) > 0;
  const hasWarn = (counts['WARN'] ?? 0) > 0;
  const worst = hasCrit ? 'CRIT' : hasWarn ? 'WARN' : 'OK';
  const color = HC[worst] ?? HC.UNKNOWN;
  const total = aisle.racks?.length ?? 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] font-bold text-gray-400 uppercase">{aisle.name}</span>
        <div className="flex gap-1">
          {(['CRIT', 'WARN', 'OK'] as const).map((s) =>
            (counts[s] ?? 0) > 0 ? (
              <span
                key={s}
                className="rounded px-1 py-0.5 font-mono text-[7px] font-bold text-white"
                style={{ backgroundColor: HC[s] }}
              >
                {counts[s]}
              </span>
            ) : null
          )}
        </div>
      </div>
      <div
        className="flex h-1.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: '#1e293b' }}
      >
        {(['CRIT', 'WARN', 'OK', 'UNKNOWN'] as const).map((s) => {
          const pct = total > 0 ? ((counts[s] ?? 0) / total) * 100 : 0;
          return pct > 0 ? (
            <div key={s} style={{ width: `${pct}%`, backgroundColor: HC[s] }} />
          ) : null;
        })}
      </div>
      <span className="font-mono text-[8px]" style={{ color }}>
        {total} racks
      </span>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────

export const CosmosRoomPageV9 = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [room, setRoom] = useState<Room | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, string>>({});
  const [catalog, setCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('cosmos-room-variant', 'room-v9');
  }, []);

  useEffect(() => {
    clockRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => {
      if (clockRef.current) clearInterval(clockRef.current);
    };
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
    const t = setInterval(poll, 15000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [roomId, loading]);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-red-500" />
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

  const aislesAll: Aisle[] = [
    ...(room.aisles ?? []),
    ...(room.standalone_racks && room.standalone_racks.length > 0
      ? [{ id: '_standalone', name: 'STANDALONE', racks: room.standalone_racks }]
      : []),
  ];

  const summary = allRacks.reduce(
    (acc, rack) => {
      const s = healthMap[rack.id] ?? 'UNKNOWN';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalU = allRacks.reduce((s, r) => s + r.u_height, 0);
  const usedU = allRacks.reduce((s, r) => s + computeUsedU(r, catalog), 0);
  const fillPct = totalU > 0 ? Math.round((usedU / totalU) * 100) : 0;
  const totalDevices = allRacks.reduce((s, r) => s + r.devices.length, 0);
  const critCount = summary['CRIT'] ?? 0;

  const alerts = allRacks
    .filter((r) => ['CRIT', 'WARN'].includes(healthMap[r.id] ?? ''))
    .sort(
      (a, b) =>
        (SEVERITY_ORDER[healthMap[b.id] ?? 'UNKNOWN'] ?? 0) -
        (SEVERITY_ORDER[healthMap[a.id] ?? 'UNKNOWN'] ?? 0)
    )
    .map((r) => {
      const aisle = aislesAll.find((a) => (a.racks ?? []).some((rk) => rk.id === r.id));
      return { rack: r, health: healthMap[r.id] ?? 'UNKNOWN', aisleName: aisle?.name ?? '—' };
    });

  return (
    <div className="flex flex-col gap-4" style={{ backgroundColor: '#050810' }}>
      {/* Header */}
      <div
        className="flex shrink-0 flex-wrap items-center gap-4 rounded-xl border px-5 py-3"
        style={{ borderColor: '#1a2035', backgroundColor: '#080d1a' }}
      >
        <nav className="flex items-center gap-1 text-xs">
          <Link to="/cosmos/views/worldmap" className="text-red-400 hover:underline">
            World Map
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-gray-700" />
          <span className="font-semibold text-gray-200">{room.name}</span>
        </nav>

        <h2 className="text-lg font-bold text-white">{room.name}</h2>
        <p className="text-xs text-gray-500">Command Center</p>

        <div className="flex-1" />

        <span className="font-mono text-sm font-bold text-gray-300">{formatTime(now)}</span>

        {critCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1 text-xs font-bold text-red-400">
            <AlertOctagon className="h-4 w-4 animate-pulse" />
            {critCount} CRITICAL
          </span>
        )}

        <div className="inline-flex overflow-hidden rounded-lg border border-gray-700">
          {VARIANTS.map((v) => (
            <button
              key={v.label}
              onClick={() => navigate(`/cosmos/views/${v.path}/${roomId}`)}
              className={`px-2 py-1.5 text-xs font-medium transition-colors ${
                v.path === 'room-v9' ? 'bg-red-600 text-white' : 'text-gray-500 hover:bg-white/5'
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

      {/* 3-column grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left: Alert feed */}
        <div className="rounded-2xl border border-gray-800 bg-[#080d1a]">
          <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-3">
            <AlertOctagon className="h-3.5 w-3.5 text-red-400" />
            <span className="font-mono text-[10px] font-bold tracking-widest text-gray-400 uppercase">
              Alerts ({alerts.length})
            </span>
          </div>
          <div className="flex max-h-[600px] flex-col gap-1.5 overflow-y-auto p-3">
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-green-500/20 bg-[#0a1f14] py-8 text-center">
                <span className="text-2xl text-green-400">✓</span>
                <p className="font-mono text-xs text-green-400">All systems OK</p>
              </div>
            ) : (
              alerts.map(({ rack, health, aisleName }) => (
                <AlertFeedItem
                  key={rack.id}
                  rackId={rack.id}
                  health={health}
                  aisleName={aisleName}
                  onClick={() => setSelectedRack((prev) => (prev?.id === rack.id ? null : rack))}
                />
              ))
            )}
          </div>
        </div>

        {/* Center: Heat map */}
        <div className="rounded-2xl border border-gray-800 bg-[#080d1a]">
          <div className="border-b border-gray-800 px-4 py-3">
            <span className="font-mono text-[10px] font-bold tracking-widest text-gray-400 uppercase">
              Room Heat Map
            </span>
          </div>
          <div className="max-h-[600px] overflow-y-auto p-4">
            <HeatMapGrid
              aisles={aislesAll}
              healthMap={healthMap}
              selectedRackId={selectedRack?.id ?? null}
              onSelect={(rack) => setSelectedRack((prev) => (prev?.id === rack.id ? null : rack))}
            />

            {selectedRack && (
              <div
                className="mt-4 flex items-center justify-between rounded-xl border px-4 py-3"
                style={{
                  borderColor: `${HC[healthMap[selectedRack.id] ?? 'UNKNOWN']}40`,
                  backgroundColor: '#0c1220',
                }}
              >
                <div>
                  <p className="font-semibold text-gray-200">{selectedRack.name}</p>
                  <p className="font-mono text-xs text-gray-500">{selectedRack.id}</p>
                </div>
                <button
                  onClick={() => navigate(`/cosmos/views/rack/${selectedRack.id}`)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
                  style={{
                    backgroundColor: HC[healthMap[selectedRack.id] ?? 'UNKNOWN'] ?? HC.UNKNOWN,
                  }}
                >
                  Open rack
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Stats */}
        <div className="flex flex-col gap-4">
          {/* Global stats card */}
          <div className="rounded-2xl border border-gray-800 bg-[#080d1a] p-4">
            <p className="mb-3 font-mono text-[9px] font-bold tracking-widest text-gray-600 uppercase">
              Global Stats
            </p>

            {[
              { label: 'Total racks', value: allRacks.length, color: '#94a3b8' },
              { label: 'CRIT', value: summary['CRIT'] ?? 0, color: HC.CRIT },
              { label: 'WARN', value: summary['WARN'] ?? 0, color: HC.WARN },
              { label: 'OK', value: summary['OK'] ?? 0, color: HC.OK },
              { label: 'UNKNOWN', value: summary['UNKNOWN'] ?? 0, color: HC.UNKNOWN },
            ].map(({ label, value, color }) => (
              <div key={label} className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-gray-400">{label}</span>
                <span className="font-mono text-base font-bold" style={{ color }}>
                  {value}
                </span>
              </div>
            ))}

            <div className="my-2 h-px bg-gray-800" />

            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-gray-400">
                <Server className="h-3 w-3" /> Devices
              </span>
              <span className="font-mono text-base font-bold text-gray-200">{totalDevices}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-gray-400">
                <Zap className="h-3 w-3" /> Fill
              </span>
              <span
                className="font-mono text-base font-bold"
                style={{
                  color: fillPct > 80 ? HC.CRIT : fillPct > 60 ? HC.WARN : HC.OK,
                }}
              >
                {fillPct}%
              </span>
            </div>
          </div>

          {/* Health distribution bar */}
          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-[#080d1a]">
            <div className="border-b border-gray-800 px-4 py-3">
              <p className="font-mono text-[9px] font-bold tracking-widest text-gray-600 uppercase">
                Health Distribution
              </p>
            </div>
            <div className="flex h-5 w-full overflow-hidden">
              {(['CRIT', 'WARN', 'OK', 'UNKNOWN'] as const).map((s) => {
                const pct = allRacks.length > 0 ? ((summary[s] ?? 0) / allRacks.length) * 100 : 0;
                return pct > 0 ? (
                  <div
                    key={s}
                    title={`${s}: ${summary[s] ?? 0}`}
                    style={{ width: `${pct}%`, backgroundColor: HC[s] }}
                  />
                ) : null;
              })}
            </div>
            <div className="flex flex-col gap-2 px-4 py-3">
              {aislesAll.map((aisle) => (
                <AisleMiniBar key={aisle.id} aisle={aisle} healthMap={healthMap} />
              ))}
            </div>
          </div>

          {/* Live clock */}
          <div className="rounded-2xl border border-gray-800 bg-[#080d1a] px-4 py-3 text-center">
            <p className="mb-1 font-mono text-[9px] text-gray-600 uppercase">Local Time</p>
            <p className="font-mono text-2xl font-bold text-gray-200">{formatTime(now)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
