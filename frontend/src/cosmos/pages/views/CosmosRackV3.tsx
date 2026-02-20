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
  ChevronDown,
} from 'lucide-react';
import { RackElevation } from '../../../components/RackVisualizer';
import { useRackData } from './useRackData';

const HC: Record<string, string> = {
  OK: '#10b981',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#6b7280',
};

const VARIANT_LINKS = [
  { label: 'V1', path: 'rack-v1', title: 'Maximized' },
  { label: 'V2', path: 'rack-v2', title: 'Workbench' },
  { label: 'V3', path: 'rack-v3', title: 'Side by Side' },
  { label: 'V4', path: 'rack-v4', title: 'USlot List' },
] as const;

export const CosmosRackV3 = () => {
  const { rackId } = useParams<{ rackId: string }>();
  const navigate = useNavigate();
  const [infraOpen, setInfraOpen] = useState(false);

  const {
    rack,
    deviceCatalog,
    health,
    roomCtx,
    loading,
    frontInfra,
    rearInfra,
    sideInfra,
    nodeCounts,
    state,
    nodes,
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

  const stateColor = HC[state] ?? HC.UNKNOWN;

  const allInfra = [
    ...frontInfra,
    ...rearInfra.filter((c) => !frontInfra.find((x) => x.id === c.id)),
  ];

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header row: breadcrumb + stats + controls */}
      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex flex-1 items-center gap-1 text-sm">
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
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="font-semibold text-gray-900 dark:text-white">{rack.name}</span>
          <span
            className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: stateColor }}
          >
            {state}
          </span>
        </nav>

        {/* Stats pills */}
        <div className="flex items-center gap-1.5">
          {[
            {
              icon: Thermometer,
              value: health?.metrics?.temperature
                ? `${Math.round(health.metrics.temperature)}°C`
                : null,
              cls: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
            },
            {
              icon: Zap,
              value: health?.metrics?.power
                ? `${(health.metrics.power / 1000).toFixed(1)}kW`
                : null,
              cls: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400',
            },
            {
              icon: Server,
              value: `${rack.devices.length}D`,
              cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
            },
            {
              icon: Cpu,
              value: `${Object.keys(nodes).length}N`,
              cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
            },
            {
              icon: XCircle,
              value: nodeCounts['CRIT'] ? `${nodeCounts['CRIT']} CRIT` : null,
              cls: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
            },
            {
              icon: AlertTriangle,
              value: nodeCounts['WARN'] ? `${nodeCounts['WARN']} WARN` : null,
              cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
            },
          ]
            .filter((s) => s.value !== null)
            .map((s, i) => (
              <span
                key={i}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}
              >
                <s.icon className="h-3 w-3" />
                {s.value}
              </span>
            ))}
        </div>

        {/* Variant switcher + refresh */}
        <div className="flex items-center gap-1">
          {VARIANT_LINKS.map((v) => (
            <button
              key={v.path}
              title={v.title}
              onClick={() => navigate(`/cosmos/views/${v.path}/${rackId}`)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                v.path === 'rack-v3'
                  ? 'bg-brand-500 text-white'
                  : 'border border-gray-200 text-gray-500 hover:text-gray-900 dark:border-gray-700 dark:hover:text-white'
              }`}
            >
              {v.label}
            </button>
          ))}
          <button
            onClick={loadHealth}
            className="ml-1 rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:text-gray-600 dark:border-gray-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Twin rack panels — always side by side */}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
        {[
          { label: 'Front', isRear: false, infra: frontInfra },
          { label: 'Rear', isRear: true, infra: rearInfra },
        ].map(({ label, isRear, infra }) => (
          <div
            key={label}
            className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            style={{ borderTopWidth: 3, borderTopColor: stateColor }}
          >
            <div className="shrink-0 border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
              <h3 className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                {label}
              </h3>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <RackElevation
                rack={rack}
                catalog={deviceCatalog}
                health={health?.state}
                nodesData={health?.nodes}
                isRearView={isRear}
                infraComponents={infra}
                sideComponents={sideInfra}
                allowInfraOverlap={isRear}
                pduMetrics={health?.infra_metrics?.pdu}
                fullWidth
                onDeviceClick={(device) => navigate(`/cosmos/views/device/${rack.id}/${device.id}`)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Collapsible infra section */}
      {allInfra.length > 0 && (
        <div className="shrink-0 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <button
            onClick={() => setInfraOpen((p) => !p)}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Infrastructure ({allInfra.length} components)
            </span>
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform ${infraOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {infraOpen && (
            <div className="border-t border-gray-100 px-4 pt-3 pb-4 dark:border-gray-800">
              <div className="flex flex-wrap gap-2">
                {allInfra.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <span className="text-xs text-gray-500">
                      {c.type === 'power' ? '⚡' : c.type === 'cooling' ? '❄' : '⚙'}
                    </span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {c.name}
                    </span>
                    <span className="font-mono text-[9px] text-gray-400">
                      {c.location === 'u-mount' ? `U${c.u_position}` : '0U'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
