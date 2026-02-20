import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  Thermometer,
  Zap,
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { api } from '../../../services/api';
import type { RackState, DeviceTemplate } from '../../../types';

const HC: Record<string, string> = {
  OK: '#10b981',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#6b7280',
};
const HBg: Record<string, string> = {
  OK: 'bg-green-50 dark:bg-green-500/10',
  WARN: 'bg-amber-50 dark:bg-amber-500/10',
  CRIT: 'bg-red-50 dark:bg-red-500/10',
  UNKNOWN: 'bg-gray-100 dark:bg-gray-800',
};
const HText: Record<string, string> = {
  OK: 'text-green-600 dark:text-green-400',
  WARN: 'text-amber-600 dark:text-amber-400',
  CRIT: 'text-red-600 dark:text-red-400',
  UNKNOWN: 'text-gray-500 dark:text-gray-400',
};
const StateIcon = ({ state }: { state: string }) => {
  const props = { className: 'h-4 w-4' };
  switch (state) {
    case 'OK':
      return <CheckCircle {...props} style={{ color: HC.OK }} />;
    case 'WARN':
      return <AlertTriangle {...props} style={{ color: HC.WARN }} />;
    case 'CRIT':
      return <XCircle {...props} style={{ color: HC.CRIT }} />;
    default:
      return <HelpCircle {...props} style={{ color: HC.UNKNOWN }} />;
  }
};

type DeviceContext = {
  device: {
    id: string;
    name: string;
    template_id: string;
    u_position: number;
    instance?: unknown;
    nodes?: unknown;
    labels?: unknown;
  };
  template: DeviceTemplate | null;
  rack: { id: string; name: string };
  room: { id: string; name: string };
  site: { id: string; name: string };
  aisle?: { id: string; name: string };
};

function expandInstances(instance: unknown): string[] {
  if (!instance) return [];
  if (typeof instance === 'string') {
    const m = instance.match(/^(.*)\[(\d+)-(\d+)\]$/);
    if (m) {
      const [, prefix, start, end] = m;
      const w = start.length;
      return Array.from(
        { length: parseInt(end) - parseInt(start) + 1 },
        (_, i) => `${prefix}${String(parseInt(start) + i).padStart(w, '0')}`
      );
    }
    return [instance];
  }
  if (Array.isArray(instance)) return instance as string[];
  if (typeof instance === 'object' && instance !== null) return Object.values(instance) as string[];
  return [];
}

export const CosmosDevicePage = () => {
  const { rackId, deviceId } = useParams<{ rackId: string; deviceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [ctx, setCtx] = useState<DeviceContext | null>(null);
  const [rackState, setRackState] = useState<RackState | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualInstance, setManualInstance] = useState<string>('');

  useEffect(() => {
    if (!rackId || !deviceId) return;
    api
      .getDeviceDetails(rackId, deviceId)
      .then((data) => {
        setCtx(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [rackId, deviceId]);

  useEffect(() => {
    if (!rackId) return;
    let active = true;
    const load = async () => {
      try {
        const state = await api.getRackState(rackId, true);
        if (active) setRackState(state);
      } catch {
        /* ignore */
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [rackId]);

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="border-t-brand-500 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700" />
      </div>
    );
  if (!ctx)
    return (
      <div className="flex h-64 items-center justify-center text-gray-400">Device not found</div>
    );

  const { device, template, rack, room, site, aisle } = ctx;

  // Derive selected instance: URL param > manual selection > first instance
  const instances = expandInstances(device.instance ?? device.nodes);
  const selectedInstance = searchParams.get('instance') || manualInstance || instances[0] || '';

  // Get instance health from rack state
  const nodes = rackState?.nodes ?? {};
  const selNodeState = selectedInstance
    ? (nodes[selectedInstance] as
        | {
            state?: string;
            temperature?: number;
            power?: number;
            checks?: { id: string; severity: string }[];
          }
        | undefined)
    : undefined;
  const selState = selNodeState?.state ?? 'UNKNOWN';

  // For disk slots (storage devices)
  const isStorage = template?.type === 'storage';
  const diskLayout = isStorage ? (template?.disk_layout ?? template?.layout) : null;
  const diskMatrix = diskLayout?.matrix ?? [];

  // Build slot → virtual node ID mapping
  const slotMap: Record<number, string> = {};
  if (isStorage && instances.length > 0) {
    const instanceName = instances[0];
    diskMatrix.flat().forEach((slot: number) => {
      if (slot > 0) slotMap[slot] = `${instanceName}:slot${slot}`;
    });
  }

  const handleInstanceSelect = (inst: string) => {
    setManualInstance(inst);
    setSearchParams({ instance: inst });
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        <Link to="/cosmos/views/worldmap" className="text-brand-500 hover:underline">
          {site.name}
        </Link>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <Link to={`/cosmos/views/room/${room.id}`} className="text-brand-500 hover:underline">
          {room.name}
        </Link>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        {aisle && (
          <>
            <span className="text-gray-400">{aisle.name}</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </>
        )}
        <Link to={`/cosmos/views/rack/${rack.id}`} className="text-brand-500 hover:underline">
          {rack.name}
        </Link>
        <ChevronRight className="h-4 w-4 text-gray-400" />
        <span className="font-semibold text-gray-900 dark:text-white">{device.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="bg-brand-50 dark:bg-brand-500/15 flex h-12 w-12 items-center justify-center rounded-xl">
          <Server className="text-brand-500 h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{device.name}</h2>
          <p className="font-mono text-sm text-gray-400">
            {device.id} · U{device.u_position} · {template?.type ?? 'device'}
          </p>
        </div>
        <span
          className="rounded-lg px-3 py-1.5 text-sm font-bold text-white"
          style={{ backgroundColor: HC[rackState?.state ?? 'UNKNOWN'] }}
        >
          Rack: {rackState?.state ?? 'UNKNOWN'}
        </span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr,380px]">
        {/* Left: Chassis visualization */}
        <div className="space-y-5">
          {/* Instance tabs */}
          {instances.length > 1 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Instances ({instances.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {instances.map((inst) => {
                  const ns = nodes[inst] as { state?: string } | undefined;
                  const s = ns?.state ?? 'UNKNOWN';
                  return (
                    <button
                      key={inst}
                      onClick={() => handleInstanceSelect(inst)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${selectedInstance === inst ? 'border-brand-500 bg-brand-500 text-white' : 'hover:border-brand-300 border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'}`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: selectedInstance === inst ? 'white' : HC[s] }}
                      />
                      {inst}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Disk matrix for storage */}
          {isStorage && diskMatrix.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Disk Layout — {template?.storage_type ?? 'storage'}
              </h3>
              <div className="space-y-1">
                {diskMatrix.map((row: number[], ri: number) => (
                  <div key={ri} className="flex gap-1">
                    {row.map((slot: number) => {
                      const vNode = slotMap[slot];
                      const ns = vNode
                        ? (nodes[vNode] as { state?: string } | undefined)
                        : undefined;
                      const s = ns?.state ?? (vNode ? 'OK' : 'UNKNOWN');
                      return (
                        <div
                          key={slot}
                          title={`Slot ${slot}${vNode ? `: ${vNode} — ${s}` : ''}`}
                          className="flex aspect-square flex-1 cursor-pointer items-center justify-center rounded text-[8px] font-bold text-white transition-transform hover:scale-110"
                          style={{
                            backgroundColor: slot > 0 ? HC[s] : 'transparent',
                            minWidth: '24px',
                            minHeight: '24px',
                            opacity: slot > 0 ? 0.8 : 0,
                          }}
                        >
                          {slot > 0 ? slot : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-400">
                {diskMatrix.flat().filter((s: number) => s > 0).length} disk slots
              </p>
            </div>
          )}

          {/* Selected instance detail */}
          {selectedInstance && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Instance: {selectedInstance}
                </h3>
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${HBg[selState]} ${HText[selState]}`}
                >
                  <StateIcon state={selState} />
                  {selState}
                </div>
              </div>

              {/* Metrics */}
              {selNodeState && (
                <div className="mb-4 grid grid-cols-2 gap-3">
                  {(selNodeState.temperature ?? 0) > 0 && (
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Thermometer className="h-3.5 w-3.5" />
                        Temperature
                      </div>
                      <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                        {Math.round(selNodeState.temperature ?? 0)}°C
                      </p>
                    </div>
                  )}
                  {(selNodeState.power ?? 0) > 0 && (
                    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Zap className="h-3.5 w-3.5" />
                        Power
                      </div>
                      <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
                        {selNodeState.power} W
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Checks */}
              {selNodeState?.checks && selNodeState.checks.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                    Active Checks
                  </p>
                  <div className="space-y-2">
                    {selNodeState.checks.map(
                      (check: { id: string; severity: string }, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
                          style={{
                            borderLeftWidth: 3,
                            borderLeftColor: HC[check.severity] ?? HC.UNKNOWN,
                          }}
                        >
                          <StateIcon state={check.severity} />
                          <span className="font-mono text-sm text-gray-900 dark:text-white">
                            {check.id}
                          </span>
                          <span
                            className="ml-auto rounded px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: HC[check.severity] ?? HC.UNKNOWN }}
                          >
                            {check.severity}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Context panel */}
        <div className="space-y-4">
          {/* Device info */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Device Info
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'ID', value: device.id, mono: true },
                { label: 'Template', value: device.template_id, mono: true },
                { label: 'Type', value: template?.type ?? '—' },
                { label: 'U Position', value: `U${device.u_position}` },
                { label: 'U Height', value: `${template?.u_height ?? 1}U` },
                ...(isStorage
                  ? [{ label: 'Storage Type', value: template?.storage_type ?? '—' }]
                  : []),
                ...(template?.role ? [{ label: 'Role', value: template.role }] : []),
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{label}</span>
                  <span
                    className={`font-medium text-gray-900 dark:text-white ${mono ? 'font-mono text-xs' : ''}`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Physical location */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Location
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Datacenter', value: site.name, to: '/cosmos/views/worldmap' },
                { label: 'Room', value: room.name, to: `/cosmos/views/room/${room.id}` },
                ...(aisle ? [{ label: 'Aisle', value: aisle.name }] : []),
                { label: 'Rack', value: rack.name, to: `/cosmos/views/rack/${rack.id}` },
              ].map(({ label, value, to }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">{label}</span>
                  {to ? (
                    <Link to={to} className="text-brand-500 font-medium hover:underline">
                      {value}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-900 dark:text-white">{value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Template checks */}
          {template?.checks && template.checks.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Configured Checks
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {template.checks.map((c: string) => (
                  <span
                    key={c}
                    className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 rounded-full px-2.5 py-1 font-mono text-xs"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
