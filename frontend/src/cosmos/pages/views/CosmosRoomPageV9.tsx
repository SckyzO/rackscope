import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw, AlertOctagon, Server, Zap } from 'lucide-react';
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
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN;
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
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN;
  const isCrit = health === 'CRIT';

  return (
    <button
      onClick={onClick}
      title={`${rack.id} — ${health}`}
      className={`flex flex-col items-center justify-end overflow-hidden rounded transition-all duration-100 hover:scale-105 focus:outline-none ${isCrit ? 'animate-pulse' : ''}`}
      style={{
        width: 72,
        height: 88,
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
        className="relative z-10 w-full truncate px-1 pb-1.5 text-center font-mono text-[8px] font-bold text-white"
        style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
      >
        {rack.id}
      </span>
    </button>
  );
};

// ── CenterHeatMap ──────────────────────────────────────────────────────────

type CenterHeatMapProps = {
  aisles: Aisle[];
  healthMap: Record<string, string>;
  selectedRackId: string | null;
  onSelect: (rack: Rack) => void;
};

const CenterHeatMap = ({ aisles, healthMap, selectedRackId, onSelect }: CenterHeatMapProps) => (
  <div className="flex flex-col gap-4">
    {aisles.map((aisle) => {
      const worst = (aisle.racks ?? []).reduce((w, r) => {
        const s = healthMap[r.id] ?? 'UNKNOWN';
        return (SEVERITY_ORDER[s] ?? 0) > (SEVERITY_ORDER[w] ?? 0) ? s : w;
      }, 'OK');
      const worstColor = HEALTH_COLOR[worst] ?? HEALTH_COLOR.UNKNOWN;

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

// ── AisleMiniSummary ───────────────────────────────────────────────────────

type AisleMiniSummaryProps = {
  aisle: Aisle;
  healthMap: Record<string, string>;
};

const AisleMiniSummary = ({ aisle, healthMap }: AisleMiniSummaryProps) => {
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
  const color = HEALTH_COLOR[worst];

  return (
    <div
      className="flex items-center gap-3 rounded-lg border px-3 py-2"
      style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
    >
      <span className="font-mono text-[10px] font-bold text-gray-300 uppercase">{aisle.name}</span>
      <div className="flex flex-1 gap-1.5">
        {(['CRIT', 'WARN', 'OK'] as const).map((s) =>
          (counts[s] ?? 0) > 0 ? (
            <span
              key={s}
              className="rounded px-1.5 py-0.5 font-mono text-[8px] font-bold text-white"
              style={{ backgroundColor: HEALTH_COLOR[s] }}
            >
              {counts[s]}
            </span>
          ) : null
        )}
      </div>
      <span className="font-mono text-[9px] text-gray-600">{aisle.racks?.length ?? 0} racks</span>
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
  const [templateMap, setTemplateMap] = useState<Record<string, DeviceTemplate>>({});
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
  const usedU = allRacks.reduce((s, r) => s + computeUsedU(r, templateMap), 0);
  const fillPct = totalU > 0 ? Math.round((usedU / totalU) * 100) : 0;
  const totalDevices = allRacks.reduce((s, r) => s + r.devices.length, 0);

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

  const critCount = summary['CRIT'] ?? 0;

  return (
    <div className="flex min-h-full flex-col gap-4" style={{ backgroundColor: '#050810' }}>
      {/* Fullscreen header */}
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

        {/* Live clock */}
        <span className="font-mono text-sm font-bold text-gray-300">{formatTime(now)}</span>

        {/* Alert count */}
        {critCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1 text-xs font-bold text-red-400">
            <AlertOctagon className="h-4 w-4 animate-pulse" />
            ALERTS: {critCount}
          </span>
        )}

        {/* Switcher */}
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

      {/* 3-column layout */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: Alert feed */}
        <div className="flex w-60 shrink-0 flex-col gap-2 overflow-y-auto">
          <div className="flex items-center gap-2 rounded-lg border border-gray-800 px-3 py-2">
            <AlertOctagon className="h-3.5 w-3.5 text-red-400" />
            <span className="font-mono text-[10px] font-bold tracking-widest text-gray-400 uppercase">
              Alerts ({alerts.length})
            </span>
          </div>
          {alerts.length === 0 ? (
            <div
              className="flex flex-col items-center gap-2 rounded-xl border border-green-500/20 py-6 text-center"
              style={{ backgroundColor: '#0a1f14' }}
            >
              <span className="text-2xl">✓</span>
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

        {/* Center: Heat map */}
        <div
          className="flex-1 overflow-y-auto rounded-2xl border border-gray-800 p-5"
          style={{ backgroundColor: '#080d1a' }}
        >
          <CenterHeatMap
            aisles={aislesAll}
            healthMap={healthMap}
            selectedRackId={selectedRack?.id ?? null}
            onSelect={(rack) => setSelectedRack((prev) => (prev?.id === rack.id ? null : rack))}
          />

          {selectedRack && (
            <div
              className="mt-4 flex items-center justify-between rounded-xl border px-4 py-3"
              style={{
                borderColor: `${HEALTH_COLOR[healthMap[selectedRack.id] ?? 'UNKNOWN']}40`,
                backgroundColor: '#0c1220',
              }}
            >
              <div>
                <p className="font-semibold text-gray-200">{selectedRack.name}</p>
                <p className="font-mono text-xs text-gray-500">{selectedRack.id}</p>
              </div>
              <button
                onClick={() => navigate(`/cosmos/views/rack/${selectedRack.id}`)}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                style={{
                  backgroundColor:
                    HEALTH_COLOR[healthMap[selectedRack.id] ?? 'UNKNOWN'] ?? '#374151',
                }}
              >
                Open rack
              </button>
            </div>
          )}
        </div>

        {/* Right: Stats */}
        <div className="flex w-52 shrink-0 flex-col gap-3">
          {/* Live stats */}
          <div
            className="flex flex-col gap-3 rounded-xl border border-gray-800 p-4"
            style={{ backgroundColor: '#080d1a' }}
          >
            <p className="font-mono text-[9px] font-bold tracking-widest text-gray-600 uppercase">
              Global Stats
            </p>

            {[
              { label: 'Total racks', value: allRacks.length, color: '#94a3b8' },
              { label: 'CRIT', value: summary['CRIT'] ?? 0, color: HEALTH_COLOR.CRIT },
              { label: 'WARN', value: summary['WARN'] ?? 0, color: HEALTH_COLOR.WARN },
              { label: 'OK', value: summary['OK'] ?? 0, color: HEALTH_COLOR.OK },
              { label: 'UNKNOWN', value: summary['UNKNOWN'] ?? 0, color: HEALTH_COLOR.UNKNOWN },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-gray-400">{label}</span>
                <span className="font-mono text-sm font-bold" style={{ color }}>
                  {value}
                </span>
              </div>
            ))}

            <div className="my-1 h-px bg-gray-800" />

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-gray-400">
                <Server className="h-3 w-3" /> Devices
              </span>
              <span className="font-mono text-sm font-bold text-gray-200">{totalDevices}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-gray-400">
                <Zap className="h-3 w-3" /> Fill
              </span>
              <span
                className="font-mono text-sm font-bold"
                style={{
                  color:
                    fillPct > 80
                      ? HEALTH_COLOR.CRIT
                      : fillPct > 60
                        ? HEALTH_COLOR.WARN
                        : HEALTH_COLOR.OK,
                }}
              >
                {fillPct}%
              </span>
            </div>
          </div>

          {/* Health bar */}
          <div
            className="overflow-hidden rounded-xl border border-gray-800"
            style={{ backgroundColor: '#080d1a' }}
          >
            <div className="px-4 py-2">
              <p className="font-mono text-[9px] font-bold tracking-widest text-gray-600 uppercase">
                Health Distribution
              </p>
            </div>
            <div className="flex h-4 w-full overflow-hidden">
              {(['CRIT', 'WARN', 'OK', 'UNKNOWN'] as const).map((s) => {
                const pct = allRacks.length > 0 ? ((summary[s] ?? 0) / allRacks.length) * 100 : 0;
                return pct > 0 ? (
                  <div
                    key={s}
                    title={`${s}: ${summary[s] ?? 0}`}
                    style={{ width: `${pct}%`, backgroundColor: HEALTH_COLOR[s] }}
                  />
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="flex shrink-0 flex-wrap gap-2">
        {aislesAll.map((aisle) => (
          <AisleMiniSummary key={aisle.id} aisle={aisle} healthMap={healthMap} />
        ))}
      </div>
    </div>
  );
};
