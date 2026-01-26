import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { RackTemplate, RoomSummary, AisleSummary } from '../types';

type RoomOption = { id: string; name: string; aisles: AisleSummary[] };

export const TopologyEditorPage = () => {
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [rackTemplates, setRackTemplates] = useState<RackTemplate[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedAisleId, setSelectedAisleId] = useState('');
  const [orderedRackIds, setOrderedRackIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.getRooms(), api.getCatalog()])
      .then(([roomsData, catalog]) => {
        if (!active) return;
        setRooms(Array.isArray(roomsData) ? roomsData : []);
        setRackTemplates(catalog.rack_templates || []);
      })
      .catch((err) => setError(err?.message || 'Failed to load topology'));
    return () => {
      active = false;
    };
  }, []);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || null;
  const aisles = selectedRoom?.aisles || [];
  const selectedAisle = aisles.find((aisle) => aisle.id === selectedAisleId) || null;

  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (aisles.length === 0) {
      setSelectedAisleId('');
      return;
    }
    if (!selectedAisleId || !aisles.find((aisle) => aisle.id === selectedAisleId)) {
      setSelectedAisleId(aisles[0].id);
    }
  }, [aisles, selectedAisleId]);

  useEffect(() => {
    if (!selectedAisle) {
      setOrderedRackIds([]);
      return;
    }
    setOrderedRackIds(selectedAisle.racks.map((rack) => rack.id));
  }, [selectedAisle]);

  const rackById = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    rooms.forEach((room) => {
      room.aisles.forEach((aisle) => {
        aisle.racks.forEach((rack) => {
          map.set(rack.id, rack);
        });
      });
    });
    return map;
  }, [rooms]);

  const handleDrop = async (targetId: string, draggedId?: string | null) => {
    const activeId = draggedId || draggingId;
    if (!activeId || activeId === targetId) return;
    const next = [...orderedRackIds];
    const from = next.indexOf(activeId);
    const to = next.indexOf(targetId);
    if (from === -1 || to === -1) return;
    next.splice(from, 1);
    next.splice(to, 0, activeId);
    setOrderedRackIds(next);
    setStatus('saving');
    try {
      await api.updateAisleRacks(selectedAisleId, selectedRoomId, next);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Failed to save order');
    } finally {
      setDraggingId(null);
    }
  };

  const handleTemplateChange = async (rackId: string, templateId: string) => {
    setStatus('saving');
    setError(null);
    try {
      await api.updateRackTemplate(rackId, templateId || null);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Failed to update rack template');
    }
  };

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.45em] text-gray-500">Topology</div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Editor</h1>
          <div className="mt-2 text-[11px] font-mono uppercase tracking-[0.2em] text-gray-500">
            Drag racks + assign templates
          </div>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
          {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : status === 'error' ? 'Error' : ''}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
        <section className="bg-rack-panel border border-rack-border rounded-3xl p-6 space-y-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Room</div>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="mt-2 w-full rounded-xl bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Aisle</div>
            <select
              value={selectedAisleId}
              onChange={(e) => setSelectedAisleId(e.target.value)}
              className="mt-2 w-full rounded-xl bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
            >
              {aisles.map((aisle) => (
                <option key={aisle.id} value={aisle.id}>
                  {aisle.name}
                </option>
              ))}
            </select>
          </div>
          {error && <div className="text-[11px] text-status-crit">{error}</div>}
        </section>

        <section className="bg-rack-panel border border-rack-border rounded-3xl p-6 space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Racks</div>
          <div className="space-y-2">
            {orderedRackIds.map((rackId) => {
              const rack = rackById.get(rackId);
              return (
                <div
                  key={rackId}
                  draggable
                  onDragStart={(e) => {
                    setDraggingId(rackId);
                    e.dataTransfer.setData('text/plain', rackId);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dragged = e.dataTransfer.getData('text/plain');
                    handleDrop(rackId, dragged || null);
                  }}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-200">{rack?.name || rackId}</div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-gray-500">{rackId}</div>
                  </div>
                  <select
                    defaultValue=""
                    onChange={(e) => handleTemplateChange(rackId, e.target.value)}
                    className="rounded-lg bg-black/30 border border-[var(--color-border)] px-2 py-1 text-[11px] text-gray-200"
                  >
                    <option value="">No template</option>
                    {rackTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
            {orderedRackIds.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-[11px] font-mono uppercase tracking-widest text-gray-500">
                No racks in this aisle
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
