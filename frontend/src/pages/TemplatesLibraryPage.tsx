import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { DeviceTemplate, RackTemplate } from '../types';

export const TemplatesLibraryPage = () => {
  const [devices, setDevices] = useState<DeviceTemplate[]>([]);
  const [racks, setRacks] = useState<RackTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const catalog = await api.getCatalog();
        if (!active) return;
        setDevices(catalog.device_templates || []);
        setRacks(catalog.rack_templates || []);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <div className="p-10 font-mono text-blue-500 animate-pulse">LDR :: LOADING_TEMPLATES...</div>;
  }

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <header className="mb-8">
        <div className="text-[10px] font-mono uppercase tracking-[0.45em] text-gray-500">Templates</div>
        <h1 className="text-3xl font-black tracking-tight uppercase">Library</h1>
        <div className="mt-2 text-[11px] font-mono uppercase tracking-[0.2em] text-gray-500">
          {devices.length} devices / {racks.length} racks
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section id="templates-devices" className="bg-rack-panel border border-rack-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Devices</div>
              <h2 className="text-lg font-bold uppercase tracking-[0.2em]">Device Templates</h2>
            </div>
          </div>
          <div className="space-y-2">
            {devices.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-gray-200">{t.name}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                    {t.id} · {t.type} · {t.u_height}U
                  </div>
                </div>
              </div>
            ))}
            {devices.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-[11px] font-mono uppercase tracking-widest text-gray-500">
                No device templates
              </div>
            )}
          </div>
        </section>

        <section id="templates-racks" className="bg-rack-panel border border-rack-border rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Racks</div>
              <h2 className="text-lg font-bold uppercase tracking-[0.2em]">Rack Templates</h2>
            </div>
          </div>
          <div className="space-y-2">
            {racks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-gray-200">{t.name}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                    {t.id} · {t.u_height}U
                  </div>
                </div>
              </div>
            ))}
            {racks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-[11px] font-mono uppercase tracking-widest text-gray-500">
                No rack templates
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
