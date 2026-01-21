import { ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { RoomPage } from './pages/RoomPage';

// Layout global
const Layout = ({ children }: { children: ReactNode }) => (
  <div className="flex h-screen bg-rack-dark text-gray-100 overflow-hidden font-sans">
    <Sidebar />
    <main className="flex-1 overflow-hidden relative bg-[#0a0a0a]">
      {/* Background technique subtil */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      
      {children}
    </main>
  </div>
);

import { useState, useEffect } from 'react';
import { api } from './services/api';
import type { RoomSummary } from './types';

// Dashboard avec data réelles
const Dashboard = () => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  
  useEffect(() => {
    api.getRooms().then(setRooms).catch(console.error);
  }, []);

  return (
    <div className="p-12 flex flex-col items-center justify-center h-full text-center">
      <div className="bg-gradient-to-tr from-blue-500/20 to-purple-500/20 p-1 rounded-full mb-8">
        <div className="bg-[#0a0a0a] rounded-full p-8 border border-white/5 shadow-[0_0_50px_rgba(59,130,246,0.1)]">
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2 italic">RACK<span className="text-blue-500">SCOPE</span></h1>
          <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.4em]">Infrastructure Intelligence</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-8 mb-12 w-full max-w-lg">
        <div className="p-6 bg-white/5 border border-white/5 rounded-xl text-left group hover:border-blue-500/30 transition-colors">
          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Managed Rooms</div>
          <div className="text-4xl font-mono text-white">{rooms.length}</div>
        </div>
        <div className="p-6 bg-white/5 border border-white/5 rounded-xl text-left group hover:border-status-ok/30 transition-colors">
          <div className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mb-1">Global Health</div>
          <div className="text-4xl font-mono text-status-ok">100%</div>
        </div>
      </div>

      <p className="text-gray-400 max-w-md text-lg leading-relaxed">
        Select a <span className="text-blue-400 font-bold border-b border-blue-400/30">Room</span> in the left sidebar to begin physical inspection.
      </p>
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
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
