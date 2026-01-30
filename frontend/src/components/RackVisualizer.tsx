import { useState, useMemo, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Server,
  Box,
  Zap,
  Thermometer,
  Router as RouterIcon,
  Fan,
  Power,
  Activity,
} from 'lucide-react';
import type {
  Device,
  DeviceTemplate,
  Rack,
  InfrastructureComponent,
  RackNodeState,
  AlertCheck,
} from '../types';

// --- Helpers ---
const parseNodeset = (
  pattern?: string | Record<number, string> | string[]
): Record<number, string> => {
  if (!pattern) return {};
  if (Array.isArray(pattern)) {
    return pattern.reduce<Record<number, string>>((acc, value, index) => {
      if (typeof value === 'string') {
        acc[index + 1] = value;
      }
      return acc;
    }, {});
  }
  if (typeof pattern !== 'string') return pattern;
  const match = pattern.match(/(.+)\[(\d+)-(\d+)\]/);
  if (!match) return { 1: pattern };
  const [, prefix, startStr, end] = match;
  const start = parseInt(startStr);
  const count = parseInt(end) - start + 1;
  const padding = startStr.length;
  const result: Record<number, string> = {};
  for (let i = 0; i < count; i++) {
    const num = (start + i).toString().padStart(padding, '0');
    result[i + 1] = `${prefix}${num}`;
  }
  return result;
};

// --- Reusable HUD Tooltip Component ---

interface HUDTooltipProps {
  title: string;
  subtitle?: string;
  status: string;
  details: { label: string; value: string; italic?: boolean }[];
  reasons?: string[];
  metrics?: {
    temp?: number;
    power?: number;
  };
  mousePos: { x: number; y: number };
}

export const HUDTooltip = ({
  title,
  subtitle,
  status,
  details,
  reasons,
  metrics,
  mousePos,
}: HUDTooltipProps) => {
  const statusColor =
    status === 'OK'
      ? 'bg-status-ok'
      : status === 'CRIT'
        ? 'bg-status-crit'
        : status === 'WARN'
          ? 'bg-status-warn'
          : 'bg-gray-600';

  const showBelow = mousePos.y < 400;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: showBelow ? `${mousePos.y + 15}px` : `${mousePos.y - 15}px`,
        left: `${mousePos.x}px`,
        transform: showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
        zIndex: 999999,
        pointerEvents: 'none',
      }}
      className="animate-in fade-in zoom-in-95 w-80 duration-200"
    >
      <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-panel)]/95 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        {showBelow && (
          <div className="absolute top-0 left-1/2 -mt-1 h-0 w-0 -translate-x-1/2 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-b-[var(--color-accent-primary)] border-l-transparent"></div>
        )}

        <div
          className={`absolute top-0 bottom-0 left-0 w-1 ${statusColor} ${status === 'CRIT' ? 'animate-pulse' : ''}`}
        ></div>

        <div className="p-5 pl-7 text-left">
          {/* Header */}
          <div className="mb-5 flex items-start justify-between">
            <div className="space-y-0.5">
              <h4 className="text-[11px] font-black tracking-widest text-[var(--color-accent-primary)] uppercase opacity-70">
                {subtitle || 'Identity'}
              </h4>
              <div className="text-2xl leading-none font-black tracking-tighter text-[var(--color-text-base)] uppercase">
                {title}
              </div>
            </div>
            <div
              className={`rounded-md border px-2 py-1 text-[10px] font-black uppercase ${statusColor.replace('bg-', 'border-')}/20 ${statusColor.replace('bg-', 'text-')} bg-current/5`}
            >
              {status}
            </div>
          </div>

          {/* Details Grid */}
          <div className="mb-5 grid grid-cols-2 gap-4 border-y border-[var(--color-border)]/10 py-4">
            {details.map((d, i) => (
              <div key={i} className={`space-y-1 ${i % 2 !== 0 ? 'text-right' : ''}`}>
                <span className="block text-[10px] font-bold tracking-wider text-gray-500 uppercase opacity-60">
                  {d.label}
                </span>
                <span
                  className={`block truncate text-[13px] font-bold text-[var(--color-text-base)] ${d.italic ? 'font-mono italic' : ''}`}
                >
                  {d.value}
                </span>
              </div>
            ))}
          </div>

          {/* Metrics */}
          {(metrics?.temp !== undefined || metrics?.power !== undefined) && (
            <div className="flex gap-4">
              <div className="flex flex-1 items-center gap-3 rounded-xl border border-[var(--color-accent-primary)]/5 bg-[var(--color-accent-primary)]/5 p-2.5 shadow-inner">
                <div className="bg-status-warn/10 text-status-warn rounded-lg p-1.5">
                  <Thermometer className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black tracking-tighter text-gray-500 uppercase">
                    Thermal
                  </span>
                  <span className="mt-0.5 font-mono text-base leading-none font-black text-[var(--color-text-base)]">
                    {metrics.temp ? `${metrics.temp.toFixed(1)}°` : '--'}
                  </span>
                </div>
              </div>
              <div className="flex flex-1 items-center gap-3 rounded-xl border border-[var(--color-accent-primary)]/5 bg-[var(--color-accent-primary)]/5 p-2.5 shadow-inner">
                <div className="bg-status-ok/10 text-status-ok rounded-lg p-1.5">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black tracking-tighter text-gray-500 uppercase">
                    Power
                  </span>
                  <span className="mt-0.5 font-mono text-base leading-none font-black text-[var(--color-text-base)]">
                    {metrics.power ? `${(metrics.power / 1000).toFixed(1)}k` : '--'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Reasons */}
          {reasons && reasons.length > 0 && (
            <div className="mt-4 border-t border-[var(--color-border)]/10 pt-4">
              <div className="mb-2 text-[10px] font-bold tracking-wider text-gray-500 uppercase">
                Reasons
              </div>
              <div className="space-y-1">
                {reasons.map((r, i) => (
                  <div
                    key={i}
                    className="truncate font-mono text-[11px] text-[var(--color-text-base)] opacity-80"
                  >
                    {r}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {!showBelow && (
        <div className="mx-auto h-0 w-0 border-t-[8px] border-r-[8px] border-l-[8px] border-t-[var(--color-bg-panel)]/95 border-r-transparent border-l-transparent drop-shadow-lg"></div>
      )}
    </div>,
    document.getElementById('tooltip-root')!
  );
};

// --- Core Visualizers ---

export const RackElevation = ({
  rack,
  catalog,
  health,
  nodesData,
  isRearView = false,
  infraComponents = [],
  allowInfraOverlap = false,
  flipView,
  rearInfraComponents = [],
  overlay,
}: {
  rack: Rack;
  catalog: Record<string, DeviceTemplate>;
  health?: string;
  nodesData?: Record<string, RackNodeState>;
  isRearView?: boolean;
  infraComponents?: (InfrastructureComponent & { slot?: number; span?: number })[];
  allowInfraOverlap?: boolean;
  flipView?: 'front' | 'rear';
  rearInfraComponents?: (InfrastructureComponent & { slot?: number; span?: number })[];
  overlay?: ReactNode;
}) => {
  const uMap = new Map<number, Device>();
  rack.devices.forEach((d) => {
    const template = catalog[d.template_id];
    const height = template?.u_height || 1;
    for (let i = 0; i < height; i++) {
      uMap.set(d.u_position + i, d);
    }
  });

  const renderRackFace = (
    faceRearView: boolean,
    faceInfra: typeof infraComponents,
    faceAllowOverlap: boolean
  ) => {
    const infraMap = new Map<
      number,
      { component: InfrastructureComponent; height: number; hasCollision: boolean }
    >();
    faceInfra
      .filter((c) => c.location === 'u-mount' && c.u_position)
      .forEach((c) => {
        const height = c.u_height || 1;
        let hasCollision = false;
        if (!faceAllowOverlap) {
          for (let i = 0; i < height; i++) {
            if (uMap.has(c.u_position + i)) {
              hasCollision = true;
              break;
            }
          }
        }
        infraMap.set(c.u_position, { component: c, height, hasCollision });
      });

    const topSlots = Math.max(6, rack.u_height);
    const topSide = buildSideLayout(
      faceInfra.filter((c) => c.location === 'top'),
      topSlots
    );
    const bottomSide = buildSideLayout(
      faceInfra.filter((c) => c.location === 'bottom'),
      topSlots
    );

    return (
      <div className="relative flex h-full w-full items-stretch">
        {faceRearView && topSide.length > 0 && (
          <div
            className="absolute -top-10 right-4 left-4 grid h-8 gap-1"
            style={{ gridTemplateColumns: `repeat(${topSlots}, minmax(0, 1fr))` }}
          >
            {topSide.map(({ component, slot, span }) => (
              <SideAttachment
                key={component.id}
                component={component}
                horizontal
                style={{ gridColumn: `${slot} / span ${span}` }}
              />
            ))}
          </div>
        )}
        {faceRearView && bottomSide.length > 0 && (
          <div
            className="absolute right-4 -bottom-10 left-4 grid h-8 gap-1"
            style={{ gridTemplateColumns: `repeat(${topSlots}, minmax(0, 1fr))` }}
          >
            {bottomSide.map(({ component, slot, span }) => (
              <SideAttachment
                key={component.id}
                component={component}
                horizontal
                style={{ gridColumn: `${slot} / span ${span}` }}
              />
            ))}
          </div>
        )}
        <div className="relative flex h-full w-full flex-col-reverse rounded-sm border-x-[24px] border-[var(--color-rack-frame)] bg-[var(--color-rack-frame)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-colors duration-500">
          {Array.from({ length: rack.u_height }).map((_, idx) => {
            const u = idx + 1;
            const device = uMap.get(u);
            const template = device ? catalog[device.template_id] : null;
            const isDeviceStart = device && device.u_position === u;
            const infraStart = infraMap.get(u);

            return (
              <div
                key={u}
                className="relative flex min-h-0 w-full flex-1 items-center border-b border-[var(--color-border)]/10 transition-colors duration-300"
              >
                <div className="absolute -left-[20px] z-10 flex h-full w-4 items-center justify-center text-center font-mono text-[10px] font-black text-[var(--color-text-base)] opacity-40 select-none">
                  {u}
                </div>
                <div className="absolute -right-[20px] z-10 flex h-full w-4 items-center justify-center text-center font-mono text-[10px] font-black text-[var(--color-text-base)] opacity-40 select-none">
                  {u}
                </div>

                <div className="relative h-full w-full px-0.5 py-[1px]">
                  {isDeviceStart && template && (
                    <div
                      className="absolute right-0.5 bottom-0 left-0.5 z-20"
                      style={{ height: `calc(${template.u_height} * 100%)` }}
                    >
                      <DeviceChassis
                        device={device}
                        template={template}
                        rackHealth={health || 'UNKNOWN'}
                        nodesData={nodesData}
                        isRearView={faceRearView}
                        uPosition={u}
                      />
                    </div>
                  )}

                  {infraStart && (
                    <div
                      className={`absolute right-0.5 bottom-0 left-0.5 z-30 ${
                        infraStart.hasCollision ? 'ring-2 ring-[var(--color-status-crit)]/70' : ''
                      }`}
                      style={{ height: `calc(${infraStart.height} * 100%)` }}
                    >
                      <InfraOverlay
                        component={infraStart.component}
                        hasCollision={infraStart.hasCollision}
                      />
                    </div>
                  )}

                  {!device && (
                    <div className="h-full w-full bg-[var(--color-empty-slot)] opacity-40"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex h-full flex-1 items-center justify-center rounded-lg bg-[var(--color-rack-interior)] p-4 transition-colors duration-500">
      {overlay && <div className="absolute top-2 left-2 z-30">{overlay}</div>}
      <div className="relative flex h-full w-full max-w-[380px] items-stretch">
        {flipView
          ? renderRackFace(
              flipView === 'rear',
              flipView === 'rear' ? rearInfraComponents : infraComponents,
              flipView === 'rear'
            )
          : renderRackFace(isRearView, infraComponents, allowInfraOverlap)}
      </div>
    </div>
  );
};

const buildSideLayout = (
  components: Array<InfrastructureComponent & { slot?: number; span?: number }>,
  slots: number
) => {
  const used = new Array(slots + 1).fill(false);
  const withOrder = [...components].sort((a, b) => {
    const aSlot = a.slot ?? Number.MAX_SAFE_INTEGER;
    const bSlot = b.slot ?? Number.MAX_SAFE_INTEGER;
    if (aSlot !== bSlot) return aSlot - bSlot;
    return String(a.id).localeCompare(String(b.id));
  });

  return withOrder.map((component) => {
    const span = Math.max(1, Math.min(slots, component.span ?? 1));
    let slot = Math.max(1, Math.min(slots, component.slot ?? 1));
    while (slot <= slots && used[slot]) slot += 1;
    if (slot > slots) slot = slots;
    for (let i = 0; i < span; i += 1) {
      const s = slot + i;
      if (s <= slots) used[s] = true;
    }
    return { component, slot, span };
  });
};

const SideAttachment = ({
  component,
  horizontal = false,
  style,
}: {
  component: InfrastructureComponent & { slot?: number; span?: number };
  horizontal?: boolean;
  style?: React.CSSProperties;
}) => {
  const accent =
    component.type === 'power'
      ? 'text-status-warn border-status-warn/40'
      : component.type === 'cooling'
        ? 'text-blue-400 border-blue-500/40'
        : component.type === 'management'
          ? 'text-cyan-400 border-cyan-500/40'
          : component.type === 'network'
            ? 'text-indigo-400 border-indigo-500/40'
            : 'text-gray-400 border-[var(--color-border)]/40';
  const layout = horizontal ? 'h-full w-full' : 'h-full w-full';
  const Icon =
    component.type === 'power'
      ? Power
      : component.type === 'cooling'
        ? Thermometer
        : component.type === 'management'
          ? Activity
          : component.type === 'network'
            ? RouterIcon
            : Box;
  return (
    <div
      className={`border bg-[var(--color-node-surface)]/70 ${accent} rounded-[2px] ${layout} flex items-center justify-center px-1 font-mono text-[8px] tracking-widest uppercase shadow-[inset_0_0_12px_rgba(0,0,0,0.25)]`}
      style={style}
    >
      <div className={`flex items-center gap-1 ${horizontal ? '' : 'flex-col'} truncate`}>
        <Icon className="h-3 w-3 opacity-70" />
        <span className="truncate">{component.name}</span>
      </div>
    </div>
  );
};

const InfraOverlay = ({
  component,
  hasCollision,
}: {
  component: InfrastructureComponent;
  hasCollision: boolean;
}) => {
  const base = 'bg-[var(--color-node-surface)]/70 border border-[var(--color-border)]/30';
  const accent =
    component.type === 'power'
      ? 'text-status-warn border-status-warn/40'
      : component.type === 'cooling'
        ? 'text-blue-400 border-blue-500/40'
        : component.type === 'management'
          ? 'text-cyan-400 border-cyan-500/40'
          : 'text-gray-400 border-[var(--color-border)]/40';
  return (
    <div
      className={`h-full w-full ${base} ${accent} pointer-events-none flex items-center justify-between rounded-[2px] px-2 font-mono text-[9px] tracking-widest uppercase`}
    >
      <span className="truncate">{component.name}</span>
      {hasCollision && <span className="text-status-crit font-black">INVALID</span>}
    </div>
  );
};

export const DeviceChassis = ({
  device,
  template,
  rackHealth,
  nodesData,
  isRearView,
  uPosition,
}: {
  device: Device;
  template: DeviceTemplate;
  rackHealth: string;
  nodesData?: Record<string, RackNodeState>;
  isRearView?: boolean;
  uPosition: number;
}) => {
  const nodeMap = useMemo(
    () => parseNodeset(device.instance || device.nodes),
    [device.instance, device.nodes]
  );
  const chassisHealth = useMemo(() => {
    if (!nodesData) return rackHealth;
    const nodeIds = Object.values(nodeMap);
    const states = nodeIds.map((id) => nodesData[id]?.state).filter(Boolean);
    if (states.length === 0) return rackHealth;
    const critCount = states.filter((s) => s === 'CRIT').length;
    const warnCount = states.filter((s) => s === 'WARN').length;
    if (critCount === states.length && states.length > 0) return 'CRIT';
    if (critCount > 0 || warnCount > 0) return 'WARN';
    return 'OK';
  }, [nodesData, nodeMap, rackHealth]);

  const hasRearLayout = Boolean(template.rear_layout);
  if (isRearView && !hasRearLayout) {
    return null;
  }
  const layout = isRearView && hasRearLayout ? template.rear_layout : template.layout;
  const isHighDensity = layout.cols > 8 && template.type !== 'network';

  let borderColor = 'border-[var(--color-border)]/30';
  let bgColor = 'bg-[var(--color-device-surface)]';
  if (template.type === 'network') {
    borderColor = 'border-blue-500/40';
    bgColor = 'bg-blue-500/5';
  }
  const statusColor =
    chassisHealth === 'OK'
      ? 'bg-status-ok'
      : chassisHealth === 'CRIT'
        ? 'bg-status-crit'
        : chassisHealth === 'WARN'
          ? 'bg-status-warn'
          : 'bg-gray-600';

  return (
    <div
      className={`h-full w-full border ${borderColor} ${bgColor} group relative flex rounded-[2px] transition-all duration-200 hover:z-[100] hover:scale-[1.03] hover:shadow-2xl`}
    >
      <div className={`h-full w-1.5 ${statusColor} relative shrink-0 opacity-90`}>
        <div className={`absolute inset-0 blur-[4px] ${statusColor} opacity-40`}></div>
      </div>
      <div
        className="grid flex-1 gap-[1px] bg-[var(--color-border)]/5 p-[1px]"
        style={{
          gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
          gridTemplateColumns: isHighDensity ? '1fr' : `repeat(${layout.cols}, 1fr)`,
        }}
      >
        {layout.matrix.map((row, rIdx) =>
          isHighDensity ? (
            <RowSummaryUnit
              key={rIdx}
              rowNodes={row.map((slot) => nodeMap[slot])}
              nodesData={nodesData || {}}
              label={
                template.type === 'storage'
                  ? template.layout.rows > 1
                    ? `DRAWER ${rIdx + 1}`
                    : 'STORAGE ARRAY'
                  : template.name
              }
            />
          ) : (
            row.map((slotNum, cIdx) => {
              if (isRearView && slotNum > 900)
                return (
                  <RearModuleUnit
                    key={`${rIdx}-${cIdx}`}
                    type={slotNum % 2 === 0 ? 'psu' : 'fan'}
                  />
                );
              const nodeId = nodeMap[slotNum];
              const nodeHealth =
                nodeId && nodesData && nodesData[nodeId] ? nodesData[nodeId].state : 'UNKNOWN';
              const nodeMetrics =
                nodeId && nodesData && nodesData[nodeId] ? nodesData[nodeId] : undefined;
              return (
                <NodeUnit
                  key={`${rIdx}-${cIdx}`}
                  nodeName={nodeId}
                  slotNum={slotNum}
                  nodeHealth={nodeHealth}
                  nodeMetrics={nodeMetrics}
                  type={template.type}
                  uHeight={template.u_height}
                  uPosition={uPosition}
                  chassisName={template.name}
                />
              );
            })
          )
        )}
      </div>
    </div>
  );
};

const RearModuleUnit = ({ type }: { type: 'psu' | 'fan' }) => {
  return (
    <div className="group relative flex h-full items-center justify-center border border-[var(--color-border)]/20 bg-[var(--color-node-surface)] transition-colors hover:bg-white/10">
      {type === 'fan' ? (
        <Fan className="h-5 w-5 animate-[spin_2s_linear_infinite] text-gray-600" />
      ) : (
        <div className="flex flex-col items-center gap-1">
          <Power className="h-4 w-4 text-gray-400" />
          <div className="bg-status-ok h-2 w-2 rounded-full shadow-[0_0_5px_var(--color-status-ok)]"></div>
        </div>
      )}
    </div>
  );
};

const RowSummaryUnit = ({
  rowNodes,
  nodesData,
  label,
}: {
  rowNodes: (string | undefined)[];
  nodesData: Record<string, RackNodeState>;
  label: string;
}) => {
  let worstState = 'OK';
  rowNodes.forEach((nodeId) => {
    if (!nodeId || !nodesData[nodeId]) return;
    const state = nodesData[nodeId].state;
    if (state === 'CRIT') worstState = 'CRIT';
    else if (state === 'WARN' && worstState !== 'CRIT') worstState = 'WARN';
  });
  const statusColor =
    worstState === 'CRIT'
      ? 'bg-status-crit'
      : worstState === 'WARN'
        ? 'bg-status-warn'
        : 'bg-status-ok';
  return (
    <div
      className={`group relative flex h-full cursor-help items-center justify-between border-b border-[var(--color-border)]/10 bg-[var(--color-node-surface)] px-4 transition-colors last:border-0 hover:bg-[var(--color-accent-primary)]/10`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`h-2.5 w-2.5 rounded-full ${statusColor} ${worstState === 'CRIT' ? 'animate-pulse shadow-[0_0_10px_var(--color-status-crit)]' : ''}`}
        ></div>
        <span className="font-mono text-[11px] font-black tracking-widest text-[var(--color-text-base)] uppercase opacity-50 group-hover:opacity-100">
          {label}
        </span>
      </div>
      <div className="flex gap-3 opacity-30 group-hover:opacity-100">
        <span className="font-mono text-[9px] font-bold text-gray-500 uppercase">
          {rowNodes.length} UNITS
        </span>
      </div>
    </div>
  );
};

export const NodeUnit = ({
  nodeName,
  slotNum,
  nodeHealth,
  type,
  uHeight,
  uPosition,
  chassisName,
  nodeMetrics,
}: {
  nodeName?: string;
  slotNum: number;
  nodeHealth: string;
  type?: string;
  uHeight: number;
  uPosition: number;
  chassisName: string;
  nodeMetrics?: RackNodeState;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const Icon = type === 'network' ? RouterIcon : Server;
  const hideText = uHeight === 1;
  const reasons = Array.isArray(nodeMetrics?.alerts)
    ? (nodeMetrics.alerts as AlertCheck[]).map((alert) => alert?.id).filter(Boolean)
    : [];

  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        onMouseLeave={() => setIsHovered(false)}
        className={`group relative flex h-full cursor-help items-center justify-center border border-[var(--color-border)]/20 bg-[var(--color-node-surface)] transition-all hover:bg-[var(--color-accent-primary)]/20`}
      >
        {nodeName ? (
          <div className="flex h-full w-full flex-col items-center justify-center px-1">
            <div
              className={`mb-1 h-1.5 w-1.5 shrink-0 rounded-full ${nodeHealth === 'OK' ? 'bg-status-ok' : nodeHealth === 'CRIT' ? 'bg-status-crit animate-pulse shadow-[0_0_8px_var(--color-status-crit)]' : 'bg-status-warn'} `}
            ></div>
            {!hideText && (
              <div className="flex w-full items-center justify-center gap-1.5 overflow-hidden">
                <Icon className="h-3 w-3 shrink-0 text-gray-400 opacity-50" />
                <span className="truncate font-mono text-[10px] font-black tracking-tight text-[var(--color-text-base)] uppercase opacity-50 group-hover:opacity-100">
                  {nodeName}
                </span>
              </div>
            )}
            {hideText && (
              <span className="absolute inset-0 z-10 flex items-center justify-center truncate bg-[var(--color-node-surface)] px-1 text-[11px] font-black text-[var(--color-accent-primary)] uppercase opacity-0 transition-opacity group-hover:opacity-100">
                {nodeName}
              </span>
            )}
          </div>
        ) : (
          <div className="font-mono text-[8px] text-gray-400 uppercase italic opacity-20">
            U{slotNum}
          </div>
        )}
      </div>

      {isHovered && (
        <HUDTooltip
          title={nodeName || 'UNASSIGNED'}
          subtitle="Node Identity"
          status={nodeHealth}
          details={[
            { label: 'Enclosure', value: chassisName },
            { label: 'Active checks', value: String(reasons.length) },
            { label: 'Physical Location', value: `RACK U${uPosition} S${slotNum}`, italic: true },
          ]}
          reasons={reasons}
          metrics={
            nodeMetrics ? { temp: nodeMetrics.temperature, power: nodeMetrics.power } : undefined
          }
          mousePos={mousePos}
        />
      )}
    </>
  );
};
