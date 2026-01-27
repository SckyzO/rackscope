import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import type { Device, DeviceTemplate, Rack, RoomSummary } from '../types';
import { Search, X } from 'lucide-react';

const SLOT_HEIGHT = 24;

type RackOption = { id: string; label: string };

type DragPayload = { kind: 'template'; templateId: string } | { kind: 'device'; deviceId: string };

const parseDragPayload = (data: string | undefined | null): DragPayload | null => {
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    if (parsed?.kind === 'template' && parsed.templateId) return parsed as DragPayload;
    if (parsed?.kind === 'device' && parsed.deviceId) return parsed as DragPayload;
    return null;
  } catch {
    return null;
  }
};

const buildRackOptions = (rooms: RoomSummary[]): RackOption[] => {
  const options: RackOption[] = [];
  rooms.forEach((room) => {
    (room.aisles || []).forEach((aisle) => {
      aisle.racks.forEach((rack) => {
        options.push({ id: rack.id, label: `${room.name} / ${aisle.name} / ${rack.name}` });
      });
    });
  });
  return options;
};

const normalizeInstance = (instance?: Record<number, string> | string) => {
  if (!instance) return undefined;
  return instance;
};

export const RackEditorPage = () => {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [deviceTemplates, setDeviceTemplates] = useState<DeviceTemplate[]>([]);
  const [selectedRackId, setSelectedRackId] = useState('');
  const [rack, setRack] = useState<Rack | null>(null);
  const [draftDevices, setDraftDevices] = useState<Device[]>([]);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragHoverU, setDragHoverU] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [pendingRackId, setPendingRackId] = useState<string | null>(null);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const rackContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.getRooms(), api.getCatalog()])
      .then(([roomsData, catalog]) => {
        if (!active) return;
        setRooms(Array.isArray(roomsData) ? roomsData : []);
        setDeviceTemplates(catalog.device_templates || []);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load data';
        setError(message);
      })
      .finally(() => setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const rackOptions = useMemo(() => buildRackOptions(rooms), [rooms]);

  useEffect(() => {
    if (!selectedRackId && rackOptions.length > 0) {
      setSelectedRackId(rackOptions[0].id);
    }
  }, [rackOptions, selectedRackId]);

  useEffect(() => {
    let active = true;
    if (!selectedRackId) return;
    setLoading(true);
    api
      .getRack(selectedRackId)
      .then((data) => {
        if (!active) return;
        setRack(data);
        setDraftDevices(data.devices || []);
        setDirty(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Failed to load rack';
        setError(message);
      })
      .finally(() => setLoading(false));
    return () => {
      active = false;
    };
  }, [selectedRackId]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const templateById = useMemo(
    () => new Map(deviceTemplates.map((t) => [t.id, t])),
    [deviceTemplates]
  );

  const occupiedMap = useMemo(() => {
    const occupied = new Map<number, string>();
    if (!rack) return occupied;
    draftDevices.forEach((device) => {
      const template = templateById.get(device.template_id);
      const height = template?.u_height || 1;
      for (let u = device.u_position; u < device.u_position + height; u += 1) {
        occupied.set(u, device.id);
      }
    });
    return occupied;
  }, [rack, draftDevices, templateById]);

  const filteredTemplates = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return deviceTemplates.filter((template) => {
      if (typeFilter !== 'all' && template.type !== typeFilter) return false;
      if (!needle) return true;
      return (
        template.name.toLowerCase().includes(needle) ||
        template.id.toLowerCase().includes(needle) ||
        template.type.toLowerCase().includes(needle)
      );
    });
  }, [deviceTemplates, search, typeFilter]);

  const templateTypes = useMemo(() => {
    const types = new Set(deviceTemplates.map((t) => t.type));
    return ['all', ...Array.from(types).sort()];
  }, [deviceTemplates]);

  const buildUniqueDeviceId = (base: string, uPos: number) => {
    if (!rack) return `${base}-${uPos}`;
    const existing = new Set(draftDevices.map((d) => d.id));
    let candidate = `${base}-${uPos}`;
    let idx = 2;
    while (existing.has(candidate)) {
      candidate = `${base}-${uPos}-${idx}`;
      idx += 1;
    }
    return candidate;
  };

  const canPlaceDevice = (uPos: number, height: number, ignoreId?: string) => {
    if (!rack) return false;
    if (uPos < 1 || uPos + height - 1 > rack.u_height) return false;
    for (let u = uPos; u < uPos + height; u += 1) {
      const owner = occupiedMap.get(u);
      if (owner && owner !== ignoreId) return false;
    }
    return true;
  };

  const handleDropOnU = (uPos: number, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const payload = parseDragPayload(event.dataTransfer.getData('application/rackscope'));
    setDragHoverU(null);
    if (!payload || !rack) return;

    if (payload.kind === 'template') {
      const template = templateById.get(payload.templateId);
      if (!template) return;
      const height = template.u_height || 1;
      if (!canPlaceDevice(uPos, height)) {
        setError('Collision detected');
        return;
      }
      setError(null);
      const newId = buildUniqueDeviceId(template.id, uPos);
      const nextDevice: Device = {
        id: newId,
        name: template.name,
        template_id: template.id,
        u_position: uPos,
        instance: normalizeInstance(undefined),
      };
      setDraftDevices((prev) => [...prev, nextDevice]);
      setDirty(true);
      return;
    }

    if (payload.kind === 'device') {
      const device = draftDevices.find((d) => d.id === payload.deviceId);
      if (!device) return;
      const template = templateById.get(device.template_id);
      const height = template?.u_height || 1;
      if (!canPlaceDevice(uPos, height, device.id)) {
        setError('Collision detected');
        return;
      }
      if (device.u_position === uPos) return;
      setError(null);
      setDraftDevices((prev) =>
        prev.map((d) => (d.id === device.id ? { ...d, u_position: uPos } : d))
      );
      setDirty(true);
    }
  };

  const handleDeleteDevice = (deviceId: string) => {
    setDraftDevices((prev) => prev.filter((d) => d.id !== deviceId));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!rack) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateRackDevices(rack.id, draftDevices);
      const refreshed = await api.getRack(rack.id);
      setRack(refreshed);
      setDraftDevices(refreshed.devices || []);
      setDirty(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const requestRackChange = (nextId: string) => {
    if (!dirty) {
      setSelectedRackId(nextId);
      return;
    }
    setPendingRackId(nextId);
    setShowUnsavedPrompt(true);
  };

  const confirmDiscardChanges = () => {
    setShowUnsavedPrompt(false);
    if (pendingRackId) {
      setSelectedRackId(pendingRackId);
    }
    setPendingRackId(null);
    setDirty(false);
  };

  const cancelDiscardChanges = () => {
    setShowUnsavedPrompt(false);
    setPendingRackId(null);
  };

  const renderSlotTargets = () => {
    if (!rack) return null;
    const slots = [];
    for (let u = 1; u <= rack.u_height; u += 1) {
      const isHover = dragHoverU === u;
      const bottom = (u - 1) * SLOT_HEIGHT;
      slots.push(
        <div
          key={u}
          onDragOver={(e) => {
            e.preventDefault();
            setDragHoverU(u);
          }}
          onDrop={(e) => handleDropOnU(u, e)}
          className={`absolute right-6 left-6 border-b border-white/10 ${isHover ? 'bg-blue-500/10' : ''}`}
          style={{ height: SLOT_HEIGHT, bottom }}
        />
      );
    }
    return slots;
  };

  const renderDeviceBlocks = () => {
    if (!rack) return null;
    return draftDevices.map((device) => {
      const template = templateById.get(device.template_id);
      const height = template?.u_height || 1;
      const topOffset = (rack.u_height - (device.u_position + height - 1)) * SLOT_HEIGHT;
      const blockHeight = height * SLOT_HEIGHT - 4;
      const tooltip = `${device.name}\n${device.id}\n${device.template_id}\nU${device.u_position} • ${height}U`;
      return (
        <div
          key={device.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(
              'application/rackscope',
              JSON.stringify({ kind: 'device', deviceId: device.id })
            );
            e.dataTransfer.effectAllowed = 'move';
          }}
          title={tooltip}
          className="absolute right-7 left-7 cursor-grab rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-gray-200 shadow-md"
          style={{ top: topOffset + 2, height: blockHeight }}
        >
          <div className="flex items-center justify-between">
            <div className="truncate text-[11px] font-semibold">{device.name}</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteDevice(device.id);
              }}
              className="ml-2 rounded-full p-1 text-red-400 hover:text-red-300"
              title="Delete device"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="custom-scrollbar h-full overflow-y-auto p-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.45em] text-gray-500 uppercase">
            Topology
          </div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Rack Editor</h1>
          <div className="mt-2 font-mono text-[11px] tracking-[0.2em] text-gray-500 uppercase">
            Drag templates onto empty U slots, or move existing devices.
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-mono text-[11px] tracking-widest text-gray-200 uppercase transition hover:bg-white/20 disabled:opacity-50"
          >
            Save
          </button>
          <div className="font-mono text-[10px] tracking-[0.2em] text-gray-500 uppercase">
            {saving ? 'Saving...' : dirty ? 'Unsaved changes' : ''}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <section className="bg-rack-panel border-rack-border space-y-4 rounded-3xl border p-6">
          <div>
            <div className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">
              Rack
            </div>
            <select
              value={selectedRackId}
              onChange={(e) => requestRackChange(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs text-gray-200"
            >
              {rackOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {error && <div className="text-status-crit text-[11px]">{error}</div>}
        </section>

        <section className="bg-rack-panel border-rack-border flex justify-center rounded-3xl border p-6">
          <div className="mb-4 font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">
            Front view
          </div>
          <div
            className="w-full max-w-[360px] rounded-2xl border border-white/10 bg-black/30 p-2"
            ref={rackContainerRef}
          >
            <div className="flex gap-2">
              <div
                className="flex w-6 flex-col-reverse font-mono text-[9px] text-gray-600"
                style={{ height: rack ? rack.u_height * SLOT_HEIGHT : 300 }}
              >
                {rack &&
                  Array.from({ length: rack.u_height }).map((_, idx) => (
                    <div
                      key={idx}
                      className="flex flex-1 items-center justify-center border-b border-white/10"
                    >
                      <span>{idx + 1}</span>
                    </div>
                  ))}
              </div>
              <div
                className="relative flex-1 rounded-xl border border-white/10 bg-black/40"
                style={{ height: rack ? rack.u_height * SLOT_HEIGHT : 300 }}
              >
                <div className="absolute top-0 bottom-0 left-0 flex w-5 items-center justify-center border-r border-white/10 bg-black/60 font-mono text-[8px] text-gray-500">
                  L
                </div>
                <div className="absolute top-0 right-0 bottom-0 flex w-5 items-center justify-center border-l border-white/10 bg-black/60 font-mono text-[8px] text-gray-500">
                  R
                </div>
                {renderSlotTargets()}
                {renderDeviceBlocks()}
              </div>
              <div
                className="flex w-6 flex-col-reverse font-mono text-[9px] text-gray-600"
                style={{ height: rack ? rack.u_height * SLOT_HEIGHT : 300 }}
              >
                {rack &&
                  Array.from({ length: rack.u_height }).map((_, idx) => (
                    <div
                      key={idx}
                      className="flex flex-1 items-center justify-center border-b border-white/10"
                    >
                      <span>{idx + 1}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          {loading && <div className="mt-3 text-[11px] text-gray-500">Loading rack...</div>}
        </section>

        <section className="bg-rack-panel border-rack-border space-y-4 rounded-3xl border p-6">
          <div className="font-mono text-[10px] tracking-[0.3em] text-gray-500 uppercase">
            Device library
          </div>
          <div className="relative">
            <Search className="absolute top-3 left-3 h-4 w-4 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates"
              className="w-full rounded-xl border border-[var(--color-border)] bg-black/30 px-9 py-2 text-xs text-gray-200"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-border)] bg-black/30 px-3 py-2 text-xs text-gray-200"
          >
            {templateTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? 'All types' : type}
              </option>
            ))}
          </select>
          <div className="custom-scrollbar max-h-[520px] space-y-2 overflow-y-auto">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    'application/rackscope',
                    JSON.stringify({ kind: 'template', templateId: template.id })
                  );
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="cursor-grab rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-[11px] text-gray-200"
              >
                <div className="text-sm font-semibold">{template.name}</div>
                <div className="font-mono text-[10px] tracking-widest text-gray-500 uppercase">
                  {template.type} • {template.u_height}U
                </div>
              </div>
            ))}
            {filteredTemplates.length === 0 && (
              <div className="text-[11px] text-gray-500">No templates found.</div>
            )}
          </div>
        </section>
      </div>

      {showUnsavedPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[var(--color-panel)] p-6 text-gray-100 shadow-xl">
            <div className="text-sm font-semibold">Unsaved changes</div>
            <div className="mt-2 text-[12px] text-gray-400">
              You have unsaved changes. Do you want to save or discard them?
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={cancelDiscardChanges}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-mono text-[11px] tracking-widest text-gray-200 uppercase hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmDiscardChanges}
                className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 font-mono text-[11px] tracking-widest text-red-300 uppercase hover:bg-red-500/20"
              >
                Discard
              </button>
              <button
                onClick={() => {
                  handleSave();
                  setShowUnsavedPrompt(false);
                }}
                className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 font-mono text-[11px] tracking-widest text-gray-200 uppercase hover:bg-white/20"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
