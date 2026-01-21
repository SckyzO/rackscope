import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { RoomSummary } from '../types';
import { LayoutDashboard, Database, Server, ChevronRight, Activity } from 'lucide-react';

export const Sidebar = () => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const { roomId } = useParams();

  useEffect(() => {
    api.getRooms().then(setRooms).catch(console.error);
  }, []);

  return (
    <div className="w-64 h-screen bg-rack-panel border-r border-rack-border flex flex-col overflow-hidden">
      <div className="p-6 border-b border-rack-border">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5 text-blue-500" />
          <h1 className="text-xl font-bold tracking-tight text-white">
            RACK<span className="text-blue-500">SCOPE</span>
          </h1>
        </div>
        <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Physical Infrastructure</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-4">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Main</h2>
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </Link>
        </div>

        <div className="px-4">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 px-2">Sites & Rooms</h2>
          <div className="space-y-1">
            {rooms.map(room => (
              <Link
                key={room.id}
                to={`/room/${room.id}`}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  roomId === room.id 
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4" />
                  <span>{room.name}</span>
                </div>
                {roomId === room.id && <ChevronRight className="w-3 h-3" />}
              </Link>
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
