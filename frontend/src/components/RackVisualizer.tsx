import { useState, useMemo, useRef, useEffect } from 'react';
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

// --- Components ---

export const RackElevation = ({ rack, catalog, health, nodesData, isRearView = false }: { rack: Rack, catalog: Record<string, DeviceTemplate>, health?: string, nodesData?: Record<string, any>, isRearView?: boolean }) => {
  const uMap = new Map<number, Device>();
  rack.devices.forEach(d => {
      const template = catalog[d.template_id];
      const height = template?.u_height || 1;
      for(let i=0; i < height; i++) {
          uMap.set(d.u_position + i, d);
      }
  });

  return (
    <div className="flex-1 bg-[var(--color-rack-interior)] p-4 flex items-center justify-center h-full transition-colors duration-500 rounded-lg">
      <div className="flex flex-col-reverse w-full max-w-[380px] h-full border-x-[24px] border-[var(--color-rack-frame)] bg-[var(--color-rack-frame)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative transition-colors duration-500 rounded-sm">
        {Array.from({ length: rack.u_height }).map((_, idx) => {
          const u = idx + 1;
          const device = uMap.get(u);
          const template = device ? catalog[device.template_id] : null;
          const isDeviceStart = device && device.u_position === u;

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
                          <DeviceChassis device={device} template={template} rackHealth={health || 'UNKNOWN'} nodesData={nodesData} isRearView={isRearView} uPosition={u} />
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
    
    const layout = (isRearView && template.rear_layout) ? template.rear_layout : template.layout;
    const isHighDensity = layout.cols > 8 && template.type !== 'network';

    let borderColor = 'border-[var(--color-border)]/30';
    let bgColor = 'bg-[var(--color-device-surface)]';
    if (template.type === 'network') {
        borderColor = 'border-blue-500/40';
        bgColor = 'bg-blue-500/5';
    }
    
    const statusColor = chassisHealth === 'OK' ? 'bg-status-ok' 
                      : chassisHealth === 'CRIT' ? 'bg-status-crit' 
                      : chassisHealth === 'WARN' ? 'bg-status-warn' 
                      : 'bg-gray-600';

    return (
        <div className={`w-full h-full border ${borderColor} ${bgColor} rounded-[2px] flex relative group transition-all duration-200 hover:scale-[1.03] hover:z-[100] hover:shadow-2xl`}>
            <div className={`w-1.5 h-full ${statusColor} shrink-0 opacity-90 relative`}>
                <div className={`absolute inset-0 blur-[4px] ${statusColor} opacity-40`}></div>
            </div>
            
            <div 
                className="flex-1 grid gap-[1px] p-[1px] bg-[var(--color-border)]/5"
                style={{ 
                    gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                    gridTemplateColumns: isHighDensity ? '1fr' : `repeat(${layout.cols}, 1fr)` 
                }}
            >
                {layout.matrix.map((row, rIdx) => (
                    isHighDensity ? (
                        <RowSummaryUnit 
                            key={rIdx} 
                            rowNodes={row.map(slot => nodeMap[slot])} 
                            nodesData={nodesData || {}}
                            label={template.type === 'storage' ? (template.layout.rows > 1 ? `DRAWER ${rIdx + 1}` : 'STORAGE ARRAY') : template.name}
                        />
                    ) : (
                        row.map((slotNum, cIdx) => {
                            if (isRearView && slotNum > 900) {
                                return <RearModuleUnit key={`${rIdx}-${cIdx}`} type={slotNum % 2 === 0 ? 'psu' : 'fan'} />;
                            }
                            const nodeId = nodeMap[slotNum];
                            const nodeHealth = nodeId && nodesData && nodesData[nodeId] ? nodesData[nodeId].state : 'UNKNOWN';
                            const nodeMetrics = nodeId && nodesData && nodesData[nodeId] ? nodesData[nodeId] : null;
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
                ))}
            </div>
        </div>
    );
};

const RearModuleUnit = ({ type }: { type: 'psu' | 'fan' }) => {
    return (
        <div className="relative flex items-center justify-center bg-[var(--color-node-surface)] border border-[var(--color-border)]/20 group hover:bg-white/10 transition-colors h-full">
            {type === 'fan' ? (
                <Fan className="w-5 h-5 text-gray-600 animate-[spin_2s_linear_infinite]" />
            ) : (
                <div className="flex flex-col items-center gap-1">
                    <Power className="w-4 h-4 text-gray-400" />
                    <div className="w-2 h-2 rounded-full bg-status-ok shadow-[0_0_5px_var(--color-status-ok)]"></div>
                </div>
            )}
        </div>
    );
};

const RowSummaryUnit = ({ rowNodes, nodesData, label }: { rowNodes: (string|undefined)[], nodesData: Record<string, any>, label: string }) => {
    let worstState = 'OK';
    let critCount = 0;
    rowNodes.forEach(nodeId => {
        if (!nodeId || !nodesData[nodeId]) return;
        const state = nodesData[nodeId].state;
        if (state === 'CRIT') { worstState = 'CRIT'; critCount++; }
        else if (state === 'WARN' && worstState !== 'CRIT') { worstState = 'WARN'; }
    });
    const statusColor = worstState === 'CRIT' ? 'bg-status-crit' : worstState === 'WARN' ? 'bg-status-warn' : 'bg-status-ok';
    return (
        <div className={`relative flex items-center justify-between px-4 bg-[var(--color-node-surface)] group hover:bg-[var(--color-accent-primary)]/10 transition-colors cursor-help border-b border-[var(--color-border)]/10 last:border-0 h-full`}>
            <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${statusColor} ${worstState === 'CRIT' ? 'animate-pulse shadow-[0_0_10px_var(--color-status-crit)]' : ''}`}></div>
                <span className="text-[11px] font-black font-mono text-[var(--color-text-base)] opacity-50 group-hover:opacity-100 uppercase tracking-widest">{label}</span>
            </div>
            <div className="flex gap-3 opacity-30 group-hover:opacity-100">
                <span className="text-[9px] font-mono text-gray-500 uppercase font-bold">{rowNodes.length} UNITS</span>
            </div>
        </div>
    );
};

export const NodeUnit = ({ nodeName, slotNum, nodeHealth, type, uHeight, uPosition, chassisName, nodeMetrics }: { nodeName?: string, slotNum: number, nodeHealth: string, type?: string, uHeight: number, uPosition: number, chassisName: string, nodeMetrics?: any }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const isOk = nodeHealth === 'OK';
    let Icon = type === 'network' ? RouterIcon : Server;
    const hideText = uHeight === 1;

    const statusColor = nodeHealth === 'OK' ? 'bg-status-ok' 
                      : nodeHealth === 'CRIT' ? 'bg-status-crit' 
                      : nodeHealth === 'WARN' ? 'bg-status-warn' 
                      : 'bg-gray-600';

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    return (
        <>
            <div 
                onMouseEnter={() => setIsHovered(true)}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setIsHovered(false)}
                className={`relative flex items-center justify-center bg-[var(--color-node-surface)] border border-[var(--color-border)]/20 group hover:bg-[var(--color-accent-primary)]/20 transition-all cursor-help h-full`}
            >
                {nodeName ? (
                    <div className="flex flex-col items-center w-full h-full justify-center px-1">
                        <div className={`w-1.5 h-1.5 rounded-full mb-1 shrink-0 ${statusColor} ${nodeHealth === 'CRIT' ? 'animate-pulse shadow-[0_0_8px_var(--color-status-crit)]' : ''}`}></div>
                        {!hideText && (
                            <div className="flex items-center gap-1.5 w-full justify-center overflow-hidden">
                                <Icon className="w-3 h-3 text-gray-400 opacity-50 shrink-0" />
                                <span className="text-[10px] font-mono text-[var(--color-text-base)] opacity-50 group-hover:opacity-100 truncate font-black uppercase tracking-tight">
                                    {nodeName}
                                </span>
                            </div>
                        )}
                        {hideText && (
                            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-[var(--color-accent-primary)] opacity-0 group-hover:opacity-100 bg-[var(--color-node-surface)] transition-opacity z-10 px-1 truncate uppercase">
                                {nodeName}
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="text-[8px] text-gray-400 font-mono italic opacity-20 uppercase">U{slotNum}</div>
                )}
            </div>

            {/* PORTAL HUD TOOLTIP */}
            {isHovered && createPortal(
                <div 
                    style={{ 
                        position: 'fixed', 
                        top: `${mousePos.y - 20}px`, 
                        left: `${mousePos.x}px`,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 999999,
                        pointerEvents: 'none'
                    }}
                    className="w-80 animate-in fade-in zoom-in-95 duration-200"
                >
                    <div className="relative bg-[var(--color-bg-panel)]/95 backdrop-blur-3xl border border-[var(--color-accent-primary)]/40 rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden">
                        <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${statusColor} ${nodeHealth === 'CRIT' ? 'animate-pulse' : ''}`}></div>
                        <div className="p-6 pl-8 text-left">
                            <div className="flex justify-between items-start mb-6">
                                <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-[var(--color-accent-primary)] uppercase tracking-[0.3em] opacity-80">Node Identity</h4>
                                    <div className="text-2xl font-black text-[var(--color-text-base)] tracking-tighter uppercase leading-none">
                                        {nodeName || 'UNASSIGNED'}
                                    </div>
                                </div>
                                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${statusColor.replace('bg-', 'border-')}/30 ${statusColor.replace('bg-', 'text-')} bg-current/10`}>
                                    {nodeHealth}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-8 mb-6 border-y border-[var(--color-border)]/10 py-4">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block opacity-60">Enclosure</span>
                                    <span className="text-[12px] text-[var(--color-text-base)] font-bold truncate block text-left">{chassisName}</span>
                                </div>
                                <div className="space-y-1 text-right border-l border-[var(--color-border)]/10 pl-4">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block opacity-60">Location</span>
                                    <div className="flex items-center justify-end gap-2">
                                        <span className="text-[12px] text-[var(--color-text-base)] font-mono font-black italic">U{uPosition}</span>
                                        <div className="px-1.5 py-0.5 bg-gray-500/20 rounded text-[9px] font-black text-[var(--color-text-base)] opacity-70">S{slotNum}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-accent-primary)]/5 border border-[var(--color-accent-primary)]/10">
                                    <div className="p-2 rounded-xl bg-status-warn/10 text-status-warn">
                                        <Thermometer className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">Thermal</span>
                                        <span className="text-lg font-mono font-black text-[var(--color-text-base)] mt-1">
                                            {nodeMetrics?.temperature ? `${nodeMetrics.temperature.toFixed(1)}°C` : '--'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-accent-primary)]/5 border border-[var(--color-accent-primary)]/10">
                                    <div className="p-2 rounded-xl bg-status-ok/10 text-status-ok">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">Power</span>
                                        <span className="text-lg font-mono font-black text-[var(--color-text-base)] mt-1">
                                            {nodeMetrics?.power ? `${(nodeMetrics.power).toFixed(0)}W` : '--'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 p-3 opacity-[0.03] pointer-events-none">
                            <Activity className="w-20 h-20 rotate-12 text-[var(--color-accent-primary)]" />
                        </div>
                    </div>
                    <div className="mx-auto w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-[var(--color-bg-panel)]/95 drop-shadow-2xl"></div>
                </div>,
                document.getElementById('tooltip-root')!
            )}
        </>
    );
};
