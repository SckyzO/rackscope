import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Building2,
  Layers,
  Server,
  Plus,
  X,
  Save,
  AlertCircle,
  Loader2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import type { Site, Room, Aisle, Rack, RackTemplate } from '../../../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const VARIANT_LINKS = [
  { label: 'V1', path: '/cosmos/editors/topology-v1' },
  { label: 'V2', path: '/cosmos/editors/topology-v2' },
  { label: 'V3', path: '/cosmos/editors/topology-v3' },
  { label: 'V4', path: '/cosmos/editors/topology-v4' },
  { label: 'V5', path: '/cosmos/editors/topology-v5' },
];

// ─── Module-level sub-components ─────────────────────────────────────────────

type ColumnHeaderProps = {
  icon: React.ElementType;
  title: string;
  count: number;
};

const ColumnHeader = ({ icon: Icon, title, count }: ColumnHeaderProps) => (
  <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-gray-700">
    <Icon className="h-3.5 w-3.5 text-gray-400" />
    <span className="flex-1 text-xs font-bold tracking-wider text-gray-500 uppercase dark:text-gray-400">
      {title}
    </span>
    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      {count}
    </span>
  </div>
);

type ColumnItemProps = {
  label: string;
  subLabel?: string;
  active: boolean;
  hasChildren: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragTarget?: boolean;
  onClick: () => void;
};

const ColumnItem = ({
  label,
  subLabel,
  active,
  hasChildren,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop,
  isDragTarget = false,
  onClick,
}: ColumnItemProps) => (
  <div
    className={`group flex w-full cursor-pointer items-center gap-2 px-3 py-2 transition-colors ${
      active
        ? 'border-l-2 border-[#465fff] bg-[#465fff]/10 text-[#465fff]'
        : isDragTarget
          ? 'border-l-2 border-amber-400 bg-amber-50 dark:border-amber-400 dark:bg-amber-400/10'
          : 'border-l-2 border-transparent text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
    }`}
    draggable={draggable}
    onDragStart={onDragStart}
    onDragOver={onDragOver}
    onDrop={onDrop}
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && onClick()}
  >
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs font-medium">{label}</p>
      {subLabel && (
        <p className="truncate text-[10px] text-gray-400 dark:text-gray-500">{subLabel}</p>
      )}
    </div>
    {hasChildren && (
      <ChevronRight className={`h-3 w-3 shrink-0 ${active ? 'text-[#465fff]' : 'text-gray-400'}`} />
    )}
  </div>
);

type AddInlineFormProps = {
  placeholder: string;
  onSave: (name: string, id: string) => Promise<void>;
  onCancel: () => void;
};

const AddInlineForm = ({ placeholder, onSave, onCancel }: AddInlineFormProps) => {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(name.trim(), id.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-l-2 border-[#465fff] bg-[#465fff]/5 px-3 py-2">
      {error && (
        <div className="mb-2 flex items-center gap-1.5 rounded bg-red-50 px-2 py-1 dark:bg-red-500/10">
          <AlertCircle className="h-3 w-3 shrink-0 text-red-500" />
          <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      <input
        ref={nameRef}
        type="text"
        placeholder={placeholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') onCancel();
        }}
        className="mb-1 w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900 outline-none focus:border-[#465fff] dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
      <input
        type="text"
        placeholder="ID (optional)"
        value={id}
        onChange={(e) => setId(e.target.value)}
        className="mb-2 w-full rounded border border-gray-200 bg-white px-2 py-1 font-mono text-xs text-gray-900 outline-none focus:border-[#465fff] dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          disabled={busy || !name.trim()}
          className="flex items-center gap-1 rounded bg-[#465fff] px-2 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
          ) : (
            <Save className="h-2.5 w-2.5" />
          )}
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <X className="h-2.5 w-2.5" />
          Cancel
        </button>
      </div>
    </div>
  );
};

type AddButtonProps = {
  label: string;
  onClick: () => void;
};

const AddButton = ({ label, onClick }: AddButtonProps) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-1.5 px-3 py-2 text-xs text-gray-400 transition-colors hover:bg-gray-50 hover:text-[#465fff] dark:hover:bg-gray-800 dark:hover:text-[#465fff]"
  >
    <Plus className="h-3 w-3" />
    {label}
  </button>
);

type RackDetailPanelProps = {
  rack: Rack;
  rackTemplates: RackTemplate[];
  onTemplateChange: (templateId: string | null) => Promise<void>;
  saving: boolean;
};

const RackDetailPanel = ({
  rack,
  rackTemplates,
  onTemplateChange,
  saving,
}: RackDetailPanelProps) => {
  const navigate = useNavigate();
  const deviceCount = (rack.devices || []).length;
  const currentTemplate = rackTemplates.find((t) => t.id === rack.template_id);

  return (
    <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{rack.name}</h3>
          <p className="font-mono text-[11px] text-gray-400">{rack.id}</p>
        </div>
        <button
          onClick={() => navigate(`/cosmos/views/rack/${rack.id}`)}
          className="flex items-center gap-1.5 rounded-lg bg-[#465fff] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
        >
          <ExternalLink className="h-3 w-3" />
          Open in Rack Editor
        </button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
          <p className="text-[10px] text-gray-400">Height</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{rack.u_height}U</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
          <p className="text-[10px] text-gray-400">Devices</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">{deviceCount}</p>
        </div>
        <div className="col-span-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
          <p className="mb-1 text-[10px] text-gray-400">Template</p>
          <div className="flex items-center gap-1">
            <select
              value={rack.template_id ?? ''}
              onChange={(e) => onTemplateChange(e.target.value || null)}
              disabled={saving}
              className="w-full rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">No template</option>
              {rackTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {saving && <Loader2 className="h-3 w-3 animate-spin text-[#465fff]" />}
          </div>
          {currentTemplate && (
            <p className="mt-0.5 text-[10px] text-gray-400">{currentTemplate.u_height}U</p>
          )}
        </div>
      </div>
    </div>
  );
};

type VariantSwitcherProps = {
  active: string;
};

const VariantSwitcher = ({ active }: VariantSwitcherProps) => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
      {VARIANT_LINKS.map((v) => (
        <button
          key={v.label}
          onClick={() => navigate(v.path)}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
            v.label === active
              ? 'bg-[#465fff] text-white'
              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const CosmosTopologyEditorPageV2: React.FC = () => {
  const [topology, setTopology] = useState<Site[]>([]);
  const [rackTemplates, setRackTemplates] = useState<RackTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedAisle, setSelectedAisle] = useState<Aisle | null>(null);
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);

  const [addingIn, setAddingIn] = useState<'site' | 'room' | 'aisle' | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [dragRackId, setDragRackId] = useState<string | null>(null);
  const [dragOverAisleId, setDragOverAisleId] = useState<string | null>(null);

  const reload = async () => {
    const [sites, catalog] = await Promise.all([api.getSites(), api.getCatalog()]);
    setTopology(Array.isArray(sites) ? sites : []);
    setRackTemplates(catalog?.rack_templates ?? []);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [sites, catalog] = await Promise.all([api.getSites(), api.getCatalog()]);
        if (!active) return;
        setTopology(Array.isArray(sites) ? sites : []);
        setRackTemplates(catalog?.rack_templates ?? []);
        setLoading(false);
      } catch {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // Sync selected objects after reload
  useEffect(() => {
    if (!selectedSite) return;
    const freshSite = topology.find((s) => s.id === selectedSite.id) ?? null;
    setSelectedSite(freshSite);
    if (!freshSite || !selectedRoom) return;
    const freshRoom = (freshSite.rooms || []).find((r) => r.id === selectedRoom.id) ?? null;
    setSelectedRoom(freshRoom);
    if (!freshRoom || !selectedAisle) return;
    const freshAisle = (freshRoom.aisles || []).find((a) => a.id === selectedAisle.id) ?? null;
    setSelectedAisle(freshAisle);
    if (!freshAisle || !selectedRack) return;
    const freshRack = (freshAisle.racks || []).find((r) => r.id === selectedRack.id) ?? null;
    setSelectedRack(freshRack);
  }, [topology]); // eslint-disable-line react-hooks/exhaustive-deps

  const withSave = async (fn: () => Promise<void>) => {
    setSaveStatus('saving');
    try {
      await fn();
      await reload();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const moveRack = async (
    rackId: string,
    fromAisleId: string,
    toAisleId: string,
    roomId: string
  ) => {
    const room = topology.flatMap((s) => s.rooms).find((r) => r.id === roomId);
    if (!room || fromAisleId === toAisleId) return;
    const newAisles: Record<string, string[]> = {};
    room.aisles.forEach((a) => {
      if (a.id === fromAisleId)
        newAisles[a.id] = a.racks.filter((r) => r.id !== rackId).map((r) => r.id);
      else if (a.id === toAisleId) newAisles[a.id] = [...a.racks.map((r) => r.id), rackId];
      else newAisles[a.id] = a.racks.map((r) => r.id);
    });
    await withSave(() => api.updateRoomAisles(roomId, newAisles));
  };

  const handleAddSite = async (name: string, id: string) => {
    await withSave(() => api.createSite({ id: id || null, name }));
    setAddingIn(null);
  };

  const handleAddRoom = async (name: string, id: string) => {
    if (!selectedSite) return;
    await withSave(() => api.createRoom(selectedSite.id, { id: id || null, name }));
    setAddingIn(null);
  };

  const handleAddAisle = async (name: string, id: string) => {
    if (!selectedRoom) return;
    await withSave(() => api.createRoomAisles(selectedRoom.id, [{ id: id || null, name }]));
    setAddingIn(null);
  };

  const handleTemplateChange = async (templateId: string | null) => {
    if (!selectedRack) return;
    setTemplateSaving(true);
    try {
      await api.updateRackTemplate(selectedRack.id, templateId);
      await reload();
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleSelectSite = (site: Site) => {
    setSelectedSite(site);
    setSelectedRoom(null);
    setSelectedAisle(null);
    setSelectedRack(null);
    setAddingIn(null);
  };

  const handleSelectRoom = (room: Room) => {
    setSelectedRoom(room);
    setSelectedAisle(null);
    setSelectedRack(null);
    setAddingIn(null);
  };

  const handleSelectAisle = (aisle: Aisle) => {
    setSelectedAisle(aisle);
    setSelectedRack(null);
    setAddingIn(null);
  };

  const handleDragStart = (e: React.DragEvent, rackId: string) => {
    setDragRackId(rackId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleAisleDragOver = (e: React.DragEvent, aisleId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverAisleId(aisleId);
  };

  const handleAisleDrop = async (e: React.DragEvent, toAisle: Aisle) => {
    e.preventDefault();
    setDragOverAisleId(null);
    if (!dragRackId || !selectedAisle || !selectedRoom) return;
    const fromAisleId = selectedAisle.id;
    const rackInAisle = selectedAisle.racks.some((r) => r.id === dragRackId);
    if (!rackInAisle) return;
    setDragRackId(null);
    await moveRack(dragRackId, fromAisleId, toAisle.id, selectedRoom.id);
  };

  const rooms = selectedSite ? selectedSite.rooms || [] : [];
  const aisles = selectedRoom ? selectedRoom.aisles || [] : [];
  const racks = selectedAisle ? selectedAisle.racks || [] : [];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#465fff]/10">
            <MapPin className="h-5 w-5 text-[#465fff]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Topology Editor</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Column browser — V2</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus !== 'idle' && (
            <span
              className={`text-xs font-medium ${
                saveStatus === 'saving'
                  ? 'text-gray-400'
                  : saveStatus === 'saved'
                    ? 'text-[#22c55e]'
                    : 'text-[#ef4444]'
              }`}
            >
              {saveStatus === 'saving'
                ? 'Saving…'
                : saveStatus === 'saved'
                  ? 'Saved'
                  : 'Error saving'}
            </span>
          )}
          <VariantSwitcher active="V2" />
        </div>
      </div>

      {/* Column Browser */}
      <div className="flex flex-1 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        {/* Column 1: Sites */}
        <div className="flex w-1/4 min-w-[180px] flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <ColumnHeader icon={MapPin} title="Sites" count={topology.length} />
          <div className="flex-1 overflow-y-auto">
            {topology.map((site) => (
              <ColumnItem
                key={site.id}
                label={site.name}
                subLabel={`${(site.rooms || []).length} rooms`}
                active={selectedSite?.id === site.id}
                hasChildren={(site.rooms || []).length > 0}
                onClick={() => handleSelectSite(site)}
              />
            ))}
            {addingIn === 'site' && (
              <AddInlineForm
                placeholder="Site name *"
                onSave={handleAddSite}
                onCancel={() => setAddingIn(null)}
              />
            )}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700">
            <AddButton label="Add Site" onClick={() => setAddingIn('site')} />
          </div>
        </div>

        {/* Column 2: Rooms */}
        <div className="flex w-1/4 min-w-[180px] flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <ColumnHeader icon={Building2} title="Rooms" count={rooms.length} />
          <div className="flex-1 overflow-y-auto">
            {selectedSite ? (
              rooms.map((room) => (
                <ColumnItem
                  key={room.id}
                  label={room.name}
                  subLabel={`${(room.aisles || []).length} aisles`}
                  active={selectedRoom?.id === room.id}
                  hasChildren={(room.aisles || []).length > 0}
                  onClick={() => handleSelectRoom(room)}
                />
              ))
            ) : (
              <div className="px-3 py-6 text-center">
                <p className="text-[11px] text-gray-400">Select a site</p>
              </div>
            )}
            {addingIn === 'room' && selectedSite && (
              <AddInlineForm
                placeholder="Room name *"
                onSave={handleAddRoom}
                onCancel={() => setAddingIn(null)}
              />
            )}
          </div>
          {selectedSite && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <AddButton label="Add Room" onClick={() => setAddingIn('room')} />
            </div>
          )}
        </div>

        {/* Column 3: Aisles */}
        <div className="flex w-1/4 min-w-[180px] flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <ColumnHeader icon={Layers} title="Aisles" count={aisles.length} />
          <div className="flex-1 overflow-y-auto">
            {selectedRoom ? (
              aisles.map((aisle) => (
                <ColumnItem
                  key={aisle.id}
                  label={aisle.name}
                  subLabel={`${(aisle.racks || []).length} racks`}
                  active={selectedAisle?.id === aisle.id}
                  hasChildren={(aisle.racks || []).length > 0}
                  isDragTarget={dragOverAisleId === aisle.id}
                  onDragOver={(e) => handleAisleDragOver(e, aisle.id)}
                  onDrop={(e) => handleAisleDrop(e, aisle)}
                  onClick={() => handleSelectAisle(aisle)}
                />
              ))
            ) : (
              <div className="px-3 py-6 text-center">
                <p className="text-[11px] text-gray-400">Select a room</p>
              </div>
            )}
            {addingIn === 'aisle' && selectedRoom && (
              <AddInlineForm
                placeholder="Aisle name *"
                onSave={handleAddAisle}
                onCancel={() => setAddingIn(null)}
              />
            )}
          </div>
          {selectedRoom && (
            <div className="border-t border-gray-200 dark:border-gray-700">
              <AddButton label="Add Aisle" onClick={() => setAddingIn('aisle')} />
            </div>
          )}
        </div>

        {/* Column 4: Racks */}
        <div className="flex w-1/4 min-w-[180px] flex-col bg-white dark:bg-gray-900">
          <ColumnHeader icon={Server} title="Racks" count={racks.length} />
          <div className="flex-1 overflow-y-auto">
            {selectedAisle ? (
              racks.map((rack) => (
                <ColumnItem
                  key={rack.id}
                  label={rack.name}
                  subLabel={rack.template_id ?? `${rack.u_height}U`}
                  active={selectedRack?.id === rack.id}
                  hasChildren={false}
                  draggable
                  onDragStart={(e) => handleDragStart(e, rack.id)}
                  onClick={() => setSelectedRack(rack)}
                />
              ))
            ) : (
              <div className="px-3 py-6 text-center">
                <p className="text-[11px] text-gray-400">Select an aisle</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rack Detail Panel */}
      {selectedRack && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700">
          <RackDetailPanel
            rack={selectedRack}
            rackTemplates={rackTemplates}
            onTemplateChange={handleTemplateChange}
            saving={templateSaving}
          />
        </div>
      )}
    </div>
  );
};
