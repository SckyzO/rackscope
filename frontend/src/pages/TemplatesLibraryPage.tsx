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

  const filteredRacks = useMemo(() => {
    if (!normalizedQuery) return racks;
    return racks.filter((rack) => {
      const name = rack.name || '';
      const id = rack.id || '';
      return (
        name.toLowerCase().includes(normalizedQuery) || id.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [normalizedQuery, racks]);

  const groupedDevices = useMemo(() => {
    const grouped = devices.reduce(
      (acc, device) => {
        const type = (device.type || 'other').toLowerCase();
        if (!acc[type]) acc[type] = [];
        acc[type].push(device);
        return acc;
      },
      {} as Record<string, DeviceTemplate[]>
    );

    if (!normalizedQuery) return grouped;
    const filtered: Record<string, DeviceTemplate[]> = {};
    Object.entries(grouped).forEach(([type, items]) => {
      const matching = items.filter((device) => {
        const name = device.name || '';
        const id = device.id || '';
        const deviceType = device.type || '';
        return (
          name.toLowerCase().includes(normalizedQuery) ||
          id.toLowerCase().includes(normalizedQuery) ||
          deviceType.toLowerCase().includes(normalizedQuery)
        );
      });
      if (matching.length > 0) {
        filtered[type] = matching;
      }
    });
    return filtered;
  }, [devices, normalizedQuery]);

  const selectedRack = useMemo(() => {
    if (!selected || selected.kind !== 'rack') return null;
    return racks.find((rack) => rack.id === selected.id) || null;
  }, [selected, racks]);

  const selectedDevice = useMemo(() => {
    if (!selected || selected.kind !== 'device') return null;
    return devices.find((device) => device.id === selected.id) || null;
  }, [selected, devices]);

  const selectedTemplate = selectedDevice ?? selectedRack;

  if (loading) {
    return (
      <div className="animate-pulse p-10 font-mono text-blue-500">LDR :: LOADING_TEMPLATES...</div>
    );
  }

  return (
    <div className="custom-scrollbar h-full overflow-y-auto p-10">
      <header className="mb-8">
        <div className="font-mono text-[10px] tracking-[0.45em] text-gray-500 uppercase">
          Templates
        </div>
        <h1 className="text-3xl font-black tracking-tight uppercase">Library</h1>
        <div className="mt-2 font-mono text-[11px] tracking-[0.2em] text-gray-500 uppercase">
          {devices.length} devices / {racks.length} racks
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section className="bg-rack-panel border-rack-border space-y-4 rounded-3xl border p-6">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">
              Library
            </div>
            <h2 className="text-lg font-bold tracking-[0.2em] uppercase">Templates</h2>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name / type / id"
            className="h-10 w-full rounded-xl border border-[var(--color-border)] bg-black/30 px-4 text-[12px] text-gray-200 placeholder:text-gray-500"
          />
          <div className="space-y-4 font-mono text-[12px] text-gray-300">
            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                Rack
              </div>
              <div className="mt-2 space-y-1">
                {filteredRacks.map((rack) => (
                  <button
                    key={rack.id}
                    type="button"
                    onClick={() => setSelected({ kind: 'rack', id: rack.id })}
                    className={`w-full rounded-lg border px-3 py-2 text-left ${
                      selected?.id === rack.id && selected.kind === 'rack'
                        ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                        : 'border-white/5 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {rack.name}
                  </button>
                ))}
                {filteredRacks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-[10px] tracking-widest text-gray-500 uppercase">
                    No rack templates
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
                Device Templates
              </div>
              <div className="mt-2 space-y-3">
                {Object.entries(groupedDevices).map(([type, items]) => (
                  <div key={type}>
                    <div className="text-[10px] tracking-widest text-gray-500 uppercase">
                      {type}
                    </div>
                    <div className="mt-1 space-y-1">
                      {items.map((device) => (
                        <button
                          key={device.id}
                          type="button"
                          onClick={() => setSelected({ kind: 'device', id: device.id })}
                          className={`w-full rounded-lg border px-3 py-2 text-left ${
                            selected?.id === device.id && selected.kind === 'device'
                              ? 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
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
                  <div className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-[10px] tracking-widest text-gray-500 uppercase">
                    No device templates
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-rack-panel border-rack-border space-y-4 rounded-3xl border p-6">
          <div className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">
            Details
          </div>
          {selectedTemplate ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-black text-[var(--color-text-primary)]">{selectedTemplate.name}</div>
                  <div className="font-mono text-[10px] tracking-widest text-gray-500 uppercase">
                    {selectedTemplate.id}
                  </div>
                </div>
                {selected?.kind === 'device' ? (
                  <Link
                    to={`/templates/editor?id=${selectedTemplate.id}`}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-[10px] font-bold tracking-widest text-gray-400 uppercase transition-colors hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
                  >
                    Edit
                  </Link>
                ) : (
                  <Link
                    to={`/templates/editor/racks?id=${selectedTemplate.id}`}
                    className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-[10px] font-bold tracking-widest text-gray-400 uppercase transition-colors hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
                  >
                    Edit
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                  <div className="font-mono text-[10px] tracking-widest text-gray-500 uppercase">
                    Type
                  </div>
                  <div className="text-sm text-gray-200">
                    {selected?.kind === 'device' ? selectedDevice?.type || 'device' : 'rack'}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                  <div className="font-mono text-[10px] tracking-widest text-gray-500 uppercase">
                    U Height
                  </div>
                  <div className="text-sm text-gray-200">{selectedTemplate?.u_height}U</div>
                </div>
                {selected?.kind === 'device' ? (
                  <>
                    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                      <div className="font-mono text-[10px] tracking-widest text-gray-500 uppercase">
                        Layout
                      </div>
                      <div className="text-sm text-gray-200">
                        {selectedDevice?.layout?.rows}x{selectedDevice?.layout?.cols}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                      <div className="font-mono text-[10px] tracking-widest text-gray-500 uppercase">
                        Rear
                      </div>
                      <div className="text-sm text-gray-200">
                        {selectedDevice?.rear_layout ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                      <div className="font-mono text-[10px] tracking-widest text-gray-500 uppercase">
                        Front Components
                      </div>
                      <div className="text-sm text-gray-200">
                        {selectedRack?.infrastructure?.front_components?.length || 0}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                      <div className="font-mono text-[10px] tracking-widest text-gray-500 uppercase">
                        Rear Components
                      </div>
                      <div className="text-sm text-gray-200">
                        {selectedRack?.infrastructure?.rear_components?.length || 0}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center font-mono text-[11px] tracking-widest text-gray-500 uppercase">
              Select a template to view details
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
