import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '../services/api';
import type { DeviceContext, RackNodeState, RackState } from '../types';
import { DeviceChassis, HUDTooltip } from '../components/RackVisualizer';
import { expandInstanceList, expandInstanceMap, type InstanceInput } from '../utils/instances';

export const DevicePage = () => {
  const { rackId, deviceId } = useParams<{ rackId: string; deviceId: string }>();
  const [searchParams] = useSearchParams();
  const [context, setContext] = useState<DeviceContext | null>(null);
  const [rackState, setRackState] = useState<RackState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tooltip, setTooltip] = useState<Parameters<typeof HUDTooltip>[0] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!rackId || !deviceId) return;
      setLoading(true);
      try {
        const detail = await api.getDeviceDetails(rackId, deviceId);
        setContext(detail);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load device';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [rackId, deviceId]);

  useEffect(() => {
    const fetchState = async () => {
      if (!rackId || !deviceId) return;
      try {
        // Fetch device metrics only (much faster than loading all rack metrics)
        const metricsData = await api.getDeviceMetrics(rackId, deviceId);

        // Also get health state without metrics for checks/alerts
        const healthState = await api.getRackState(rackId, false);

        // Merge metrics into rack state format for compatibility
        const mergedState = {
          ...healthState,
          nodes: healthState.nodes || {},
        };

        // Add metrics from device-specific endpoint
        Object.keys(metricsData.metrics).forEach((instance) => {
          if (mergedState.nodes[instance]) {
            const instanceMetrics = metricsData.metrics[instance];
            mergedState.nodes[instance] = {
              ...mergedState.nodes[instance],
              temperature: instanceMetrics.temperature || 0,
              power: instanceMetrics.power || 0,
            };
          }
        });

        setRackState(mergedState);
      } catch {
        // Ignore rack state errors for the device page.
      }
    };
    fetchState();
  }, [rackId, deviceId]);

  const instanceList = useMemo(() => {
    if (!context) return [];
    const raw = (context.device.instance || context.device.nodes) as InstanceInput;
    const list = expandInstanceList(raw);
    return list.length > 0 ? list : [context.device.id];
  }, [context]);

  useEffect(() => {
    if (!context) return;
    const requested = searchParams.get('instance');
    if (!requested) {
      setSelectedIndex(0);
      return;
    }
    const idx = instanceList.findIndex((value) => value === requested);
    setSelectedIndex(idx >= 0 ? idx : 0);
  }, [context, instanceList, searchParams]);

  const template = context?.template;
  const matrixSlots = useMemo(() => {
    if (!template) return [];
    // For storage devices, use disk_layout if available, otherwise fallback to layout
    const deviceLayout = template.type === 'storage' && template.disk_layout
      ? template.disk_layout
      : template.layout;
    if (!deviceLayout?.matrix) return [];
    return deviceLayout.matrix.flat();
  }, [template]);
  const selectedInstance = instanceList[selectedIndex] || '';
  const selectedMatrixSlot =
    selectedIndex >= 0 && selectedIndex < matrixSlots.length ? matrixSlots[selectedIndex] : null;

  if (loading) {
    return (
      <div className="animate-pulse p-12 font-mono text-blue-500">
        LDR :: LOADING_DEVICE_CONTEXT...
      </div>
    );
  }

  if (error || !context || !template) {
    return (
      <div className="text-status-crit p-12 font-mono">ERR :: {error || 'DEVICE_NOT_FOUND'}</div>
    );
  }

  const chassisHeight = Math.max(180, template.u_height * 32);
  const nodeMap = expandInstanceMap(
    (context.device.instance || context.device.nodes) as InstanceInput
  );
  const nodesData = rackState?.nodes as Record<string, RackNodeState> | undefined;

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-base)] p-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <Link
            to={`/rack/${context.rack.id}`}
            className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase transition-colors hover:text-blue-400"
          >
            <ChevronLeft className="h-3 w-3" /> Back to Rack
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black tracking-tighter text-[var(--color-text-primary)] uppercase italic">
              {context.device.name}
            </h1>
            <div className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-1 font-mono text-[10px] text-blue-400">
              {template.name}
            </div>
          </div>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-12 gap-6 overflow-hidden">
        <div className="col-span-5 flex flex-col gap-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black tracking-[0.4em] text-gray-400 uppercase">
              Device Chassis
            </h2>
            <span className="font-mono text-[10px] text-gray-500 uppercase">
              U{context.device.u_position} · {template.u_height}U
            </span>
          </div>

          <div
            className="flex items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-base)]/40 p-4"
            style={{ minHeight: chassisHeight }}
          >
            <div className="w-full" style={{ height: chassisHeight }}>
              <DeviceChassis
                device={context.device}
                template={template}
                rackHealth={rackState?.state || 'UNKNOWN'}
                nodesData={nodesData}
                uPosition={context.device.u_position}
                onTooltipChange={setTooltip}
                detailView={true}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
              Instances
            </div>
            <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-1">
              {instanceList.map((instance, idx) => (
                <button
                  key={`${instance}-${idx}`}
                  onClick={() => setSelectedIndex(idx)}
                  className={`rounded-full border px-4 py-1 font-mono text-[11px] tracking-widest whitespace-nowrap uppercase transition ${
                    idx === selectedIndex
                      ? 'border-blue-500/60 bg-blue-500/15 text-blue-300'
                      : 'border-[var(--color-border)]/40 text-gray-400 hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {instance}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-7 flex flex-col gap-6">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6">
            <h3 className="mb-4 text-[10px] font-black tracking-[0.4em] text-gray-400 uppercase">
              Selected Node
            </h3>
            <div className="grid grid-cols-2 gap-4 text-[12px]">
              <Detail label="Hostname" value={selectedInstance || context.device.id} />
              <Detail
                label="Matrix Slot"
                value={selectedMatrixSlot ? String(selectedMatrixSlot) : 'N/A'}
              />
              <Detail label="Template ID" value={template.id} mono />
              <Detail label="Template Name" value={template.name} />
              {(() => {
                const deviceLayout = template.type === 'storage' && template.disk_layout
                  ? template.disk_layout
                  : template.layout;
                return (
                  <Detail
                    label={template.type === 'storage' ? 'Disk Layout' : 'Layout'}
                    value={`${deviceLayout?.rows || 1}x${deviceLayout?.cols || 1}`}
                  />
                );
              })()}
              {template.type === 'storage' && template.storage_type && (
                <Detail label="Storage Type" value={template.storage_type} />
              )}
              <Detail label="Role" value={template.role || 'default'} />
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6">
            <h3 className="mb-4 text-[10px] font-black tracking-[0.4em] text-gray-400 uppercase">
              Physical Location
            </h3>
            <div className="grid grid-cols-2 gap-4 text-[12px]">
              <Detail label="Datacenter" value={context.site.name} />
              <Detail label="Room" value={context.room.name} />
              <Detail label="Aisle" value={context.aisle?.name || 'Standalone'} />
              <Detail label="Rack" value={context.rack.name} />
              <Detail label="Rack ID" value={context.rack.id} mono />
              <Detail label="Rack Template" value={context.rack.template_id || 'generic'} mono />
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-panel)] p-6">
            <h3 className="mb-4 text-[10px] font-black tracking-[0.4em] text-gray-400 uppercase">
              Instance Map
            </h3>
            <div className="grid grid-cols-2 gap-3 font-mono text-[11px] tracking-widest text-gray-400 uppercase">
              {Object.entries(nodeMap).map(([slot, value]) => (
                <div
                  key={`${slot}-${value}`}
                  className="rounded-md border border-[var(--color-border)]/40 bg-[var(--color-bg-base)]/50 px-3 py-2 text-[var(--color-text-primary)]"
                >
                  <span className="text-gray-500">Slot {slot}</span>
                  <div className="mt-1 truncate text-[12px] text-[var(--color-text-primary)]">{value}</div>
                </div>
              ))}
              {Object.keys(nodeMap).length === 0 && (
                <div className="text-gray-500">No instances configured for this device.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {tooltip && <HUDTooltip {...tooltip} />}
    </div>
  );
};

const Detail = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="space-y-1">
    <div className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">{label}</div>
    <div className={`text-[13px] font-semibold text-[var(--color-text-primary)] ${mono ? 'font-mono' : ''}`}>{value}</div>
  </div>
);
