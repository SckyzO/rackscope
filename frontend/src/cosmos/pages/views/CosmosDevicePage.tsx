import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  Thermometer,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import { DeviceChassis, HUDTooltip } from '../../../components/RackVisualizer';

// Local type matching HUDTooltip props (the interface isn't exported from RackVisualizer)
type TooltipPayload = {
  title: string;
  subtitle: string;
  status: string;
  details: { label: string; value: string; italic?: boolean }[];
  reasons?: string[];
  metrics?: { temp?: number; power?: number };
  mousePos: { x: number; y: number };
};
import { api } from '../../../services/api';
import type { RackState, DeviceTemplate } from '../../../types';

// ── Health helpers ─────────────────────────────────────────────────────────────

const HC: Record<string, string> = {
  OK: '#10b981',
  WARN: '#f59e0b',
  CRIT: '#ef4444',
  UNKNOWN: '#6b7280',
};

const STATE_PILL: Record<string, string> = {
  OK: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
  WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CRIT: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  UNKNOWN: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

// ── Sub-components (module-level) ──────────────────────────────────────────────

const StateIcon = ({ state, className }: { state: string; className?: string }) => {
  const p = { className: className ?? 'h-4 w-4' };
  switch (state) {
    case 'OK':
      return <CheckCircle {...p} style={{ color: HC.OK }} />;
    case 'WARN':
      return <AlertTriangle {...p} style={{ color: HC.WARN }} />;
    case 'CRIT':
      return <XCircle {...p} style={{ color: HC.CRIT }} />;
    default:
      return <HelpCircle {...p} style={{ color: HC.UNKNOWN }} />;
  }
};

// ── Types ──────────────────────────────────────────────────────────────────────

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

type NodeState = {
  state?: string;
  temperature?: number;
  power?: number;
  checks?: { id: string; severity: string }[];
};

// ── expandInstances ────────────────────────────────────────────────────────────

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

// ── Main page ──────────────────────────────────────────────────────────────────

export const CosmosDevicePage = () => {
  const { rackId, deviceId } = useParams<{ rackId: string; deviceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [ctx, setCtx] = useState<DeviceContext | null>(null);
  const [rackState, setRackState] = useState<RackState | null>(null);
  const [loading, setLoading] = useState(true);
  const [chassisView, setChassisView] = useState<'front' | 'rear'>('front');
  const [tooltip, setTooltip] = useState<TooltipPayload | null>(null);

  useEffect(() => {
    if (!rackId || !deviceId) return;
    let active = true;
    api
      .getDeviceDetails(rackId, deviceId)
      .then((data) => {
        if (active) {
          setCtx(data);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
    return () => {
      active = false;
    };
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
  const instances = expandInstances(device.instance ?? device.nodes);
  const nodes = (rackState?.nodes ?? {}) as Record<string, NodeState>;

  const selectedInstance = searchParams.get('instance') || instances[0] || '';
  const handleSelect = (inst: string) => setSearchParams({ instance: inst });

  const selNode = selectedInstance ? nodes[selectedInstance] : undefined;
  const selState = selNode?.state ?? 'UNKNOWN';
  const hasRear = Boolean(template?.rear_layout);
  const isStorage = template?.type === 'storage';

  // Overall device state = worst instance
  const deviceState = instances.reduce((worst, inst) => {
    const s = nodes[inst]?.state ?? 'UNKNOWN';
    const rank: Record<string, number> = { CRIT: 4, WARN: 3, UNKNOWN: 2, OK: 1 };
    return (rank[s] ?? 0) > (rank[worst] ?? 0) ? s : worst;
  }, 'UNKNOWN');

  const mockDevice = {
    id: device.id,
    name: device.name,
    template_id: device.template_id,
    u_position: device.u_position,
    instance: device.instance ?? null,
    nodes: device.nodes ?? null,
    labels: null as Record<string, string> | null,
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* ── Breadcrumb ── */}
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
              <span className="text-gray-500 dark:text-gray-400">{aisle.name}</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </>
          )}
          <Link to={`/cosmos/views/rack/${rack.id}`} className="text-brand-500 hover:underline">
            {rack.name}
          </Link>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="font-semibold text-gray-900 dark:text-white">{device.name}</span>
        </nav>

        {/* ── Device header ── */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{device.name}</h1>
            <p className="font-mono text-sm text-gray-400">
              {device.id} · U{device.u_position} · {template?.type ?? 'device'}
              {template?.u_height && template.u_height > 1 ? ` · ${template.u_height}U` : ''}
            </p>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold ${STATE_PILL[deviceState] ?? STATE_PILL.UNKNOWN}`}
          >
            <StateIcon state={deviceState} className="h-4 w-4" />
            {deviceState}
          </span>
        </div>

        {/* ── CHASSIS — full width, tall ── */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          {/* Chassis toolbar */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {isStorage ? 'Disk Layout' : 'Device Chassis'}
              </span>
              {template && (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-mono text-xs text-gray-500 dark:bg-gray-800">
                  {template.id}
                </span>
              )}
              <span className="text-xs text-gray-400">
                {template?.u_height ?? 1}U · {instances.length} node
                {instances.length !== 1 ? 's' : ''}
              </span>
            </div>
            {hasRear && (
              <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                {(['front', 'rear'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setChassisView(v)}
                    className={`px-3 py-1 text-xs font-medium capitalize transition-colors ${
                      chassisView === v
                        ? 'bg-brand-500 text-white'
                        : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chassis — large render area */}
          <div className="flex items-stretch justify-center px-8 py-6" style={{ minHeight: 280 }}>
            {template ? (
              <div className="w-full">
                <DeviceChassis
                  device={mockDevice}
                  template={template}
                  rackHealth={deviceState}
                  nodesData={rackState?.nodes}
                  isRearView={chassisView === 'rear'}
                  uPosition={device.u_position}
                  detailView={true}
                  onClick={() => {}}
                  onTooltipChange={(payload) => setTooltip(payload as TooltipPayload | null)}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center text-sm text-gray-400">
                No template available
              </div>
            )}
          </div>

          {/* Instance pills */}
          {instances.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-800">
              {instances.map((inst) => {
                const s = nodes[inst]?.state ?? 'UNKNOWN';
                const active = inst === selectedInstance;
                return (
                  <button
                    key={inst}
                    onClick={() => handleSelect(inst)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'border border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: active ? 'white' : HC[s] }}
                    />
                    {inst}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Bottom row: Instance detail (left) + Device info (right) ── */}
        <div className="grid gap-4 md:grid-cols-[1fr,320px]">
          {/* LEFT — selected instance */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: HC[selState] }}
                />
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                  {selectedInstance || '—'}
                </span>
              </div>
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${STATE_PILL[selState] ?? STATE_PILL.UNKNOWN}`}
              >
                <StateIcon state={selState} className="h-3.5 w-3.5" />
                {selState}
              </span>
            </div>

            <div className="p-5">
              {/* Metrics */}
              {selNode && ((selNode.temperature ?? 0) > 0 || (selNode.power ?? 0) > 0) && (
                <div className="mb-5 grid grid-cols-2 gap-3">
                  {(selNode.temperature ?? 0) > 0 && (
                    <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-3 dark:bg-blue-500/10">
                      <Thermometer className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-xs text-blue-600 dark:text-blue-400">Temperature</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {Math.round(selNode.temperature ?? 0)}°C
                        </p>
                      </div>
                    </div>
                  )}
                  {(selNode.power ?? 0) > 0 && (
                    <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10">
                      <Zap className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="text-xs text-amber-600 dark:text-amber-400">Power</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {selNode.power} W
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Checks */}
              {selNode?.checks && selNode.checks.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                    Active Checks ({selNode.checks.length})
                  </p>
                  {selNode.checks.map((check, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-2.5 dark:border-gray-800"
                      style={{
                        borderLeftWidth: 3,
                        borderLeftColor: HC[check.severity] ?? HC.UNKNOWN,
                      }}
                    >
                      <StateIcon state={check.severity} />
                      <span className="flex-1 truncate font-mono text-sm text-gray-900 dark:text-white">
                        {check.id}
                      </span>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
                        style={{ backgroundColor: HC[check.severity] ?? HC.UNKNOWN }}
                      >
                        {check.severity}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-500/20 dark:bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    No active alerts
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — device info + location + checks */}
          <div className="space-y-4">
            {/* Device info */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                Device
              </p>
              <div className="space-y-2">
                {[
                  { label: 'ID', value: device.id, mono: true },
                  { label: 'Template', value: device.template_id, mono: true },
                  { label: 'Type', value: template?.type ?? '—' },
                  {
                    label: 'Position',
                    value: `U${device.u_position} · ${template?.u_height ?? 1}U`,
                  },
                  ...(template?.role ? [{ label: 'Role', value: template.role, mono: false }] : []),
                  ...(isStorage && template?.storage_type
                    ? [{ label: 'Storage', value: template.storage_type, mono: false }]
                    : []),
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="shrink-0 text-gray-500 dark:text-gray-400">{label}</span>
                    <span
                      className={`truncate text-right font-medium text-gray-900 dark:text-white ${mono ? 'font-mono text-[11px]' : ''}`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                Location
              </p>
              <div className="space-y-2">
                {[
                  { label: 'DC', value: site.name, to: '/cosmos/views/worldmap' },
                  { label: 'Room', value: room.name, to: `/cosmos/views/room/${room.id}` },
                  ...(aisle ? [{ label: 'Aisle', value: aisle.name }] : []),
                  { label: 'Rack', value: rack.name, to: `/cosmos/views/rack/${rack.id}` },
                ].map(({ label, value, to }) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="shrink-0 text-gray-500 dark:text-gray-400">{label}</span>
                    {to ? (
                      <Link
                        to={to}
                        className="text-brand-500 truncate text-right font-medium hover:underline"
                      >
                        {value}
                      </Link>
                    ) : (
                      <span className="truncate text-right font-medium text-gray-900 dark:text-white">
                        {value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Configured checks */}
            {template?.checks && template.checks.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <p className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                  Configured Checks
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {template.checks.map((c: string) => (
                    <span
                      key={c}
                      className="bg-brand-50 text-brand-500 dark:bg-brand-500/15 rounded-full px-2 py-0.5 font-mono text-[11px]"
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

      {/* HUDTooltip — shown when hovering nodes in the chassis */}
      {tooltip && <HUDTooltip {...tooltip} />}
    </>
  );
};
