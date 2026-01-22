import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import type { RoomSummary, AisleSummary, RackSummary } from '../types';
import { LayoutDashboard, Database, Server, ChevronRight, ChevronDown, Activity, Map } from 'lucide-react';

export const Sidebar = () => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  
  useEffect(() => {
    api.getRooms().then(setRooms).catch(console.error);
  }, []);

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
        <div className="px-4 mb-6">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Main</h2>
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </Link>
        </div>

        <div className="px-4">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Topology</h2>
          <div className="space-y-4">
            {rooms.map(room => (
              <RoomTreeItem key={room.id} room={room} />
            ))}
          </div>
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
  const isOpen = roomId === room.id; // Auto-open if active

  return (
    <div>
      <Link 
        to={`/room/${room.id}`}
        className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors mb-1 group ${
          isOpen ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-gray-300 hover:bg-white/5 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 opacity-70" />
          <span className="font-bold">{room.name}</span>
        </div>
      </Link>
      
      {/* Aisles Tree */}
      <div className="pl-3 space-y-1 relative">
        <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-white/5"></div>
        {room.aisles?.map(aisle => (
          <AisleTreeItem key={aisle.id} aisle={aisle} roomId={room.id} />
        ))}
      </div>
    </div>
  );
};

const AisleTreeItem = ({ aisle, roomId }: { aisle: AisleSummary, roomId: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="relative pl-4">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left py-1 text-xs text-gray-500 hover:text-gray-300 transition-colors group"
      >
        <div className="w-2 h-[1px] bg-white/10 absolute left-0 top-1/2"></div>
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span className="uppercase tracking-wider font-mono text-[10px]">{aisle.name}</span>
      </button>

      {isExpanded && (
        <div className="pl-4 border-l border-white/5 ml-1.5 mt-1 space-y-1">
          {aisle.racks.map(rack => (
            <Link 
              key={rack.id}
              to={`/room/${roomId}?rack=${rack.id}`} // We'll handle query param selection later or direct link
              className="flex items-center gap-2 py-1 text-xs text-gray-400 hover:text-blue-400 transition-colors block"
            >
              <Server className="w-3 h-3 opacity-50" />
              <span>{rack.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};