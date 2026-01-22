import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Room, Rack, Device, DeviceTemplate } from '../types';
import { Server, Box, Zap, Thermometer, Router as RouterIcon } from 'lucide-react';

// --- Helpers ---

const parseNodeset = (pattern: string | Record<number, string>): Record<number, string> => {
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

export const RoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [catalog, setCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const init = async () => {
      if (!roomId) return;
      setLoading(true);
      try {
        const [roomData, catalogData] = await Promise.all([
          api.getRoomLayout(roomId),
          api.getCatalog()
        ]);
        setRoom(roomData);
        const catMap = catalogData.reduce((acc, t) => ({ ...acc, [t.id]: t }), {});
        setCatalog(catMap);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [roomId]);

  useEffect(() => {
    if (!room) return;
    const fetchHealth = async () => {
      const newHealth: Record<string, any> = {};
      const rackIds = [
        ...room.aisles.flatMap(a => a.racks.map(r => r.id)),
        ...room.standalone_racks.map(r => r.id)
      ];
      await Promise.all(rackIds.map(async (id) => {
        try {
          const data = await api.getRackState(id);
          newHealth[id] = data;
        } catch (e) {
          newHealth[id] = { state: 'UNKNOWN' };
        }
      }));
      setHealthMap(newHealth);
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, [room]);

  const selectedMetrics = selectedRack ? healthMap[selectedRack.id]?.metrics : null;
  const selectedNodesData = selectedRack ? healthMap[selectedRack.id]?.nodes : null;

  if (loading) return <div className="p-8 font-mono animate-pulse text-blue-500">LDR :: INITIALIZING_ENVIRONMENT...</div>;
  if (error) return <div className="p-8 text-status-crit font-mono uppercase">ERR :: {error}</div>;
  if (!room) return <div className="p-8 text-gray-500 font-mono text-center uppercase">ERR :: ROOM_NOT_FOUND</div>;

  return (
    <div className="h-full flex flex-col">
      <header className="px-8 py-6 border-b border-white/5 bg-black/20 flex justify-between items-center shrink-0">
        <div>
          <nav className="flex items-center gap-2 text-gray-500 text-[10px] font-mono uppercase tracking-[0.2em] mb-1">
            <Link to="/" className="hover:text-blue-400 transition-colors">Infrastructure</Link>
            <span>/</span>
            <span className="text-white">{room.name}</span>
          </nav>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">{room.name}</h1>
            <div className="h-4 w-[1px] bg-white/10"></div>
            <div className="flex gap-4 text-[10px] font-mono text-gray-400">
               <span>{room.aisles.length} AISLES</span>
               <span>{room.aisles.reduce((acc, a) => acc + a.racks.length, 0)} RACKS</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-500 font-mono uppercase">Room Status</span>
            <span className="text-2xl font-mono text-status-ok tracking-tighter">LIVE</span>
        </div>
      </header>

      <div className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden">
        <div className="col-span-12 lg:col-span-8 bg-rack-panel border border-rack-border rounded-xl p-6 overflow-auto relative custom-scrollbar shadow-inner">
           <div className="space-y-12">
            {room.aisles.map(aisle => (
              <div key={aisle.id}>
                <h3 className="text-[10px] font-bold text-blue-500/80 uppercase tracking-[0.3em] mb-4 flex items-center gap-4">
                  <span className="bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">{aisle.name}</span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-500/20 to-transparent"></div>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {aisle.racks.map(rack => (
                    <RackThumbnail 
                      key={rack.id} 
                      rack={rack} 
                      health={healthMap[rack.id]?.state || 'UNKNOWN'}
                      isSelected={selectedRack?.id === rack.id}
                      onClick={() => setSelectedRack(rack)} 
                    />
                  ))}
                </div>
              </div>
            ))}
           </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col h-full overflow-hidden">
          <div className="bg-rack-panel border border-rack-border rounded-xl flex-1 flex flex-col overflow-hidden shadow-2xl relative">
            {selectedRack ? (
              <RackDetailView 
                rack={selectedRack} 
                catalog={catalog}
                health={healthMap[selectedRack.id]?.state || 'UNKNOWN'} 
                metrics={selectedMetrics}
                nodesData={selectedNodesData}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 opacity-50">
                <Box className="w-16 h-16 text-gray-800 mb-4 stroke-[1px]" />
                <p className="text-gray-600 text-[10px] font-mono uppercase tracking-[0.3em]">Physical Inspector ready</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const RackThumbnail = ({ rack, health, isSelected, onClick }: { rack: Rack, health: string, isSelected: boolean, onClick: () => void }) => {
  const isCrit = health === 'CRIT';
  const isWarn = health === 'WARN';
  return (
    <button onClick={onClick} className={`w-20 h-24 border rounded flex flex-col items-center justify-between p-1.5 transition-all relative group overflow-hidden ${isSelected ? 'ring-1 ring-blue-500 border-blue-500 bg-blue-500/5' : 'bg-[#121212] border-white/10 hover:border-white/30 hover:bg-white/5'}`}>
      <div className="w-full flex justify-between items-center px-1">
        <div className={`w-1.5 h-1.5 rounded-full ${isCrit ? 'bg-status-crit shadow-[0_0_5px_var(--color-status-crit)]' : isWarn ? 'bg-status-warn' : health === 'OK' ? 'bg-status-ok shadow-[0_0_5px_var(--color-status-ok)]' : 'bg-status-unknown'}`}></div>
        <span className="text-[7px] text-gray-600 font-mono tracking-tighter">{rack.u_height}U</span>
      </div>
      <div className="flex-1 w-full my-2 flex flex-col gap-[2px] px-2 opacity-50 group-hover:opacity-80 transition-opacity">
         {Array.from({length: 6}).map((_, i) => (
             <div key={i} className={`h-[2px] w-full rounded-full ${isCrit && i % 2 === 0 ? 'bg-status-crit/50' : 'bg-gray-700'}`}></div>
         ))}
      </div>
      <div className="w-full bg-white/5 py-1 rounded text-center border-t border-white/5">
        <div className="text-[9px] font-bold truncate text-gray-300 px-1 uppercase">{rack.name.replace('Rack ', '')}</div>
      </div>
    </button>
  );
};

const RackDetailView = ({ rack, catalog, health, metrics, nodesData }: { rack: Rack, catalog: Record<string, DeviceTemplate>, health: string, metrics: any, nodesData: Record<string, any> }) => {
  const uMap = new Map<number, Device>();
  rack.devices.forEach(d => {
      const template = catalog[d.template_id];
      const height = template?.u_height || 1;
      for(let i=0; i < height; i++) {
          uMap.set(d.u_position + i, d);
      }
  });

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="p-4 border-b border-rack-border bg-black/20 flex flex-col gap-4 shrink-0">
         <div className="flex justify-between items-start">
             <div>
                <h2 className="text-xl font-bold text-white tracking-tighter uppercase">{rack.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-gray-500 uppercase px-1.5 py-0.5 border border-white/10 rounded">ID: {rack.id}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${health === 'OK' ? 'bg-status-ok/20 text-status-ok' : health === 'CRIT' ? 'bg-status-crit/20 text-status-crit' : 'bg-gray-800 text-gray-400'}`}>{health}</span>
                </div>
             </div>
             <div className="flex gap-2">
                 <div className="px-3 py-1.5 bg-white/5 rounded border border-white/10 flex flex-col items-center min-w-[60px]">
                    <div className="flex items-center gap-1 text-gray-500 mb-0.5"><Thermometer className="w-3 h-3" /><span className="text-[8px] uppercase">Temp</span></div>
                    <div className="text-sm font-mono text-white">{metrics?.temperature ? metrics.temperature.toFixed(1) : '--'}<span className="text-[9px] text-gray-500 ml-0.5">°C</span></div>
                 </div>
                 <div className="px-3 py-1.5 bg-white/5 rounded border border-white/10 flex flex-col items-center min-w-[60px]">
                    <div className="flex items-center gap-1 text-gray-500 mb-0.5"><Zap className="w-3 h-3" /><span className="text-[8px] uppercase">Pwr</span></div>
                    <div className="text-sm font-mono text-white">{metrics?.power ? (metrics.power / 1000).toFixed(1) : '--'}<span className="text-[9px] text-gray-500 ml-0.5">kW</span></div>
                 </div>
             </div>
         </div>
      </div>

      <div className="flex-1 bg-[#0f0f0f] p-4 overflow-hidden flex items-center justify-center">
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
                            <DeviceChassis device={device} template={template} rackHealth={health} nodesData={nodesData} />
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
    </div>
  );
};

const DeviceChassis = ({ device, template, rackHealth, nodesData }: { device: Device, template: DeviceTemplate, rackHealth: string, nodesData: Record<string, any> }) => {
    const nodeMap = useMemo(() => parseNodeset(device.nodes), [device.nodes]);
    const chassisHealth = rackHealth; 
    
    // Density detection: if too many columns, we simplify the view
    const isHighDensity = template.layout.cols > 8;

    let borderColor = 'border-white/10';
    let bgColor = 'bg-gray-900/50';
    if (template.id.includes('switch')) {
        borderColor = 'border-blue-500/30';
        bgColor = 'bg-blue-900/10';
    }
    const statusColor = chassisHealth === 'OK' ? 'bg-status-ok' 
                      : chassisHealth === 'CRIT' ? 'bg-status-crit' 
                      : chassisHealth === 'WARN' ? 'bg-status-warn' 
                      : 'bg-gray-600';

    return (
        <div className={`w-full h-full border ${borderColor} ${bgColor} rounded-sm overflow-hidden flex relative group`}>
            <div className={`w-1.5 h-full ${statusColor} shrink-0 opacity-70 group-hover:opacity-100 transition-opacity`} title={`Chassis Status: ${chassisHealth}`}></div>
            
            <div 
                className="flex-1 grid gap-[1px] p-[1px] bg-transparent"
                style={{ 
                    gridTemplateRows: `repeat(${template.layout.rows}, 1fr)`,
                    gridTemplateColumns: isHighDensity ? '1fr' : `repeat(${template.layout.cols}, 1fr)` 
                }}
            >
                {template.layout.matrix.map((row, rIdx) => (
                    isHighDensity ? (
                        // Render a single summary unit for the whole row
                        <RowSummaryUnit 
                            key={rIdx} 
                            rowNodes={row.map(slot => nodeMap[slot])} 
                            nodesData={nodesData}
                            label={template.layout.rows > 1 ? `DRAWER ${rIdx + 1}` : 'STORAGE ARRAY'}
                        />
                    ) : (
                        // Classic grid rendering
                        row.map((slotNum, cIdx) => {
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
                                />
                            );
                        })
                    )
                ))}
            </div>
        </div>
    );
};

const RowSummaryUnit = ({ rowNodes, nodesData, label }: { rowNodes: (string|undefined)[], nodesData: Record<string, any>, label: string }) => {
    // Calculate aggregate health for the row
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

            {/* Detailed row tooltip */}
            <div className="absolute z-50 bg-black border border-white/20 px-3 py-2 rounded text-[9px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap left-1/2 -translate-x-1/2 -top-10 shadow-2xl">
                <div className="font-bold border-b border-white/10 pb-1 mb-1">{label} SUMMARY</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    <div className="text-gray-500">Total Units:</div><div className="text-right">{rowNodes.length}</div>
                    <div className="text-status-crit">Critical:</div><div className="text-right text-status-crit">{critCount}</div>
                    <div className="text-status-warn">Warning:</div><div className="text-right text-status-warn">{warnCount}</div>
                    <div className="text-status-ok">Healthy:</div><div className="text-right text-status-ok">{okCount}</div>
                </div>
            </div>
        </div>
    );
};

const NodeUnit = ({ nodeName, slotNum, nodeHealth, nodeTemp }: { nodeName?: string, slotNum: number, nodeHealth: string, nodeTemp?: number }) => {
    const isOk = nodeHealth === 'OK';
    return (
        <div className={`relative flex items-center justify-center bg-[#0a0a0a] group hover:bg-white/5 transition-colors cursor-help`}>
            {nodeName ? (
                <div className="flex flex-col items-center">
                    <div className={`w-1.5 h-1.5 rounded-full mb-1 ${isOk ? 'bg-status-ok shadow-[0_0_5px_var(--color-status-ok)]' : nodeHealth === 'CRIT' ? 'bg-status-crit animate-pulse' : nodeHealth === 'WARN' ? 'bg-status-warn' : 'bg-status-unknown'}`}></div>
                    <span className="text-[7px] font-mono text-gray-400 group-hover:text-white transition-colors truncate px-1 max-w-full italic">
                        {nodeName}
                    </span>
                </div>
            ) : (
                <div className="text-[6px] text-gray-800 font-mono">SLOT {slotNum}</div>
            )}
            <div className="absolute z-50 bg-black border border-white/20 px-2 py-1 rounded text-[8px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
                Slot {slotNum} {nodeName ? `: ${nodeName} (${nodeHealth}${nodeTemp ? ` ${nodeTemp.toFixed(1)}°C` : ''})` : '(Empty)'}
            </div>
        </div>
    );
};
