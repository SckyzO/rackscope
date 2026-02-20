import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw, Thermometer, Zap, Server, ExternalLink } from 'lucide-react';
import { RackElevation } from '../../../components/RackVisualizer';
import { api } from '../../../services/api';
import type {
  Room,
  Rack,
  DeviceTemplate,
  RackTemplate,
  RackComponentTemplate,
  InfrastructureComponent,
  RackState,
  RoomSummary,
} from '../../../types';
import { resolveRackComponents } from '../../../utils/rackComponents';

// ── Constants ─────────────────────────────────────────────────────────────────

const HC: Record<string, string> = {
  OK: '#22c55e',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#374151',
};

const PX_PER_U = 6; // pixel height per U unit in mini elevation

// ── MiniRackElevation — top-down physical rack thumbnail ─────────────────────

type MiniRackProps = {
  rack: Rack;
  health: string;
  catalog: Record<string, DeviceTemplate>;
  selected: boolean;
  onClick: () => void;
};

const MiniRackElevation = ({ rack, health, catalog, selected, onClick }: MiniRackProps) => {
  const uHeight = rack.u_height ?? 42;
  const totalPx = uHeight * PX_PER_U;
  const color = HC[health] ?? HC.UNKNOWN;

  // Build u-map: which U slots are occupied and by what device
  const uMap = useMemo(() => {
    const map = new Map<number, { templateId: string; deviceId: string }>();
    rack.devices.forEach((dev) => {
      const tpl = catalog[dev.template_id];
      const h = tpl?.u_height ?? 1;
      for (let u = dev.u_position; u < dev.u_position + h; u++) {
        map.set(u, { templateId: dev.template_id, deviceId: dev.id });
      }
    });
    return map;
  }, [rack.devices, catalog]);

  // Render slots from top (uHeight) to bottom (1)
  const slots = Array.from({ length: uHeight }, (_, i) => uHeight - i);

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 focus:outline-none"
      title={`${rack.name} — ${health}`}
    >
      {/* Rack column */}
      <div
        className="relative overflow-hidden rounded-sm transition-all"
        style={{
          width: 52,
          height: totalPx,
          border: `2px solid ${color}`,
          boxShadow: selected ? `0 0 0 2px ${color}40, 0 0 12px ${color}30` : undefined,
          backgroundColor: '#0d1420',
        }}
      >
        {slots.map((u) => {
          const occ = uMap.get(u);
          return (
            <div
              key={u}
              style={{
                height: PX_PER_U,
                backgroundColor: occ ? color : undefined,
                opacity: occ ? 0.75 : 0.06,
              }}
              className={occ ? '' : 'border-b border-white/5'}
            />
          );
        })}

        {/* Health pulse overlay for CRIT */}
        {health === 'CRIT' && (
          <div
            className="pointer-events-none absolute inset-0 animate-pulse"
            style={{ backgroundColor: `${color}10` }}
          />
        )}
      </div>

      {/* Rack ID */}
      <span className="font-mono text-[9px] font-semibold text-gray-500 dark:text-gray-400">
        {rack.id}
      </span>

      {/* Health badge */}
      <span
        className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {health}
      </span>
    </button>
  );
};

// ── RackDetailPanel — full RackElevation for selected rack ───────────────────

type RackDetailProps = {
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
}: RackDetailProps) => {
  const state = health?.state ?? 'UNKNOWN';
  const color = HC[state] ?? HC.UNKNOWN;

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

        {/* Quick stats */}
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
              value: Object.keys(nodes).length,
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

        {/* Node health strip */}
        {Object.keys(nodeCounts).length > 0 && (
          <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full">
            {(
              [
                ['OK', HC.OK],
                ['WARN', HC.WARN],
                ['CRIT', HC.CRIT],
                ['UNKNOWN', HC.UNKNOWN],
              ] as [string, string][]
            )
              .filter(([s]) => (nodeCounts[s] ?? 0) > 0)
              .map(([s, c]) => (
                <div
                  key={s}
                  style={{
                    width: `${((nodeCounts[s] ?? 0) / Object.keys(nodes).length) * 100}%`,
                    backgroundColor: c,
                  }}
                />
              ))}
          </div>
        )}

        {/* Open button */}
        <button
          onClick={onNavigate}
          className="bg-brand-500 hover:bg-brand-600 mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white transition-colors"
        >
          Open Full View
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Rack elevation */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="h-full">
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
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────

export const CosmosRoomPageV2 = () => {
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
  const [rooms, setRooms] = useState<RoomSummary[]>([]);

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

  // Load room layout + catalog + rooms list
  useEffect(() => {
    if (!roomId) return;
    let active = true;
    const load = async () => {
      try {
        const [roomData, catalog, roomsList] = await Promise.all([
          api.getRoomLayout(roomId),
          api.getCatalog(),
          api.getRooms(),
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
        setRooms(Array.isArray(roomsList) ? roomsList : []);
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

  // Poll room health every 30s
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

  // Load selected rack detail health (with metrics)
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
        </div>

        <div className="flex items-center gap-2">
          {/* Health summary pills */}
          <div className="flex items-center gap-1.5">
            {(
              [
                ['OK', HC.OK],
                ['WARN', HC.WARN],
                ['CRIT', HC.CRIT],
                ['UNKNOWN', HC.UNKNOWN],
              ] as [string, string][]
            )
              .filter(([s]) => (summary[s] ?? 0) > 0)
              .map(([s, c]) => (
                <span
                  key={s}
                  className="rounded-full px-2.5 py-1 text-xs font-bold text-white"
                  style={{ backgroundColor: c }}
                >
                  {summary[s]} {s}
                </span>
              ))}
          </div>

          {/* Room selector */}
          {rooms.length > 1 && (
            <select
              value={roomId ?? ''}
              onChange={(e) => navigate(`/cosmos/views/room-v2/${e.target.value}`)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}

          {/* View toggle */}
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => navigate(`/cosmos/views/room/${roomId}`)}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5"
            >
              V1
            </button>
            <button className="bg-brand-500 px-3 py-1.5 text-xs font-medium text-white">V2</button>
          </div>

          <button
            onClick={() => roomId && loadRoomHealth(roomId)}
            className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:text-gray-600 dark:border-gray-700"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main floor plan + detail panel */}
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1fr,360px]">
        {/* Left: floor plan */}
        <div className="min-h-0 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="space-y-8">
            {(room.aisles ?? []).map((aisle) => (
              <div key={aisle.id}>
                {/* Aisle header */}
                <div className="mb-3 flex items-center gap-2">
                  <div className="bg-brand-500 h-2.5 w-2.5 rounded-full opacity-60" />
                  <h3 className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                    {aisle.name}
                  </h3>
                  <span className="text-xs text-gray-300 dark:text-gray-600">
                    {aisle.racks?.length ?? 0} racks
                  </span>
                </div>

                {/* Racks row */}
                <div className="flex flex-wrap items-end gap-4">
                  {(aisle.racks ?? []).map((rack) => (
                    <MiniRackElevation
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
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-400 opacity-60" />
                  <h3 className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                    Standalone
                  </h3>
                </div>
                <div className="flex flex-wrap items-end gap-4">
                  {(room.standalone_racks ?? []).map((rack) => (
                    <MiniRackElevation
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
                <p className="mt-1 text-xs text-gray-400">
                  Click any rack in the floor plan to inspect it
                </p>
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
