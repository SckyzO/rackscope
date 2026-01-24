import { useState, useMemo, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Server, Box, Zap, Thermometer, Router as RouterIcon, HardDrive, Fan, Power, Cpu, Activity } from 'lucide-react';
import type { Device, DeviceTemplate, Rack } from '../types';

// --- Helpers ---
export const parseNodeset = (pattern: string | Record<number, string>): Record<number, string> => {
  if (typeof pattern !== 'string') return pattern;
  const match = pattern.match(/(.+)\[(\d+)-(\d+)\]/);
  if (!match) return { 1: pattern };
  const [_, prefix, startStr, end] = match;
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

export const HUDTooltip = ({ title, subtitle, status, details, reasons, metrics, mousePos }: HUDTooltipProps) => {
    const statusColor = status === 'OK' ? 'bg-status-ok' 
                      : status === 'CRIT' ? 'bg-status-crit' 
                      : status === 'WARN' ? 'bg-status-warn' 
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
                pointerEvents: 'none'
            }}
            className="w-80 animate-in fade-in zoom-in-95 duration-200"
        >
            <div className="relative bg-[var(--color-bg-panel)]/95 backdrop-blur-2xl border border-[var(--color-border)] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
                {showBelow && <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-1 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-[var(--color-accent-primary)]"></div>}

                <div className={`absolute top-0 left-0 bottom-0 w-1 ${statusColor} ${status === 'CRIT' ? 'animate-pulse' : ''}`}></div>
                
                <div className="p-5 pl-7 text-left">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-5">
                        <div className="space-y-0.5">
                            <h4 className="text-[11px] font-black text-[var(--color-accent-primary)] uppercase tracking-widest opacity-70">{subtitle || 'Identity'}</h4>
                            <div className="text-2xl font-black text-[var(--color-text-base)] tracking-tighter uppercase leading-none">
                                {title}
                            </div>
                        </div>
                        <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase border ${statusColor.replace('bg-', 'border-')}/20 ${statusColor.replace('bg-', 'text-')} bg-current/5`}>
                            {status}
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-5 border-y border-[var(--color-border)]/10 py-4">
                        {details.map((d, i) => (
                            <div key={i} className={`space-y-1 ${i % 2 !== 0 ? 'text-right' : ''}`}>
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block opacity-60">{d.label}</span>
                                <span className={`text-[13px] text-[var(--color-text-base)] font-bold truncate block ${d.italic ? 'font-mono italic' : ''}`}>{d.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Metrics */}
                    {(metrics?.temp !== undefined || metrics?.power !== undefined) && (
                        <div className="flex gap-4">
                            <div className="flex-1 flex items-center gap-3 p-2.5 rounded-xl bg-[var(--color-accent-primary)]/5 border border-[var(--color-accent-primary)]/5 shadow-inner">
                                <div className="p-1.5 rounded-lg bg-status-warn/10 text-status-warn">
                                    <Thermometer className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Thermal</span>
                                    <span className="text-base font-mono font-black text-[var(--color-text-base)] leading-none mt-0.5">
                                        {metrics.temp ? `${metrics.temp.toFixed(1)}°` : '--'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1 flex items-center gap-3 p-2.5 rounded-xl bg-[var(--color-accent-primary)]/5 border border-[var(--color-accent-primary)]/5 shadow-inner">
                                <div className="p-1.5 rounded-lg bg-status-ok/10 text-status-ok">
                                    <Zap className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">Power</span>
                                    <span className="text-base font-mono font-black text-[var(--color-text-base)] leading-none mt-0.5">
                                        {metrics.power ? `${(metrics.power / 1000).toFixed(1)}k` : '--'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reasons */}
                    {reasons && reasons.length > 0 && (
                        <div className="mt-4 border-t border-[var(--color-border)]/10 pt-4">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Reasons</div>
                            <div className="space-y-1">
                                {reasons.map((r, i) => (
                                    <div key={i} className="text-[11px] font-mono text-[var(--color-text-base)] opacity-80 truncate">
                                        {r}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {!showBelow && (
                <div className="mx-auto w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[var(--color-bg-panel)]/95 drop-shadow-lg"></div>
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
  rack: Rack,
  catalog: Record<string, DeviceTemplate>,
  health?: string,
  nodesData?: Record<string, any>,
  isRearView?: boolean,
  infraComponents?: {
    id: string;
    name: string;
    type: 'power' | 'cooling' | 'management' | 'network' | 'other';
    model?: string;
    role?: string;
    location: 'u-mount' | 'side-left' | 'side-right' | 'top' | 'bottom';
    u_position?: number;
    u_height?: number;
  }[],
  allowInfraOverlap?: boolean,
  flipView?: 'front' | 'rear',
  rearInfraComponents?: {
    id: string;
    name: string;
    type: 'power' | 'cooling' | 'management' | 'network' | 'other';
    model?: string;
    role?: string;
    location: 'u-mount' | 'side-left' | 'side-right' | 'top' | 'bottom';
    u_position?: number;
    u_height?: number;
  }[],
  overlay?: ReactNode,
}) => {
  const uMap = new Map<number, Device>();
  rack.devices.forEach(d => {
      const template = catalog[d.template_id];
      const height = template?.u_height || 1;
      for(let i=0; i < height; i++) {
          uMap.set(d.u_position + i, d);
      }
  });

  const renderRackFace = (
    faceRearView: boolean,
    faceInfra: typeof infraComponents,
    faceAllowOverlap: boolean
  ) => {
    const infraMap = new Map<number, { component: any; height: number; hasCollision: boolean }>();
    faceInfra
      .filter(c => c.location === 'u-mount' && c.u_position)
      .forEach(c => {
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
    const topSide = buildSideLayout(faceInfra.filter(c => c.location === 'top'), topSlots);
    const bottomSide = buildSideLayout(faceInfra.filter(c => c.location === 'bottom'), topSlots);

    return (
      <div className="relative w-full h-full flex items-stretch">
        {faceRearView && topSide.length > 0 && (
          <div
            className="absolute left-4 right-4 -top-10 h-8 grid gap-1"
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
            className="absolute left-4 right-4 -bottom-10 h-8 grid gap-1"
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
        <div className="flex flex-col-reverse w-full h-full border-x-[24px] border-[var(--color-rack-frame)] bg-[var(--color-rack-frame)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative transition-colors duration-500 rounded-sm">
          {Array.from({ length: rack.u_height }).map((_, idx) => {
            const u = idx + 1;
            const device = uMap.get(u);
            const template = device ? catalog[device.template_id] : null;
            const isDeviceStart = device && device.u_position === u;
            const infraStart = infraMap.get(u);

            return (
              <div key={u} className="relative flex items-center border-b border-[var(--color-border)]/10 min-h-0 w-full flex-1 transition-colors duration-300">
                <div className="absolute -left-[20px] w-4 text-center text-[10px] font-mono text-[var(--color-text-base)] font-black opacity-40 select-none flex items-center justify-center h-full z-10">{u}</div>
                <div className="absolute -right-[20px] w-4 text-center text-[10px] font-mono text-[var(--color-text-base)] font-black opacity-40 select-none flex items-center justify-center h-full z-10">{u}</div>
                
                <div className="w-full px-0.5 py-[1px] h-full relative">
                    {isDeviceStart && template && (
                        <div 
                          className="absolute bottom-0 left-0.5 right-0.5 z-20" 
                          style={{ height: `calc(${template.u_height} * 100%)` }}
                        >
                            <DeviceChassis device={device} template={template} rackHealth={health || 'UNKNOWN'} nodesData={nodesData} isRearView={faceRearView} uPosition={u} />
                        </div>
                    )}

                    {infraStart && (
                        <div
                          className={`absolute bottom-0 left-0.5 right-0.5 z-30 ${
                            infraStart.hasCollision ? 'ring-2 ring-[var(--color-status-crit)]/70' : ''
                          }`}
                          style={{ height: `calc(${infraStart.height} * 100%)` }}
                        >
                          <InfraOverlay component={infraStart.component} hasCollision={infraStart.hasCollision} />
                        </div>
                    )}
                    
                    {!device && (
                        <div className="w-full h-full bg-[var(--color-empty-slot)] opacity-40"></div>
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
    <div className="flex-1 bg-[var(--color-rack-interior)] p-4 flex items-center justify-center h-full transition-colors duration-500 rounded-lg relative">
      {overlay && (
        <div className="absolute top-2 left-2 z-30">
          {overlay}
        </div>
      )}
      <div className="relative w-full max-w-[380px] h-full flex items-stretch">
        {flipView
          ? renderRackFace(flipView === 'rear', flipView === 'rear' ? rearInfraComponents : infraComponents, flipView === 'rear')
          : renderRackFace(isRearView, infraComponents, allowInfraOverlap)}
      </div>
    </div>
  );
};

const buildSideLayout = (components: any[], slots: number) => {
  const used = new Array(slots + 1).fill(false);
  const withOrder = [...components].sort((a, b) => {
    const aSlot = a.slot ?? Number.MAX_SAFE_INTEGER;
    const bSlot = b.slot ?? Number.MAX_SAFE_INTEGER;
    if (aSlot !== bSlot) return aSlot - bSlot;
    return String(a.id).localeCompare(String(b.id));
  });

  return withOrder.map((component) => {
    let span = Math.max(1, Math.min(slots, component.span ?? 1));
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
  component: any;
  horizontal?: boolean;
  style?: React.CSSProperties;
}) => {
  const accent = component.type === 'power' ? 'text-status-warn border-status-warn/40'
               : component.type === 'cooling' ? 'text-blue-400 border-blue-500/40'
               : component.type === 'management' ? 'text-cyan-400 border-cyan-500/40'
               : component.type === 'network' ? 'text-indigo-400 border-indigo-500/40'
               : 'text-gray-400 border-[var(--color-border)]/40';
  const layout = horizontal ? 'h-full w-full' : 'h-full w-full';
  const Icon = component.type === 'power' ? Power
             : component.type === 'cooling' ? Thermometer
             : component.type === 'management' ? Activity
             : component.type === 'network' ? RouterIcon
             : Box;
  return (
    <div
      className={`bg-[var(--color-node-surface)]/70 border ${accent} rounded-[2px] ${layout} flex items-center justify-center text-[8px] font-mono uppercase tracking-widest px-1 shadow-[inset_0_0_12px_rgba(0,0,0,0.25)]`}
      style={style}
    >
      <div className={`flex items-center gap-1 ${horizontal ? '' : 'flex-col'} truncate`}>
        <Icon className="w-3 h-3 opacity-70" />
        <span className="truncate">{component.name}</span>
      </div>
    </div>
  );
};

const InfraOverlay = ({ component, hasCollision }: { component: any; hasCollision: boolean }) => {
  const base = 'bg-[var(--color-node-surface)]/70 border border-[var(--color-border)]/30';
  const accent = component.type === 'power' ? 'text-status-warn border-status-warn/40'
               : component.type === 'cooling' ? 'text-blue-400 border-blue-500/40'
               : component.type === 'management' ? 'text-cyan-400 border-cyan-500/40'
               : 'text-gray-400 border-[var(--color-border)]/40';
  return (
    <div className={`w-full h-full ${base} ${accent} rounded-[2px] flex items-center justify-between px-2 text-[9px] font-mono uppercase tracking-widest pointer-events-none`}>
      <span className="truncate">{component.name}</span>
      {hasCollision && <span className="text-status-crit font-black">INVALID</span>}
    </div>
  );
};

export const DeviceChassis = ({ device, template, rackHealth, nodesData, isRearView, uPosition }: { device: Device, template: DeviceTemplate, rackHealth: string, nodesData?: Record<string, any>, isRearView?: boolean, uPosition: number }) => {
    const nodeMap = useMemo(() => parseNodeset(device.nodes), [device.nodes]);
    const chassisHealth = useMemo(() => {
        if (!nodesData) return rackHealth;
        const nodeIds = Object.values(nodeMap);
        const states = nodeIds.map(id => nodesData[id]?.state).filter(Boolean);
        if (states.length === 0) return rackHealth;
        const critCount = states.filter(s => s === 'CRIT').length;
        const warnCount = states.filter(s => s === 'WARN').length;
        if (critCount === states.length && states.length > 0) return 'CRIT';
        if (critCount > 0 || warnCount > 0) return 'WARN';
        return 'OK';
    }, [nodesData, nodeMap, rackHealth]);
    
    const hasRearLayout = Boolean(template.rear_layout);
    if (isRearView && !hasRearLayout) {
        return null;
    }
    const layout = (isRearView && hasRearLayout) ? template.rear_layout : template.layout;
    const isHighDensity = layout.cols > 8 && template.type !== 'network';

    let borderColor = 'border-[var(--color-border)]/30';
    let bgColor = 'bg-[var(--color-device-surface)]';
    if (template.type === 'network') {
        borderColor = 'border-blue-500/40';
        bgColor = 'bg-blue-500/5';
    }
    const statusColor = chassisHealth === 'OK' ? 'bg-status-ok' : chassisHealth === 'CRIT' ? 'bg-status-crit' : chassisHealth === 'WARN' ? 'bg-status-warn' : 'bg-gray-600';

    return (
        <div className={`w-full h-full border ${borderColor} ${bgColor} rounded-[2px] flex relative group transition-all duration-200 hover:scale-[1.03] hover:z-[100] hover:shadow-2xl`}>
            <div className={`w-1.5 h-full ${statusColor} shrink-0 opacity-90 relative`}>
                <div className={`absolute inset-0 blur-[4px] ${statusColor} opacity-40`}></div>
            </div>
            <div className="flex-1 grid gap-[1px] p-[1px] bg-[var(--color-border)]/5" style={{ gridTemplateRows: `repeat(${layout.rows}, 1fr)`, gridTemplateColumns: isHighDensity ? '1fr' : `repeat(${layout.cols}, 1fr)` }}>
                {layout.matrix.map((row, rIdx) => (
                    isHighDensity ? (
                        <RowSummaryUnit key={rIdx} rowNodes={row.map(slot => nodeMap[slot])} nodesData={nodesData || {}} label={template.type === 'storage' ? (template.layout.rows > 1 ? `DRAWER ${rIdx + 1}` : 'STORAGE ARRAY') : template.name} />
                    ) : (
                        row.map((slotNum, cIdx) => {
                            if (isRearView && slotNum > 900) return <RearModuleUnit key={`${rIdx}-${cIdx}`} type={slotNum % 2 === 0 ? 'psu' : 'fan'} />;
                            const nodeId = nodeMap[slotNum];
                            const nodeHealth = nodeId && nodesData && nodesData[nodeId] ? nodesData[nodeId].state : 'UNKNOWN';
                            const nodeMetrics = nodeId && nodesData && nodesData[nodeId] ? nodesData[nodeId] : null;
                            return <NodeUnit key={`${rIdx}-${cIdx}`} nodeName={nodeId} slotNum={slotNum} nodeHealth={nodeHealth} nodeMetrics={nodeMetrics} type={template.type} uHeight={template.u_height} uPosition={uPosition} chassisName={template.name} />;
                        })
                    )
                ))}
            </div>
        </div>
    );
};

const RearModuleUnit = ({ type }: { type: 'psu' | 'fan' }) => {
    return (
        <div className="relative flex items-center justify-center bg-[var(--color-node-surface)] border border-[var(--color-border)]/20 group hover:bg-white/10 transition-colors h-full">
            {type === 'fan' ? <Fan className="w-5 h-5 text-gray-600 animate-[spin_2s_linear_infinite]" /> : <div className="flex flex-col items-center gap-1"><Power className="w-4 h-4 text-gray-400" /><div className="w-2 h-2 rounded-full bg-status-ok shadow-[0_0_5px_var(--color-status-ok)]"></div></div>}
        </div>
    );
};

const RowSummaryUnit = ({ rowNodes, nodesData, label }: { rowNodes: (string|undefined)[], nodesData: Record<string, any>, label: string }) => {
    let worstState = 'OK';
    rowNodes.forEach(nodeId => {
        if (!nodeId || !nodesData[nodeId]) return;
        const state = nodesData[nodeId].state;
        if (state === 'CRIT') worstState = 'CRIT';
        else if (state === 'WARN' && worstState !== 'CRIT') worstState = 'WARN';
    });
    const statusColor = worstState === 'CRIT' ? 'bg-status-crit' : worstState === 'WARN' ? 'bg-status-warn' : 'bg-status-ok';
    return (
        <div className={`relative flex items-center justify-between px-4 bg-[var(--color-node-surface)] group hover:bg-[var(--color-accent-primary)]/10 transition-colors cursor-help border-b border-[var(--color-border)]/10 last:border-0 h-full`}>
            <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${statusColor} ${worstState === 'CRIT' ? 'animate-pulse shadow-[0_0_10px_var(--color-status-crit)]' : ''}`}></div>
                <span className="text-[11px] font-black font-mono text-[var(--color-text-base)] opacity-50 group-hover:opacity-100 uppercase tracking-widest">{label}</span>
            </div>
            <div className="flex gap-3 opacity-30 group-hover:opacity-100"><span className="text-[9px] font-mono text-gray-500 uppercase font-bold">{rowNodes.length} UNITS</span></div>
        </div>
    );
};

export const NodeUnit = ({ nodeName, slotNum, nodeHealth, type, uHeight, uPosition, chassisName, nodeMetrics }: { nodeName?: string, slotNum: number, nodeHealth: string, type?: string, uHeight: number, uPosition: number, chassisName: string, nodeMetrics?: any }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const isOk = nodeHealth === 'OK';
    let Icon = type === 'network' ? RouterIcon : Server;
    const hideText = uHeight === 1;

    return (
        <>
            <div 
                onMouseEnter={() => setIsHovered(true)}
                onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setIsHovered(false)}
                className={`relative flex items-center justify-center bg-[var(--color-node-surface)] border border-[var(--color-border)]/20 group hover:bg-[var(--color-accent-primary)]/20 transition-all cursor-help h-full`}
            >
                {nodeName ? (
                    <div className="flex flex-col items-center w-full h-full justify-center px-1">
                        <div className={`w-1.5 h-1.5 rounded-full mb-1 shrink-0 ${nodeHealth === 'OK' ? 'bg-status-ok' : nodeHealth === 'CRIT' ? 'bg-status-crit animate-pulse shadow-[0_0_8px_var(--color-status-crit)]' : 'bg-status-warn'} `}></div>
                        {!hideText && (
                            <div className="flex items-center gap-1.5 w-full justify-center overflow-hidden">
                                <Icon className="w-3 h-3 text-gray-400 opacity-50 shrink-0" />
                                <span className="text-[10px] font-mono text-[var(--color-text-base)] opacity-50 group-hover:opacity-100 truncate font-black uppercase tracking-tight">{nodeName}</span>
                            </div>
                        )}
                        {hideText && <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-[var(--color-accent-primary)] opacity-0 group-hover:opacity-100 bg-[var(--color-node-surface)] transition-opacity z-10 px-1 truncate uppercase">{nodeName}</span>}
                    </div>
                ) : <div className="text-[8px] text-gray-400 font-mono italic opacity-20 uppercase">U{slotNum}</div>}
            </div>

            {isHovered && (
                <HUDTooltip 
                    title={nodeName || 'UNASSIGNED'}
                    subtitle="Node Identity"
                    status={nodeHealth}
                    details={[
                        { label: 'Enclosure', value: chassisName },
                        { label: 'Physical Location', value: `RACK U${uPosition} S${slotNum}`, italic: true }
                    ]}
                    metrics={nodeMetrics ? { temp: nodeMetrics.temperature, power: nodeMetrics.power } : undefined}
                    mousePos={mousePos}
                />
            )}
        </>
    );
};
