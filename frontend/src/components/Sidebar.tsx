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
    Promise.all([
        api.getRooms(),
        api.getCatalog()
    ]).then(([roomsData, catalogData]) => {
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
    <div className="w-64 h-screen bg-[#0f0f0f] border-r border-rack-border flex flex-col overflow-hidden shrink-0">
      <div className="p-6 border-b border-rack-border bg-black/20">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5 text-blue-500" />
          <h1 className="text-xl font-bold tracking-tight text-white">
            RACK<span className="text-blue-500">SCOPE</span>
          </h1>
        </div>
        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Physical Infrastructure</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        {/* Navigation Section */}
        <div className="px-4 mb-6">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Main</h2>
          <div className="space-y-1">
            <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                <LayoutDashboard className="w-4 h-4 opacity-70" />
                Overview
            </Link>
            <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                <Settings className="w-4 h-4 opacity-70" />
                Settings
            </Link>
          </div>
        </div>

        {/* Topology Section */}
        <div className="px-4 mb-6">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Topology</h2>
          <div className="space-y-1">
            {rooms.map(room => (
              <RoomTreeItem key={room.id} room={room} />
            ))}
          </div>
        </div>

        {/* Library Section */}
        <div className="px-4 border-t border-white/5 pt-4">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4 px-2 italic text-gray-600">Gabarit Library</h2>
          
          <div className="space-y-2">
             {Object.entries(groupedDevices).map(([type, templates]) => (
                 <div key={type} className="space-y-1">
                    <button 
                        onClick={() => toggleCategory(type)}
                        className="w-full px-2 py-1.5 text-[10px] font-bold text-blue-500/50 hover:text-blue-400 uppercase flex items-center justify-between group transition-colors rounded hover:bg-white/5"
                    >
                        <div className="flex items-center gap-2">
                            <Folder className={`w-3 h-3 ${expandedCategories[type] ? 'text-blue-400' : ''}`} /> 
                            {type}s
                        </div>
                        {expandedCategories[type] ? <ChevronDown className="w-3 h-3 opacity-50" /> : <ChevronRight className="w-3 h-3 opacity-50" />}
                    </button>
                    
                    {expandedCategories[type] && (
                        <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
                            {templates.map(t => (
                                <div key={t.id} className="px-6 py-1 text-[10px] text-gray-500 hover:text-white truncate cursor-help border-l border-white/5 ml-3" title={t.name}>
                                    {t.name}
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
             ))}
          </div>

          {rackTemplates.length > 0 && (
            <div className="space-y-1 mt-2">
                <button 
                    onClick={() => toggleCategory('racks')}
                    className="w-full px-2 py-1.5 text-[10px] font-bold text-purple-500/50 hover:text-purple-400 uppercase flex items-center justify-between group transition-colors rounded hover:bg-white/5"
                >
                    <div className="flex items-center gap-2">
                        <Server className={`w-3 h-3 ${expandedCategories['racks'] ? 'text-purple-400' : ''}`} /> 
                        Racks
                    </div>
                    {expandedCategories['racks'] ? <ChevronDown className="w-3 h-3 opacity-50" /> : <ChevronRight className="w-3 h-3 opacity-50" />}
                </button>
                
                {expandedCategories['racks'] && (
                    <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
                        {rackTemplates.map(t => (
                            <div key={t.id} className="px-6 py-1 text-[10px] text-gray-500 hover:text-white truncate cursor-help border-l border-white/5 ml-3" title={t.name}>
                                {t.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>
          )}
        </div>
      </nav>

      <div className="p-4 border-t border-rack-border bg-black/20">
        <div className="flex items-center gap-3 px-2">
          <div className="w-2 h-2 rounded-full bg-status-ok animate-pulse shadow-[0_0_8px_var(--color-status-ok)]"></div>
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-tighter">System Live</span>
        </div>
      </div>
    </div>
  );
};

const RoomTreeItem = ({ room }: { room: RoomSummary }) => {
  const { roomId } = useParams();
  // Expanded by default for Phase 3 exploration
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between group">
          <Link 
            to={`/room/${room.id}`}
            className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              roomId === room.id ? 'text-white font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Map className={`w-3 h-3 ${roomId === room.id ? 'text-blue-500' : 'opacity-50'}`} />
            <span className="truncate">{room.name}</span>
          </Link>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-white/5 rounded text-gray-500 hover:text-white"
          >
             {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
      </div>
      
      {isExpanded && (
        <div className="pl-3 space-y-1 relative">
          <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-white/5"></div>
          {room.aisles?.map(aisle => (
            <AisleTreeItem key={aisle.id} aisle={aisle} roomId={room.id} />
          ))}
        </div>
      )}
    </div>
  );
};

const AisleTreeItem = ({ aisle, roomId }: { aisle: AisleSummary, roomId: string }) => {
  // Collapsed by default to hide rack list
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="relative pl-4">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-2 py-1 text-[10px] font-bold text-gray-500 hover:text-gray-300 uppercase flex items-center justify-between group transition-colors rounded hover:bg-white/5"
      >
        <span className="tracking-wider">{aisle.name}</span>
        {isExpanded ? <ChevronDown className="w-3 h-3 opacity-50" /> : <ChevronRight className="w-3 h-3 opacity-50" />}
      </button>

      {isExpanded && (
        <div className="pl-3 border-l border-white/5 ml-3 mt-1 space-y-1">
          {aisle.racks.map(rack => (
            <Link 
              key={rack.id}
              to={`/rack/${rack.id}`} 
              className="flex items-center gap-2 py-1 px-2 text-xs text-gray-500 hover:text-blue-400 hover:bg-white/5 rounded transition-colors block group/rack"
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
