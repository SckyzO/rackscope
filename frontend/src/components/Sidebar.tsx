import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { RoomSummary, AisleSummary, DeviceTemplate } from '../types';
import { LayoutDashboard, Server, ChevronRight, ChevronDown, Activity, Map, Component, Box, Folder, Settings } from 'lucide-react';

export const Sidebar = () => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [deviceTemplates, setDeviceTemplates] = useState<DeviceTemplate[]>([]);
  const [rackTemplates, setRackTemplates] = useState<any[]>([]); 
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([api.getRooms(), api.getCatalog()])
      .then(([roomsData, catalogData]) => {
        setRooms(roomsData);
        setDeviceTemplates(catalogData.device_templates || []);
        setRackTemplates(catalogData.rack_templates || []);
      }).catch(console.error);
  }, []);

  const groupedDevices = useMemo(() => {
    return deviceTemplates.reduce((acc, t) => {
      const type = t.type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(t);
      return acc;
    }, {} as Record<string, DeviceTemplate[]>);
  }, [deviceTemplates]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="w-64 h-screen bg-[var(--color-bg-panel)] border-r border-[var(--color-border)] flex flex-col overflow-hidden shrink-0 z-50">
      {/* Branding */}
      <div className="p-5 border-b border-[var(--color-border)] bg-[var(--color-bg-panel)]">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-1.5 rounded-lg bg-[var(--color-accent)] shadow-[0_0_10px_var(--color-accent)]/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-black tracking-tight text-[var(--color-text-base)] uppercase">
            RACK<span className="text-[var(--color-accent)]">SCOPE</span>
          </h1>
        </div>
        <p className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.3em] pl-10">Physical Intelligence</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 custom-scrollbar px-3">
        {/* Main Section */}
        <div className="mb-8">
          <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 px-3 opacity-70">Main Control</h2>
          <div className="space-y-1">
            <SidebarLink to="/" icon={LayoutDashboard} label="Overview" />
            <SidebarLink to="/settings" icon={Settings} label="Settings" />
          </div>
        </div>

        {/* Topology Section */}
        <div className="mb-8">
          <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 px-3 opacity-70">Topology</h2>
          <div className="space-y-1">
            {rooms.map(room => (
              <RoomTreeItem key={room.id} room={room} />
            ))}
          </div>
        </div>

        {/* Library Section */}
        <div className="border-t border-[var(--color-border)] pt-6 mt-6">
          <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 px-3 italic opacity-70">Library</h2>
          
          <div className="space-y-2">
             {Object.entries(groupedDevices).map(([type, templates]) => (
                 <div key={type} className="space-y-1">
                    <button 
                        onClick={() => toggleCategory(type)}
                        className="w-full px-3 py-2 text-[11px] font-bold text-gray-400 hover:text-[var(--color-accent)] uppercase flex items-center justify-between group transition-all rounded-lg hover:bg-[var(--color-accent)]/5"
                    >
                        <div className="flex items-center gap-2">
                            <Folder className={`w-3.5 h-3.5 ${expandedCategories[type] ? 'text-[var(--color-accent)]' : 'opacity-50'}`} /> 
                            {type}s
                        </div>
                        {expandedCategories[type] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    
                    {expandedCategories[type] && (
                        <div className="space-y-1 animate-in slide-in-from-top-1 duration-200 ml-4 border-l border-[var(--color-border)]">
                            {templates.map(t => (
                                <div key={t.id} className="px-6 py-1.5 text-[10px] text-gray-500 hover:text-[var(--color-text-base)] truncate cursor-help hover:bg-white/5 rounded-r-lg transition-colors" title={t.name}>
                                    {t.name}
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
             ))}
          </div>
        </div>
      </nav>

      {/* Footer Status */}
      <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-panel)]">
        <div className="flex items-center gap-3 px-2 py-1 rounded-full bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/10">
          <div className="w-2 h-2 rounded-full bg-status-ok animate-pulse shadow-[0_0_8px_var(--color-status-ok)]"></div>
          <span className="text-[9px] font-mono font-bold text-[var(--color-accent)] uppercase tracking-tighter">System Online</span>
        </div>
      </div>
    </div>
  );
};

const SidebarLink = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const { pathname } = useParams(); // Note: logic might vary based on how you handle active state
    const isActive = window.location.pathname === to;

    return (
        <Link 
            to={to} 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                ? 'bg-[var(--color-accent)] text-white shadow-lg shadow-[var(--color-accent)]/20' 
                : 'text-gray-400 hover:bg-[var(--color-accent)]/10 hover:text-[var(--color-accent)]'
            }`}
        >
            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'opacity-70'}`} />
            {label}
        </Link>
    );
};

const RoomTreeItem = ({ room }: { room: RoomSummary }) => {
  const { roomId } = useParams();
  const [isExpanded, setIsExpanded] = useState(true);
  const isActive = roomId === room.id;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 group">
          <Link 
            to={`/room/${room.id}`}
            className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
              isActive 
              ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20' 
              : 'text-gray-400 hover:text-[var(--color-text-base)]'
            }`}
          >
            <Map className={`w-4 h-4 ${isActive ? 'text-[var(--color-accent)]' : 'opacity-50'}`} />
            <span className="truncate uppercase tracking-tight">{room.name}</span>
          </Link>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-[var(--color-text-base)] transition-colors"
          >
             {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
      </div>
      
      {isExpanded && (
        <div className="pl-4 space-y-1 mt-1">
          {room.aisles?.map(aisle => (
            <AisleTreeItem key={aisle.id} aisle={aisle} roomId={room.id} />
          ))}
        </div>
      )}
    </div>
  );
};

const AisleTreeItem = ({ aisle, roomId }: { aisle: AisleSummary, roomId: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="relative">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-1.5 text-[10px] font-bold text-gray-500 hover:text-[var(--color-accent)] uppercase flex items-center justify-between group transition-all rounded-lg hover:bg-white/5"
      >
        <span className="tracking-[0.1em]">{aisle.name}</span>
        {isExpanded ? <ChevronDown className="w-3 h-3 opacity-50" /> : <ChevronRight className="w-3 h-3 opacity-50" />}
      </button>

      {isExpanded && (
        <div className="pl-3 border-l border-[var(--color-border)] ml-3 mt-1 space-y-0.5 animate-in slide-in-from-top-1 duration-200">
          {aisle.racks.map(rack => (
            <Link 
              key={rack.id}
              to={`/rack/${rack.id}`} 
              className="flex items-center gap-2 py-1.5 px-3 text-[11px] font-medium text-gray-500 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 rounded-lg transition-all block group/rack"
            >
              <Component className="w-3 h-3 opacity-30 group-hover/rack:opacity-100" />
              <span className="truncate">{rack.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
