import { useMemo } from 'react';
import { Server, Box, Zap, Thermometer, Router as RouterIcon, HardDrive, Fan, Power, Cpu, Info } from 'lucide-react';
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
      {/* 
          RACK FRAME 
          - border-x-[24px]: Creates the side rails for the unit numbers
      */}
      <div className="flex flex-col-reverse w-full max-w-[380px] h-full border-x-[24px] border-[var(--color-rack-frame)] bg-[var(--color-rack-frame)] shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative transition-colors duration-500 rounded-sm">
        {Array.from({ length: rack.u_height }).map((_, idx) => {
          const u = idx + 1;
          const device = uMap.get(u);
          const template = device ? catalog[device.template_id] : null;
          const isDeviceStart = device && device.u_position === u;

          return (
            <div key={u} className="relative flex items-center border-b border-[var(--color-border)]/10 min-h-0 w-full flex-1 transition-colors duration-300">
              
              {/* Unit Labels - Centered on the 24px rails */}
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
                    <Power className="w-3 h-3 text-gray-400" />
                    <div className="w-1.5 h-1.5 rounded-full bg-status-ok shadow-[0_0_5px_var(--color-status-ok)]"></div>
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
    const isOk = nodeHealth === 'OK';
    let Icon = type === 'network' ? RouterIcon : Server;
    const hideText = uHeight === 1;

    return (
        <div className={`relative flex items-center justify-center bg-[var(--color-node-surface)] border border-[var(--color-border)]/20 group hover:bg-[var(--color-accent-primary)]/20 transition-all cursor-help h-full`}>
            {nodeName ? (
                <div className="flex flex-col items-center">
                    <div className={`w-1.5 h-1.5 rounded-full mb-1 ${isOk ? 'bg-status-ok shadow-[0_0_8px_var(--color-status-ok)]' : nodeHealth === 'CRIT' ? 'bg-status-crit animate-pulse shadow-[0_0_10px_var(--color-status-crit)]' : 'bg-status-warn shadow-[0_0_8px_var(--color-status-warn)]'}`}></div>
                    {!hideText && (
                        <div className="flex items-center gap-1.5">
                            <Icon className="w-3 h-3 text-gray-400 opacity-50 group-hover:text-[var(--color-accent-primary)] transition-colors" />
                            <span className="text-[9px] font-mono text-[var(--color-text-base)] opacity-50 group-hover:opacity-100 transition-colors truncate px-1 max-w-full font-black uppercase">
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

            {/* HIGH-END TOOLTIP BUBBLE */}
            <div className="absolute z-[999] bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="bg-[var(--color-bg-panel)] border border-[var(--color-accent-primary)]/40 rounded-2xl overflow-hidden backdrop-blur-2xl">
                    {/* Tooltip Header */}
                    <div className="bg-[var(--color-accent-primary)] p-4 flex justify-between items-center shadow-lg">
                        <div className="flex items-center gap-3">
                            <Cpu className="w-5 h-5 text-white" />
                            <span className="text-sm font-black text-white uppercase tracking-tighter">{nodeName || 'Empty Slot'}</span>
                        </div>
                        <div className="px-2 py-1 bg-black/20 rounded-lg text-[10px] font-black text-white uppercase tracking-wider border border-white/10">{nodeHealth}</div>
                    </div>
                    
                    {/* Tooltip Body */}
                    <div className="p-5 grid grid-cols-2 gap-6 bg-[var(--color-bg-panel)]/90">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block opacity-60">Chassis Model</span>
                            <span className="text-xs text-[var(--color-text-base)] font-bold truncate block">{chassisName}</span>
                        </div>
                        <div className="space-y-1 text-right">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block opacity-60">Location</span>
                            <span className="text-xs text-[var(--color-text-base)] font-mono font-black block">RACK U{uPosition}</span>
                        </div>
                        
                        <div className="col-span-2 pt-4 border-t border-[var(--color-border)]/20 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-status-warn/10">
                                    <Thermometer className="w-4 h-4 text-status-warn" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-gray-500 uppercase">Temp</span>
                                    <span className="text-xs font-mono font-bold text-[var(--color-text-base)]">{nodeMetrics?.temperature ? `${nodeMetrics.temperature.toFixed(1)}°C` : '--'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-status-ok/10">
                                    <Zap className="w-4 h-4 text-status-ok" />
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-black text-gray-500 uppercase">Power</span>
                                    <span className="text-xs font-mono font-black text-[var(--color-text-base)]">{nodeMetrics?.power ? `${(nodeMetrics.power).toFixed(0)}W` : '--'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Tooltip Footer Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[var(--color-bg-panel)]"></div>
                </div>
            </div>
        </div>
    );
};