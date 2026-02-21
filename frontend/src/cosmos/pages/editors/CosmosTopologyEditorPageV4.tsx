import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Server,
  Plus,
  X,
  Save,
  AlertCircle,
  Loader2,
  GripVertical,
  ExternalLink,
  ChevronDown,
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

type VariantSwitcherProps = { active: string };

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

type RoomSelectorProps = {
  rooms: { id: string; name: string }[];
  selectedRoomId: string | null;
  onSelect: (id: string) => void;
};

const RoomSelector = ({ rooms, selectedRoomId, onSelect }: RoomSelectorProps) => (
  <div className="relative flex items-center gap-2">
    <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
    <select
      value={selectedRoomId ?? ''}
      onChange={(e) => e.target.value && onSelect(e.target.value)}
      className="appearance-none rounded-xl border border-gray-200 bg-white py-2 pr-8 pl-3 text-sm font-medium text-gray-700 focus:border-[#465fff] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
    >
      <option value="">Select a room…</option>
      {rooms.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
    <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-gray-400" />
  </div>
);

type NewAisleFormProps = {
  onSave: (name: string, id: string) => Promise<void>;
  onCancel: () => void;
};

const NewAisleForm = ({ onSave, onCancel }: NewAisleFormProps) => {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex min-w-[200px] flex-col rounded-2xl border-2 border-dashed border-[#465fff]/50 bg-[#465fff]/5 p-3">
      <p className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-300">New Aisle</p>
      {error && (
        <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1 dark:bg-red-500/10">
          <AlertCircle className="h-3 w-3 shrink-0 text-red-500" />
          <p className="text-[10px] text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      <input
        autoFocus
        type="text"
        placeholder="Aisle name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs focus:border-[#465fff] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />
      <input
        type="text"
        placeholder="ID (optional)"
        value={id}
        onChange={(e) => setId(e.target.value)}
        className="mb-2 rounded-lg border border-gray-200 bg-white px-2 py-1.5 font-mono text-xs focus:border-[#465fff] focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />
      <div className="flex gap-1.5">
        <button
          onClick={handleSave}
          disabled={busy || !name.trim()}
          className="flex items-center gap-1 rounded-lg bg-[#465fff] px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </div>
  );
};

type RackItemProps = {
  rack: Rack;
  rackTemplates: RackTemplate[];
  expanded: boolean;
  isDragging: boolean;
  isDragTarget: boolean;
  onDragStart: (e: React.DragEvent, rackId: string, aisleId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onToggleExpand: () => void;
  onDelete: () => void;
  onTemplateChange: (templateId: string | null) => Promise<void>;
  onOpen: () => void;
  aisleId: string;
};

const RackItem = ({
  rack,
  rackTemplates,
  expanded,
  isDragging,
  isDragTarget,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggleExpand,
  onDelete,
  onTemplateChange,
  onOpen,
  aisleId,
}: RackItemProps) => {
  const [saving, setSaving] = useState(false);

  const handleTemplateChange = async (val: string) => {
    setSaving(true);
    try {
      await onTemplateChange(val || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`transition-all ${isDragging ? 'opacity-30' : ''} ${isDragTarget ? 'ring-2 ring-[#465fff]/50' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, rack.id, aisleId)}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div
        className="dark:hover:bg-gray-750 flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onToggleExpand()}
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-gray-300 dark:text-gray-600" />
        <Server className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="flex-1 truncate text-xs font-semibold text-gray-900 dark:text-white">
          {rack.name}
        </span>
        <span className="text-[10px] text-gray-400">{(rack.devices || []).length} dev</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-0.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-[#ef4444] dark:text-gray-600 dark:hover:bg-red-500/10"
          aria-label="Delete rack"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {expanded && (
        <div className="mt-1 ml-6 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
          <p className="mb-1.5 text-[10px] font-semibold text-gray-500 uppercase dark:text-gray-400">
            Template
          </p>
          <div className="flex items-center gap-1.5">
            <select
              value={rack.template_id ?? ''}
              onChange={(e) => handleTemplateChange(e.target.value)}
              disabled={saving}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">No template</option>
              {rackTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#465fff]" />}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="mt-2 flex items-center gap-1 text-[11px] text-[#465fff] hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Open in Rack Editor
          </button>
        </div>
      )}
    </div>
  );
};

type AisleColumnProps = {
  aisle: Aisle;
  rackTemplates: RackTemplate[];
  roomId: string;
  isDragOver: boolean;
  dragRackId: string | null;
  dragFromAisleId: string | null;
  expandedRackId: string | null;
  onColumnDragOver: (e: React.DragEvent, aisleId: string) => void;
  onColumnDrop: (e: React.DragEvent, aisleId: string, roomId: string) => void;
  onRackDragStart: (e: React.DragEvent, rackId: string, aisleId: string) => void;
  onRackDragOver: (e: React.DragEvent) => void;
  onRackDrop: (e: React.DragEvent, targetRackId: string, aisleId: string) => void;
  onDragEnd: () => void;
  onToggleExpand: (rackId: string) => void;
  onTemplateChange: (rackId: string, templateId: string | null) => Promise<void>;
  onOpenRack: (rackId: string) => void;
  onAddRack: () => void;
};

const AisleColumn = ({
  aisle,
  rackTemplates,
  roomId: _roomId,
  isDragOver,
  dragRackId,
  dragFromAisleId,
  expandedRackId,
  onColumnDragOver,
  onColumnDrop,
  onRackDragStart,
  onRackDragOver,
  onRackDrop,
  onDragEnd,
  onToggleExpand,
  onTemplateChange,
  onOpenRack,
  onAddRack,
}: AisleColumnProps) => (
  <div
    className={`flex min-w-[220px] flex-1 flex-col rounded-2xl border transition-colors ${
      isDragOver
        ? 'border-[#465fff] bg-[#465fff]/5'
        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
    }`}
    onDragOver={(e) => onColumnDragOver(e, aisle.id)}
    onDrop={(e) => onColumnDrop(e, aisle.id, _roomId)}
  >
    {/* Column header */}
    <div className="border-b border-gray-200 px-3 py-2.5 dark:border-gray-700">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white">{aisle.name}</h3>
      <p className="font-mono text-[10px] text-gray-400">{aisle.id}</p>
    </div>

    {/* Racks */}
    <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
      {(aisle.racks || []).map((rack) => (
        <RackItem
          key={rack.id}
          rack={rack}
          rackTemplates={rackTemplates}
          expanded={expandedRackId === rack.id}
          isDragging={dragRackId === rack.id}
          isDragTarget={false}
          aisleId={aisle.id}
          onDragStart={onRackDragStart}
          onDragOver={onRackDragOver}
          onDrop={(e) => onRackDrop(e, rack.id, aisle.id)}
          onDragEnd={onDragEnd}
          onToggleExpand={() => onToggleExpand(rack.id)}
          onDelete={() => {}}
          onTemplateChange={(tId) => onTemplateChange(rack.id, tId)}
          onOpen={() => onOpenRack(rack.id)}
        />
      ))}
      {dragRackId && dragFromAisleId !== aisle.id && (
        <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-[#465fff]/40 py-3 text-[11px] text-[#465fff]/60">
          Drop here
        </div>
      )}
    </div>

    {/* Add rack */}
    <div className="border-t border-gray-200 p-2 dark:border-gray-700">
      <button
        onClick={onAddRack}
        className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-1.5 text-xs text-gray-400 transition-colors hover:border-[#465fff] hover:text-[#465fff] dark:border-gray-700"
      >
        <Plus className="ml-2 h-3 w-3" />
        Add Rack
      </button>
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const CosmosTopologyEditorPageV4: React.FC = () => {
  const navigate = useNavigate();
  const [topology, setTopology] = useState<Site[]>([]);
  const [rackTemplates, setRackTemplates] = useState<RackTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [addingAisle, setAddingAisle] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [dragRackId, setDragRackId] = useState<string | null>(null);
  const [dragFromAisleId, setDragFromAisleId] = useState<string | null>(null);
  const [dragOverAisleId, setDragOverAisleId] = useState<string | null>(null);
  const [expandedRackId, setExpandedRackId] = useState<string | null>(null);

  const dragRoomIdRef = useRef<string | null>(null);

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

  const allRooms = topology.flatMap((s) =>
    (s.rooms || []).map((r) => ({ id: r.id, name: r.name }))
  );

  const selectedRoom: Room | null = selectedRoomId
    ? (topology.flatMap((s) => s.rooms).find((r) => r.id === selectedRoomId) ?? null)
    : null;

  const selectedRoomParentSiteId: string | null = selectedRoomId
    ? (topology.find((s) => (s.rooms || []).some((r) => r.id === selectedRoomId))?.id ?? null)
    : null;

  const handleAddAisle = async (name: string, id: string) => {
    if (!selectedRoomId) return;
    await withSave(() => api.createRoomAisles(selectedRoomId, [{ id: id || null, name }]));
    setAddingAisle(false);
  };

  const handleRackDragStart = (e: React.DragEvent, rackId: string, aisleId: string) => {
    setDragRackId(rackId);
    setDragFromAisleId(aisleId);
    dragRoomIdRef.current = selectedRoomId;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleRackDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent, aisleId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverAisleId(aisleId);
  };

  const handleColumnDrop = async (e: React.DragEvent, toAisleId: string, roomId: string) => {
    e.preventDefault();
    setDragOverAisleId(null);
    if (!dragRackId || !dragFromAisleId || dragFromAisleId === toAisleId) {
      setDragRackId(null);
      setDragFromAisleId(null);
      return;
    }
    const rackId = dragRackId;
    const fromAisleId = dragFromAisleId;
    setDragRackId(null);
    setDragFromAisleId(null);
    await moveRack(rackId, fromAisleId, toAisleId, roomId);
  };

  const handleRackDrop = async (e: React.DragEvent, _targetRackId: string, aisleId: string) => {
    e.stopPropagation();
    if (!selectedRoomId) return;
    await handleColumnDrop(e, aisleId, selectedRoomId);
  };

  const handleDragEnd = () => {
    setDragRackId(null);
    setDragFromAisleId(null);
    setDragOverAisleId(null);
  };

  const handleToggleExpand = (rackId: string) => {
    setExpandedRackId((prev) => (prev === rackId ? null : rackId));
  };

  const handleTemplateChange = async (rackId: string, templateId: string | null) => {
    await withSave(() => api.updateRackTemplate(rackId, templateId));
  };

  const handleRoomSelect = (id: string) => {
    setSelectedRoomId(id);
    setExpandedRackId(null);
    setAddingAisle(false);
  };

  const standaloneRacks = selectedRoom ? selectedRoom.standalone_racks || [] : [];
  const hasStandalone = standaloneRacks.length > 0;

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
            <p className="text-sm text-gray-500 dark:text-gray-400">Kanban aisles — V4</p>
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
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Error'}
            </span>
          )}
          <VariantSwitcher active="V4" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <RoomSelector
          rooms={allRooms}
          selectedRoomId={selectedRoomId}
          onSelect={handleRoomSelect}
        />
        {selectedRoomId && (
          <button
            onClick={() => setAddingAisle(true)}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Plus className="h-4 w-4" />
            Add Aisle
          </button>
        )}
        {selectedRoom && (
          <span className="text-xs text-gray-400">
            {selectedRoomParentSiteId} / {selectedRoom.name}
          </span>
        )}
      </div>

      {/* Kanban board */}
      {!selectedRoom ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-center">
            <MapPin className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-400">Select a room to see its aisles</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex h-full min-h-[400px] gap-4 pb-4">
            {(selectedRoom.aisles || []).map((aisle) => (
              <AisleColumn
                key={aisle.id}
                aisle={aisle}
                rackTemplates={rackTemplates}
                roomId={selectedRoom.id}
                isDragOver={dragOverAisleId === aisle.id}
                dragRackId={dragRackId}
                dragFromAisleId={dragFromAisleId}
                expandedRackId={expandedRackId}
                onColumnDragOver={handleColumnDragOver}
                onColumnDrop={handleColumnDrop}
                onRackDragStart={handleRackDragStart}
                onRackDragOver={handleRackDragOver}
                onRackDrop={handleRackDrop}
                onDragEnd={handleDragEnd}
                onToggleExpand={handleToggleExpand}
                onTemplateChange={handleTemplateChange}
                onOpenRack={(rackId) => navigate(`/cosmos/views/rack/${rackId}`)}
                onAddRack={() => {}}
              />
            ))}

            {/* New aisle column */}
            {addingAisle ? (
              <NewAisleForm onSave={handleAddAisle} onCancel={() => setAddingAisle(false)} />
            ) : (
              <button
                onClick={() => setAddingAisle(true)}
                className="flex min-w-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-[#465fff] hover:text-[#465fff] dark:border-gray-700"
              >
                <Plus className="h-5 w-5" />
                <span className="text-xs">Add Aisle</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Standalone racks */}
      {hasStandalone && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-300">
            Standalone Racks ({standaloneRacks.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {standaloneRacks.map((rack: Rack) => (
              <div
                key={rack.id}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700"
              >
                <Server className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {rack.name}
                </span>
                <button
                  onClick={() => navigate(`/cosmos/views/rack/${rack.id}`)}
                  className="text-[#465fff] hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
