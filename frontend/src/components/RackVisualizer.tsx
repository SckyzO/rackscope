import { useMemo } from 'react';
import { Server, Box, Zap, Thermometer, Router as RouterIcon, HardDrive, Fan, Power } from 'lucide-react';
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
    <div className="flex-1 bg-[#0f0f0f] p-4 overflow-hidden flex items-center justify-center h-full">
      <div className="flex flex-col-reverse w-full max-w-[300px] h-full border-x-2 border-gray-800 bg-[#0a0a0a] shadow-2xl relative">
        {Array.from({ length: rack.u_height }).map((_, idx) => {
          const u = idx + 1;
          const device = uMap.get(u);
          const template = device ? catalog[device.template_id] : null;
          const isDeviceStart = device && device.u_position === u;

          return (
            <div key={u} className="relative flex items-center border-b border-white/5 min-h-0 w-full flex-1">
              <div className="absolute -left-6 w-4 text-right text-[8px] font-mono text-gray-600 select-none flex items-center justify-end h-full z-10">{u}</div>
              <div className="absolute -right-6 w-4 text-left text-[8px] font-mono text-gray-600 select-none flex items-center justify-start h-full z-10">{u}</div>
              
              <div className="w-full px-0.5 py-[1px] h-full relative">
                  {isDeviceStart && template && (
                      <div 
                        className="absolute bottom-0 left-0.5 right-0.5 z-20" 
                        style={{ height: `calc(${template.u_height} * 100%)` }}
                      >
                          <DeviceChassis device={device} template={template} rackHealth={health || 'UNKNOWN'} nodesData={nodesData} isRearView={isRearView} />
                      </div>
                  )}
                  
                  {!device && (
                      <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#1a1a1a_2px,#1a1a1a_4px)] opacity-20"></div>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const DeviceChassis = ({ device, template, rackHealth, nodesData, isRearView }: { device: Device, template: DeviceTemplate, rackHealth: string, nodesData?: Record<string, any>, isRearView?: boolean }) => {
    const nodeMap = useMemo(() => parseNodeset(device.nodes), [device.nodes]);
    
    // --- Custom HPC Health Aggregation Logic ---
    const chassisHealth = useMemo(() => {
        if (!nodesData) return rackHealth;
        
        const nodeIds = Object.values(nodeMap);
        const states = nodeIds.map(id => nodesData[id]?.state).filter(Boolean);
        
        if (states.length === 0) return rackHealth;

        const critCount = states.filter(s => s === 'CRIT').length;
        const warnCount = states.filter(s => s === 'WARN').length;

        if (critCount === states.length && states.length > 0) {
            return 'CRIT'; // 100% Critical -> Red
        }
        if (critCount > 0 || warnCount > 0) {
            return 'WARN'; // Partially failing -> Orange
        }
        return 'OK';
    }, [nodesData, nodeMap, rackHealth]);
    
    // Use the appropriate layout (Front or Rear)
    const layout = (isRearView && template.rear_layout) ? template.rear_layout : template.layout;
    
    // Density detection: if too many columns, we simplify the view (except for networks)
    const isHighDensity = layout.cols > 8 && template.type !== 'network';

    let borderColor = 'border-white/10';
    let bgColor = 'bg-gray-900/50';
    if (template.type === 'network') {
        borderColor = 'border-blue-500/30';
        bgColor = 'bg-blue-900/10';
    }
    const statusColor = chassisHealth === 'OK' ? 'bg-status-ok' 
                      : chassisHealth === 'CRIT' ? 'bg-status-crit' 
                      : chassisHealth === 'WARN' ? 'bg-status-warn' 
                      : 'bg-gray-600';

    return (
        <div className={`w-full h-full border ${borderColor} ${bgColor} rounded-sm overflow-hidden flex relative group shadow-inner`}>
            {/* Chassis Health Strip */}
            <div className={`w-1.5 h-full ${statusColor} shrink-0 opacity-70 group-hover:opacity-100 transition-opacity`}></div>
            
            <div 
                className="flex-1 grid gap-[1px] p-[1px] bg-transparent"
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
                            const nodeTemp = nodeId && nodesData && nodesData[nodeId] ? nodesData[nodeId].temperature : null;
                            
                            return (
                                <NodeUnit 
                                    key={`${rIdx}-${cIdx}`} 
                                    nodeName={nodeId} 
                                    slotNum={slotNum}
                                    nodeHealth={nodeHealth}
                                    nodeTemp={nodeTemp}
                                    isRearView={isRearView}
                                    type={template.type}
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
        <div className="relative flex items-center justify-center bg-[#151515] border border-white/5 group hover:bg-white/10 transition-colors">
            {type === 'fan' ? (
                <Fan className="w-4 h-4 text-gray-600 animate-[spin_3s_linear_infinite]" />
            ) : (
                <div className="flex flex-col items-center gap-1">
                    <Power className="w-3 h-3 text-gray-500" />
                    <div className="w-1.5 h-1.5 rounded-full bg-status-ok shadow-[0_0_5px_var(--color-status-ok)]"></div>
                </div>
            )}
        </div>
    );
};

const RowSummaryUnit = ({ rowNodes, nodesData, label }: { rowNodes: (string|undefined)[], nodesData: Record<string, any>, label: string }) => {
    let worstState = 'OK';
    let critCount = 0;
    let warnCount = 0;
    let okCount = 0;

    rowNodes.forEach(nodeId => {
        if (!nodeId || !nodesData[nodeId]) return;
        const state = nodesData[nodeId].state;
        if (state === 'CRIT') { worstState = 'CRIT'; critCount++; }
        else if (state === 'WARN') { warnCount++; if (worstState !== 'CRIT') worstState = 'WARN'; }
        else if (state === 'OK') okCount++;
    });

    const statusColor = worstState === 'CRIT' ? 'bg-status-crit' : worstState === 'WARN' ? 'bg-status-warn' : 'bg-status-ok';

    return (
        <div className={`relative flex items-center justify-between px-3 bg-[#0a0a0a] group hover:bg-white/5 transition-colors cursor-help border-b border-white/5 last:border-0`}>
            <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${statusColor} ${worstState === 'CRIT' ? 'animate-pulse shadow-[0_0_8px_var(--color-status-crit)]' : ''}`}></div>
                <span className="text-[8px] font-bold font-mono text-gray-400 group-hover:text-white uppercase tracking-wider">{label}</span>
            </div>
            <div className="flex gap-1.5 opacity-40 group-hover:opacity-100">
                {critCount > 0 && <span className="text-[7px] font-mono text-status-crit">{critCount} ERR</span>}
                {warnCount > 0 && <span className="text-[7px] font-mono text-status-warn">{warnCount} WRN</span>}
                <span className="text-[7px] font-mono text-gray-600">{rowNodes.length} DISKS</span>
            </div>
        </div>
    );
};

export const NodeUnit = ({ nodeName, slotNum, nodeHealth, nodeTemp, isRearView, type }: { nodeName?: string, slotNum: number, nodeHealth: string, nodeTemp?: number, isRearView?: boolean, type?: string }) => {
    const isOk = nodeHealth === 'OK';
    
    if (isRearView && !nodeName) {
         return (
            <div className="relative flex items-center justify-center bg-[#0a0a0a] border border-white/5">
                <div className="w-full h-full bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,#1a1a1a_2px,#1a1a1a_4px)] opacity-30"></div>
            </div>
         );
    }

    // Specific Icon for Network
    let Icon = type === 'network' ? RouterIcon : Server;

    return (
        <div className={`relative flex items-center justify-center bg-[#0a0a0a] group hover:bg-white/5 transition-colors cursor-help`}>
            {nodeName ? (
                <div className="flex flex-col items-center">
                    <div className={`w-1.5 h-1.5 rounded-full mb-1 ${isOk ? 'bg-status-ok shadow-[0_0_5px_var(--color-status-ok)]' : nodeHealth === 'CRIT' ? 'bg-status-crit animate-pulse' : nodeHealth === 'WARN' ? 'bg-status-warn' : 'bg-status-unknown'}`}></div>
                    <div className="flex items-center gap-1.5">
                        <Icon className="w-2.5 h-2.5 text-gray-600 opacity-50" />
                        <span className="text-[7px] font-mono text-gray-400 group-hover:text-white transition-colors truncate px-1 max-w-full italic">
                            {nodeName}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="text-[6px] text-gray-800 font-mono italic">SLOT {slotNum}</div>
            )}
            <div className="absolute z-50 bg-black border border-white/20 px-2 py-1 rounded text-[8px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                {nodeName ? `${nodeName} (${nodeHealth}${nodeTemp ? ` ${nodeTemp.toFixed(1)}°C` : ''})` : `Empty Slot ${slotNum}`}
            </div>
        </div>
    );
};
