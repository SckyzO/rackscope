import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Rack, DeviceTemplate, RackTemplate, InfrastructureComponent } from '../types';
import { ChevronLeft, Server, Activity, Zap, Thermometer, ShieldCheck } from 'lucide-react';
import { RackElevation } from '../components/RackVisualizer';

/**
 * RackPage Component
 * 
 * The "Level 2" detail view for a specific rack.
 * Displays:
 * - Infrastructure components (PMC, HMC, RMC)
 * - Front View (Compute/Storage)
 * - Rear View (Cabling/Cooling)
 */
export const RackPage = () => {
  const { rackId } = useParams<{ rackId: string }>();
  
  const [rack, setRack] = useState<Rack | null>(null);
  const [deviceCatalog, setDeviceCatalog] = useState<Record<string, DeviceTemplate>>({});
  const [rackTemplate, setRackTemplate] = useState<RackTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<any>(null);

  // 1. Fetch Rack Details & Catalog
  useEffect(() => {
    const fetchData = async () => {
      if (!rackId) return;
      setLoading(true);
      try {
        const [rackData, catalogData] = await Promise.all([
          api.getRack(rackId),
          api.getCatalog()
        ]);
        
        setRack(rackData);
        
        // Map device templates
        const devCat = (catalogData as any).device_templates || [];
        setDeviceCatalog(devCat.reduce((acc: any, t: DeviceTemplate) => ({ ...acc, [t.id]: t }), {}));
        
        // Find specific rack template if assigned
        if (rackData.template_id) {
            const rackCat = (catalogData as any).rack_templates || [];
            const template = rackCat.find((t: RackTemplate) => t.id === rackData.template_id);
            setRackTemplate(template || null);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [rackId]);

  // 2. Telemetry Polling
  useEffect(() => {
    if (!rackId) return;
    const fetchHealth = async () => {
      try {
        const data = await api.getRackState(rackId);
        setHealthData(data);
      } catch (e) {
        console.error("Failed to fetch rack health", e);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, [rackId]);

  if (loading) return <div className="p-12 font-mono animate-pulse text-blue-500">LDR :: ANALYZING_RACK_STRUCTURE...</div>;
  if (error || !rack) return <div className="p-12 text-status-crit font-mono">ERR :: {error || 'RACK_NOT_FOUND'}</div>;

  return (
    <div className="h-full flex flex-col p-8 bg-[var(--color-bg-base)]">
      {/* Top Navigation & Title */}
      <header className="flex justify-between items-end mb-6 shrink-0">
        <div>
          <Link to={`/room/${rack.aisle_id?.split('-')[0] || ''}`} className="flex items-center gap-2 text-gray-500 hover:text-blue-400 transition-colors mb-2 text-[10px] font-mono uppercase tracking-[0.2em]">
            <ChevronLeft className="w-3 h-3" /> Back to Floor Plan
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">{rack.name}</h1>
            <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] font-mono text-blue-400">
                {rackTemplate?.name || 'Generic Rack'}
            </div>
          </div>
        </div>

        <div className="flex gap-6">
            <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-500 font-mono uppercase">Avg Power</span>
                <span className="text-2xl font-mono text-white">{(healthData?.metrics?.power / 1000 || 0).toFixed(1)} <span className="text-xs text-gray-500">kW</span></span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-500 font-mono uppercase">Health Score</span>
                <span className={`text-2xl font-mono ${healthData?.state === 'OK' ? 'text-status-ok' : 'text-status-crit'}`}>{healthData?.state || '---'}</span>
            </div>
        </div>
      </header>

      {/* Main Rack View Layout */}
      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        
        {/* LEFT: Infrastructure Column (HMC, PMC, RMC) */}
        <div className="col-span-2 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
            <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest border-b border-white/5 pb-2">Infrastructure</h3>
            
            {rackTemplate?.infrastructure.components.map(comp => (
                <InfraComponentCard key={comp.id} component={comp} />
            ))}
            
            {!rackTemplate && (
                <div className="p-4 border border-dashed border-gray-800 rounded text-[10px] text-gray-600 text-center uppercase font-mono">
                    No Template Assigned
                </div>
            )}
        </div>

        {/* CENTER: Front View */}
        <div className="col-span-5 flex flex-col bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-3xl shadow-2xl relative">
            <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-base)]/50 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] rounded-t-3xl">
                Front Orientation
            </div>
            <div className="flex-1 p-6">
                <RackElevation rack={rack} catalog={deviceCatalog} health={healthData?.state} nodesData={healthData?.nodes} />
            </div>
        </div>

        {/* RIGHT: Rear View */}
        <div className="col-span-5 flex flex-col bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-3xl shadow-2xl relative">
            <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-base)]/50 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] rounded-t-3xl">
                Rear Orientation
            </div>
            <div className="flex-1 p-6 opacity-90">
                <RackElevation rack={rack} catalog={deviceCatalog} health={healthData?.state} nodesData={healthData?.nodes} isRearView={true} />
            </div>
        </div>

      </div>
    </div>
  );
};

/**
 * Visual card for Infrastructure components (HMC, PMC, RMC)
 */
const InfraComponentCard = ({ component }: { component: InfrastructureComponent }) => {
    let Icon = ShieldCheck;
    let accentColor = "border-gray-700 text-gray-400";
    
    if (component.type === 'power') { Icon = Zap; accentColor = "border-yellow-500/30 text-yellow-500/70"; }
    if (component.type === 'cooling') { Icon = Thermometer; accentColor = "border-blue-500/30 text-blue-500/70"; }
    if (component.type === 'management') { Icon = Activity; accentColor = "border-purple-500/30 text-purple-500/70"; }

    return (
        <div className={`p-3 bg-white/5 border rounded-lg ${accentColor} flex flex-col gap-2 hover:bg-white/10 transition-colors cursor-help group`}>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">{component.name}</span>
                </div>
                {component.role && (
                    <span className="text-[8px] px-1 bg-black/40 rounded text-gray-500 uppercase">{component.role}</span>
                )}
            </div>
            <div className="flex justify-between items-end">
                <div className="text-[9px] font-mono text-gray-500">
                    {component.location === 'u-mount' ? `U${component.u_position}` : 'Zero-U'}
                </div>
                <div className="text-[8px] font-mono text-gray-600 truncate max-w-[80px]">
                    {component.model}
                </div>
            </div>
            {/* Minimalist Health Bar for the component */}
            <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden mt-1">
                <div className="h-full w-full bg-status-ok opacity-50 group-hover:opacity-100 transition-opacity"></div>
            </div>
        </div>
    );
};