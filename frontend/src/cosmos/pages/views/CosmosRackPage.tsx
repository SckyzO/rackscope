import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  RotateCcw,
  Thermometer,
  Zap,
  Server,
  Cpu,
  AlertTriangle,
  XCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import { api } from '../../../services/api';
import { RackElevation } from '../../../components/RackVisualizer';
import { resolveRackComponents } from '../../../utils/rackComponents';
import type {
  Rack,
  DeviceTemplate,
  RackTemplate,
  RackComponentTemplate,
  InfrastructureComponent,
  RackState,
  RackNodeState,
  Room,
} from '../../../types';

// ── Alerts drawer ──────────────────────────────────────────────────────────────

const RackAlertsDrawer = ({
  onClose,
  critNodes,
  warnNodes,
}: {
  onClose: () => void;
  critNodes: string[];
  warnNodes: string[];
}) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const alertCount = critNodes.length + warnNodes.length;
  const alertColor = critNodes.length > 0 ? '#ef4444' : '#f59e0b';

  return (
    <>
      <div className="fixed inset-0 z-[9990]" onClick={onClose} />
      <div
        className={`fixed top-[72px] right-0 z-[9991] flex h-[calc(100vh-72px)] w-[360px] flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out dark:border-gray-800 dark:bg-gray-900 ${visible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" style={{ color: alertColor }} />
            <span className="font-semibold text-gray-900 dark:text-white">
              Alerts
              <span className="ml-1.5 text-sm font-normal text-gray-400">({alertCount})</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-4">
          {critNodes.length > 0 && (
            <>
              <p className="mb-2 text-[10px] font-semibold tracking-wider text-red-400 uppercase">
                Critical ({critNodes.length})
              </p>
              {critNodes.map((nodeId) => (
                <div
                  key={nodeId}
                  className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-500/10"
                >
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-red-700 dark:text-red-400">
                    {nodeId}
                  </span>
                  <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600 dark:bg-red-500/20 dark:text-red-400">
                    CRIT
                  </span>
                </div>
              ))}
            </>
          )}
          {warnNodes.length > 0 && (
            <>
              <p
                className={`mb-2 text-[10px] font-semibold tracking-wider text-amber-400 uppercase ${critNodes.length > 0 ? 'mt-4' : ''}`}
              >
                Warning ({warnNodes.length})
              </p>
              {warnNodes.map((nodeId) => (
                <div
                  key={nodeId}
                  className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-500/10"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-amber-700 dark:text-amber-400">
                    {nodeId}
                  </span>
                  <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                    WARN
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
};

const stateBadge = (state: string) => {
  const map: Record<string, string> = {
    OK: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
    WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    CRIT: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    UNKNOWN: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  };
  return map[state] ?? map.UNKNOWN;
};

type RoomContext = {
  roomId: string;
  roomName: string;
  aisleId?: string;
  aisleName?: string;
};

export const CosmosRackPage = () => {
  const { rackId } = useParams<{ rackId: string }>();
  const navigate = useNavigate();

  const [rack, setRack] = useState<Rack | null>(null);
  const [deviceCatalog, setDeviceCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [rackComponentTemplates, setRackComponentTemplates] = useState<
    Record<string, RackComponentTemplate>
  >({});
  const [rackTemplate, setRackTemplate] = useState<RackTemplate | null>(null);
  const [health, setHealth] = useState<RackState | null>(null);
  const [roomCtx, setRoomCtx] = useState<RoomContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewSide, setViewSide] = useState<'front' | 'both' | 'rear'>('both');
  const [alertsOpen, setAlertsOpen] = useState(false);

  const loadHealth = async () => {
    if (!rackId) return;
    try {
      const state = await api.getRackState(rackId, true);
      setHealth(state);
    } catch {
      /* ignore */
    }
  };

  // 1. Load rack structure + catalog (fast)
  useEffect(() => {
    if (!rackId) return;
    Promise.all([api.getRack(rackId), api.getCatalog()])
      .then(([rackData, catalog]) => {
        setRack(rackData);

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

        if (rackData.template_id) {
          const tpl = (catalog?.rack_templates ?? []).find(
            (t: RackTemplate) => t.id === rackData.template_id
          );
          setRackTemplate(tpl ?? null);
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [rackId]);

  // 2. Resolve room/aisle context for breadcrumb
  useEffect(() => {
    if (!rack?.aisle_id) return;
    api
      .getRooms()
      .then((rooms: Room[]) => {
        for (const room of rooms) {
          for (const aisle of room.aisles ?? []) {
            if (aisle.id === rack.aisle_id) {
              setRoomCtx({
                roomId: room.id,
                roomName: room.name,
                aisleId: aisle.id,
                aisleName: aisle.name,
              });
              return;
            }
          }
          // Check standalone racks too
          for (const sr of room.standalone_racks ?? []) {
            if (sr.id === rack.id) {
              setRoomCtx({ roomId: room.id, roomName: room.name });
              return;
            }
          }
        }
      })
      .catch(() => {});
  }, [rack]);

  // 3. Poll health state every 30s
  useEffect(() => {
    if (!rackId || loading) return;
    let active = true;
    const poll = async () => {
      try {
        const state = await api.getRackState(rackId, true);
        if (active) setHealth(state);
      } catch {
        /* ignore */
      }
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [rackId, loading]);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="border-t-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
      </div>
    );
  if (!rack)
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">Rack not found</div>
    );

  // Infrastructure resolution
  const resolvedRackComponents = rackTemplate
    ? resolveRackComponents(rackTemplate.infrastructure?.rack_components, rackComponentTemplates)
    : { front: [], rear: [], side: [], main: [] };

  const baseInfra = rackTemplate?.infrastructure?.components ?? [];
  const frontInfra: InfrastructureComponent[] = [
    ...(rackTemplate?.infrastructure?.front_components?.length
      ? rackTemplate.infrastructure.front_components
      : baseInfra),
    ...resolvedRackComponents.main,
    ...resolvedRackComponents.front,
  ];
  const rearInfra: InfrastructureComponent[] = [
    ...(rackTemplate?.infrastructure?.rear_components?.length
      ? rackTemplate.infrastructure.rear_components
      : baseInfra),
    ...resolvedRackComponents.main,
    ...resolvedRackComponents.rear,
  ];
  const sideInfra: InfrastructureComponent[] = [
    ...(rackTemplate?.infrastructure?.side_components ?? []),
    ...resolvedRackComponents.side,
  ];

  // Health summary counts
  const nodes = health?.nodes ?? {};
  const nodeCounts = Object.values(nodes as Record<string, RackNodeState>).reduce(
    (acc, n) => {
      const s = n.state ?? 'UNKNOWN';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const state = health?.state ?? 'UNKNOWN';
  const uHeight = rack.u_height ?? 42;

  // Alert node lists for the drawer
  const critNodes = Object.entries(nodes as Record<string, RackNodeState>)
    .filter(([, n]) => n.state === 'CRIT')
    .map(([id]) => id);
  const warnNodes = Object.entries(nodes as Record<string, RackNodeState>)
    .filter(([, n]) => n.state === 'WARN')
    .map(([id]) => id);
  const alertCount = critNodes.length + warnNodes.length;
  const alertColor = critNodes.length > 0 ? '#ef4444' : warnNodes.length > 0 ? '#f59e0b' : null;

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        <Link to="/cosmos/views/worldmap" className="text-brand-500 hover:underline">
          World Map
        </Link>
        {roomCtx && (
          <>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <Link
              to={`/cosmos/views/room/${roomCtx.roomId}`}
              className="text-brand-500 hover:underline"
            >
              {roomCtx.roomName}
            </Link>
          </>
        )}
        {roomCtx?.aisleName && (
          <>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">{roomCtx.aisleName}</span>
          </>
        )}
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="font-semibold text-gray-900 dark:text-white">{rack.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{rack.name}</h2>
            <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${stateBadge(state)}`}>
              {state}
            </span>
            <span className="rounded-lg border border-gray-200 px-2.5 py-1 font-mono text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
              {rack.id}
            </span>
            {rackTemplate && (
              <span className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 rounded-lg px-2.5 py-1 text-xs font-medium">
                {rackTemplate.name}
              </span>
            )}
            <span className="text-xs text-gray-400">{uHeight}U</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            {(['front', 'both', 'rear'] as const).map((side) => (
              <button
                key={side}
                onClick={() => setViewSide(side)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  viewSide === side
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5'
                }`}
              >
                {side === 'both' ? 'Front & Rear' : side}
              </button>
            ))}
          </div>
          <button
            onClick={loadHealth}
            title="Refresh"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          {/* Alert button — only when alerts exist */}
          {alertCount > 0 && alertColor && (
            <button
              onClick={() => setAlertsOpen((o) => !o)}
              title={`${alertCount} alert${alertCount > 1 ? 's' : ''}`}
              className={`relative flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                alertsOpen
                  ? 'border-transparent text-white'
                  : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5'
              }`}
              style={
                alertsOpen
                  ? { backgroundColor: alertColor }
                  : { color: alertColor, borderColor: `${alertColor}40` }
              }
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>
                {alertCount} alert{alertCount > 1 ? 's' : ''}
              </span>
              {/* Pulsing dot when closed */}
              {!alertsOpen && (
                <span
                  className="absolute -top-1 -right-1 h-2.5 w-2.5 animate-pulse rounded-full border-2 border-white dark:border-gray-950"
                  style={{ backgroundColor: alertColor }}
                />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          {
            label: 'Temperature',
            value: health?.metrics?.temperature
              ? `${Math.round(health.metrics.temperature)}°C`
              : '—',
            icon: Thermometer,
            color: 'text-blue-500',
          },
          {
            label: 'Power',
            value: health?.metrics?.power ? `${(health.metrics.power / 1000).toFixed(1)} kW` : '—',
            icon: Zap,
            color: 'text-yellow-500',
          },
          {
            label: 'Devices',
            value: rack.devices.length,
            icon: Server,
            color: 'text-brand-500',
          },
          {
            label: 'Nodes',
            value: Object.keys(nodes).length,
            icon: Cpu,
            color: 'text-brand-500',
          },
          {
            label: 'CRIT',
            value: nodeCounts['CRIT'] ?? 0,
            icon: XCircle,
            color: 'text-red-500',
          },
          {
            label: 'WARN',
            value: nodeCounts['WARN'] ?? 0,
            icon: AlertTriangle,
            color: 'text-amber-500',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
          >
            <s.icon className={`h-4 w-4 shrink-0 ${s.color}`} />
            <div>
              <p className="text-base font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-[10px] text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main rack view — fills remaining height */}
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
        {/* Infrastructure panel */}
        {(frontInfra.length > 0 || rearInfra.length > 0 || sideInfra.length > 0) && (
          <div className="col-span-2 flex flex-col gap-3 overflow-y-auto">
            <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Infrastructure
            </p>

            {[
              { label: 'Front', items: frontInfra },
              { label: 'Rear', items: rearInfra },
              { label: 'Side', items: sideInfra },
            ]
              .filter((g) => g.items.length > 0)
              // Deduplicate across front/rear when they share the same base list
              .filter((g, i, arr) => {
                if (i === 0) return true;
                const prev = arr[i - 1].items.map((x) => x.id).join(',');
                const cur = g.items.map((x) => x.id).join(',');
                return cur !== prev;
              })
              .map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-[9px] font-semibold tracking-wider text-gray-500 uppercase">
                    {group.label}
                  </p>
                  {group.items.map((comp) => (
                    <InfraCard
                      key={comp.id}
                      component={comp}
                      pduMetrics={health?.infra_metrics?.pdu}
                    />
                  ))}
                </div>
              ))}
          </div>
        )}

        {/* Rack elevation panels */}
        <div
          className={`${frontInfra.length > 0 || rearInfra.length > 0 ? 'col-span-10' : 'col-span-12'} grid min-h-0 gap-4 ${viewSide === 'both' ? 'grid-cols-2' : 'grid-cols-1'}`}
        >
          {(viewSide === 'front' || viewSide === 'both') && (
            <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="shrink-0 border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
                <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Front
                </h3>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <RackElevation
                  rack={rack}
                  catalog={deviceCatalog}
                  health={health?.state}
                  nodesData={health?.nodes}
                  infraComponents={frontInfra}
                  sideComponents={sideInfra}
                  pduMetrics={health?.infra_metrics?.pdu}
                  onDeviceClick={(device) =>
                    navigate(`/cosmos/views/device/${rack.id}/${device.id}`)
                  }
                />
              </div>
            </div>
          )}

          {(viewSide === 'rear' || viewSide === 'both') && (
            <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="shrink-0 border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
                <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Rear
                </h3>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <RackElevation
                  rack={rack}
                  catalog={deviceCatalog}
                  health={health?.state}
                  nodesData={health?.nodes}
                  isRearView={true}
                  infraComponents={rearInfra}
                  sideComponents={sideInfra}
                  allowInfraOverlap={true}
                  pduMetrics={health?.infra_metrics?.pdu}
                  onDeviceClick={(device) =>
                    navigate(`/cosmos/views/device/${rack.id}/${device.id}`)
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alerts drawer */}
      {alertsOpen && alertCount > 0 && (
        <RackAlertsDrawer
          onClose={() => setAlertsOpen(false)}
          critNodes={critNodes}
          warnNodes={warnNodes}
        />
      )}
    </div>
  );
};

// ── Infrastructure mini-card ──────────────────────────────────────────────────

type PduMetric = Record<
  string,
  {
    activepower_watt?: number;
    current_amp?: number;
    inlet_rating_amp?: number;
  }
>;

const INFRA_ICON: Record<string, React.ElementType> = {
  power: Zap,
  cooling: Thermometer,
  management: CheckCircle,
  network: Server,
};

const INFRA_COLOR: Record<string, string> = {
  power: 'text-yellow-500 border-yellow-200 dark:border-yellow-500/20',
  cooling: 'text-blue-500 border-blue-200 dark:border-blue-500/20',
  management: 'text-purple-500 border-purple-200 dark:border-purple-500/20',
  network: 'text-brand-500 border-brand-200 dark:border-brand-500/20',
  other: 'text-gray-400 border-gray-200 dark:border-gray-700',
};

const InfraCard = ({
  component,
  pduMetrics,
}: {
  component: InfrastructureComponent;
  pduMetrics?: PduMetric;
}) => {
  const Icon = INFRA_ICON[component.type] ?? Server;
  const color = INFRA_COLOR[component.type] ?? INFRA_COLOR.other;

  const pduEntries = component.type === 'power' && pduMetrics ? Object.entries(pduMetrics) : [];
  const totalPower = pduEntries.reduce((acc, [, v]) => acc + (v.activepower_watt ?? 0), 0);
  const totalCurrent = pduEntries.reduce((acc, [, v]) => acc + (v.current_amp ?? 0), 0);

  return (
    <div
      className={`rounded-xl border bg-white p-2.5 dark:bg-gray-900 ${color.split(' ').slice(1).join(' ')}`}
    >
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${color.split(' ')[0]}`} />
        <span className="truncate text-[10px] font-semibold text-gray-700 dark:text-gray-300">
          {component.name}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="font-mono text-[9px] text-gray-400">
          {component.location === 'u-mount' ? `U${component.u_position}` : 'Zero-U'}
        </span>
        {component.role && (
          <span className="rounded bg-gray-100 px-1 text-[8px] text-gray-500 dark:bg-gray-800">
            {component.role}
          </span>
        )}
      </div>
      {pduEntries.length > 0 && (
        <div className="mt-1.5 flex items-center justify-between font-mono text-[9px]">
          <span className="text-yellow-600 dark:text-yellow-400">
            {(totalPower / 1000).toFixed(1)} kW
          </span>
          <span className="text-gray-400">{totalCurrent.toFixed(1)} A</span>
        </div>
      )}
    </div>
  );
};
