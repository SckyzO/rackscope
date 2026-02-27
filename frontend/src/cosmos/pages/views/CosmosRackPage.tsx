import { useState } from 'react';
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
  X,
  Building2,
  Pencil,
} from 'lucide-react';
import { RackElevation } from '../../../components/RackVisualizer';
import { useRackData } from './useRackData';
import type { Device, InfrastructureComponent, RackNodeState } from '../../../types';

const HC: Record<string, string> = {
  OK: '#10b981',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#6b7280',
};

const STATE_CLS: Record<string, string> = {
  OK: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CRIT: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  UNKNOWN: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const INFRA_COLOR: Record<string, string> = {
  power: 'text-yellow-500',
  cooling: 'text-blue-500',
  management: 'text-purple-500',
  network: 'text-brand-500',
  other: 'text-gray-400',
};

type SelectedDevice = {
  device: Device;
  state: string;
  temp?: number;
  power?: number;
};

const InfraRow = ({ comp }: { comp: InfrastructureComponent }) => (
  <div className="flex items-center gap-2 py-1.5">
    <span className={`text-xs font-medium ${INFRA_COLOR[comp.type] ?? 'text-gray-400'}`}>
      {comp.type === 'power'
        ? '⚡'
        : comp.type === 'cooling'
          ? '❄'
          : comp.type === 'management'
            ? '⚙'
            : '◈'}
    </span>
    <span className="min-w-0 flex-1 truncate text-xs text-gray-700 dark:text-gray-300">
      {comp.name}
    </span>
    <span className="shrink-0 font-mono text-[9px] text-gray-400">
      {comp.location === 'u-mount' ? `U${comp.u_position}` : '0U'}
    </span>
  </div>
);

export const CosmosRackPage = () => {
  const { rackId } = useParams<{ rackId: string }>();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<SelectedDevice | null>(null);

  const {
    rack,
    deviceCatalog,
    rackTemplate,
    health,
    roomCtx,
    loading,
    frontInfra,
    rearInfra,
    sideInfra,
    nodeCounts,
    state,
    nodes,
    uHeight,
    loadHealth,
  } = useRackData(rackId);

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

  const handleDeviceClick = (device: Device) => {
    const matchKey = Object.keys(nodes).find((k) => k.startsWith(device.id.split(':')[0]));
    const ns = matchKey ? (nodes[matchKey] as RackNodeState) : undefined;
    setSelected({
      device,
      state: ns?.state ?? 'UNKNOWN',
      temp: ns?.temperature,
      power: ns?.power,
    });
  };

  const allInfra = [
    ...frontInfra.filter((c, i, a) => a.findIndex((x) => x.id === c.id) === i),
    ...rearInfra.filter((c) => !frontInfra.find((x) => x.id === c.id)),
  ];

  // Count devices by template name for the stats box
  const deviceStats = Object.entries(
    rack.devices.reduce<Record<string, number>>((acc, d) => {
      const name = deviceCatalog[d.template_id]?.name ?? d.template_id ?? 'Unknown';
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {})
  ).sort(([, a], [, b]) => b - a);

  return (
    <div className="flex h-full gap-4">
      {/* Left sidebar */}
      <aside className="flex w-64 shrink-0 flex-col gap-4 overflow-y-auto">
        {/* Rack identity */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">{rack.name}</h2>
              <p className="font-mono text-xs text-gray-400">{rack.id}</p>
            </div>
            <span
              className={`rounded-lg px-2 py-0.5 text-xs font-bold ${STATE_CLS[state] ?? STATE_CLS.UNKNOWN}`}
            >
              {state}
            </span>
          </div>

          {/* Breadcrumb */}
          <nav className="mb-3 flex flex-wrap items-center gap-1 text-[11px]">
            <Link to="/cosmos/views/worldmap" className="text-brand-500 hover:underline">
              Map
            </Link>
            {roomCtx && (
              <>
                <ChevronRight className="h-3 w-3 text-gray-400" />
                <Link
                  to={`/cosmos/views/room/${roomCtx.roomId}`}
                  className="text-brand-500 hover:underline"
                >
                  {roomCtx.roomName}
                </Link>
              </>
            )}
          </nav>

          <div className="space-y-1.5 text-xs">
            {[
              { label: 'Height', value: `${uHeight}U` },
              { label: 'Devices', value: rack.devices.length },
              { label: 'Template', value: rackTemplate?.name ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-gray-400">{label}</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics */}
        {health && (
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                icon: Thermometer,
                label: 'Temp',
                value: health.metrics?.temperature
                  ? `${Math.round(health.metrics.temperature)}°C`
                  : '—',
                color: 'text-blue-500',
              },
              {
                icon: Zap,
                label: 'Power',
                value: health.metrics?.power
                  ? `${(health.metrics.power / 1000).toFixed(1)}kW`
                  : '—',
                color: 'text-yellow-500',
              },
              {
                icon: XCircle,
                label: 'CRIT',
                value: nodeCounts['CRIT'] ?? 0,
                color: 'text-red-500',
              },
              {
                icon: AlertTriangle,
                label: 'WARN',
                value: nodeCounts['WARN'] ?? 0,
                color: 'text-amber-500',
              },
              {
                icon: Cpu,
                label: 'Nodes',
                value: Object.keys(nodes).length,
                color: 'text-brand-500',
              },
              {
                icon: Server,
                label: 'OK',
                value: nodeCounts['OK'] ?? 0,
                color: 'text-green-500',
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-gray-200 bg-white p-2.5 dark:border-gray-800 dark:bg-gray-900"
              >
                <s.icon className={`mb-1 h-3.5 w-3.5 ${s.color}`} />
                <p className="text-sm font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-[9px] text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Infrastructure */}
        {allInfra.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Infrastructure
            </p>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {allInfra.map((c) => (
                <InfraRow key={c.id} comp={c} />
              ))}
            </div>
          </div>
        )}

        {/* Device stats */}
        {deviceStats.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="mb-3 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
              Devices ({rack.devices.length})
            </p>
            <div className="space-y-1.5">
              {deviceStats.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs text-gray-700 dark:text-gray-300">
                    {name}
                  </span>
                  <span className="shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main rack area — front + rear side by side */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Building2 className="text-brand-500 h-4 w-4" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {rack.name}
            </span>
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: HC[state] ?? HC.UNKNOWN }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate(`/cosmos/editors/rack`)}
              title="Edit rack"
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              onClick={loadHealth}
              title="Refresh"
              className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:text-gray-600 dark:border-gray-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Dual front / rear views */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Front */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-gray-100 dark:border-gray-800">
            <div className="shrink-0 border-b border-gray-100 py-1.5 text-center dark:border-gray-800">
              <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                Front
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="mx-auto h-full max-w-[600px]">
                <RackElevation
                  rack={rack}
                  catalog={deviceCatalog}
                  health={health?.state}
                  nodesData={health?.nodes}
                  isRearView={false}
                  infraComponents={frontInfra}
                  sideComponents={sideInfra}
                  allowInfraOverlap={false}
                  pduMetrics={health?.infra_metrics?.pdu}
                  onDeviceClick={handleDeviceClick}
                  maxUPx={48}
                />
              </div>
            </div>
          </div>

          {/* Rear */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-gray-100 py-1.5 text-center dark:border-gray-800">
              <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                Rear
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="mx-auto h-full max-w-[600px]">
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
                  onDeviceClick={handleDeviceClick}
                  maxUPx={48}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right device detail drawer */}
      {selected && (
        <aside className="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-start justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {selected.device.name}
              </h3>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <span
              className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-bold ${STATE_CLS[selected.state] ?? STATE_CLS.UNKNOWN}`}
            >
              {selected.state}
            </span>
            <div className="mt-3 space-y-2 text-xs">
              {[
                { label: 'ID', value: selected.device.id, mono: true },
                { label: 'Template', value: selected.device.template_id, mono: true },
                { label: 'U Position', value: `U${selected.device.u_position}`, mono: false },
                ...(selected.temp !== undefined
                  ? [{ label: 'Temp', value: `${Math.round(selected.temp)}°C`, mono: false }]
                  : []),
                ...(selected.power !== undefined
                  ? [{ label: 'Power', value: `${selected.power} W`, mono: false }]
                  : []),
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-gray-400">{label}</span>
                  <span
                    className={`truncate font-medium text-gray-700 dark:text-gray-300 ${mono ? 'font-mono text-[10px]' : ''}`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate(`/cosmos/views/device/${rack.id}/${selected.device.id}`)}
              className="bg-brand-500 hover:bg-brand-600 mt-4 w-full rounded-lg py-2 text-xs font-semibold text-white transition-colors"
            >
              Open Device →
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};
