import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, RotateCcw, Thermometer, Zap, Server } from 'lucide-react';
import { RackElevation } from '../../../components/RackVisualizer';
import { useRackData } from './useRackData';
import type { RackNodeState } from '../../../types';

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

export const CosmosRackV1 = () => {
  const { rackId } = useParams<{ rackId: string }>();
  const navigate = useNavigate();
  const [face, setFace] = useState<'front' | 'rear'>('front');
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

  const borderColor = HC[state] ?? HC.UNKNOWN;
  const crit = nodeCounts['CRIT'] ?? 0;
  const warn = nodeCounts['WARN'] ?? 0;

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Top bar — ultra compact */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Breadcrumb */}
        <nav className="flex min-w-0 flex-1 items-center gap-1 text-xs">
          <Link to="/cosmos/views/worldmap" className="text-brand-500 shrink-0 hover:underline">
            World Map
          </Link>
          {roomCtx && (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <Link
                to={`/cosmos/views/room/${roomCtx.roomId}`}
                className="text-brand-500 shrink-0 hover:underline"
              >
                {roomCtx.roomName}
              </Link>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="font-semibold text-gray-900 dark:text-white">{rack.name}</span>
        </nav>

        {/* Inline stats chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {health?.metrics?.temperature && (
            <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Thermometer className="h-3 w-3" />
              {Math.round(health.metrics.temperature)}°C
            </span>
          )}
          {health?.metrics?.power && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-[11px] font-medium text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400">
              <Zap className="h-3 w-3" />
              {(health.metrics.power / 1000).toFixed(1)} kW
            </span>
          )}
          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <Server className="h-3 w-3" />
            {rack.devices.length}
          </span>
          {crit > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400">
              {crit} CRIT
            </span>
          )}
          {warn > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              {warn} WARN
            </span>
          )}
        </div>

        {/* Variant switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-2 py-1 dark:border-gray-700 dark:bg-gray-800/50">
          <span className="mr-1 text-[9px] font-semibold tracking-wider text-gray-400 uppercase">
            View
          </span>
          {VARIANT_LINKS.map((v) => (
            <button
              key={v.path}
              title={v.title}
              onClick={() => navigate(`/cosmos/views/${v.path}/${rackId}`)}
              className={`rounded px-2 py-0.5 text-[10px] font-bold transition-colors ${
                v.path === 'rack-v1'
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {v.label}
            </button>
          ))}
          <button
            onClick={loadHealth}
            className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Rack panel — fills remaining height */}
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
      >
        {/* Rack panel header with face toggle */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 animate-pulse rounded-full"
              style={{ backgroundColor: borderColor }}
            />
            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
              {rack.name}
            </span>
            <span className="text-xs text-gray-400">{rack.u_height ?? 42}U</span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: borderColor }}
            >
              {state}
            </span>
          </div>
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            {(['front', 'rear'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFace(f)}
                className={`px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  face === f
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* RackElevation — fills the panel */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <RackElevation
            rack={rack}
            catalog={deviceCatalog}
            health={health?.state}
            nodesData={health?.nodes}
            isRearView={face === 'rear'}
            infraComponents={face === 'rear' ? rearInfra : frontInfra}
            sideComponents={sideInfra}
            allowInfraOverlap={face === 'rear'}
            pduMetrics={health?.infra_metrics?.pdu}
            fullWidth
            onDeviceClick={(device) => navigate(`/cosmos/views/device/${rack.id}/${device.id}`)}
          />
        </div>
      </div>

      {/* Node heatmap strip */}
      {Object.keys(nodes).length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <span className="mr-2 self-center text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
            Nodes ({Object.keys(nodes).length})
          </span>
          {Object.entries(nodes).map(([node, ns]) => {
            const s = (ns as RackNodeState).state ?? 'UNKNOWN';
            return (
              <div
                key={node}
                title={`${node}: ${s}`}
                className="h-5 w-5 cursor-pointer rounded transition-transform hover:scale-125"
                style={{ backgroundColor: HC[s] ?? HC.UNKNOWN }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
