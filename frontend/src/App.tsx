import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { RoomPage } from './pages/RoomPage';
import { RackPage } from './pages/RackPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import type { RoomSummary } from './types';
import { Activity, Zap, Thermometer, AlertTriangle, Map as MapIcon, ArrowUpRight } from 'lucide-react';

// Layout global
const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-screen bg-rack-dark text-gray-100 overflow-hidden font-sans">
    <Sidebar />
    <main className="flex-1 overflow-hidden relative bg-[var(--color-bg-base)] text-[var(--color-text-base)]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      {children}
    </main>
  </div>
);

/**
 * Dashboard Component (Overview)
 * 
 * Central monitoring hub providing a high-level view of the entire infrastructure.
 */
const Dashboard = () => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [roomStates, setRoomStates] = useState<Record<string, any>>({});
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsData, stats] = await Promise.all([
            api.getRooms(),
            api.getGlobalStats()
        ]);
        setRooms(roomsData);
        setGlobalStats(stats);
        
        const states: Record<string, any> = {};
        await Promise.all(roomsData.map(async (r) => {
            try {
                const s = await api.getRoomState(r.id);
                states[r.id] = s;
            } catch (e) {
                states[r.id] = { state: 'UNKNOWN' };
            }
        }));
        setRoomStates(states);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000); // 1 minute refresh
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-12 font-mono animate-pulse text-blue-500">LDR :: AGGREGATING_GLOBAL_METRICS...</div>;

  return (
    <div className="p-12 h-full overflow-y-auto custom-scrollbar">
      <header className="mb-12">
        <h1 className="text-5xl font-black tracking-tighter mb-2 uppercase italic text-[var(--color-accent-primary)]">Overview</h1>
        <p className="text-gray-500 font-mono text-sm uppercase tracking-[0.3em]">Global Infrastructure Status</p>
      </header>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-rack-panel border border-rack-border p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-2 text-gray-500">
                <Zap className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Global Status</span>
            </div>
            <div className={`text-3xl font-black font-mono ${globalStats?.status === 'CRIT' ? 'text-status-crit' : globalStats?.status === 'WARN' ? 'text-status-warn' : 'text-status-ok'}`}>
                {globalStats?.status === 'CRIT' ? 'CRITICAL' : globalStats?.status === 'WARN' ? 'WARNING' : 'OPTIMAL'}
            </div>
        </div>
        <div className="bg-rack-panel border border-rack-border p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-2 text-gray-500">
                <AlertTriangle className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Active Alerts</span>
            </div>
            <div className={`text-3xl font-black font-mono ${globalStats?.active_alerts > 0 ? 'text-status-warn' : 'text-white'}`}>
                {globalStats?.active_alerts || 0}
            </div>
        </div>
        <div className="bg-rack-panel border border-rack-border p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-2 text-gray-500">
                <MapIcon className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Managed Racks</span>
            </div>
            <div className="text-3xl font-black font-mono text-white">{globalStats?.total_racks || 0}</div>
        </div>
        <div className="bg-rack-panel border border-rack-border p-6 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-2 text-gray-500">
                <Activity className="w-4 h-4" /> <span className="text-[10px] font-bold uppercase tracking-widest">Telemetry Pulse</span>
            </div>
            <div className="text-3xl font-black font-mono text-status-ok animate-pulse">LIVE</div>
        </div>
      </div>

      {/* Room Grid */}
      <h2 className="text-xs font-bold text-gray-600 uppercase tracking-[0.4em] mb-6 border-b border-white/5 pb-2">Datacenter Locations</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {rooms.map(room => (
            <Link 
                key={room.id} 
                to={`/room/${room.id}`}
                className="group relative bg-rack-panel border border-rack-border rounded-3xl p-8 hover:border-[var(--color-accent-primary)] transition-all hover:shadow-[0_0_40px_rgba(59,130,246,0.05)] overflow-hidden"
            >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                    <MapIcon className="w-24 h-24 -rotate-12" />
                </div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-2xl font-black text-white uppercase group-hover:text-[var(--color-accent-primary)] transition-colors">{room.name}</h3>
                            <p className="text-[10px] font-mono text-gray-500 uppercase mt-1 tracking-widest">Site ID: {room.site_id}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                            roomStates[room.id]?.state === 'OK' ? 'bg-status-ok/10 text-status-ok border-status-ok/20' :
                            roomStates[room.id]?.state === 'CRIT' ? 'bg-status-crit/10 text-status-crit border-status-crit/20 animate-pulse' :
                            'bg-status-warn/10 text-status-warn border-status-warn/20'
                        }`}>
                            {roomStates[room.id]?.state || 'UNKNOWN'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-12">
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-gray-600 uppercase font-bold tracking-tighter">Inventory</span>
                            <span className="text-xl font-mono text-gray-300">{room.aisles?.length || 0} Aisles</span>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                            <span className="text-[9px] text-gray-600 uppercase font-bold tracking-tighter">Inspection</span>
                            <div className="flex items-center gap-1 text-[var(--color-accent-primary)] font-bold text-xs uppercase">
                                Open Map <ArrowUpRight className="w-3 h-3" />
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
        ))}
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
           <Route path="/" element={<Dashboard />} />
           <Route path="/room/:roomId" element={<RoomPage />} />
           <Route path="/rack/:rackId" element={<RackPage />} />
           <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
