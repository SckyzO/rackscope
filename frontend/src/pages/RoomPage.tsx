import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Room, Rack } from '../types';
import { Server, Box, Zap, Thermometer, Router as RouterIcon, HardDrive } from 'lucide-react';

// --- Types locaux pour la démo UI ---
type DeviceType = 'server' | 'switch' | 'storage' | 'pdu';

interface Device {
  id: string;
  name: string;
  type: DeviceType;
  uPosition: number;
  uHeight: number;
  status: 'ok' | 'warn' | 'crit';
}

// --- Mock Data Generator ---
const generateMockDevices = (rackId: string, totalU: number): Device[] => {
  const devices: Device[] = [];
  let currentU = 1;

  while (currentU <= totalU) {
    if (Math.random() > 0.7) {
      currentU++;
      continue;
    }

    const typeRoll = Math.random();
    let type: DeviceType = 'server';
    let height = 1;

    if (typeRoll > 0.9) { type = 'switch'; height = 1; }
    else if (typeRoll > 0.8) { type = 'storage'; height = 2; }
    else if (typeRoll > 0.6) { type = 'server'; height = 2; }
    else { type = 'server'; height = 1; }

    if (currentU + height - 1 > totalU) break;

    devices.push({
      id: `${rackId}-dev-${currentU}`,
      name: `${type.toUpperCase()}-${currentU.toString().padStart(2, '0')}`,
      type,
      uPosition: currentU,
      uHeight: height,
      status: Math.random() > 0.9 ? 'crit' : Math.random() > 0.8 ? 'warn' : 'ok'
    });

    currentU += height;
  }
  return devices;
};

export const RoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!roomId) return;
    setLoading(true);
    api.getRoomLayout(roomId)
      .then(setRoom)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
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

  if (loading) return <div className="p-8 font-mono animate-pulse text-blue-500">LDR :: LOADING_ROOM_{roomId?.toUpperCase()}...</div>;
  if (error) return <div className="p-8 text-status-crit font-mono">ERR :: {error}</div>;
  if (!room) return <div className="p-8 text-gray-500 font-mono text-center">ERR :: ROOM_NOT_FOUND</div>;

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
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase">{room.name}</h1>
            <div className="h-4 w-[1px] bg-white/10"></div>
            <div className="flex gap-4 text-[10px] font-mono text-gray-400">
               <span>{room.aisles.length} AISLES</span>
               <span>{room.aisles.reduce((acc, a) => acc + a.racks.length, 0)} RACKS</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-gray-500 font-mono uppercase">Health Index</span>
            <span className="text-2xl font-mono text-status-ok tracking-tighter">LIVE</span>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Main Floor Plan / Grid */}
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

        {/* Info Panel / Rack Detail Preview */}
        <div className="col-span-12 lg:col-span-4 flex flex-col h-full overflow-hidden">
          <div className="bg-rack-panel border border-rack-border rounded-xl flex-1 flex flex-col overflow-hidden shadow-2xl relative">
            {selectedRack ? (
              <RackDetailView 
                rack={selectedRack} 
                health={healthMap[selectedRack.id]?.state || 'UNKNOWN'} 
                metrics={selectedMetrics}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 opacity-50">
                <Box className="w-16 h-16 text-gray-800 mb-4 stroke-[1px]" />
                <p className="text-gray-600 text-xs font-mono uppercase tracking-widest">Select a rack to inspect units</p>
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
    <button 
      onClick={onClick}
      className={`
        w-20 h-24 border rounded flex flex-col items-center justify-between p-1.5 transition-all relative group overflow-hidden
        ${isSelected 
            ? 'ring-1 ring-blue-500 border-blue-500 bg-blue-500/5' 
            : 'bg-[#121212] border-white/10 hover:border-white/30 hover:bg-white/5'}
      `}
    >
      <div className="w-full flex justify-between items-center px-1">
        <div className={`w-1.5 h-1.5 rounded-full ${isCrit ? 'bg-status-crit shadow-[0_0_5px_var(--color-status-crit)]' : isWarn ? 'bg-status-warn shadow-[0_0_5px_var(--color-status-warn)]' : health === 'OK' ? 'bg-status-ok shadow-[0_0_5px_var(--color-status-ok)]' : 'bg-status-unknown'}`}></div>
        <span className="text-[7px] text-gray-600 font-mono tracking-tighter">{rack.u_height}U</span>
      </div>
      
      <div className="flex-1 w-full my-2 flex flex-col gap-[2px] px-2 opacity-50 group-hover:opacity-80 transition-opacity">
         {Array.from({length: 6}).map((_, i) => (
             <div key={i} className={`h-[2px] w-full rounded-full ${isCrit && i % 2 === 0 ? 'bg-status-crit/50' : 'bg-gray-700'}`}></div>
         ))}
      </div>
      
      <div className="w-full bg-white/5 py-1 rounded text-center border-t border-white/5">
        <div className="text-[9px] font-bold truncate text-gray-300 px-1">{rack.name.replace('Rack ', '')}</div>
      </div>
    </button>
  );
};

const RackDetailView = ({ rack, health, metrics }: { rack: Rack, health: string, metrics: any }) => {
  const devices = useMemo(() => generateMockDevices(rack.id, rack.u_height), [rack.id, rack.u_height]);
  const uMap = new Map<number, Device>();
  devices.forEach(d => {
      for(let i=0; i < d.uHeight; i++) {
          uMap.set(d.uPosition + i, d);
      }
  });

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="p-4 border-b border-rack-border bg-black/20 flex flex-col gap-4 shrink-0">
         <div className="flex justify-between items-start">
             <div>
                <h2 className="text-xl font-bold text-white tracking-tight uppercase">{rack.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-gray-500 uppercase px-1.5 py-0.5 border border-white/10 rounded">ID: {rack.id}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${health === 'OK' ? 'bg-status-ok/20 text-status-ok' : health === 'CRIT' ? 'bg-status-crit/20 text-status-crit' : 'bg-gray-800 text-gray-400'}`}>{health}</span>
                </div>
             </div>
             
             {/* Integrated Metrics Widget */}
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
        {/* Rack Container taking full height */}
        <div className="flex flex-col-reverse w-full max-w-[300px] h-full border-x-2 border-gray-800 bg-[#0a0a0a] shadow-2xl relative">
          {Array.from({ length: rack.u_height }).map((_, idx) => {
            const u = idx + 1;
            const device = uMap.get(u);
            const isDeviceStart = device && device.uPosition === u;
            const isOccupied = device && device.uPosition !== u;

            if (isOccupied) return null;

            // Calculate span for flex-grow if device > 1U
            const flexGrow = isDeviceStart ? device.uHeight : 1;

            return (
              <div 
                key={u} 
                className="relative flex items-center border-b border-white/5 min-h-0 w-full" 
                style={{ flex: `${flexGrow} 1 0%` }}
              >
                {/* Side Labels */}
                <div className="absolute -left-6 w-4 text-right text-[8px] font-mono text-gray-600 select-none flex items-center justify-end h-full">{u}</div>
                <div className="absolute -right-6 w-4 text-left text-[8px] font-mono text-gray-600 select-none flex items-center justify-start h-full">{u}</div>

                <div className="w-full px-0.5 py-[1px] h-full">
                    {isDeviceStart ? (
                        <DeviceUnit device={device} />
                    ) : (
                        <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#1a1a1a_2px,#1a1a1a_4px)] opacity-50 hover:opacity-100 transition-opacity"></div>
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

const DeviceUnit = ({ device }: { device: Device }) => {
    let Icon = Server;
    let bgColor = 'bg-gray-800';
    let borderColor = 'border-gray-700';
    
    if (device.type === 'switch') { Icon = RouterIcon; bgColor = 'bg-blue-900/20'; borderColor = 'border-blue-500/30'; }
    else if (device.type === 'storage') { Icon = HardDrive; bgColor = 'bg-purple-900/20'; borderColor = 'border-purple-500/30'; }
    else if (device.status === 'crit') { bgColor = 'bg-red-900/20'; borderColor = 'border-red-500/50'; }

    return (
        <div 
            className={`
                w-full h-full rounded-sm border ${borderColor} ${bgColor} 
                flex items-center justify-between px-2 relative group
                hover:brightness-125 transition-all cursor-help shadow-lg overflow-hidden
            `}
        >
            <div className="flex items-center gap-2">
                <div className={`w-1 h-3 rounded-full ${device.status === 'ok' ? 'bg-status-ok shadow-[0_0_5px_var(--color-status-ok)]' : 'bg-status-crit animate-pulse'}`}></div>
                <span className="text-[9px] font-bold text-gray-300 font-mono tracking-wide truncate">{device.name}</span>
            </div>
             <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 hidden sm:flex">
                <Icon className="w-3 h-3 text-gray-400" />
            </div>
        </div>
    );
};