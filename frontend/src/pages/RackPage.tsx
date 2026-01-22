import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Rack } from '../types';
import { ChevronLeft, Maximize2, Server } from 'lucide-react';

export const RackPage = () => {
  const { rackId } = useParams<{ rackId: string }>();
  const [rack, setRack] = useState<Rack | null>(null); // We need a direct getRack endpoint later
  // For now we rely on room context or stub, but Phase 3 implies a direct GET /api/racks/{id} which we don't have fully detailed yet (only state).
  
  return (
    <div className="h-full flex flex-col p-8">
      <header className="mb-8">
        <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-2 text-sm font-mono uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4" /> Back to Map
        </Link>
        <h1 className="text-4xl font-black text-white tracking-tighter uppercase flex items-center gap-4">
          <Server className="w-8 h-8 text-blue-500" />
          {rackId}
        </h1>
      </header>

      <div className="flex-1 border border-dashed border-gray-800 rounded-xl flex items-center justify-center bg-black/20">
        <div className="text-center text-gray-500">
          <Maximize2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Detailed Rack Inspection View</h2>
          <p className="font-mono text-sm">Under Construction (Phase 3)</p>
          <p className="text-xs mt-2 opacity-50">Will display Front/Rear views and detailed PDU metrics.</p>
        </div>
      </div>
    </div>
  );
};
