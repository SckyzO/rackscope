import { ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { RoomPage } from './pages/RoomPage';
import { RackPage } from './pages/RackPage';
import { SettingsPage } from './pages/SettingsPage';

// Layout global
const Layout = ({ children }: { children: ReactNode }) => (
  <div className="flex h-screen bg-rack-dark text-gray-100 overflow-hidden font-sans">
    <Sidebar />
    <main className="flex-1 overflow-hidden relative bg-[var(--color-bg-base)] text-[var(--color-text-base)]">
      {/* Background technique subtil */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
      
      {children}
    </main>
  </div>
);

const Dashboard = () => (
  <div className="p-12 flex flex-col items-center justify-center h-full text-center">
    <div className="bg-gradient-to-tr from-[var(--color-accent)] to-purple-500/20 p-1 rounded-full mb-8">
      <div className="bg-[var(--color-bg-panel)] rounded-full p-8 border border-[var(--color-border)] shadow-[0_0_50px_rgba(59,130,246,0.1)]">
        <h1 className="text-5xl font-black text-[var(--color-text-base)] tracking-tighter mb-2 italic">RACK<span className="text-[var(--color-accent)]">SCOPE</span></h1>
        <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.4em]">Infrastructure Intelligence</p>
      </div>
    </div>
    <p className="text-gray-400 max-w-md text-lg leading-relaxed">
      Select a <span className="text-[var(--color-accent)] font-bold border-b border-current">Room</span> in the left sidebar to begin physical inspection.
    </p>
  </div>
);

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