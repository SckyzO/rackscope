import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Room, Rack, DeviceTemplate, RackTemplate } from '../types';
import { Box, Zap, Thermometer, Maximize2 } from 'lucide-react';
import { RackElevation, HUDTooltip } from '../components/RackVisualizer';

export const RoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [catalog, setCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [rackTemplates, setRackTemplates] = useState<Record<string, RackTemplate>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [viewSide, setViewSide] = useState<'front' | 'rear'>('front');
  const [error, setError] = useState<string | null>(null);
  const [healthMap, setHealthMap] = useState<Record<string, any>>({});
  const [selectedRackHealth, setSelectedRackHealth] = useState<any>(null);
  const [refreshMs, setRefreshMs] = useState(60000);

  useEffect(() => {
    const init = async () => {
      if (!roomId) return;
      setLoading(true);
      try {
        const [roomData, catalogData, configData] = await Promise.all([
          api.getRoomLayout(roomId),
          api.getCatalog(),
          api.getConfig()
        ]);
        setRoom(roomData);
        const deviceTemplates = (catalogData as any).device_templates || [];
        const rackTemplates = (catalogData as any).rack_templates || [];
        const catMap = deviceTemplates.reduce((acc: any, t: DeviceTemplate) => ({ ...acc, [t.id]: t }), {});
        setCatalog(catMap);
        const rackMap = rackTemplates.reduce((acc: any, t: RackTemplate) => ({ ...acc, [t.id]: t }), {});
        setRackTemplates(rackMap);
        const nextRefresh = Number(configData?.refresh?.room_state_seconds) || 60;
        setRefreshMs(Math.max(60000, nextRefresh * 1000));
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
      try {
        const data = await api.getRoomState(room.id);
        setHealthMap(data?.racks || {});
      } catch (e) {
        console.error("Failed to fetch room health", e);
        setHealthMap({});
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, refreshMs);
    return () => clearInterval(interval);
  }, [room, refreshMs]);

  useEffect(() => {
    if (!selectedRack) {
      setSelectedRackHealth(null);
      return;
    }
    let active = true;
    const fetchSelected = async () => {
      try {
        const data = await api.getRackState(selectedRack.id);
        if (active) {
          setSelectedRackHealth(data);
        }
      } catch (e) {
        console.error("Failed to fetch rack health", e);
        if (active) {
          setSelectedRackHealth(null);
        }
      }
    };
    fetchSelected();
    return () => {
      active = false;
    };
  }, [selectedRack]);

  const selectedMetrics = selectedRackHealth?.metrics || null;
  const selectedNodesData = selectedRackHealth?.nodes || null;
  const selectedState = selectedRackHealth?.state || healthMap[selectedRack?.id || ""]?.state;
  const selectedRackTemplate = selectedRack?.template_id ? rackTemplates[selectedRack.template_id] : null;
  const frontInfra = selectedRackTemplate?.infrastructure.front_components?.length
    ? selectedRackTemplate.infrastructure.front_components
    : selectedRackTemplate?.infrastructure.components || [];
  const rearInfra = selectedRackTemplate?.infrastructure.rear_components?.length
    ? selectedRackTemplate.infrastructure.rear_components
    : selectedRackTemplate?.infrastructure.components || [];

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
                      healthData={healthMap[rack.id]}
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
              <>
                <div className="p-4 border-b border-rack-border bg-black/20 flex flex-col gap-4 shrink-0">
                   <div className="flex justify-between items-start">
                       <div>
                          <Link to={`/rack/${selectedRack.id}`} className="group flex items-center gap-3 hover:text-blue-400 transition-colors">
                              <h2 className="text-xl font-bold text-white tracking-tighter uppercase group-hover:text-blue-400">{selectedRack.name}</h2>
                              <Maximize2 className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] font-mono text-gray-500 uppercase px-1.5 py-0.5 border border-white/10 rounded">ID: {selectedRack.id}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${selectedState === 'OK' ? 'bg-status-ok/20 text-status-ok' : selectedState === 'CRIT' ? 'bg-status-crit/20 text-status-crit' : 'bg-gray-800 text-gray-400'}`}>{selectedState}</span>
                          </div>
                       </div>
                       <div className="flex gap-2">
                           <div className="px-3 py-1.5 bg-white/5 rounded border border-white/10 flex flex-col items-center min-w-[60px]">
                              <div className="flex items-center gap-1 text-gray-500 mb-0.5"><Thermometer className="w-3 h-3" /><span className="text-[8px] uppercase">Temp</span></div>
                              <div className="text-sm font-mono text-white">{selectedMetrics?.temperature ? selectedMetrics.temperature.toFixed(1) : '--'}<span className="text-[9px] text-gray-500 ml-0.5">°C</span></div>
                           </div>
                           <div className="px-3 py-1.5 bg-white/5 rounded border border-white/10 flex flex-col items-center min-w-[60px]">
                              <div className="flex items-center gap-1 text-gray-500 mb-0.5"><Zap className="w-3 h-3" /><span className="text-[8px] uppercase">Pwr</span></div>
                              <div className="text-sm font-mono text-white">{selectedMetrics?.power ? (selectedMetrics.power / 1000).toFixed(1) : '--'}<span className="text-[9px] text-gray-500 ml-0.5">kW</span></div>
                           </div>
                       </div>
                   </div>
                </div>
                <div className="flex-1">
                  <RackElevation
                    rack={selectedRack}
                    catalog={catalog}
                    health={selectedState}
                    nodesData={selectedNodesData}
                    isRearView={viewSide === 'rear'}
                    infraComponents={viewSide === 'rear' ? rearInfra : frontInfra}
                    allowInfraOverlap={viewSide === 'rear'}
                    overlay={(
                      <button
                        type="button"
                        onClick={() => setViewSide(viewSide === 'front' ? 'rear' : 'front')}
                        aria-label="Toggle rack view"
                        aria-pressed={viewSide === 'rear'}
                        className="relative h-6 w-[132px] rounded-[6px] border border-white/10 bg-black/50 p-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-gray-500 transition-colors hover:text-gray-300"
                      >
                        <span
                          className={`absolute inset-y-0.5 left-0.5 w-1/2 rounded-[4px] bg-white/12 border border-white/12 shadow-[0_0_10px_rgba(255,255,255,0.08)] transition-transform duration-300 ${viewSide === 'rear' ? 'translate-x-full' : ''}`}
                        />
                        <span className={`relative z-10 inline-flex w-1/2 items-center justify-center ${viewSide === 'front' ? 'text-white' : ''}`}>
                          Front
                        </span>
                        <span className={`relative z-10 inline-flex w-1/2 items-center justify-center ${viewSide === 'rear' ? 'text-white' : ''}`}>
                          Rear
                        </span>
                      </button>
                    )}
                  />
                </div>
              </>
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

const RackThumbnail = ({ rack, healthData, isSelected, onClick }: { rack: Rack, healthData: any, isSelected: boolean, onClick: () => void }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  const health = healthData?.state || 'UNKNOWN';
  const isCrit = health === 'CRIT';
  const isWarn = health === 'WARN';

  const handleMouseEnter = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    hoverTimer.current = setTimeout(() => {
        setIsHovered(true);
    }, 600); // 600ms delay
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setIsHovered(false);
  };

  const reasons = (() => {
    if (!healthData) return [];
    const raw = healthData.reasons || healthData.checks || healthData.alerts;
    if (Array.isArray(raw)) {
      return raw.map((r: any) => r?.name || r?.label || r?.id || r).filter(Boolean);
    }
    return [];
  })();
  const showReasons = health !== 'OK' ? (reasons.length > 0 ? reasons : ['No checks available']) : [];

  return (
    <>
        <button 
            onClick={onClick} 
            onMouseEnter={handleMouseEnter}
            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
            onMouseLeave={handleMouseLeave}
            className={`w-20 h-24 border rounded flex flex-col items-center justify-between p-1.5 transition-all relative group overflow-hidden ${isSelected ? 'ring-1 ring-blue-500 border-blue-500 bg-blue-500/5' : 'bg-[#121212] border-white/10 hover:border-white/30 hover:bg-white/5'}`}
        >
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

        {isHovered && (
            <HUDTooltip 
                title={rack.name}
                subtitle="Enclosure Overview"
                status={health}
                details={[
                    { label: 'Template', value: rack.template_id || 'Generic' },
                    { label: 'Capacity', value: `${rack.devices.length} Assets / ${rack.u_height}U`, italic: true }
                ]}
                reasons={showReasons}
                metrics={healthData?.metrics ? { temp: healthData.metrics.temperature, power: healthData.metrics.power } : undefined}
                mousePos={mousePos}
            />
        )}
    </>
  );
};
