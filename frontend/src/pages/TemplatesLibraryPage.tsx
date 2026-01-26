import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { DeviceTemplate, RackTemplate } from '../types';

export const TemplatesLibraryPage = () => {
  const [devices, setDevices] = useState<DeviceTemplate[]>([]);
  const [racks, setRacks] = useState<RackTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ kind: 'device' | 'rack'; id: string } | null>(null);

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

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (value?: string) => (value || '').toLowerCase().includes(normalizedQuery);

  const filteredRacks = useMemo(() => {
    if (!normalizedQuery) return racks;
    return racks.filter((rack) => matchesQuery(rack.name) || matchesQuery(rack.id));
  }, [normalizedQuery, racks]);

  const groupedDevices = useMemo(() => {
    const grouped = devices.reduce((acc, device) => {
      const type = (device.type || 'other').toLowerCase();
      if (!acc[type]) acc[type] = [];
      acc[type].push(device);
      return acc;
    }, {} as Record<string, DeviceTemplate[]>);

    if (!normalizedQuery) return grouped;
    const filtered: Record<string, DeviceTemplate[]> = {};
    Object.entries(grouped).forEach(([type, items]) => {
      const matching = items.filter((device) => matchesQuery(device.name) || matchesQuery(device.id) || matchesQuery(device.type));
      if (matching.length > 0) {
        filtered[type] = matching;
      }
    });
    return filtered;
  }, [devices, normalizedQuery]);

  const selectedTemplate = useMemo(() => {
    if (!selected) return null;
    if (selected.kind === 'rack') {
      return racks.find((rack) => rack.id === selected.id) || null;
    }
    return devices.find((device) => device.id === selected.id) || null;
  }, [selected, racks, devices]);

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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-6">
        <section className="bg-rack-panel border border-rack-border rounded-3xl p-6 space-y-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Library</div>
            <h2 className="text-lg font-bold uppercase tracking-[0.2em]">Templates</h2>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name / type / id"
            className="w-full h-10 rounded-xl bg-black/30 border border-[var(--color-border)] px-4 text-[12px] text-gray-200 placeholder:text-gray-500"
          />
          <div className="space-y-4 text-[12px] font-mono text-gray-300">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">Rack</div>
              <div className="mt-2 space-y-1">
                {filteredRacks.map((rack) => (
                  <button
                    key={rack.id}
                    type="button"
                    onClick={() => setSelected({ kind: 'rack', id: rack.id })}
                    className={`w-full text-left px-3 py-2 rounded-lg border ${
                      selected?.id === rack.id && selected.kind === 'rack'
                        ? 'border-[var(--color-accent)]/30 text-[var(--color-accent)] bg-[var(--color-accent)]/10'
                        : 'border-white/5 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {rack.name}
                  </button>
                ))}
                {filteredRacks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-[10px] uppercase tracking-widest text-gray-500">
                    No rack templates
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">Device Templates</div>
              <div className="mt-2 space-y-3">
                {Object.entries(groupedDevices).map(([type, items]) => (
                  <div key={type}>
                    <div className="text-[10px] uppercase tracking-widest text-gray-500">{type}</div>
                    <div className="mt-1 space-y-1">
                      {items.map((device) => (
                        <button
                          key={device.id}
                          type="button"
                          onClick={() => setSelected({ kind: 'device', id: device.id })}
                          className={`w-full text-left px-3 py-2 rounded-lg border ${
                            selected?.id === device.id && selected.kind === 'device'
                              ? 'border-[var(--color-accent)]/30 text-[var(--color-accent)] bg-[var(--color-accent)]/10'
                              : 'border-white/5 text-gray-300 hover:bg-white/5'
                          }`}
                        >
                          {device.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(groupedDevices).length === 0 && (
                  <div className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-[10px] uppercase tracking-widest text-gray-500">
                    No device templates
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-rack-panel border border-rack-border rounded-3xl p-6 space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Details</div>
          {selectedTemplate ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-black text-white">{selectedTemplate.name}</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                    {selectedTemplate.id}
                  </div>
                </div>
                {selected?.kind === 'device' ? (
                  <Link
                    to={`/templates/editor?id=${selectedTemplate.id}`}
                    className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-[var(--color-border)] text-gray-400 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-colors"
                  >
                    Edit
                  </Link>
                ) : (
                  <Link
                    to={`/templates/editor/racks?id=${selectedTemplate.id}`}
                    className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-[var(--color-border)] text-gray-400 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]/40 transition-colors"
                  >
                    Edit
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Type</div>
                  <div className="text-sm text-gray-200">{(selectedTemplate as any).type || 'rack'}</div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">U Height</div>
                  <div className="text-sm text-gray-200">{(selectedTemplate as any).u_height}U</div>
                </div>
                {selected?.kind === 'device' ? (
                  <>
                    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Layout</div>
                      <div className="text-sm text-gray-200">
                        {(selectedTemplate as any).layout?.rows}x{(selectedTemplate as any).layout?.cols}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Rear</div>
                      <div className="text-sm text-gray-200">
                        {(selectedTemplate as any).rear_layout ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Front Components</div>
                      <div className="text-sm text-gray-200">
                        {(selectedTemplate as any).infrastructure?.front_components?.length || 0}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                      <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">Rear Components</div>
                      <div className="text-sm text-gray-200">
                        {(selectedTemplate as any).infrastructure?.rear_components?.length || 0}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-[11px] font-mono uppercase tracking-widest text-gray-500">
              Select a template to view details
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
