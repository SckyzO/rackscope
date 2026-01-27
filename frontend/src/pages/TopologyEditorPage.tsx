import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { RackTemplate, RoomSummary, AisleSummary, DeviceTemplate, Rack, Site } from '../types';

type RoomOption = { id: string; name: string; aisles: AisleSummary[] };

type AisleRackMap = Record<string, string[]>;

const buildAisleMap = (aisles: AisleSummary[]): AisleRackMap => {
  const map: AisleRackMap = {};
  aisles.forEach((aisle) => {
    map[aisle.id] = aisle.racks.map((rack) => rack.id);
  });
  return map;
};

const mapsEqual = (a: AisleRackMap, b: AisleRackMap): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const av = a[key] || [];
    const bv = b[key] || [];
    if (av.length !== bv.length) return false;
    for (let i = 0; i < av.length; i += 1) {
      if (av[i] !== bv[i]) return false;
    }
  }
  return true;
};

const moveRack = (map: AisleRackMap, rackId: string, targetAisleId: string, targetIndex?: number): AisleRackMap => {
  const next = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]));
  Object.values(next).forEach((racks) => {
    const idx = racks.indexOf(rackId);
    if (idx !== -1) racks.splice(idx, 1);
  });
  if (!next[targetAisleId]) next[targetAisleId] = [];
  const insertAt = typeof targetIndex === 'number' ? targetIndex : next[targetAisleId].length;
  next[targetAisleId].splice(insertAt, 0, rackId);
  return next;
};

export const TopologyEditorPage = () => {
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [rackTemplates, setRackTemplates] = useState<RackTemplate[]>([]);
  const [deviceTemplates, setDeviceTemplates] = useState<DeviceTemplate[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [baseAisleRacks, setBaseAisleRacks] = useState<AisleRackMap>({});
  const [pendingAisleRacks, setPendingAisleRacks] = useState<AisleRackMap>({});
  const [selectedRackId, setSelectedRackId] = useState('');
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [newDeviceTemplateId, setNewDeviceTemplateId] = useState('');
  const [newDeviceUPosition, setNewDeviceUPosition] = useState<number | ''>('');
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceInstance, setNewDeviceInstance] = useState('');
  const [deviceIdTouched, setDeviceIdTouched] = useState(false);
  const [deviceNameTouched, setDeviceNameTouched] = useState(false);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardMode, setWizardMode] = useState<'existing' | 'new'>('existing');
  const [wizardSiteId, setWizardSiteId] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteId, setNewSiteId] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomId, setNewRoomId] = useState('');
  const [aisleCount, setAisleCount] = useState<number>(0);
  const [aisleNamePrefix, setAisleNamePrefix] = useState('Aisle');
  const [aisleIdPrefix, setAisleIdPrefix] = useState('aisle');
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [wizardBusy, setWizardBusy] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.getRooms(), api.getCatalog(), api.getSites()])
      .then(([roomsData, catalog, sitesData]) => {
        if (!active) return;
        setRooms(Array.isArray(roomsData) ? roomsData : []);
        setRackTemplates(catalog.rack_templates || []);
        setDeviceTemplates(catalog.device_templates || []);
        setSites(Array.isArray(sitesData) ? sitesData : []);
      })
      .catch((err) => setError(err?.message || 'Failed to load topology'));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (!wizardSiteId && sites.length > 0) {
      setWizardSiteId(sites[0].id);
    }
  }, [sites, wizardSiteId]);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) || null;
  const aisles = selectedRoom?.aisles || [];
  const deviceTemplateById = useMemo(() => new Map(deviceTemplates.map((t) => [t.id, t])), [deviceTemplates]);

  useEffect(() => {
    const nextMap = buildAisleMap(aisles);
    if (!mapsEqual(nextMap, baseAisleRacks) || !mapsEqual(nextMap, pendingAisleRacks)) {
      setBaseAisleRacks(nextMap);
      setPendingAisleRacks(nextMap);
    }
  }, [selectedRoomId, aisles]);

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

  const hasPendingChanges = useMemo(() => {
    const aisleIds = new Set([...Object.keys(baseAisleRacks), ...Object.keys(pendingAisleRacks)]);
    for (const aisleId of aisleIds) {
      const base = baseAisleRacks[aisleId] || [];
      const pending = pendingAisleRacks[aisleId] || [];
      if (base.length !== pending.length) return true;
      for (let i = 0; i < base.length; i += 1) {
        if (base[i] !== pending[i]) return true;
      }
    }
    return false;
  }, [baseAisleRacks, pendingAisleRacks]);

  useEffect(() => {
    if (!selectedRackId) {
      setSelectedRack(null);
      return;
    }
    let active = true;
    api.getRack(selectedRackId)
      .then((rack) => {
        if (!active) return;
        setSelectedRack(rack);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Failed to load rack details');
      });
    return () => {
      active = false;
    };
  }, [selectedRackId]);

  const occupiedUnits = useMemo(() => {
    const occupied = new Set<number>();
    if (!selectedRack) return occupied;
    selectedRack.devices.forEach((device) => {
      const template = deviceTemplateById.get(device.template_id);
      const height = template?.u_height || 1;
      for (let u = device.u_position; u < device.u_position + height; u += 1) {
        occupied.add(u);
      }
    });
    return occupied;
  }, [selectedRack, deviceTemplateById]);

  const availablePositions = useMemo(() => {
    if (!selectedRack || !newDeviceTemplateId) return [];
    const template = deviceTemplateById.get(newDeviceTemplateId);
    const height = template?.u_height || 1;
    const rackHeight = selectedRack.u_height || 42;
    const positions: number[] = [];
    for (let start = 1; start <= rackHeight - height + 1; start += 1) {
      let fits = true;
      for (let u = start; u < start + height; u += 1) {
        if (occupiedUnits.has(u)) {
          fits = false;
          break;
        }
      }
      if (fits) positions.push(start);
    }
    return positions;
  }, [selectedRack, newDeviceTemplateId, occupiedUnits, deviceTemplateById]);

  useEffect(() => {
    if (!newDeviceTemplateId) {
      setNewDeviceUPosition('');
      return;
    }
    if (availablePositions.length === 0) {
      setNewDeviceUPosition('');
      return;
    }
    if (!newDeviceUPosition || !availablePositions.includes(Number(newDeviceUPosition))) {
      setNewDeviceUPosition(availablePositions[0]);
    }
  }, [availablePositions, newDeviceTemplateId, newDeviceUPosition]);

  useEffect(() => {
    if (!newDeviceTemplateId || !newDeviceUPosition) return;
    const template = deviceTemplateById.get(newDeviceTemplateId);
    if (!template) return;
    const uPos = Number(newDeviceUPosition);
    if (!deviceIdTouched) {
      setNewDeviceId(`${template.id}-${uPos}`);
    }
    if (!deviceNameTouched) {
      setNewDeviceName(`${template.name} U${uPos}`);
    }
  }, [deviceTemplateById, newDeviceTemplateId, newDeviceUPosition, deviceIdTouched, deviceNameTouched]);

  const handleDropOnRack = (aisleId: string, targetRackId: string, draggedId?: string | null) => {
    const activeId = draggedId || draggingId;
    if (!activeId || activeId === targetRackId) return;
    const targetIndex = (pendingAisleRacks[aisleId] || []).indexOf(targetRackId);
    setPendingAisleRacks((prev) => moveRack(prev, activeId, aisleId, targetIndex));
    setDraggingId(null);
  };

  const handleDropOnAisle = (aisleId: string, draggedId?: string | null) => {
    const activeId = draggedId || draggingId;
    if (!activeId) return;
    setPendingAisleRacks((prev) => moveRack(prev, activeId, aisleId));
    setDraggingId(null);
  };

  const handleSaveLayout = async () => {
    if (!hasPendingChanges) return;
    setStatus('saving');
    setError(null);
    try {
      await api.updateRoomAisles(selectedRoomId, pendingAisleRacks);

      setBaseAisleRacks(pendingAisleRacks);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Failed to save changes');
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

  const handleAddDevice = async () => {
    if (!selectedRack) return;
    if (!newDeviceTemplateId || !newDeviceUPosition) {
      setError('Template and U position are required');
      return;
    }
    if (!newDeviceId.trim() || !newDeviceName.trim()) {
      setError('Device id and name are required');
      return;
    }
    setAdding(true);
    setError(null);
    try {
      await api.addRackDevice(selectedRack.id, {
        id: newDeviceId.trim(),
        name: newDeviceName.trim(),
        template_id: newDeviceTemplateId,
        u_position: Number(newDeviceUPosition),
        instance: newDeviceInstance.trim() ? newDeviceInstance.trim() : null,
      });
      const refreshed = await api.getRack(selectedRack.id);
      setSelectedRack(refreshed);
      setNewDeviceInstance('');
      setDeviceIdTouched(false);
      setDeviceNameTouched(false);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Failed to add device');
    } finally {
      setAdding(false);
    }
  };

  const resetWizard = () => {
    setWizardStep(1);
    setWizardMode('existing');
    setWizardSiteId(sites[0]?.id || '');
    setNewSiteName('');
    setNewSiteId('');
    setNewRoomName('');
    setNewRoomId('');
    setAisleCount(0);
    setAisleNamePrefix('Aisle');
    setAisleIdPrefix('aisle');
    setWizardError(null);
    setWizardBusy(false);
  };

  const handleOpenWizard = () => {
    resetWizard();
    setWizardOpen(true);
  };

  const handleCloseWizard = () => {
    setWizardOpen(false);
    resetWizard();
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      setWizardError('Room name is required');
      return;
    }
    if (wizardMode === 'existing' && !wizardSiteId) {
      setWizardError('Select a datacenter');
      return;
    }
    if (wizardMode === 'new' && !newSiteName.trim()) {
      setWizardError('Datacenter name is required');
      return;
    }
    setWizardBusy(true);
    setWizardError(null);
    try {
      let targetSiteId = wizardSiteId;
      if (wizardMode === 'new') {
        const siteResp = await api.createSite({
          id: newSiteId.trim() || null,
          name: newSiteName.trim(),
        });
        targetSiteId = siteResp?.site?.id || targetSiteId;
      }
      const roomResp = await api.createRoom(targetSiteId, {
        id: newRoomId.trim() || null,
        name: newRoomName.trim(),
      });

      const createdRoomId = roomResp?.room?.id;
      if (createdRoomId && aisleCount > 0) {
        const items = Array.from({ length: aisleCount }, (_, idx) => {
          const num = String(idx + 1).padStart(2, '0');
          return {
            id: `${aisleIdPrefix}-${num}`,
            name: `${aisleNamePrefix} ${num}`,
          };
        });
        await api.createRoomAisles(createdRoomId, items);
      }

      const [roomsData, sitesData] = await Promise.all([api.getRooms(), api.getSites()]);
      setRooms(Array.isArray(roomsData) ? roomsData : []);
      setSites(Array.isArray(sitesData) ? sitesData : []);
      if (createdRoomId) {
        setSelectedRoomId(createdRoomId);
      }
      setWizardOpen(false);
      resetWizard();
    } catch (err: any) {
      setWizardError(err?.message || 'Failed to create room');
    } finally {
      setWizardBusy(false);
    }
  };

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.45em] text-gray-500">Topology</div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Editor</h1>
          <div className="mt-2 text-[11px] font-mono uppercase tracking-[0.2em] text-gray-500">
            Drag racks between aisles, then save
          </div>
        </div>
        <div className="flex items-center gap-4">
          {hasPendingChanges && (
            <button
              onClick={handleSaveLayout}
              className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-mono uppercase tracking-widest text-gray-200 transition hover:bg-white/20"
            >
              Save changes
            </button>
          )}
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">
            {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved' : status === 'error' ? 'Error' : ''}
          </div>
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
            <button
              onClick={handleOpenWizard}
              className="mt-4 w-full rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-mono uppercase tracking-widest text-gray-200 transition hover:bg-white/20"
            >
              Create datacenter / room
            </button>
          {error && <div className="text-[11px] text-status-crit">{error}</div>}
        </section>

        <section className="bg-rack-panel border border-rack-border rounded-3xl p-6 space-y-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Room layout</div>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(aisles.length, 1)}, minmax(0, 1fr))` }}>
            {aisles.map((aisle) => (
              <div key={aisle.id} className="flex flex-col gap-2">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500">{aisle.name}</div>
                <div
                  className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-3 min-h-[240px] space-y-2"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dragged = e.dataTransfer.getData('text/plain');
                    handleDropOnAisle(aisle.id, dragged || null);
                  }}
                >
                  {(pendingAisleRacks[aisle.id] || []).map((rackId) => {
                    const rack = rackById.get(rackId);
                    const isSelected = rackId === selectedRackId;
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
                          handleDropOnRack(aisle.id, rackId, dragged || null);
                        }}
                        onClick={() => setSelectedRackId(rackId)}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors cursor-grab ${
                          isSelected
                            ? 'border-blue-400/60 bg-blue-500/10'
                            : 'border-white/5 bg-black/20 hover:border-white/20'
                        }`}
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
                  {(pendingAisleRacks[aisle.id] || []).length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/10 bg-black/30 px-3 py-4 text-center text-[10px] font-mono uppercase tracking-widest text-gray-500">
                      Drop racks here
                    </div>
                  )}
                </div>
              </div>
            ))}
            {aisles.length === 0 && (
              <div className="text-[11px] font-mono uppercase tracking-widest text-gray-500">No aisles defined</div>
            )}
          </div>

          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-500">Add device</div>
            {!selectedRack && (
              <div className="text-[11px] text-gray-500">Select a rack to assign a template.</div>
            )}
            {selectedRack && (
              <div className="space-y-3">
                <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-gray-500">
                  Rack: {selectedRack.name}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="text-[11px] text-gray-400">
                    Template
                    <select
                      value={newDeviceTemplateId}
                      onChange={(e) => {
                        setNewDeviceTemplateId(e.target.value);
                        setDeviceIdTouched(false);
                        setDeviceNameTouched(false);
                      }}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-2 py-1 text-[11px] text-gray-200"
                    >
                      <option value="">Select template</option>
                      {deviceTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] text-gray-400">
                    U position
                    <select
                      value={newDeviceUPosition === '' ? '' : String(newDeviceUPosition)}
                      onChange={(e) => setNewDeviceUPosition(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-2 py-1 text-[11px] text-gray-200"
                      disabled={!newDeviceTemplateId || availablePositions.length === 0}
                    >
                      {!newDeviceTemplateId && <option value="">Select template first</option>}
                      {newDeviceTemplateId && availablePositions.length === 0 && (
                        <option value="">No space available</option>
                      )}
                      {availablePositions.map((pos) => (
                        <option key={pos} value={pos}>
                          U{pos}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] text-gray-400">
                    Device ID
                    <input
                      value={newDeviceId}
                      onChange={(e) => {
                        setDeviceIdTouched(true);
                        setNewDeviceId(e.target.value);
                      }}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-2 py-1 text-[11px] text-gray-200"
                    />
                  </label>
                  <label className="text-[11px] text-gray-400">
                    Device name
                    <input
                      value={newDeviceName}
                      onChange={(e) => {
                        setDeviceNameTouched(true);
                        setNewDeviceName(e.target.value);
                      }}
                      className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-2 py-1 text-[11px] text-gray-200"
                    />
                  </label>
                </div>
                <label className="text-[11px] text-gray-400">
                  Instance (optional)
                  <input
                    value={newDeviceInstance}
                    onChange={(e) => setNewDeviceInstance(e.target.value)}
                    placeholder="compute[001-003]"
                    className="mt-1 w-full rounded-lg bg-black/30 border border-[var(--color-border)] px-2 py-1 text-[11px] text-gray-200"
                  />
                </label>
                <button
                  onClick={handleAddDevice}
                  disabled={adding}
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-mono uppercase tracking-widest text-gray-200 transition hover:bg-white/20 disabled:opacity-50"
                >
                  {adding ? 'Adding...' : 'Add device'}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-6">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[var(--color-panel)] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.35em] text-gray-500">Topology</div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Create datacenter & room</h2>
                <p className="mt-2 text-[11px] font-mono uppercase tracking-[0.2em] text-gray-500">
                  {wizardStep === 1
                    ? 'Choose or create a datacenter'
                    : wizardStep === 2
                    ? 'Describe the new room'
                    : 'Create aisles (optional)'}
                </p>
              </div>
              <button
                onClick={handleCloseWizard}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-gray-200"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setWizardMode('existing')}
                      className={`rounded-xl border px-3 py-2 text-[11px] font-mono uppercase tracking-widest ${
                        wizardMode === 'existing'
                          ? 'border-blue-400/60 bg-blue-500/10 text-blue-100'
                          : 'border-white/10 bg-white/5 text-gray-300'
                      }`}
                    >
                      Existing
                    </button>
                    <button
                      onClick={() => setWizardMode('new')}
                      className={`rounded-xl border px-3 py-2 text-[11px] font-mono uppercase tracking-widest ${
                        wizardMode === 'new'
                          ? 'border-blue-400/60 bg-blue-500/10 text-blue-100'
                          : 'border-white/10 bg-white/5 text-gray-300'
                      }`}
                    >
                      New
                    </button>
                  </div>

                  {wizardMode === 'existing' && (
                    <label className="block text-[11px] text-gray-400">
                      Datacenter
                      <select
                        value={wizardSiteId}
                        onChange={(e) => setWizardSiteId(e.target.value)}
                        className="mt-2 w-full rounded-xl bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                      >
                        {sites.map((site) => (
                          <option key={site.id} value={site.id}>
                            {site.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {wizardMode === 'new' && (
                    <div className="grid grid-cols-1 gap-3">
                      <label className="text-[11px] text-gray-400">
                        Datacenter name
                        <input
                          value={newSiteName}
                          onChange={(e) => setNewSiteName(e.target.value)}
                          className="mt-2 w-full rounded-xl bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                        />
                      </label>
                      <label className="text-[11px] text-gray-400">
                        Datacenter id (optional)
                        <input
                          value={newSiteId}
                          onChange={(e) => setNewSiteId(e.target.value)}
                          placeholder="auto from name"
                          className="mt-2 w-full rounded-xl bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 2 && (
                <div className="grid grid-cols-1 gap-3">
                  <label className="text-[11px] text-gray-400">
                    Room name
                    <input
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      className="mt-2 w-full rounded-xl bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                  </label>
                  <label className="text-[11px] text-gray-400">
                    Room id (optional)
                    <input
                      value={newRoomId}
                      onChange={(e) => setNewRoomId(e.target.value)}
                      placeholder="auto from name"
                      className="mt-2 w-full rounded-xl bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                  </label>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="grid grid-cols-1 gap-3">
                  <label className="text-[11px] text-gray-400">
                    Number of aisles
                    <input
                      type="number"
                      min={0}
                      value={aisleCount}
                      onChange={(e) => setAisleCount(Math.max(0, Number(e.target.value)))}
                      className="mt-2 w-full rounded-xl bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                    />
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="text-[11px] text-gray-400">
                      Aisle name prefix
                      <input
                        value={aisleNamePrefix}
                        onChange={(e) => setAisleNamePrefix(e.target.value)}
                        className="mt-2 w-full rounded-xl bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                      />
                    </label>
                    <label className="text-[11px] text-gray-400">
                      Aisle id prefix
                      <input
                        value={aisleIdPrefix}
                        onChange={(e) => setAisleIdPrefix(e.target.value)}
                        className="mt-2 w-full rounded-xl bg-black/30 border border-[var(--color-border)] px-3 py-2 text-xs text-gray-200"
                      />
                    </label>
                  </div>
                  {aisleCount > 0 && (
                    <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-gray-300">
                      {Array.from({ length: aisleCount }, (_, idx) => {
                        const num = String(idx + 1).padStart(2, '0');
                        return (
                          <div key={num} className="flex items-center justify-between py-0.5">
                            <span>{`${aisleNamePrefix} ${num}`}</span>
                            <span className="text-gray-500">{`${aisleIdPrefix}-${num}`}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {wizardError && <div className="text-[11px] text-status-crit">{wizardError}</div>}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => {
                  if (wizardStep === 3) setWizardStep(2);
                  else if (wizardStep === 2) setWizardStep(1);
                }}
                disabled={wizardStep === 1}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-mono uppercase tracking-widest text-gray-300 disabled:opacity-40"
              >
                Back
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCloseWizard}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-mono uppercase tracking-widest text-gray-300"
                >
                  Cancel
                </button>
                {wizardStep === 1 && (
                  <button
                    onClick={() => setWizardStep(2)}
                    className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-mono uppercase tracking-widest text-gray-200 hover:bg-white/20"
                  >
                    Next
                  </button>
                )}
                {wizardStep === 2 && (
                  <button
                    onClick={() => setWizardStep(3)}
                    className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-mono uppercase tracking-widest text-gray-200 hover:bg-white/20"
                  >
                    Next
                  </button>
                )}
                {wizardStep === 3 && (
                  <>
                    <button
                      onClick={() => {
                        setAisleCount(0);
                        handleCreateRoom();
                      }}
                      disabled={wizardBusy}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-mono uppercase tracking-widest text-gray-300 hover:bg-white/10 disabled:opacity-50"
                    >
                      Skip aisles
                    </button>
                    <button
                      onClick={handleCreateRoom}
                      disabled={wizardBusy}
                      className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-mono uppercase tracking-widest text-gray-200 hover:bg-white/20 disabled:opacity-50"
                    >
                      {wizardBusy ? 'Creating...' : 'Create room'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
