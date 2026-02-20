import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, RotateCcw, Thermometer, Zap, Server, Cpu } from 'lucide-react';
import { api } from '../../../services/api';
import type { Rack, RackState, DeviceTemplate } from '../../../types';

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

type USlotProps = {
  u: number;
  device?: Rack['devices'][0];
  template?: DeviceTemplate;
  onClick?: () => void;
};

const USlot = ({ u, device, template, onClick }: USlotProps) => {
  if (!device) {
    return (
      <div className="flex h-6 items-center gap-2 border-b border-gray-100 dark:border-gray-800">
        <span className="w-7 shrink-0 text-right text-[9px] text-gray-300 dark:text-gray-600">
          {u}
        </span>
        <div
          className="flex-1 rounded-sm bg-gray-50 dark:bg-gray-800/50"
          style={{ height: '18px' }}
        />
      </div>
    );
  }

  const height = (template?.u_height ?? 1) * 24;

  return (
    <div
      className="group flex cursor-pointer items-start gap-2 border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5"
      style={{ height, minHeight: height }}
      onClick={onClick}
    >
      <span className="mt-1 w-7 shrink-0 text-right text-[9px] text-gray-300 dark:text-gray-600">
        {u}
      </span>
      <div
        className="flex flex-1 items-center gap-2 rounded-sm bg-gray-100 px-2 dark:bg-gray-800"
        style={{ height: height - 2 }}
      >
        <Cpu className="text-brand-500 h-3.5 w-3.5 shrink-0" />
        <span className="truncate font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
          {device.name}
        </span>
        <span className="ml-auto text-[9px] text-gray-400">{template?.type}</span>
      </div>
    </div>
  );
};

export const CosmosRackV4 = () => {
  const { rackId } = useParams<{ rackId: string }>();
  const navigate = useNavigate();
  const [rack, setRack] = useState<Rack | null>(null);
  const [deviceCatalog, setDeviceCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [health, setHealth] = useState<RackState | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewSide, setViewSide] = useState<'front' | 'rear' | 'both'>('front');

  const loadHealth = async () => {
    if (!rackId) return;
    try {
      const state = await api.getRackState(rackId, true);
      setHealth(state);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!rackId) return;
    Promise.all([api.getRack(rackId), api.getCatalog()])
      .then(([rackData, catalog]) => {
        setRack(rackData);
        const dc: Record<string, DeviceTemplate> = {};
        (catalog?.device_templates ?? []).forEach((t: DeviceTemplate) => {
          dc[t.id] = t;
        });
        setDeviceCatalog(dc);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [rackId]);

  useEffect(() => {
    if (!rackId) return;
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
  }, [rackId]);

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

  const state = health?.state ?? 'UNKNOWN';
  const nodes = health?.nodes ?? {};

  const uMap: Record<number, Rack['devices'][0]> = {};
  rack.devices.forEach((dev) => {
    uMap[dev.u_position] = dev;
  });

  const uHeight = rack.u_height ?? 42;
  const slots = Array.from({ length: uHeight }, (_, i) => uHeight - i);

  const rackSlots = (
    <div className="overflow-auto" style={{ maxHeight: '600px' }}>
      {slots.map((u) => {
        const dev = uMap[u];
        const tpl = dev ? deviceCatalog[dev.template_id] : undefined;
        if (dev && dev.u_position !== u) return null;
        return (
          <USlot
            key={u}
            u={u}
            device={dev}
            template={tpl}
            onClick={dev ? () => navigate(`/cosmos/views/device/${rackId}/${dev.id}`) : undefined}
          />
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Breadcrumb + variant switcher */}
      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex flex-1 items-center gap-1 text-sm">
          <Link to="/cosmos/views/worldmap" className="text-brand-500 hover:underline">
            World Map
          </Link>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="font-semibold text-gray-900 dark:text-white">{rack.name}</span>
        </nav>
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
                v.path === 'rack-v4'
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{rack.name}</h2>
            <span
              className="rounded-lg px-2.5 py-1 text-xs font-bold text-white"
              style={{ backgroundColor: HC[state] }}
            >
              {state}
            </span>
          </div>
          <p className="mt-1 font-mono text-sm text-gray-400">
            {rack.id} · {uHeight}U
          </p>
        </div>
        <div className="flex gap-2">
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
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      {health && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            {
              label: 'Temperature',
              value: health.metrics?.temperature
                ? `${Math.round(health.metrics.temperature)}°C`
                : '—',
              icon: Thermometer,
            },
            {
              label: 'Power',
              value: health.metrics?.power ? `${(health.metrics.power / 1000).toFixed(1)} kW` : '—',
              icon: Zap,
            },
            { label: 'Devices', value: rack.devices.length, icon: Server },
            { label: 'Nodes', value: Object.keys(nodes).length, icon: Cpu },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <s.icon className="text-brand-500 h-5 w-5 shrink-0" />
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rack panels */}
      <div className={`grid gap-5 ${viewSide === 'both' ? 'xl:grid-cols-2' : ''}`}>
        {(viewSide === 'front' || viewSide === 'both') && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Front View</h3>
            </div>
            <div className="p-4">{rackSlots}</div>
          </div>
        )}
        {(viewSide === 'rear' || viewSide === 'both') && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Rear View</h3>
            </div>
            <div className="p-4">{rackSlots}</div>
          </div>
        )}
      </div>

      {/* Node health grid */}
      {Object.keys(nodes).length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Node Health Grid ({Object.keys(nodes).length} nodes)
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(nodes).map(([node, ns]) => {
              const s = (ns as { state?: string }).state ?? 'UNKNOWN';
              return (
                <div
                  key={node}
                  title={`${node}: ${s}`}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-[8px] font-bold text-white transition-transform hover:scale-110"
                  style={{ backgroundColor: HC[s] }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
