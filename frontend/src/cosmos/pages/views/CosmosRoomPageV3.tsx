import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw, Thermometer, Zap, Server, ExternalLink } from 'lucide-react';
import { RackElevation } from '../../../components/RackVisualizer';
import { resolveRackComponents } from '../../../utils/rackComponents';
import { api } from '../../../services/api';
import type {
  Room,
  Rack,
  DeviceTemplate,
  RackTemplate,
  RackComponentTemplate,
  InfrastructureComponent,
  RackState,
} from '../../../types';

// ── Constants ──────────────────────────────────────────────────────────────

const HEALTH_COLOR: Record<string, string> = {
  OK: '#22c55e',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#374151',
};

const HEALTH_BG: Record<string, string> = {
  OK: 'bg-green-50 dark:bg-green-500/10',
  WARN: 'bg-amber-50 dark:bg-amber-500/10',
  CRIT: 'bg-red-50 dark:bg-red-500/10',
  UNKNOWN: 'bg-gray-100 dark:bg-gray-800',
};

const HEALTH_TEXT: Record<string, string> = {
  OK: 'text-green-600 dark:text-green-400',
  WARN: 'text-amber-600 dark:text-amber-400',
  CRIT: 'text-red-600 dark:text-red-400',
  UNKNOWN: 'text-gray-500 dark:text-gray-400',
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

const PX_PER_U = 4;

// ── AisleSummaryChips ──────────────────────────────────────────────────────

type AisleSummaryChipsProps = {
  racks: Rack[];
  healthMap: Record<string, string>;
};

const AisleSummaryChips = ({ racks, healthMap }: AisleSummaryChipsProps) => {
  const counts = racks.reduce(
    (acc, r) => {
      const s = healthMap[r.id] ?? 'UNKNOWN';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex items-center gap-1.5">
      {(['CRIT', 'WARN', 'OK', 'UNKNOWN'] as const).map((s) =>
        (counts[s] ?? 0) > 0 ? (
          <span
            key={s}
            className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
            style={{ backgroundColor: HEALTH_COLOR[s] }}
          >
            {counts[s]} {s}
          </span>
        ) : null
      )}
    </div>
  );
};

// ── RackDeviceBars — proportional device fill visualization ────────────────

type RackDeviceBarsProps = {
  rack: Rack;
  health: string;
  catalog: Record<string, DeviceTemplate>;
};

const RackDeviceBars = ({ rack, health, catalog }: RackDeviceBarsProps) => {
  const uHeight = rack.u_height ?? 42;
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN;

  const segments = useMemo(() => {
    // Build array of {u, occupied} from top (uHeight) down to 1
    const uMap = new Map<number, boolean>();
    rack.devices.forEach((dev) => {
      const tpl = catalog[dev.template_id];
      const h = tpl?.u_height ?? 1;
      for (let u = dev.u_position; u < dev.u_position + h; u++) {
        uMap.set(u, true);
      }
    });

    // Collapse into contiguous runs
    const runs: { occupied: boolean; count: number }[] = [];
    for (let u = uHeight; u >= 1; u--) {
      const occ = uMap.has(u);
      const last = runs[runs.length - 1];
      if (last && last.occupied === occ) {
        last.count++;
      } else {
        runs.push({ occupied: occ, count: 1 });
      }
    }
    return runs;
  }, [rack.devices, catalog, uHeight]);

  const totalPx = uHeight * PX_PER_U;
  const occupiedU = rack.devices.reduce((sum, dev) => {
    const tpl = catalog[dev.template_id];
    return sum + (tpl?.u_height ?? 1);
  }, 0);
  const fillPct = uHeight > 0 ? Math.round((occupiedU / uHeight) * 100) : 0;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Device bar column */}
      <div
        className="w-full overflow-hidden rounded-md"
        style={{ height: totalPx, backgroundColor: '#111827' }}
      >
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              height: seg.count * PX_PER_U,
              backgroundColor: seg.occupied ? color : undefined,
              opacity: seg.occupied ? 0.7 : 0.08,
            }}
            className={seg.occupied ? '' : 'border-b border-white/5'}
          />
        ))}
      </div>

      {/* Fill % */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] text-gray-400">{fillPct}% fill</span>
        <span className="font-mono text-[9px] text-gray-400">U{uHeight}</span>
      </div>
    </div>
  );
};

// ── RackCard ───────────────────────────────────────────────────────────────

type RackCardProps = {
  rack: Rack;
  health: string;
  catalog: Record<string, DeviceTemplate>;
  selected: boolean;
  onClick: () => void;
};

const RackCard = ({ rack, health, catalog, selected, onClick }: RackCardProps) => {
  const color = HEALTH_COLOR[health] ?? HEALTH_COLOR.UNKNOWN;

  return (
    <button
      onClick={onClick}
      className={`flex w-24 flex-col gap-1.5 rounded-xl border-2 p-2.5 text-left transition-all hover:shadow-lg focus:outline-none ${
        selected ? 'ring-brand-500 ring-2 ring-offset-2 dark:ring-offset-gray-950' : ''
      }`}
      style={{ borderColor: color }}
      title={rack.name}
    >
      <RackDeviceBars rack={rack} health={health} catalog={catalog} />

      <div className="mt-0.5 border-t border-gray-100 pt-1.5 dark:border-gray-700">
        <p className="truncate font-mono text-[10px] font-semibold text-gray-700 dark:text-gray-300">
          {rack.id}
        </p>
        <span
          className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${HEALTH_BG[health]} ${HEALTH_TEXT[health]}`}
        >
          {health}
        </span>
      </div>
    </button>
  );
};

// ── RackDetailPanel ────────────────────────────────────────────────────────

type RackDetailPanelProps = {
  rack: Rack;
  deviceCatalog: Record<string, DeviceTemplate>;
  rackTemplate: RackTemplate | null;
  rackComponentTemplates: Record<string, RackComponentTemplate>;
  health: RackState | null;
  onNavigate: () => void;
};

const RackDetailPanel = ({
  rack,
  deviceCatalog,
  rackTemplate,
  rackComponentTemplates,
  health,
  onNavigate,
}: RackDetailPanelProps) => {
  const state = health?.state ?? 'UNKNOWN';
  const color = HEALTH_COLOR[state] ?? HEALTH_COLOR.UNKNOWN;

  const resolved = rackTemplate
    ? resolveRackComponents(rackTemplate.infrastructure?.rack_components, rackComponentTemplates)
    : { front: [], rear: [], side: [], main: [] };

  const baseInfra = rackTemplate?.infrastructure?.components ?? [];
  const frontInfra: InfrastructureComponent[] = [
    ...(rackTemplate?.infrastructure?.front_components?.length
      ? rackTemplate.infrastructure.front_components
      : baseInfra),
    ...resolved.main,
    ...resolved.front,
  ];
  const sideInfra: InfrastructureComponent[] = [
    ...(rackTemplate?.infrastructure?.side_components ?? []),
    ...resolved.side,
  ];

  const nodes = health?.nodes ?? {};
  const nodeCounts = Object.values(nodes as Record<string, { state?: string }>).reduce(
    (acc, n) => {
      const s = n.state ?? 'UNKNOWN';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const totalNodes = Object.keys(nodes).length;

  return (
    <div className="flex h-full flex-col">
      {/* Panel header */}
      <div className="shrink-0 border-b border-gray-100 p-4 dark:border-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{rack.name}</h3>
            <p className="font-mono text-xs text-gray-400">{rack.id}</p>
          </div>
          <span
            className="rounded-lg px-2.5 py-1 text-xs font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {state}
          </span>
        </div>

        {/* Stats grid */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            {
              icon: Thermometer,
              label: 'Temp',
              value: health?.metrics?.temperature
                ? `${Math.round(health.metrics.temperature)}°C`
                : '—',
              cls: 'text-blue-500',
            },
            {
              icon: Zap,
              label: 'Power',
              value: health?.metrics?.power
                ? `${(health.metrics.power / 1000).toFixed(1)} kW`
                : '—',
              cls: 'text-yellow-500',
            },
            {
              icon: Server,
              label: 'Devices',
              value: rack.devices.length,
              cls: 'text-brand-500',
            },
            {
              icon: Server,
              label: 'Nodes',
              value: totalNodes,
              cls: 'text-brand-500',
            },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-2 dark:bg-gray-800"
            >
              <s.icon className={`h-3.5 w-3.5 shrink-0 ${s.cls}`} />
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-[9px] text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Node health bar */}
        {totalNodes > 0 && (
          <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full">
            {(['OK', 'WARN', 'CRIT', 'UNKNOWN'] as const)
              .filter((s) => (nodeCounts[s] ?? 0) > 0)
              .map((s) => (
                <div
                  key={s}
                  style={{
                    width: `${((nodeCounts[s] ?? 0) / totalNodes) * 100}%`,
                    backgroundColor: HEALTH_COLOR[s],
                  }}
                />
              ))}
          </div>
        )}

        <button
          onClick={onNavigate}
          className="bg-brand-500 hover:bg-brand-600 mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white transition-colors"
        >
          Open full view
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Rack elevation */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <RackElevation
          rack={rack}
          catalog={deviceCatalog}
          health={health?.state}
          nodesData={health?.nodes}
          infraComponents={frontInfra}
          sideComponents={sideInfra}
          pduMetrics={health?.infra_metrics?.pdu}
        />
      </div>
    </div>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────

export const CosmosRoomPageV3 = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [deviceCatalog, setDeviceCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [rackComponentTemplates, setRackComponentTemplates] = useState<
    Record<string, RackComponentTemplate>
  >({});
  const [allRackTemplates, setAllRackTemplates] = useState<RackTemplate[]>([]);
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
        const [roomData, catalog] = await Promise.all([
          api.getRoomLayout(roomId),
          api.getCatalog(),
        ]);
        if (!active) return;
        setRoom(roomData);

        const devCat: Record<string, DeviceTemplate> = {};
        (catalog?.device_templates ?? []).forEach((t: DeviceTemplate) => {
          devCat[t.id] = t;
        });
        setDeviceCatalog(devCat);

        const compCat: Record<string, RackComponentTemplate> = {};
        (catalog?.rack_component_templates ?? []).forEach((t: RackComponentTemplate) => {
          compCat[t.id] = t;
        });
        setRackComponentTemplates(compCat);
        setAllRackTemplates(catalog?.rack_templates ?? []);
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
    api
      .getRackState(selectedRack.id, true)
      .then((data) => {
        if (active) setSelectedHealth(data);
      })
      .catch(() => {});
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

  const selectedRackTemplate = selectedRack?.template_id
    ? (allRackTemplates.find((t) => t.id === selectedRack.template_id) ?? null)
    : null;

  return (
    <div className="flex h-full flex-col gap-4">
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
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {room.aisles?.length ?? 0} aisles · {allRacks.length} racks
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Health pills */}
          <div className="flex items-center gap-1.5">
            {(['CRIT', 'WARN', 'OK', 'UNKNOWN'] as const)
              .filter((s) => (summary[s] ?? 0) > 0)
              .map((s) => (
                <span
                  key={s}
                  className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: HEALTH_COLOR[s] }}
                >
                  {summary[s]} {s}
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
                  v.path === 'room-v3'
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

      {/* Main content */}
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr,360px]">
        {/* Left: aisle sections */}
        <div className="min-h-0 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="space-y-8">
            {(room.aisles ?? []).map((aisle) => (
              <div key={aisle.id}>
                {/* Aisle header bar */}
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
                  <div className="bg-brand-500 h-2 w-2 rounded-full opacity-70" />
                  <span className="flex-1 text-xs font-semibold tracking-wider text-gray-600 uppercase dark:text-gray-300">
                    {aisle.name}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {aisle.racks?.length ?? 0} racks
                  </span>
                  <AisleSummaryChips racks={aisle.racks ?? []} healthMap={healthMap} />
                </div>

                {/* Rack cards row */}
                <div className="flex flex-wrap gap-3">
                  {(aisle.racks ?? []).map((rack) => (
                    <RackCard
                      key={rack.id}
                      rack={rack}
                      health={healthMap[rack.id] ?? 'UNKNOWN'}
                      catalog={deviceCatalog}
                      selected={selectedRack?.id === rack.id}
                      onClick={() => {
                        setSelectedRack(rack);
                        setSelectedHealth(null);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Standalone racks */}
            {(room.standalone_racks ?? []).length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
                  <div className="h-2 w-2 rounded-full bg-gray-400 opacity-70" />
                  <span className="flex-1 text-xs font-semibold tracking-wider text-gray-600 uppercase dark:text-gray-300">
                    Standalone
                  </span>
                  <AisleSummaryChips racks={room.standalone_racks ?? []} healthMap={healthMap} />
                </div>
                <div className="flex flex-wrap gap-3">
                  {(room.standalone_racks ?? []).map((rack) => (
                    <RackCard
                      key={rack.id}
                      rack={rack}
                      health={healthMap[rack.id] ?? 'UNKNOWN'}
                      catalog={deviceCatalog}
                      selected={selectedRack?.id === rack.id}
                      onClick={() => {
                        setSelectedRack(rack);
                        setSelectedHealth(null);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: rack detail panel */}
        <div className="hidden min-h-0 overflow-hidden rounded-2xl border border-gray-200 bg-white xl:flex xl:flex-col dark:border-gray-800 dark:bg-gray-900">
          {!selectedRack ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="rounded-2xl border-2 border-dashed border-gray-200 p-6 dark:border-gray-700">
                <Server className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select a rack
                </p>
                <p className="mt-1 text-xs text-gray-400">Click any rack card to inspect it</p>
              </div>
            </div>
          ) : (
            <RackDetailPanel
              rack={selectedRack}
              deviceCatalog={deviceCatalog}
              rackTemplate={selectedRackTemplate}
              rackComponentTemplates={rackComponentTemplates}
              health={selectedHealth}
              onNavigate={() => navigate(`/cosmos/views/rack/${selectedRack.id}`)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
